begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@t.com'),
  ('00000000-0000-0000-0000-00000000000c', 'lector@t.com');
insert into public.perfiles (user_id, rol) values
  ('00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'lector');
insert into public.fuentes (id, nombre, slug, tipo) values
  ('20000000-0000-0000-0000-000000000002', 'Col', 'col', 'importacion');

-- upsert_lead auto-registra las claves válidas de `extra`, ignora las inválidas.
select public.upsert_lead(
  '20000000-0000-0000-0000-000000000002',
  '{"email":"a@x.com","extra":{"ciudad":"Lima","bad key":"x"}}'
);
select ok(exists(select 1 from public.columnas_extra where key = 'ciudad'), 'upsert_lead registra ciudad');
select ok(not exists(select 1 from public.columnas_extra where key = 'bad key'), 'clave invalida "bad key" no se registra');

-- un admin ya puso un label a mano en "presupuesto": registrar_columnas no debe pisarlo.
insert into public.columnas_extra (key, label) values ('presupuesto', 'Presupuesto asignado');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","aal":"aal2","role":"authenticated"}', true);

select public.registrar_columnas(
  '[{"key":"ciudad","label":"Ciudad","tipo":"texto"},{"key":"presupuesto","label":"Otro label","tipo":"numero"}]'::jsonb
);
select is((select label from public.columnas_extra where key = 'ciudad'), 'Ciudad', 'registrar_columnas mejora label cuando label == key');
select is((select label from public.columnas_extra where key = 'presupuesto'), 'Presupuesto asignado', 'registrar_columnas no pisa un label puesto a mano');
select is((select tipo from public.columnas_extra where key = 'presupuesto'), 'numero', 'registrar_columnas mejora tipo texto -> numero');

select throws_ok(
  $$ select public.registrar_columnas('[{"key":"email","label":"Correo","tipo":"texto"}]'::jsonb) $$,
  null, null,
  'una clave nucleo (email) no se puede registrar'
);

select ok(
  exists(select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'leads_completo' and column_name = 'ciudad'),
  'leads_completo tiene una columna ciudad tras el registro'
);
select is((select ciudad from public.leads_completo where email = 'a@x.com'), 'Lima', 'leads_completo expone el valor tipado');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","aal":"aal2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.registrar_columnas('[{"key":"otra","label":"Otra","tipo":"texto"}]'::jsonb) $$,
  '42501',
  null,
  'lector no puede llamar registrar_columnas'
);

reset role;
set local role anon;
select throws_ok(
  $$ select 1 from public.columnas_extra $$,
  null, null,
  'anon no puede seleccionar columnas_extra'
);

select * from finish();
rollback;
