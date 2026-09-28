-- Importación Excel/CSV: tres columnas del archivo que antes terminaban en `extra` (o
-- rompían el mapeo por chocar con un nombre reservado) ahora van a su columna real:
--   status      ← "Estado"            (nuevo / contactado / asistio / descartado)
--   evento      ← "Evento"            (texto; antes quedaba siempre 'EXPOMINA Perú 2026' por default)
--   created_at  ← "Fecha" de registro (yyyy-mm-dd; el wizard ya convierte serial de Excel y DD/MM/AAAA)
--
-- create or replace de upsert_lead (20260924000001_columnas_extra.sql): mismo cuerpo,
-- guards y auto-registro; solo se agregan esas tres claves opcionales. Quien no las manda
-- no cambia en nada: ingresar-lead arma `p` con separarLead (solo núcleo + extra), así que
-- un formulario público no puede fijar estado, evento ni fecha de registro.
create or replace function public.upsert_lead(p_fuente uuid, p jsonb) returns text
language plpgsql set search_path = public as $$
declare
  v_email text := nullif(lower(trim(p ->> 'email')), '');
  v_ext text := nullif(p ->> 'id_externo', '');
  v_tel text := nullif(trim(p ->> 'telefono'), '');
  v_estado_txt text := nullif(lower(trim(p ->> 'status')), '');
  v_evento text := nullif(trim(p ->> 'evento'), '');
  v_creado_txt text := nullif(trim(p ->> 'created_at'), '');
  v_estado lead_status;
  v_creado timestamptz;
  v_id uuid;
  v_res text;
begin
  if jsonb_typeof(p) <> 'object' then
    raise exception 'fila_invalida';
  end if;
  if v_email is null and v_tel is null and v_ext is null then
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
      id_externo = coalesce(id_externo, v_ext),
      evento = coalesce(v_evento, evento),
      -- el estado del archivo solo se aplica mientras el lead siga en 'nuevo': una
      -- reimportación no debe deshacer un avance hecho a mano en el panel.
      status = case when status = 'nuevo' then coalesce(v_estado, status) else status end
      -- created_at no se toca al actualizar: es cuándo se registró el lead la primera vez.
    where id = v_id;
    v_res := 'actualizada';
  else
    insert into leads (fuente_id, nombres, apellido, email, telefono, empresa, ruc, cargo, rubro,
                       fecha_nacimiento, extra, id_externo, origen, user_agent, status, created_at)
    values (p_fuente, nullif(p ->> 'nombres', ''), nullif(p ->> 'apellido', ''), v_email,
            v_tel, nullif(p ->> 'empresa', ''), nullif(p ->> 'ruc', ''),
            nullif(p ->> 'cargo', ''), nullif(p ->> 'rubro', ''),
            nullif(p ->> 'fecha_nacimiento', '')::date, coalesce(p -> 'extra', '{}'::jsonb), v_ext,
            coalesce(nullif(p ->> 'origen', ''), 'dashboard'), nullif(p ->> 'user_agent', ''),
            coalesce(v_estado, 'nuevo'), coalesce(v_creado, now()))
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
