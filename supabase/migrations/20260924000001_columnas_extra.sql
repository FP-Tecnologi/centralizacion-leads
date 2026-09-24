-- Task 13b (decisión de usuario, opción B): las columnas que llegan de un Excel /
-- landing / app offline y no son núcleo dejan de sentirse "extra": se registran solas
-- y se exponen como columnas reales de una vista tipada, SIN alterar `leads` (los datos
-- siguen viviendo en `leads.extra` jsonb).
--
-- Fix round 1 (revisión previa a llegar a la nube, esta migración todavía no se pushea):
--  - la vista solo se reconstruye cuando de verdad se insertaron claves nuevas (antes,
--    el trigger corría en cada upsert_lead aunque 0 filas nuevas entraran a columnas_extra);
--  - un fallo al reconstruir la vista nunca debe tumbar un upsert_lead (intake primero);
--  - el auto-registro desde upsert_lead solo registra claves que la fuente ya declara en
--    `campos` (un lead público no puede hacer crecer el registro con claves arbitrarias) y
--    respeta un tope de 200 columnas; registrar_columnas (uso admin/editor explícito, p.ej.
--    el wizard de importación) sigue libre pero también respeta el tope, con error claro;
--  - los casts de la vista nunca deben poder tirar toda la lectura (fecha de calendario
--    inválida, dígitos Unicode que matchean \d pero no castean): dos funciones seguras
--    (_fecha_segura/_numero_seguro) que capturan la excepción y devuelven null;
--  - refrescar_leads_completo/_registrar_claves_extra dejan de estar expuestas a
--    authenticated (solo las llaman internamente triggers/funciones ya privilegiadas).

create or replace function public._claves_reservadas() returns text[]
language sql immutable as $$
  select array[
    'nombres', 'apellido', 'email', 'telefono', 'empresa', 'ruc', 'cargo', 'rubro',
    'fecha_nacimiento', 'status', 'extra', 'id', 'fuente_id', 'created_at', 'actualizado_en',
    'duplicado_de', 'id_externo', 'origen', 'user_agent', 'evento',
    -- columnas que la vista siempre agrega ella misma (join con fuentes): tampoco pueden
    -- ser el nombre de una columna extra generada, o `format(%I)` produciría un choque.
    'fuente_slug', 'fuente_nombre'
  ]
$$;

create table public.columnas_extra (
  -- 63 = NAMEDATALEN-1, el máximo real de un identificador de Postgres: una clave más
  -- larga se vería truncada por `format('%I', key)` al nombrar la columna de la vista,
  -- pudiendo colisionar con otra columna truncada al mismo nombre.
  key text primary key check (key ~ '^[a-z0-9_]{1,63}$'),
  label text not null,
  tipo text not null default 'texto' check (tipo in ('texto', 'fecha', 'numero')),
  creado_en timestamptz not null default now(),
  -- ni núcleo de `leads` ni columna real/generada de la vista: esas van directo a su
  -- propia columna, no a `extra`, y no pueden convivir con una columna generada homónima.
  constraint columnas_extra_no_nucleo check (key <> all (public._claves_reservadas()))
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

-- ponytail: tope "blando" — el `where` de más abajo evalúa el conteo una sola vez por
-- sentencia (subconsulta no correlacionada), así que una sola llamada con muchas claves
-- en un mismo `extra` puede pasarse del tope antes de que la siguiente llamada lo vea
-- lleno. Un lead trae unas pocas claves; si algún día se necesita un tope exacto,
-- reservar filas con un advisory lock o un contador aparte.
--
-- Solo registra claves de `extra` que la fuente (p_fuente) ya declara en su propio
-- `campos`: un envío público (ingresar-lead) no puede hacer crecer el registro global con
-- claves arbitrarias — eso es lo que separa este auto-registro silencioso del RPC
-- registrar_columnas (admin/editor, deliberado). Claves inválidas o no declaradas se
-- ignoran en silencio — nunca error: nunca debe poder bloquear un upsert_lead.
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
    and (select count(*) from public.columnas_extra) < 200
  on conflict (key) do nothing;
end $$;

revoke execute on function public._registrar_claves_extra(uuid, jsonb) from public, anon, authenticated;

-- create or replace de upsert_lead (20260923000003_funciones.sql): mismo cuerpo/guards,
-- solo se cambia el `return` inmediato de cada rama por una variable `v_res`, para poder
-- registrar las claves extra una sola vez (cubre ingresar-lead, importar_leads y futuro
-- sync) — ahora pasando p_fuente, para que el registro respete lo que esa fuente declara.
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

  perform public._registrar_claves_extra(p_fuente, p -> 'extra');
  return v_res;
end $$;

revoke execute on function public.upsert_lead(uuid, jsonb) from public, anon, authenticated;

-- ================= registro manual =================

-- p = [{key,label,tipo}]. Inserta las nuevas; en las existentes solo mejora el label
-- cuando el guardado sigue siendo igual a la clave (nunca pisa un label puesto a mano
-- por un admin/editor), y solo mejora el tipo cuando el guardado sigue en 'texto' y el
-- nuevo es más específico ('fecha'/'numero'). Clave inválida (núcleo/reservada o formato,
-- vía el check de la tabla) → error 23514 — a diferencia del auto-registro, esto es una
-- acción deliberada de un admin/editor. Mismo tope de 200 que el auto-registro, pero acá
-- se avisa con un error claro en vez de callar filas.
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
    if v_total >= 200 and not exists (select 1 from public.columnas_extra where key = v_item ->> 'key') then
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

-- ================= casts seguros para la vista =================

-- ::date/::numeric pueden tirar (fecha de calendario inválida tipo 2024-02-30; texto con
-- dígitos Unicode no-ASCII que no castea) y una excepción sin capturar tumbaría la lectura
-- de TODA la vista por una sola fila mala.
--
-- Fix round 2: el solo try/cast/catch NO bastaba — con el DateStyle por defecto
-- (ISO, MDY) Postgres acepta gustoso formatos no-ISO y los reinterpreta: '01/02/2024'
-- castea a 2024-01-02 (día y mes invertidos, sin avisar) y hasta 'today'/'now' castean a
-- una fecha real. Por eso `_fecha_segura` exige el patrón ISO estricto (dígitos ASCII
-- `[0-9]`, no `\d` — que en Postgres matchea dígitos Unicode "anchos" que después no
-- castean) ANTES de intentar el cast; solo entonces el cast + catch cubre lo demás (fecha
-- de calendario inválida tipo 2024-02-30). Mismo problema y mismo fix para
-- `_numero_seguro`: sin el patrón, '1e3' o 'NaN' castean a valores reales en vez de null.
create or replace function public._fecha_segura(v text) returns date
language plpgsql immutable as $$
begin
  if v is null or v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return null;
  end if;
  return v::date;
exception when others then
  return null;
end $$;

create or replace function public._numero_seguro(v text) returns numeric
language plpgsql immutable as $$
begin
  if v is null or v !~ '^-?[0-9]+(\.[0-9]+)?$' then
    return null;
  end if;
  return v::numeric;
exception when others then
  return null;
end $$;

-- ================= vista tipada =================

-- Reconstruye `leads_completo`: `leads` + fuente + una columna real por cada fila de
-- columnas_extra, tipada según `tipo` vía los casts seguros de arriba. Las claves ya
-- están validadas por el check de la tabla; se cita igual con %I/%L por higiene.
-- security_invoker: hereda RLS de `leads`/`fuentes` del que consulta.
create or replace function public.refrescar_leads_completo() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_col record;
  v_extra text := '';
  v_sql text;
begin
  for v_col in select key, tipo from public.columnas_extra order by key loop
    v_extra := v_extra || case v_col.tipo
      when 'fecha' then format(E',\n  public._fecha_segura(l.extra ->> %L) as %I', v_col.key, v_col.key)
      when 'numero' then format(E',\n  public._numero_seguro(l.extra ->> %L) as %I', v_col.key, v_col.key)
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

-- Solo la llaman, internamente, los triggers de más abajo (ellos sí son security definer
-- y corren con el dueño de la función) — nunca directo desde la API.
revoke execute on function public.refrescar_leads_completo() from public, anon, authenticated;

-- INSERT: solo reconstruye si de verdad entraron filas nuevas a columnas_extra (la tabla
-- de transición `n` de un statement trigger solo trae las filas realmente insertadas — un
-- `on conflict do nothing` que no insertó nada deja `n` vacía). Sin este chequeo, cada
-- upsert_lead (aunque sus claves ya estuvieran todas registradas) dispararía un
-- drop/create de la vista — DDL + lock exclusivo en cada lead que entra.
create or replace function public._trg_refrescar_leads_completo_ins() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from n) then
    return null;
  end if;
  begin
    perform public.refrescar_leads_completo();
  exception when others then
    -- un fallo reconstruyendo la vista nunca debe tumbar el INSERT en columnas_extra ni,
    -- por transitividad, el upsert_lead que lo disparó: se registra como warning y sigue.
    raise warning 'refrescar_leads_completo (insert) fallo: %', sqlerrm;
  end;
  return null;
end $$;

create trigger trg_columnas_extra_refrescar_ins
  after insert on public.columnas_extra
  referencing new table as n
  for each statement execute function public._trg_refrescar_leads_completo_ins();

-- UPDATE/DELETE de columnas_extra son acciones de admin (editar label/tipo a mano, borrar
-- una columna) — poco frecuentes, siempre reconstruyen (no hay un "no cambió nada" barato
-- de detectar ahí sin comparar antes/después fila por fila, y no vale la pena).
create or replace function public._trg_refrescar_leads_completo() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  begin
    perform public.refrescar_leads_completo();
  exception when others then
    raise warning 'refrescar_leads_completo fallo: %', sqlerrm;
  end;
  return null;
end $$;

create trigger trg_columnas_extra_refrescar_upd_del
  after update or delete on public.columnas_extra
  for each statement execute function public._trg_refrescar_leads_completo();

-- ================= backfill =================

insert into public.columnas_extra (key, label)
select distinct k, k
from public.leads, lateral jsonb_object_keys(extra) k
where k ~ '^[a-z0-9_]{1,63}$' and k <> all (public._claves_reservadas())
on conflict (key) do nothing;

select public.refrescar_leads_completo();
