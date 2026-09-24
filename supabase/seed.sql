-- Solo para el stack local: simula la data de producción antes de la migración.
-- Ojo: se ejecuta DESPUÉS de todas las migraciones en `supabase db reset`, por
-- eso el test de migración (Step 2) inserta su propia data dentro de la
-- transacción en vez de depender de este seed.
insert into public.fuentes (nombre, slug, tipo) values ('Demo local', 'demo-local', 'importacion')
on conflict do nothing;

-- Usuario admin local (Task 8): admin@local.test / Admin12345! — solo stack local.
-- Los *_token se fijan en '' (no NULL): el GoTrue local de esta versión hace un
-- Scan de esas columnas como string y truena con NULL ("converting NULL to
-- string is unsupported"). El bloque del brief no lo tenía; ajuste mecánico.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
)
values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@local.test',
  extensions.crypt('Admin12345!', extensions.gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', '', '', ''
)
on conflict (email) where is_sso_user = false do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
select gen_random_uuid(), id, json_build_object('sub', id::text, 'email', email), 'email', id::text, now(), now()
from auth.users where email = 'admin@local.test'
on conflict (provider_id, provider) do nothing;

insert into public.perfiles (user_id, nombre, rol)
select id, 'Admin local', 'admin' from auth.users where email = 'admin@local.test'
on conflict (user_id) do nothing;
