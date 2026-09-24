-- Task 13b (decisión de usuario, opción B): las columnas que llegan de un Excel /
-- landing / app offline y no son núcleo dejan de sentirse "extra": se registran solas
-- y se exponen como columnas reales de una vista tipada, SIN alterar `leads` (los datos
-- siguen viviendo en `leads.extra` jsonb).

create table public.columnas_extra (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  label text not null,
  tipo text not null default 'texto' check (tipo in ('texto', 'fecha', 'numero')),
  creado_en timestamptz not null default now(),
  -- ni núcleo de `leads` ni columna real de la tabla: esas van directo a su propia
  -- columna, no a `extra`, y no pueden convivir con una columna generada del mismo nombre.
  constraint columnas_extra_no_nucleo check (key <> all (array[
    'nombres', 'apellido', 'email', 'telefono', 'empresa', 'ruc', 'cargo', 'rubro',
    'fecha_nacimiento', 'status', 'extra', 'id', 'fuente_id', 'created_at', 'actualizado_en',
    'duplicado_de', 'id_externo', 'origen', 'user_agent', 'evento'
  ]))
);

alter table public.columnas_extra enable row level security;

create policy columnas_extra_sel on public.columnas_extra for select to authenticated
  using (public.mfa_ok());
create policy columnas_extra_ins on public.columnas_extra for insert to authenticated
  with check (public.mfa_ok() and public.mi_rol() in ('admin', 'editor'));
create policy columnas_extra_upd on public.columnas_extra for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy columnas_extra_del on public.columnas_extra for delete to authenticated
  using (public.es_admin());

revoke all on public.columnas_extra from anon;
-- mismo patrón que 20260923000002_rls.sql: Postgres otorga TRUNCATE/REFERENCES/TRIGGER
-- por defecto a `authenticated` en tablas nuevas de public; se revoca todo y se
-- re-otorga solo lo necesario (sin TRUNCATE).
revoke all on public.columnas_extra from authenticated;
grant select, insert, update, delete on public.columnas_extra to authenticated;

-- ================= auto-registro =================

-- Inserta las claves válidas de un `extra` jsonb en el registro global; las inválidas
-- (no matchean la regex, o son núcleo/columna real) se ignoran en silencio — nunca error.
create or replace function public._registrar_claves_extra(p_extra jsonb) returns void
language sql set search_path = public as $$
  insert into public.columnas_extra (key, label)
  select k, k from jsonb_object_keys(coalesce(p_extra, '{}'::jsonb)) k
  where k ~ '^[a-z0-9_]+$' and k <> all (array[
    'nombres', 'apellido', 'email', 'telefono', 'empresa', 'ruc', 'cargo', 'rubro',
    'fecha_nacimiento', 'status', 'extra', 'id', 'fuente_id', 'created_at', 'actualizado_en',
    'duplicado_de', 'id_externo', 'origen', 'user_agent', 'evento'
  ])
  on conflict (key) do nothing
$$;

revoke execute on function public._registrar_claves_extra(jsonb) from public, anon;
grant execute on function public._registrar_claves_extra(jsonb) to authenticated;

-- create or replace de upsert_lead (20260923000003_funciones.sql): mismo cuerpo/guards,
-- solo se cambia el `return` inmediato de cada rama por una variable `v_res`, para poder
-- registrar las claves extra una sola vez (cubre ingresar-lead, importar_leads y futuro sync).
create or replace function public.upsert_lead(p_fuente uuid, p jsonb) returns text
language plpgsql set search_path = public as $$
declare
  v_email text := nullif(lower(trim(p ->> 'email')), '');
  v_ext text := nullif(p ->> 'id_externo', '');
  v_tel text := nullif(trim(p ->> 'telefono'), '');
  v_id uuid;
  v_res text;
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
    v_res := 'actualizada';
  else
    insert into leads (fuente_id, nombres, apellido, email, telefono, empresa, ruc, cargo, rubro,
                       fecha_nacimiento, extra, id_externo, origen, user_agent)
    values (p_fuente, nullif(p ->> 'nombres', ''), nullif(p ->> 'apellido', ''), v_email,
            v_tel, nullif(p ->> 'empresa', ''), nullif(p ->> 'ruc', ''),
            nullif(p ->> 'cargo', ''), nullif(p ->> 'rubro', ''),
            nullif(p ->> 'fecha_nacimiento', '')::date, coalesce(p -> 'extra', '{}'::jsonb), v_ext,
            coalesce(nullif(p ->> 'origen', ''), 'dashboard'), nullif(p ->> 'user_agent', ''));
    v_res := 'nueva';
  end if;

  perform public._registrar_claves_extra(p -> 'extra');
  return v_res;
end $$;

revoke execute on function public.upsert_lead(uuid, jsonb) from public, anon, authenticated;

-- ================= registro manual =================

-- p = [{key,label,tipo}]. Inserta las nuevas; en las existentes solo mejora el label
-- cuando el guardado sigue siendo igual a la clave (nunca pisa un label puesto a mano
-- por un admin/editor), y solo mejora el tipo cuando el guardado sigue en 'texto' y el
-- nuevo es más específico ('fecha'/'numero'). Clave inválida (núcleo o formato) → error
-- (a diferencia del auto-registro, esto es una acción deliberada de un admin/editor).
create or replace function public.registrar_columnas(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_item jsonb;
begin
  if not (public.mfa_ok() and public.mi_rol() in ('admin', 'editor')) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  for v_item in select * from jsonb_array_elements(p) loop
    insert into public.columnas_extra (key, label, tipo)
    values (
      v_item ->> 'key',
      coalesce(nullif(v_item ->> 'label', ''), v_item ->> 'key'),
      coalesce(nullif(v_item ->> 'tipo', ''), 'texto')
    )
    on conflict (key) do update set
      label = case when columnas_extra.label = columnas_extra.key then excluded.label else columnas_extra.label end,
      tipo = case when columnas_extra.tipo = 'texto' and excluded.tipo <> 'texto' then excluded.tipo else columnas_extra.tipo end;
  end loop;
end $$;

revoke execute on function public.registrar_columnas(jsonb) from public, anon;
grant execute on function public.registrar_columnas(jsonb) to authenticated;

-- ================= vista tipada =================

-- Reconstruye `leads_completo`: `leads` + fuente + una columna real por cada fila de
-- columnas_extra, tipada según `tipo` (valor no matchea el patrón esperado → null, no
-- error). Las claves ya están validadas por el check de la tabla; se cita igual con
-- %I/%L por higiene. security_invoker: hereda RLS de `leads`/`fuentes` del que consulta.
create or replace function public.refrescar_leads_completo() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_col record;
  v_extra text := '';
  v_sql text;
begin
  for v_col in select key, tipo from public.columnas_extra order by key loop
    v_extra := v_extra || case v_col.tipo
      when 'fecha' then format(
        E',\n  case when l.extra ->> %L ~ %L then (l.extra ->> %L)::date else null end as %I',
        v_col.key, '^\d{4}-\d{2}-\d{2}$', v_col.key, v_col.key)
      when 'numero' then format(
        E',\n  case when l.extra ->> %L ~ %L then (l.extra ->> %L)::numeric else null end as %I',
        v_col.key, '^-?\d+(\.\d+)?$', v_col.key, v_col.key)
      else format(E',\n  l.extra ->> %L as %I', v_col.key, v_col.key)
    end;
  end loop;

  execute 'drop view if exists public.leads_completo';
  v_sql := format(
    $sql$create view public.leads_completo with (security_invoker = true) as
      select l.*, f.slug as fuente_slug, f.nombre as fuente_nombre%s
      from public.leads l
      join public.fuentes f on f.id = l.fuente_id$sql$,
    v_extra);
  execute v_sql;

  revoke all on public.leads_completo from anon, authenticated;
  grant select on public.leads_completo to authenticated;

  notify pgrst, 'reload schema';
end $$;

revoke execute on function public.refrescar_leads_completo() from public, anon;
grant execute on function public.refrescar_leads_completo() to authenticated;

create or replace function public._trg_refrescar_leads_completo() returns trigger
language plpgsql as $$
begin
  perform public.refrescar_leads_completo();
  return null;
end $$;

create trigger trg_columnas_extra_refrescar
  after insert or update or delete on public.columnas_extra
  for each statement execute function public._trg_refrescar_leads_completo();

-- ================= backfill =================

insert into public.columnas_extra (key, label)
select distinct k, k
from public.leads, lateral jsonb_object_keys(extra) k
where k ~ '^[a-z0-9_]+$' and k <> all (array[
  'nombres', 'apellido', 'email', 'telefono', 'empresa', 'ruc', 'cargo', 'rubro',
  'fecha_nacimiento', 'status', 'extra', 'id', 'fuente_id', 'created_at', 'actualizado_en',
  'duplicado_de', 'id_externo', 'origen', 'user_agent', 'evento'
])
on conflict (key) do nothing;

select public.refrescar_leads_completo();
