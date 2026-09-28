-- Importación Excel/CSV: "no omitir filas, marcar lo que esté mal".
--
-- 1) Tres columnas del archivo que antes terminaban en `extra` (o rompían el mapeo por
--    chocar con un nombre reservado) ahora van a su columna real:
--      status      ← "Estado"            (nuevo / contactado / asistio / descartado)
--      evento      ← "Evento"            (texto; antes quedaba siempre 'EXPOMINA Perú 2026' por default)
--      created_at  ← "Fecha" de registro (yyyy-mm-dd; el wizard ya convierte serial de Excel y DD/MM/AAAA)
-- 2) `leads.invalidos`: datos que llegaron incompletos o con formato inválido
--    ({campo: {valor, causa}}). La fila se guarda igual y la tabla marca esas celdas;
--    un valor que no cabe en su columna tipada (fecha 31/02, estado "ganado") vive solo acá.
-- 3) Mismo correo en distintos eventos = leads distintos (antes el segundo pisaba al primero).
-- 4) Una fila importada sin correo ni teléfono ya no se rechaza (se guarda marcada).
-- 5) Tope de columnas adicionales de 200 → 1000 (Excel grandes con muchas columnas).

alter table public.leads add column if not exists invalidos jsonb not null default '{}'::jsonb;

create or replace function public._claves_reservadas() returns text[]
language sql immutable as $$
  select array[
    'nombres', 'apellido', 'email', 'telefono', 'empresa', 'ruc', 'cargo', 'rubro',
    'fecha_nacimiento', 'status', 'extra', 'id', 'fuente_id', 'created_at', 'actualizado_en',
    'duplicado_de', 'id_externo', 'origen', 'user_agent', 'evento', 'invalidos',
    -- columnas que la vista siempre agrega ella misma (join con fuentes): tampoco pueden
    -- ser el nombre de una columna extra generada, o `format(%I)` produciría un choque.
    'fuente_slug', 'fuente_nombre'
  ]
$$;

-- unicidad por (fuente, correo, evento) en vez de (fuente, correo).
drop index if exists public.leads_fuente_email_uq;
create unique index leads_fuente_email_evento_uq on public.leads (fuente_id, lower(email), evento)
  where duplicado_de is null and email is not null and email <> '';

-- create or replace de upsert_lead (20260924000001_columnas_extra.sql): mismos guards y
-- auto-registro. Las claves nuevas (status, evento, created_at, invalidos, _importacion)
-- solo las manda importar_leads: ingresar-lead arma `p` con separarLead (solo núcleo +
-- extra), así que un formulario público no puede fijarlas ni saltarse el contacto.
create or replace function public.upsert_lead(p_fuente uuid, p jsonb) returns text
language plpgsql set search_path = public as $$
declare
  v_email text := nullif(lower(trim(p ->> 'email')), '');
  v_ext text := nullif(p ->> 'id_externo', '');
  v_tel text := nullif(trim(p ->> 'telefono'), '');
  v_estado_txt text := nullif(lower(trim(p ->> 'status')), '');
  v_evento text := nullif(trim(p ->> 'evento'), '');
  v_creado_txt text := nullif(trim(p ->> 'created_at'), '');
  v_invalidos jsonb := case when jsonb_typeof(p -> 'invalidos') = 'object' then p -> 'invalidos' else '{}'::jsonb end;
  v_importacion boolean := coalesce((p ->> '_importacion')::boolean, false);
  v_estado lead_status;
  v_creado timestamptz;
  v_id uuid;
  v_res text;
begin
  if jsonb_typeof(p) <> 'object' then
    raise exception 'fila_invalida';
  end if;
  if v_email is null and v_tel is null and v_ext is null and not v_importacion then
    raise exception 'fila_sin_contacto';
  end if;
  if v_estado_txt is not null then
    if v_estado_txt <> all (enum_range(null::lead_status)::text[]) then
      raise exception 'estado_invalido';
    end if;
    v_estado := v_estado_txt::lead_status;
  end if;
  if v_creado_txt is not null then
    -- patrón estricto antes de castear (mismo motivo que _fecha_segura: con DateStyle MDY
    -- Postgres invertiría día/mes de un DD/MM en vez de fallar).
    if v_creado_txt !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'fecha_registro_invalida';
    end if;
    -- medianoche en Lima: el dashboard agrupa por (created_at at time zone 'America/Lima')::date.
    v_creado := v_creado_txt::date::timestamp at time zone 'America/Lima';
  end if;

  -- mismo correo (o id externo) en la misma fuente; si la fila trae evento, además el mismo
  -- evento: el mismo correo en otro evento es otro lead.
  select id into v_id from leads
  where fuente_id = p_fuente and duplicado_de is null
    and ((v_email is not null and lower(email) = v_email)
      or (v_ext is not null and id_externo = v_ext))
    and (v_evento is null or evento = v_evento)
  order by created_at desc
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
      id_externo = coalesce(id_externo, v_ext),
      -- el estado del archivo solo se aplica mientras el lead siga en 'nuevo': una
      -- reimportación no debe deshacer un avance hecho a mano en el panel.
      status = case when status = 'nuevo' then coalesce(v_estado, status) else status end,
      -- un campo que ahora llega bien deja de estar marcado; las marcas nuevas se suman.
      invalidos = (invalidos - array(
        select k from jsonb_each_text(p) e(k, v)
        where k in ('nombres', 'apellido', 'email', 'telefono', 'empresa', 'ruc', 'cargo', 'rubro',
                    'fecha_nacimiento', 'status', 'created_at') and nullif(v, '') is not null
      )) || v_invalidos
      -- created_at no se toca al actualizar: es cuándo se registró el lead la primera vez.
    where id = v_id;
    v_res := 'actualizada';
  else
    insert into leads (fuente_id, nombres, apellido, email, telefono, empresa, ruc, cargo, rubro,
                       fecha_nacimiento, extra, id_externo, origen, user_agent, status, created_at, invalidos)
    values (p_fuente, nullif(p ->> 'nombres', ''), nullif(p ->> 'apellido', ''), v_email,
            v_tel, nullif(p ->> 'empresa', ''), nullif(p ->> 'ruc', ''),
            nullif(p ->> 'cargo', ''), nullif(p ->> 'rubro', ''),
            nullif(p ->> 'fecha_nacimiento', '')::date, coalesce(p -> 'extra', '{}'::jsonb), v_ext,
            coalesce(nullif(p ->> 'origen', ''), 'dashboard'), nullif(p ->> 'user_agent', ''),
            coalesce(v_estado, 'nuevo'), coalesce(v_creado, now()), v_invalidos)
    returning id into v_id;
    -- evento tiene default de columna (not null): solo se pisa cuando el archivo trae uno.
    if v_evento is not null then
      update leads set evento = v_evento where id = v_id;
    end if;
    v_res := 'nueva';
  end if;

  perform public._registrar_claves_extra(p_fuente, p -> 'extra');
  return v_res;
end $$;

revoke execute on function public.upsert_lead(uuid, jsonb) from public, anon, authenticated;

-- importar_leads marca sus filas como importación (permite filas sin contacto).
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
      v_res := public.upsert_lead(p_fuente, v_fila || '{"origen":"importacion","_importacion":true}');
      if v_res = 'nueva' then v_nuevas := v_nuevas + 1; else v_act := v_act + 1; end if;
    exception when others then
      v_err := v_err || jsonb_build_object('fila', v_i, 'motivo', sqlerrm);
    end;
  end loop;
  insert into importaciones (fuente_id, user_id, archivo, nuevas, actualizadas, errores)
  values (p_fuente, auth.uid(), p_archivo, v_nuevas, v_act, jsonb_array_length(v_err));
  return jsonb_build_object('nuevas', v_nuevas, 'actualizadas', v_act, 'errores', v_err);
end $$;

-- ================= tope de columnas adicionales: 200 → 1000 =================
-- (la vista leads_completo tiene ~25 columnas propias; Postgres admite 1664.)

create or replace function public._registrar_claves_extra(p_fuente uuid, p_extra jsonb) returns void
language plpgsql set search_path = public as $$
declare
  v_declaradas text[];
begin
  select coalesce(array_agg(c ->> 'key'), '{}') into v_declaradas
  from public.fuentes f, lateral jsonb_array_elements(coalesce(f.campos, '[]'::jsonb)) c
  where f.id = p_fuente;

  insert into public.columnas_extra (key, label)
  select k, k from jsonb_object_keys(coalesce(p_extra, '{}'::jsonb)) k
  where k = any (v_declaradas)
    and k ~ '^[a-z0-9_]{1,63}$'
    and k <> all (public._claves_reservadas())
    and (select count(*) from public.columnas_extra) < 1000
  on conflict (key) do nothing;
end $$;

revoke execute on function public._registrar_claves_extra(uuid, jsonb) from public, anon, authenticated;

create or replace function public.registrar_columnas(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_item jsonb;
  v_total int;
begin
  if not (public.mfa_ok() and public.mi_rol() in ('admin', 'editor')) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  select count(*) into v_total from public.columnas_extra;
  for v_item in select * from jsonb_array_elements(p) loop
    if v_total >= 1000 and not exists (select 1 from public.columnas_extra where key = v_item ->> 'key') then
      raise exception 'limite_columnas_extra' using errcode = '54000';
    end if;
    insert into public.columnas_extra (key, label, tipo)
    values (
      v_item ->> 'key',
      coalesce(nullif(v_item ->> 'label', ''), v_item ->> 'key'),
      coalesce(nullif(v_item ->> 'tipo', ''), 'texto')
    )
    on conflict (key) do update set
      label = case when columnas_extra.label = columnas_extra.key then excluded.label else columnas_extra.label end,
      tipo = case when columnas_extra.tipo = 'texto' and excluded.tipo <> 'texto' then excluded.tipo else columnas_extra.tipo end;
    select count(*) into v_total from public.columnas_extra;
  end loop;
end $$;

revoke execute on function public.registrar_columnas(jsonb) from public, anon;
grant execute on function public.registrar_columnas(jsonb) to authenticated;

-- leads_completo se arma con `l.*`: se reconstruye para que incluya `invalidos`.
select public.refrescar_leads_completo();
