-- Solo para el stack local: simula la data de producción antes de la migración.
-- Ojo: se ejecuta DESPUÉS de todas las migraciones en `supabase db reset`, por
-- eso el test de migración (Step 2) inserta su propia data dentro de la
-- transacción en vez de depender de este seed.
insert into public.fuentes (nombre, slug, tipo) values ('Demo local', 'demo-local', 'importacion')
on conflict do nothing;
