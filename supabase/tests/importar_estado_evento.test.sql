begin;
select plan(14);

insert into public.fuentes (id, nombre, slug, tipo) values ('20000000-0000-0000-0000-000000000009', 'Imp', 'imp', 'importacion');

-- estado, evento y fecha de registro del archivo van a su columna real al crear.
select is(public.upsert_lead('20000000-0000-0000-0000-000000000009',
  '{"email":"a@x.com","status":"contactado","evento":"Semana Geo","created_at":"2026-09-16"}'), 'nueva', 'crea con estado/evento/fecha');
select is((select status::text from public.leads where email = 'a@x.com'), 'contactado', 'status desde el archivo');
select is((select evento from public.leads where email = 'a@x.com'), 'Semana Geo', 'evento desde el archivo');
select is((select (created_at at time zone 'America/Lima')::date from public.leads where email = 'a@x.com'), '2026-09-16'::date,
  'created_at = día del archivo en hora de Lima');

-- reimportar no retrocede un estado ya avanzado ni cambia la fecha de registro.
select public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"email":"a@x.com","status":"nuevo","created_at":"2026-01-01"}');
select is((select status::text from public.leads where email = 'a@x.com'), 'contactado', 'no pisa un estado ya avanzado');
select is((select (created_at at time zone 'America/Lima')::date from public.leads where email = 'a@x.com'), '2026-09-16'::date,
  'created_at no cambia al actualizar');

-- sin esas claves (ingresar-lead) todo sigue igual que antes.
select public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"email":"b@x.com"}');
select is((select status::text from public.leads where email = 'b@x.com'), 'nuevo', 'sin status: nuevo');

select throws_ok(
  $$ select public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"email":"c@x.com","status":"ganado"}') $$,
  'estado_invalido', 'estado fuera del enum se rechaza');
select throws_ok(
  $$ select public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"email":"c@x.com","created_at":"16/09/2026"}') $$,
  'fecha_registro_invalida', 'fecha de registro no ISO se rechaza');

-- mismo correo en otro evento = otro lead; en el mismo evento, se actualiza.
select is(public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"email":"a@x.com","evento":"Otro evento"}'), 'nueva',
  'mismo correo en otro evento crea otro lead');
select is(public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"email":"a@x.com","evento":"Semana Geo"}'), 'actualizada',
  'mismo correo y mismo evento actualiza');

-- datos marcados: se guardan y se limpian cuando el campo llega bien.
select public.upsert_lead('20000000-0000-0000-0000-000000000009',
  '{"email":"d@x.com","telefono":"123","invalidos":{"telefono":{"valor":"123","causa":"corto"},"fecha_nacimiento":{"valor":"31/02/1980","causa":"imposible"}}}');
select is((select invalidos ? 'fecha_nacimiento' from public.leads where email = 'd@x.com'), true, 'marca de fecha imposible guardada');
select public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"email":"d@x.com","telefono":"987654321"}');
select is((select invalidos ? 'telefono' from public.leads where email = 'd@x.com'), false, 'teléfono corregido deja de estar marcado');

-- importación sin contacto: se guarda (marcada en el cliente); un envío normal sigue rechazándose.
select is(public.upsert_lead('20000000-0000-0000-0000-000000000009', '{"nombres":"Solo","_importacion":true}'), 'nueva',
  'fila importada sin contacto se guarda');

select * from finish();
rollback;
