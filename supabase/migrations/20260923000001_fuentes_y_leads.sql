create extension if not exists pgcrypto with schema extensions;

-- Ya no se manda correo en cada INSERT (una importación mandaría miles).
-- Lo hace ingresar-lead solo para leads nuevos de fuentes con correo activo.
drop trigger if exists trg_notify_thank_you_email on public.leads;
drop function if exists public.notify_thank_you_email();

create table public.fuentes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo text not null check (tipo in ('landing', 'offline', 'importacion')),
  dominio text,
  estado text not null default 'activa' check (estado in ('activa', 'cerrada')),
  campos jsonb not null default '[]'::jsonb,
  clave_hash text,
  correo_gracias jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.perfiles (
  user_id uuid primary key references auth.users on delete cascade,
  nombre text not null default '',
  rol text not null default 'lector' check (rol in ('admin', 'editor', 'lector')),
  creado_en timestamptz not null default now()
);

create table public.perfil_fuentes (
  user_id uuid not null references public.perfiles on delete cascade,
  fuente_id uuid not null references public.fuentes on delete cascade,
  primary key (user_id, fuente_id)
);

create table public.importaciones (
  id uuid primary key default gen_random_uuid(),
  fuente_id uuid not null references public.fuentes on delete cascade,
  user_id uuid not null references auth.users,
  archivo text not null,
  nuevas int not null default 0,
  actualizadas int not null default 0,
  errores int not null default 0,
  creado_en timestamptz not null default now()
);

create table public.filtros_guardados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  definicion jsonb not null,
  creado_en timestamptz not null default now()
);

create table public.aplicaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  clave_hash text not null unique,
  permisos text[] not null default array['leer'] check (permisos <@ array['leer', 'escribir']),
  fuentes uuid[],               -- null = todas las fuentes
  webhook_url text,
  activa boolean not null default true,
  ultimo_uso timestamptz,
  creado_en timestamptz not null default now()
);

-- Columnas nuevas en leads. Las núcleo antiguas pasan a nullable: un Excel
-- importado o una landing nueva no siempre trae cargo/rubro/RUC.
alter table public.leads
  add column fuente_id uuid references public.fuentes,
  add column extra jsonb not null default '{}'::jsonb,
  add column actualizado_en timestamptz not null default now(),
  add column duplicado_de uuid references public.leads,
  add column id_externo text,
  alter column nombres drop not null,
  alter column apellido drop not null,
  alter column cargo drop not null,
  alter column ruc drop not null,
  alter column empresa drop not null,
  alter column rubro drop not null,
  alter column telefono drop not null,
  alter column email drop not null,
  alter column origen set default 'dashboard';

create or replace function public.tocar_actualizado_en() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger trg_leads_actualizado before update on public.leads
  for each row execute function public.tocar_actualizado_en();
create trigger trg_fuentes_actualizado before update on public.fuentes
  for each row execute function public.tocar_actualizado_en();

create or replace function public.slugify(t text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(translate(t, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- Campos del formulario actual de Expomina (register-lead).
create or replace function public._campos_expomina() returns jsonb
language sql immutable as $$
  select '[
    {"key":"nombres","label":"Nombres","tipo":"texto","requerido":true},
    {"key":"apellido","label":"Apellido","tipo":"texto","requerido":true},
    {"key":"cargo","label":"Cargo","tipo":"texto","requerido":true},
    {"key":"ruc","label":"RUC / DNI","tipo":"documento","requerido":true},
    {"key":"empresa","label":"Empresa","tipo":"texto","requerido":false},
    {"key":"rubro","label":"Rubro","tipo":"texto","requerido":true},
    {"key":"telefono","label":"Teléfono","tipo":"telefono","requerido":true},
    {"key":"email","label":"Correo","tipo":"email","requerido":true},
    {"key":"fecha_nacimiento","label":"Fecha de nacimiento","tipo":"fecha","requerido":false}
  ]'::jsonb
$$;

-- Idempotente: se puede correr de nuevo sin efectos extra.
create or replace function public._backfill_fuentes() returns void
language plpgsql as $$
begin
  insert into public.fuentes (nombre, slug, tipo, dominio, campos)
  select distinct l.evento, public.slugify(l.evento), 'landing', 'registro.fptecnologi.com', public._campos_expomina()
  from public.leads l
  where l.fuente_id is null
  on conflict (slug) do nothing;

  update public.leads l set fuente_id = f.id
  from public.fuentes f
  where l.fuente_id is null and f.slug = public.slugify(l.evento);

  -- Mismo email en la misma fuente: el más reciente queda principal.
  with ranked as (
    select id, first_value(id) over (
      partition by fuente_id, lower(email) order by created_at desc, id desc) as principal
    from public.leads
    where email is not null and email <> ''
  )
  update public.leads l set duplicado_de = r.principal
  from ranked r
  where l.id = r.id and r.principal <> l.id and l.duplicado_de is distinct from r.principal;
end $$;

select public._backfill_fuentes();

alter table public.leads alter column fuente_id set not null;

create unique index leads_fuente_email_uq on public.leads (fuente_id, lower(email))
  where duplicado_de is null and email is not null and email <> '';
create unique index leads_fuente_id_externo_uq on public.leads (fuente_id, id_externo)
  where id_externo is not null;
create index leads_fuente_created_idx on public.leads (fuente_id, created_at desc);
create index leads_status_idx on public.leads (status);
create index leads_extra_gin on public.leads using gin (extra);
create index leads_actualizado_idx on public.leads (actualizado_en, id);

-- Contrato estable para apps externas (api-v1). Cambiar tablas internas
-- no debe cambiar esta vista sin versionar la API.
create view public.api_leads with (security_invoker = true) as
select l.id, f.slug as fuente, l.nombres, l.apellido, l.email, l.telefono, l.empresa,
       l.ruc, l.cargo, l.rubro, l.fecha_nacimiento, l.status::text as estado, l.extra,
       l.created_at as creado_en, l.actualizado_en
from public.leads l
join public.fuentes f on f.id = l.fuente_id
where l.duplicado_de is null;
