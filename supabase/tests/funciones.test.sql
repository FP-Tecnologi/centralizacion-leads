begin;
select plan(12);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'admin@t.com');
insert into public.perfiles (user_id, rol) values ('00000000-0000-0000-0000-00000000000a', 'admin');
insert into public.fuentes (id, nombre, slug, tipo) values ('20000000-0000-0000-0000-000000000001', 'Imp', 'imp', 'importacion');

select is(public.upsert_lead('20000000-0000-0000-0000-000000000001', '{"email":"X@y.com","nombres":"Ana","extra":{"ciudad":"Lima"}}'), 'nueva', 'primer upsert crea');
select is(public.upsert_lead('20000000-0000-0000-0000-000000000001', '{"email":"x@Y.com","cargo":"Jefe","extra":{"talla":"M"}}'), 'actualizada', 'mismo email misma fuente actualiza');
select is((select extra from public.leads where lower(email) = 'x@y.com'), '{"ciudad":"Lima","talla":"M"}'::jsonb, 'extra se fusiona');
select is((select nombres from public.leads where lower(email) = 'x@y.com'), 'Ana', 'campos no enviados se conservan');

select throws_ok(
  $$ select public.upsert_lead('20000000-0000-0000-0000-000000000001', '{}'::jsonb) $$,
  'fila_sin_contacto',
  'upsert_lead rechaza fila vacía (sin email/telefono/id_externo)');
select is(public.upsert_lead('20000000-0000-0000-0000-000000000001', '{"telefono":"987654321"}'), 'nueva', 'lead solo con teléfono es válido (no exige email)');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","aal":"aal2","role":"authenticated"}', true);

create temp table t_import as
  select public.importar_leads('20000000-0000-0000-0000-000000000001',
     '[{"email":"n1@y.com"},{"email":"x@y.com","rubro":"Minería"},{"fecha_nacimiento":"no-es-fecha","email":"e@y.com"},{}]',
     'a.xlsx') as j;

select is((select j from t_import) - 'errores', '{"nuevas":1,"actualizadas":1}'::jsonb, 'importar cuenta nuevas/actualizadas');
select ok(
  exists(select 1 from t_import, jsonb_array_elements(j -> 'errores') e
         where (e ->> 'fila')::int = 4 and e ->> 'motivo' = 'fila_sin_contacto'),
  'fila vacía del archivo aparece en errores y no cuenta como nueva');
select is((select count(*)::int from public.importaciones), 1, 'importación registrada');
select ok((public.dashboard_resumen() ->> 'total')::int >= 2, 'dashboard devuelve total');

select ok(public.regenerar_clave_fuente('20000000-0000-0000-0000-000000000001') like 'pub\_%', 'clave con prefijo pub_');

set local role anon;
select throws_ok(
  $$ select public.importar_leads('20000000-0000-0000-0000-000000000001'::uuid, '[]'::jsonb, 'x') $$,
  '42501',
  null,
  'anon no puede ejecutar importar_leads'
);

select * from finish();
rollback;
