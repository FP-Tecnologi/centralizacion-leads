-- CMS de landings: cada fuente tipo 'landing' puede tener una página propia
-- (plantilla + contenido editable) que la app sirve en /l/<slug>.
--
--   landing_paginas   1 fila por fuente: plantilla (id del catálogo en código,
--                     src/lib/landings/plantillas.ts), contenido jsonb (textos,
--                     colores, logos) y si está publicada.
--
-- Quién puede qué:
--   ver          quien ve la fuente (puede_ver_fuente)
--   editar       superadmin/admin y el editor asignado a la fuente (puede_editar_fuente)
--   publicar     solo superadmin/admin (trigger _landing_paginas_antes)
--   borrar       solo superadmin/admin
--   anónimo      solo landing_publica(slug): landings publicadas, columnas públicas
--
-- El formulario (fuentes.campos) y el correo (fuentes.correo_gracias) siguen
-- viviendo en `fuentes` (ingresar-lead y send-thank-you los leen de ahí). Como
-- fuentes_adm deja escribir `fuentes` solo a admins, guardar_landing (security
-- definer) permite al editor de la fuente tocar SOLO esas dos columnas.
--
-- No depende de 20260929000000_superadmin_usuarios: usa es_admin() y
-- puede_editar_fuente(), que esa migración redefine para incluir superadmin.

create table public.landing_paginas (
  fuente_id uuid primary key references public.fuentes on delete cascade,
  plantilla text not null default 'evento' check (plantilla ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  contenido jsonb not null default '{}'::jsonb
    check (jsonb_typeof(contenido) = 'object' and pg_column_size(contenido) < 262144),
  publicada boolean not null default false,
  publicada_en timestamptz,
  actualizado_por uuid default auth.uid() references auth.users on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create or replace function public._landing_paginas_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_publicada_antes boolean := case when tg_op = 'INSERT' then false else old.publicada end;
begin
  if (select tipo from fuentes where id = new.fuente_id) is distinct from 'landing' then
    raise exception 'solo_landings' using errcode = '22023';
  end if;
  -- Con sesión de usuario (PostgREST o RPC), publicar/despublicar es solo de admins.
  -- Sin auth.uid() (SQL editor, service_role) no se aplica.
  if auth.uid() is not null and new.publicada is distinct from v_publicada_antes and not public.es_admin() then
    raise exception 'sin_permiso_publicar' using errcode = '42501';
  end if;
  if new.publicada and not v_publicada_antes then
    new.publicada_en := now();
  end if;
  if tg_op = 'UPDATE' then
    new.fuente_id := old.fuente_id;
    new.creado_en := old.creado_en;
  end if;
  new.actualizado_en := now();
  new.actualizado_por := coalesce(auth.uid(), new.actualizado_por);
  return new;
end $$;

create trigger trg_landing_paginas_antes before insert or update on public.landing_paginas
  for each row execute function public._landing_paginas_antes();

alter table public.landing_paginas enable row level security;

create policy lp_sel on public.landing_paginas for select to authenticated
  using (public.puede_ver_fuente(fuente_id));
create policy lp_ins on public.landing_paginas for insert to authenticated
  with check (public.puede_editar_fuente(fuente_id));
create policy lp_upd on public.landing_paginas for update to authenticated
  using (public.puede_editar_fuente(fuente_id)) with check (public.puede_editar_fuente(fuente_id));
create policy lp_del on public.landing_paginas for delete to authenticated
  using (public.es_admin());

-- Mismo criterio que 20260923000002_rls.sql: sin TRUNCATE/REFERENCES/TRIGGER
-- implícitos, y nada para anon (lo público pasa por landing_publica).
revoke all on public.landing_paginas from anon, authenticated;
grant select, insert, update, delete on public.landing_paginas to authenticated;

-- Validación mínima de `campos` en el servidor (el editor ya valida lo mismo).
create or replace function public._campos_validos(p jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p) = 'array'
    and jsonb_array_length(p) <= 60
    and not exists (
      select 1 from jsonb_array_elements(p) c
      where jsonb_typeof(c) <> 'object'
         or coalesce(c ->> 'key', '') !~ '^[a-z0-9_]+$'
         or coalesce(c ->> 'tipo', '') not in ('texto', 'email', 'telefono', 'fecha', 'numero', 'opcion', 'documento')
         or jsonb_typeof(c -> 'requerido') is distinct from 'boolean'
    )
    and (select count(distinct c ->> 'key') from jsonb_array_elements(p) c) = jsonb_array_length(p)
$$;

-- Guarda todo lo que edita el asistente de landings en una transacción.
create or replace function public.guardar_landing(
  p_fuente uuid, p_plantilla text, p_contenido jsonb, p_campos jsonb, p_correo jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.puede_editar_fuente(p_fuente) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if not public._campos_validos(p_campos) then
    raise exception 'campos_invalidos' using errcode = '22023';
  end if;
  if p_correo is not null and jsonb_typeof(p_correo) <> 'object' then
    raise exception 'correo_invalido' using errcode = '22023';
  end if;

  insert into landing_paginas (fuente_id, plantilla, contenido)
  values (p_fuente, p_plantilla, p_contenido)
  on conflict (fuente_id) do update set plantilla = excluded.plantilla, contenido = excluded.contenido;

  update fuentes set campos = p_campos, correo_gracias = coalesce(p_correo, correo_gracias)
  where id = p_fuente;
end $$;

-- Lectura pública para /l/<slug>. Solo landings publicadas y solo lo que la
-- página necesita mostrar: nunca clave_hash ni correo_gracias.
create or replace function public.landing_publica(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'slug', f.slug, 'nombre', f.nombre, 'estado', f.estado,
    'plantilla', p.plantilla, 'contenido', p.contenido, 'campos', f.campos)
  from fuentes f
  join landing_paginas p on p.fuente_id = f.id
  where f.slug = p_slug and f.tipo = 'landing' and p.publicada
$$;

-- duplicar_fuente (20260923000003) ahora también copia la página, sin publicar.
create or replace function public.duplicar_fuente(p_fuente uuid, p_nombre text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.es_admin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  insert into fuentes (nombre, slug, tipo, dominio, campos, correo_gracias)
  select p_nombre, p_slug, tipo, dominio, campos, correo_gracias from fuentes where id = p_fuente
  returning id into v_id;
  insert into landing_paginas (fuente_id, plantilla, contenido)
  select v_id, plantilla, contenido from landing_paginas where fuente_id = p_fuente;
  return v_id;
end $$;

revoke execute on function public._landing_paginas_antes() from public, anon, authenticated;
revoke execute on function public.guardar_landing(uuid, text, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.landing_publica(text) from public;
revoke execute on function public.duplicar_fuente(uuid, text, text) from public, anon;
grant execute on function public.guardar_landing(uuid, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.landing_publica(text) to anon, authenticated;
grant execute on function public.duplicar_fuente(uuid, text, text) to authenticated;
