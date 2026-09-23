-- Ejecutar en Supabase: Dashboard > SQL Editor > New query > pegar todo > Run.

create extension if not exists "pgcrypto";

create type lead_status as enum ('nuevo', 'contactado', 'asistio', 'descartado');

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombres text not null,
  apellido text not null,
  cargo text not null,
  ruc text not null,
  empresa text not null,
  rubro text not null,
  telefono text not null,
  email text not null,
  origen text not null default 'landing-registro-expomina',
  status lead_status not null default 'nuevo'
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (email);

alter table public.leads enable row level security;

-- El formulario público (rol "anon") solo puede insertar, nunca leer/editar/borrar.
create policy "Público puede registrar su asistencia"
  on public.leads for insert
  to anon
  with check (true);

-- Solo usuarios autenticados (equipo FP Tecnologi) pueden ver y administrar los leads.
create policy "Autenticados pueden ver leads"
  on public.leads for select
  to authenticated
  using (true);

create policy "Autenticados pueden actualizar leads"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);

create policy "Autenticados pueden borrar leads"
  on public.leads for delete
  to authenticated
  using (true);

-- RLS solo filtra FILAS; Postgres además exige el permiso base de TABLA
-- (GRANT) para el rol. Sin esto, el INSERT falla con 42501 aunque la
-- política de arriba exista.
grant usage on schema public to anon, authenticated;
grant insert on public.leads to anon;
grant select, update, delete on public.leads to authenticated;

-- ---------------------------------------------------------------------------
-- Notifica a la Edge Function "send-thank-you" cada vez que se registra un lead.
-- Requiere: Database Webhooks (Supabase Dashboard > Database > Webhooks) o el
-- trigger + pg_net de abajo. Se deja el trigger comentado como referencia; la
-- forma recomendada es crear el webhook desde el Dashboard apuntando a la URL
-- de la función desplegada, evento INSERT en la tabla "leads".
-- ---------------------------------------------------------------------------

-- Crea aquí los usuarios del panel admin (Authentication > Users > Add user)
-- con su email y contraseña; no necesitan una fila adicional en esta tabla.
-- Ya corriste schema.sql antes (tabla "leads" ya existe). Corre esto en el
-- SQL Editor de Supabase para agregar la columna "apellido" sin perder datos.

alter table public.leads
  add column if not exists apellido text not null default '';

alter table public.leads
  alter column apellido drop default;
-- Las políticas RLS solo filtran FILAS; Postgres también exige permisos base
-- a nivel de TABLA (GRANT) para el rol que hace la operación. Como creamos
-- "leads" con SQL crudo (no con el editor de tablas de Supabase), esos GRANT
-- nunca se aplicaron — por eso el INSERT del formulario público seguía
-- fallando con 42501 aunque la política de RLS para "anon" ya existía.

grant usage on schema public to anon, authenticated;

grant insert on public.leads to anon;
grant select, update, delete on public.leads to authenticated;

-- Las columnas autogeneradas (id, created_at, status) usan gen_random_uuid()
-- y default now()/'nuevo', así que anon no necesita permiso de secuencia.
-- Evita registros duplicados del mismo correo (sin importar mayúsculas).
-- Segura de correr en cualquier momento: no depende del Edge Function.

create unique index if not exists leads_email_unique_idx
  on public.leads (lower(email));
-- IMPORTANTE: correr esta migración SOLO después de confirmar que la Edge
-- Function "register-lead" está desplegada y funcionando (el formulario
-- público ya no inserta directo con la anon key, pasa por esa función con
-- la service_role key). Si la corres antes, el formulario público se
-- rompe: 42501 en cada intento de registro.

drop policy if exists "Público puede registrar su asistencia" on public.leads;
revoke insert on public.leads from anon;
-- Dispara la Edge Function "send-thank-you" cada vez que se inserta un lead,
-- sin depender de configurarlo a mano en Dashboard > Database > Webhooks.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_thank_you_email()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  perform net.http_post(
    url := 'https://qpjxwtvmuqramhqoxkxj.supabase.co/functions/v1/send-thank-you',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('type', 'INSERT', 'table', 'leads', 'record', row_to_json(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_thank_you_email on public.leads;
create trigger trg_notify_thank_you_email
  after insert on public.leads
  for each row execute function public.notify_thank_you_email();
-- Guarda el user-agent del navegador para poder ver de qué dispositivo
-- (móvil / escritorio / tablet) se registró cada visitante.
alter table public.leads add column if not exists user_agent text;
-- Permite volver a registrarse con el mismo correo (ya no hay límite de una
-- sola vez): se quita el índice único de la migración 004.
drop index if exists public.leads_email_unique_idx;

-- Distingue de qué evento/campaña viene cada lead, para poder filtrar y
-- graficar por separado en el dashboard cuando conviven registros de más
-- de un evento. Los leads existentes quedan con el evento original; los
-- nuevos usan el valor que envíe la Edge Function register-lead (constante
-- CURRENT_EVENT ahí — se actualiza a mano cada vez que hay un evento nuevo).
alter table public.leads add column if not exists evento text not null default 'EXPOMINA Perú 2026';

alter table public.leads add column if not exists fecha_nacimiento date;
