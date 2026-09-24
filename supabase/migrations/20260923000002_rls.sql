-- Políticas antiguas de Expomina: cualquier autenticado veía/editaba todo.
drop policy if exists "Autenticados pueden ver leads" on public.leads;
drop policy if exists "Autenticados pueden actualizar leads" on public.leads;
drop policy if exists "Autenticados pueden borrar leads" on public.leads;
drop policy if exists "Público puede registrar su asistencia" on public.leads;

create or replace function public.mfa_ok() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where user_id = auth.uid()
$$;

create or replace function public.puede_ver_fuente(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and (
    public.mi_rol() = 'admin'
    or exists (select 1 from public.perfil_fuentes pf where pf.user_id = auth.uid() and pf.fuente_id = f)
  )
$$;

create or replace function public.puede_editar_fuente(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and (
    public.mi_rol() = 'admin'
    or (public.mi_rol() = 'editor'
        and exists (select 1 from public.perfil_fuentes pf where pf.user_id = auth.uid() and pf.fuente_id = f))
  )
$$;

create or replace function public.es_admin() returns boolean
language sql stable as $$ select public.mfa_ok() and public.mi_rol() = 'admin' $$;

alter table public.fuentes enable row level security;
alter table public.perfiles enable row level security;
alter table public.perfil_fuentes enable row level security;
alter table public.importaciones enable row level security;
alter table public.filtros_guardados enable row level security;
alter table public.aplicaciones enable row level security;

create policy leads_sel on public.leads for select to authenticated using (public.puede_ver_fuente(fuente_id));
create policy leads_ins on public.leads for insert to authenticated with check (public.puede_editar_fuente(fuente_id));
create policy leads_upd on public.leads for update to authenticated
  using (public.puede_editar_fuente(fuente_id)) with check (public.puede_editar_fuente(fuente_id));
create policy leads_del on public.leads for delete to authenticated using (public.es_admin());

create policy fuentes_sel on public.fuentes for select to authenticated using (public.puede_ver_fuente(id));
create policy fuentes_adm on public.fuentes for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy perfiles_sel on public.perfiles for select to authenticated using (user_id = auth.uid() or public.es_admin());
create policy perfiles_adm on public.perfiles for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy pf_sel on public.perfil_fuentes for select to authenticated using (user_id = auth.uid() or public.es_admin());
create policy pf_adm on public.perfil_fuentes for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy imp_sel on public.importaciones for select to authenticated using (public.puede_ver_fuente(fuente_id));
create policy imp_ins on public.importaciones for insert to authenticated
  with check (user_id = auth.uid() and public.puede_editar_fuente(fuente_id));

create policy fg_own on public.filtros_guardados for all to authenticated
  using (user_id = auth.uid() and public.mfa_ok()) with check (user_id = auth.uid() and public.mfa_ok());

create policy apps_adm on public.aplicaciones for all to authenticated using (public.es_admin()) with check (public.es_admin());

revoke all on public.leads, public.fuentes, public.perfiles, public.perfil_fuentes,
  public.importaciones, public.filtros_guardados, public.aplicaciones, public.api_leads from anon;
-- Postgres/Supabase otorga por defecto TRUNCATE/REFERENCES/TRIGGER (además de
-- SELECT/INSERT/UPDATE/DELETE) a `authenticated` en tablas nuevas de public.
-- TRUNCATE ignora RLS por completo, así que sin este revoke cualquier usuario
-- autenticado (incluso sin 2FA) podría vaciar `leads` con `truncate ... cascade`.
revoke all on public.leads, public.fuentes, public.perfiles, public.perfil_fuentes,
  public.importaciones, public.filtros_guardados, public.aplicaciones from authenticated;
grant select, insert, update, delete on public.leads, public.fuentes, public.perfiles, public.perfil_fuentes,
  public.filtros_guardados, public.aplicaciones to authenticated;
grant select, insert on public.importaciones to authenticated;
revoke all on public.api_leads from authenticated;
