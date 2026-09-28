-- Módulo Usuarios: rol superadmin y reglas de quién gestiona a quién.
--
--   superadmin  todo lo de admin + es el único que crea, cambia o quita admins/superadmins.
--   admin       ve y edita todas las fuentes; gestiona solo editores y lectores.
--   editor      importa y edita leads de sus fuentes asignadas.
--   lector      solo ve (y exporta) sus fuentes asignadas.
--
-- Las altas/bajas de cuentas (auth.users) las hace la Edge Function admin-usuarios con
-- service_role; aquí se protege `perfiles` contra escrituras directas por PostgREST
-- (perfiles_adm deja escribir a cualquier admin) para que un admin no pueda
-- promoverse ni tocar a otro admin/superadmin por fuera de la función.

alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol in ('superadmin', 'admin', 'editor', 'lector'));

create or replace function public.puede_ver_fuente(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and (
    public.mi_rol() in ('superadmin', 'admin')
    or exists (select 1 from public.perfil_fuentes pf where pf.user_id = auth.uid() and pf.fuente_id = f)
  )
$$;

create or replace function public.puede_editar_fuente(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mfa_ok() and (
    public.mi_rol() in ('superadmin', 'admin')
    or (public.mi_rol() = 'editor'
        and exists (select 1 from public.perfil_fuentes pf where pf.user_id = auth.uid() and pf.fuente_id = f))
  )
$$;

create or replace function public.es_admin() returns boolean
language sql stable as $$ select public.mfa_ok() and public.mi_rol() in ('superadmin', 'admin') $$;

create or replace function public.es_superadmin() returns boolean
language sql stable as $$ select public.mfa_ok() and public.mi_rol() = 'superadmin' $$;

drop policy if exists columnas_extra_ins on public.columnas_extra;
create policy columnas_extra_ins on public.columnas_extra for insert to authenticated
  with check (public.mfa_ok() and public.mi_rol() in ('superadmin', 'admin', 'editor'));

-- create or replace de registrar_columnas (20260928000000): solo cambia el chequeo de rol.
create or replace function public.registrar_columnas(p jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_item jsonb;
  v_total int;
begin
  if not (public.mfa_ok() and public.mi_rol() in ('superadmin', 'admin', 'editor')) then
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

-- Escrituras directas a `perfiles` con sesión de usuario. Sin auth.uid() (service_role de
-- la Edge Function o el SQL editor) no se aplica: la función valida sus propias reglas.
create or replace function public._proteger_perfiles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if public.mi_rol() = 'superadmin' then
    if tg_op <> 'INSERT' and old.user_id = auth.uid() and (tg_op = 'DELETE' or new.rol <> 'superadmin') then
      raise exception 'no_puedes_quitarte_superadmin' using errcode = '42501';
    end if;
    return coalesce(new, old);
  end if;
  if (tg_op <> 'INSERT' and old.rol in ('superadmin', 'admin'))
     or (tg_op <> 'DELETE' and new.rol in ('superadmin', 'admin')) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_proteger_perfiles on public.perfiles;
create trigger trg_proteger_perfiles before insert or update or delete on public.perfiles
  for each row execute function public._proteger_perfiles();

-- Eliminar una cuenta no debe fallar por su historial de importaciones: se conserva el
-- registro de la importación sin autor.
alter table public.importaciones alter column user_id drop not null;
alter table public.importaciones drop constraint if exists importaciones_user_id_fkey;
alter table public.importaciones add constraint importaciones_user_id_fkey
  foreign key (user_id) references auth.users on delete set null;
