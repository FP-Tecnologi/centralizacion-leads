create or replace function public.hash_clave(c text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(c, 'sha256'), 'hex')
$$;

-- ponytail: carrera entre dos inserts simultáneos del mismo email la corta el
-- índice único (el segundo falla y el llamador reintenta); sin lock explícito.
create or replace function public.upsert_lead(p_fuente uuid, p jsonb) returns text
language plpgsql set search_path = public as $$
declare
  v_email text := nullif(lower(trim(p ->> 'email')), '');
  v_ext text := nullif(p ->> 'id_externo', '');
  v_tel text := nullif(trim(p ->> 'telefono'), '');
  v_id uuid;
begin
  if jsonb_typeof(p) <> 'object' then
    raise exception 'fila_invalida';
  end if;
  if v_email is null and v_tel is null and v_ext is null then
    raise exception 'fila_sin_contacto';
  end if;

  select id into v_id from leads
  where fuente_id = p_fuente and duplicado_de is null
    and ((v_email is not null and lower(email) = v_email)
      or (v_ext is not null and id_externo = v_ext))
  limit 1;

  if v_id is not null then
    update leads set
      nombres = coalesce(nullif(p ->> 'nombres', ''), nombres),
      apellido = coalesce(nullif(p ->> 'apellido', ''), apellido),
      telefono = coalesce(v_tel, telefono),
      empresa = coalesce(nullif(p ->> 'empresa', ''), empresa),
      ruc = coalesce(nullif(p ->> 'ruc', ''), ruc),
      cargo = coalesce(nullif(p ->> 'cargo', ''), cargo),
      rubro = coalesce(nullif(p ->> 'rubro', ''), rubro),
      fecha_nacimiento = coalesce(nullif(p ->> 'fecha_nacimiento', '')::date, fecha_nacimiento),
      extra = extra || coalesce(p -> 'extra', '{}'::jsonb),
      id_externo = coalesce(id_externo, v_ext)
    where id = v_id;
    return 'actualizada';
  end if;

  insert into leads (fuente_id, nombres, apellido, email, telefono, empresa, ruc, cargo, rubro,
                     fecha_nacimiento, extra, id_externo, origen, user_agent)
  values (p_fuente, nullif(p ->> 'nombres', ''), nullif(p ->> 'apellido', ''), v_email,
          v_tel, nullif(p ->> 'empresa', ''), nullif(p ->> 'ruc', ''),
          nullif(p ->> 'cargo', ''), nullif(p ->> 'rubro', ''),
          nullif(p ->> 'fecha_nacimiento', '')::date, coalesce(p -> 'extra', '{}'::jsonb), v_ext,
          coalesce(nullif(p ->> 'origen', ''), 'dashboard'), nullif(p ->> 'user_agent', ''));
  return 'nueva';
end $$;

revoke execute on function public.upsert_lead(uuid, jsonb) from public, anon, authenticated;

-- Security definer (para poder llamar upsert_lead, que authenticated no puede
-- ejecutar). RLS no aplica aquí: el chequeo puede_editar_fuente va primero y es obligatorio.
create or replace function public.importar_leads(p_fuente uuid, p_filas jsonb, p_archivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_fila jsonb;
  v_i int := 0;
  v_res text;
  v_nuevas int := 0;
  v_act int := 0;
  v_err jsonb := '[]'::jsonb;
begin
  if not public.puede_editar_fuente(p_fuente) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  for v_fila in select * from jsonb_array_elements(p_filas) loop
    v_i := v_i + 1;
    begin
      v_res := public.upsert_lead(p_fuente, v_fila || '{"origen":"importacion"}');
      if v_res = 'nueva' then v_nuevas := v_nuevas + 1; else v_act := v_act + 1; end if;
    exception when others then
      v_err := v_err || jsonb_build_object('fila', v_i, 'motivo', sqlerrm);
    end;
  end loop;
  insert into importaciones (fuente_id, user_id, archivo, nuevas, actualizadas, errores)
  values (p_fuente, auth.uid(), p_archivo, v_nuevas, v_act, jsonb_array_length(v_err));
  return jsonb_build_object('nuevas', v_nuevas, 'actualizadas', v_act, 'errores', v_err);
end $$;

create or replace function public.dashboard_resumen(
  p_fuentes uuid[] default null, p_desde date default null, p_hasta date default null
) returns jsonb
language sql stable set search_path = public as $$
  with base as (
    select l.*, (l.created_at at time zone 'America/Lima')::date as dia
    from leads l
    where l.duplicado_de is null
      and (p_fuentes is null or l.fuente_id = any(p_fuentes))
      and (p_desde is null or (l.created_at at time zone 'America/Lima')::date >= p_desde)
      and (p_hasta is null or (l.created_at at time zone 'America/Lima')::date <= p_hasta)
  ),
  hoy as (select (now() at time zone 'America/Lima')::date as d)
  select jsonb_build_object(
    'total', (select count(*) from base),
    'personas_unicas', (select count(distinct lower(email)) from base where email is not null),
    'hoy', (select count(*) from base, hoy where base.dia = hoy.d),
    'semana', (select count(*) from base, hoy where base.dia > hoy.d - 7),
    'contactados', (select count(*) from base where status <> 'nuevo'),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'n', n) order by dia), '[]')
                from (select dia, count(*) n from base group by dia) x),
    'por_fuente', (select coalesce(jsonb_agg(jsonb_build_object('fuente', f.nombre, 'n', x.n) order by x.n desc), '[]')
                   from (select fuente_id, count(*) n from base group by fuente_id) x join fuentes f on f.id = x.fuente_id),
    'por_estado', (select coalesce(jsonb_agg(jsonb_build_object('estado', status, 'n', n)), '[]')
                   from (select status, count(*) n from base group by status) x),
    'por_rubro', (select coalesce(jsonb_agg(jsonb_build_object('rubro', rubro, 'n', n) order by n desc), '[]')
                  from (select coalesce(nullif(rubro, ''), 'Sin rubro') rubro, count(*) n from base group by 1 order by 2 desc limit 10) x),
    'por_cargo', (select coalesce(jsonb_agg(jsonb_build_object('cargo', cargo, 'n', n) order by n desc), '[]')
                  from (select coalesce(nullif(cargo, ''), 'Sin cargo') cargo, count(*) n from base group by 1 order by 2 desc limit 10) x)
  )
$$;

create or replace function public._nueva_clave(prefijo text) returns text
language sql volatile set search_path = public, extensions as $$
  select prefijo || encode(extensions.gen_random_bytes(24), 'hex')
$$;

create or replace function public.regenerar_clave_fuente(p_fuente uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v text := public._nueva_clave('pub_');
begin
  if not public.es_admin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  update fuentes set clave_hash = public.hash_clave(v) where id = p_fuente;
  return v;
end $$;

create or replace function public.crear_aplicacion(p_nombre text, p_permisos text[], p_fuentes uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := public._nueva_clave('app_'); v_id uuid;
begin
  if not public.es_admin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  insert into aplicaciones (nombre, clave_hash, permisos, fuentes)
  values (p_nombre, public.hash_clave(v), p_permisos, p_fuentes) returning id into v_id;
  return jsonb_build_object('id', v_id, 'clave', v);
end $$;

create or replace function public.regenerar_clave_aplicacion(p_app uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v text := public._nueva_clave('app_');
begin
  if not public.es_admin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  update aplicaciones set clave_hash = public.hash_clave(v) where id = p_app;
  return v;
end $$;

create or replace function public.duplicar_fuente(p_fuente uuid, p_nombre text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.es_admin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  insert into fuentes (nombre, slug, tipo, dominio, campos, correo_gracias)
  select p_nombre, p_slug, tipo, dominio, campos, correo_gracias from fuentes where id = p_fuente
  returning id into v_id;
  return v_id;
end $$;

-- Ruling del controlador: Supabase otorga EXECUTE a PUBLIC (y por tanto a anon)
-- por defecto en toda función nueva. Las funciones security definer de abajo
-- hacen bypass de RLS, así que anon jamás debe poder ejecutarlas: se revoca el
-- privilegio implícito de PUBLIC y sólo se re-otorga a authenticated.
-- hash_clave y _nueva_clave quedan con el default (no son security definer por
-- sí solas de forma peligrosa: no exponen datos, sólo derivan strings).
revoke execute on function public.importar_leads(uuid, jsonb, text) from public, anon;
revoke execute on function public.dashboard_resumen(uuid[], date, date) from public, anon;
revoke execute on function public.regenerar_clave_fuente(uuid) from public, anon;
revoke execute on function public.crear_aplicacion(text, text[], uuid[]) from public, anon;
revoke execute on function public.regenerar_clave_aplicacion(uuid) from public, anon;
revoke execute on function public.duplicar_fuente(uuid, text, text) from public, anon;

grant execute on function public.importar_leads(uuid, jsonb, text), public.dashboard_resumen(uuid[], date, date),
  public.regenerar_clave_fuente(uuid), public.crear_aplicacion(text, text[], uuid[]),
  public.regenerar_clave_aplicacion(uuid), public.duplicar_fuente(uuid, text, text) to authenticated;
