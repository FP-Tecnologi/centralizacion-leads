-- Compatibilidad con la landing de EXPOMINA (repo landing-registro-expomina), que sigue
-- insertando en `leads` con su Edge Function register-lead sin mandar `fuente_id`
-- (solo `evento`, fijo en su constante CURRENT_EVENT). Desde 20260923000001 fuente_id es
-- NOT NULL, así que cada registro fallaba con insert_failed.
--
-- Mientras esa landing no pase a ingresar-lead, un insert sin fuente_id toma la fuente
-- del evento (misma regla que _backfill_fuentes: slug = slugify(evento), creándola si no
-- existe) y, si el correo ya estaba registrado en esa fuente y evento, se guarda como
-- duplicado del principal (antes lo permitía; ahora el índice único lo rechazaría).
-- Los inserts que ya traen fuente_id (ingresar-lead, importación, dashboard) no cambian.

create or replace function public._leads_fuente_por_evento() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_fuente uuid;
  v_principal uuid;
begin
  if new.fuente_id is not null then
    return new;
  end if;

  select id into v_fuente from fuentes where slug = public.slugify(new.evento);
  if v_fuente is null then
    insert into fuentes (nombre, slug, tipo, dominio, campos)
    values (new.evento, public.slugify(new.evento), 'landing', 'registro.fptecnologi.com', public._campos_expomina())
    on conflict (slug) do update set nombre = fuentes.nombre
    returning id into v_fuente;
  end if;
  new.fuente_id := v_fuente;

  if nullif(new.email, '') is not null and new.duplicado_de is null then
    select id into v_principal from leads
    where fuente_id = v_fuente and lower(email) = lower(new.email) and evento = new.evento and duplicado_de is null
    order by created_at desc
    limit 1;
    new.duplicado_de := v_principal;
  end if;
  return new;
end $$;

revoke execute on function public._leads_fuente_por_evento() from public, anon, authenticated;

drop trigger if exists trg_leads_fuente_por_evento on public.leads;
create trigger trg_leads_fuente_por_evento before insert on public.leads
  for each row execute function public._leads_fuente_por_evento();
