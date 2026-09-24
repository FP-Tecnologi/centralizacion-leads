begin;
select plan(20);

-- fix round 2: _fecha_segura/_numero_seguro exigen el patrón ISO/ASCII estricto antes de
-- castear — no solo capturan la excepción. Sin el patrón, Postgres (DateStyle ISO,MDY por
-- defecto) castea DD/MM/YYYY invirtiendo día y mes en vez de fallar, y acepta palabras
-- especiales como 'today'; '_numero_seguro' aceptaría notación científica.
select is(public._fecha_segura('01/02/2024'), null, '_fecha_segura rechaza no-ISO (evita el swap DD/MM con DateStyle MDY)');
select is(public._fecha_segura('today'), null, '_fecha_segura rechaza palabras especiales de Postgres (today/now)');
select is(public._numero_seguro('NaN'), null, '_numero_seguro rechaza NaN');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@t.com'),
  ('00000000-0000-0000-0000-00000000000c', 'lector@t.com');
insert into public.perfiles (user_id, rol) values
  ('00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'lector');
-- 'Col' declara "ciudad" en su propio formulario: upsert_lead solo auto-registra claves
-- que la fuente ya declara (fix round 1, CRITICAL 2d) — "presupuesto" NO está declarada,
-- así que llega a `extra` pero nunca a columnas_extra por esta vía.
insert into public.fuentes (id, nombre, slug, tipo, campos) values (
  '20000000-0000-0000-0000-000000000002', 'Col', 'col', 'importacion',
  '[{"key":"ciudad","label":"Ciudad","tipo":"texto","requerido":false}]'::jsonb
);

-- upsert_lead auto-registra solo claves declaradas y válidas; ignora las inválidas y las
-- no declaradas por la fuente.
select public.upsert_lead(
  '20000000-0000-0000-0000-000000000002',
  '{"email":"a@x.com","extra":{"ciudad":"Lima","bad key":"x","presupuesto":"100"}}'
);
select ok(exists(select 1 from public.columnas_extra where key = 'ciudad'), 'upsert_lead registra ciudad (declarada por la fuente)');
select ok(not exists(select 1 from public.columnas_extra where key = 'bad key'), 'clave invalida "bad key" no se registra');
select ok(not exists(select 1 from public.columnas_extra where key = 'presupuesto'), 'clave no declarada por la fuente no se auto-registra');

-- no hubo fila nueva en la segunda llamada (mismas claves) -> la vista no se reconstruye:
-- mismo OID antes y después.
select 'public.leads_completo'::regclass::oid as oid_antes \gset
select public.upsert_lead(
  '20000000-0000-0000-0000-000000000002',
  '{"email":"a@x.com","extra":{"ciudad":"Cusco"}}'
);
select is('public.leads_completo'::regclass::oid, :'oid_antes'::oid, 'sin claves nuevas, la vista no se reconstruye (mismo OID)');

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
  '23514',
  null,
  'una clave nucleo (email) no se puede registrar'
);
select throws_ok(
  $$ select public.registrar_columnas('[{"key":"fuente_slug","label":"x","tipo":"texto"}]'::jsonb) $$,
  '23514',
  null,
  'fuente_slug (columna reservada de la vista) no se puede registrar'
);
select throws_ok(
  $$ select public.registrar_columnas(jsonb_build_array(jsonb_build_object(
       'key', repeat('a', 64), 'label', 'x', 'tipo', 'texto'))) $$,
  '23514',
  null,
  'una clave de 64+ caracteres no se puede registrar'
);

-- fecha de calendario invalida y numero con digitos Unicode: la vista no debe tirar, y
-- el valor sale null.
select public.registrar_columnas('[{"key":"visita","label":"Visita","tipo":"fecha"},{"key":"monto","label":"Monto","tipo":"numero"}]'::jsonb);
-- upsert_lead está revocado para `authenticated` (solo lo llaman funciones security
-- definer como importar_leads, o el service_role de la edge function): se vuelve al rol
-- de la sesión de test para poder llamarlo directo, como en funciones.test.sql.
reset role;
select public.upsert_lead(
  '20000000-0000-0000-0000-000000000002',
  '{"email":"b@x.com","extra":{"visita":"2024-02-30","monto":"١٢٣"}}'
);
select lives_ok(
  $$ select visita, monto from public.leads_completo where email = 'b@x.com' $$,
  'leads_completo sigue siendo legible con fecha de calendario invalida / digitos Unicode'
);
select is((select visita from public.leads_completo where email = 'b@x.com'), null, 'fecha de calendario invalida (2024-02-30) sale null, no tira la vista');
select is((select monto from public.leads_completo where email = 'b@x.com'), null, 'numero con digitos Unicode (no ASCII) sale null, no tira la vista');

select ok(
  exists(select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'leads_completo' and column_name = 'ciudad'),
  'leads_completo tiene una columna ciudad tras el registro'
);
select is((select ciudad from public.leads_completo where email = 'a@x.com'), 'Cusco', 'leads_completo expone el valor tipado');

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
  '42501',
  null,
  'anon no puede seleccionar columnas_extra'
);

select * from finish();
rollback;
