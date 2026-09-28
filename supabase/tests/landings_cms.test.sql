-- pgTAP: CMS de landings (20260930000000_landings_cms.sql).
begin;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000001a', 'admin-cms@t.com'),
  ('00000000-0000-0000-0000-00000000001e', 'editor-cms@t.com'),
  ('00000000-0000-0000-0000-00000000001c', 'lector-cms@t.com');
insert into public.perfiles (user_id, rol) values
  ('00000000-0000-0000-0000-00000000001a', 'admin'),
  ('00000000-0000-0000-0000-00000000001e', 'editor'),
  ('00000000-0000-0000-0000-00000000001c', 'lector');
insert into public.fuentes (id, nombre, slug, tipo) values
  ('20000000-0000-0000-0000-000000000001', 'L1', 'cms-l1', 'landing'),
  ('20000000-0000-0000-0000-000000000002', 'L2', 'cms-l2', 'landing'),
  ('20000000-0000-0000-0000-000000000003', 'O1', 'cms-o1', 'offline');
insert into public.perfil_fuentes values
  ('00000000-0000-0000-0000-00000000001e', '20000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000001c', '20000000-0000-0000-0000-000000000001');

create function pg_temp.como(uid text, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'aal', aal, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- editor asignado: guarda contenido + formulario de su landing
select pg_temp.como('00000000-0000-0000-0000-00000000001e', 'aal2');
select lives_ok($$ select public.guardar_landing('20000000-0000-0000-0000-000000000001', 'evento',
  '{"hero":{"titulo":"Hola"}}', '[{"key":"email","label":"Correo","tipo":"email","requerido":true}]',
  '{"activo":false}') $$, 'editor guarda su landing');
select is((select contenido #>> '{hero,titulo}' from public.landing_paginas where fuente_id = '20000000-0000-0000-0000-000000000001'),
  'Hola', 'el contenido quedó guardado');
select is((select campos -> 0 ->> 'key' from public.fuentes where id = '20000000-0000-0000-0000-000000000001'),
  'email', 'los campos quedaron en fuentes');
select throws_ok($$ select public.guardar_landing('20000000-0000-0000-0000-000000000002', 'evento', '{}', '[]', null) $$,
  '42501', null, 'editor no guarda una landing ajena');
select throws_ok($$ select public.guardar_landing('20000000-0000-0000-0000-000000000001', 'evento', '{}',
  '[{"key":"Mal Key","label":"x","tipo":"texto","requerido":false}]', null) $$,
  '22023', null, 'claves de campo inválidas se rechazan');
select throws_ok($$ update public.landing_paginas set publicada = true where fuente_id = '20000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'editor no puede publicar');
select throws_ok($$ insert into public.landing_paginas (fuente_id, plantilla) values ('20000000-0000-0000-0000-000000000002', 'evento') $$,
  '42501', null, 'editor no crea página en fuente ajena');

-- lector: ve la página de su fuente pero no la edita
select pg_temp.como('00000000-0000-0000-0000-00000000001c', 'aal2');
select is((select count(*)::int from public.landing_paginas), 1, 'lector ve la página de su fuente');
select throws_ok($$ select public.guardar_landing('20000000-0000-0000-0000-000000000001', 'evento', '{}', '[]', null) $$,
  '42501', null, 'lector no guarda');

-- admin publica; offline no admite página
select pg_temp.como('00000000-0000-0000-0000-00000000001a', 'aal2');
select lives_ok($$ update public.landing_paginas set publicada = true where fuente_id = '20000000-0000-0000-0000-000000000001' $$,
  'admin publica');
select isnt((select publicada_en from public.landing_paginas where fuente_id = '20000000-0000-0000-0000-000000000001'),
  null, 'publicar marca publicada_en');
select throws_ok($$ insert into public.landing_paginas (fuente_id) values ('20000000-0000-0000-0000-000000000003') $$,
  '22023', null, 'una fuente offline no tiene página');
select throws_ok($$ select public.guardar_landing('20000000-0000-0000-0000-000000000001', 'Plantilla Rara', '{}', '[]', null) $$,
  '23514', null, 'id de plantilla con formato inválido se rechaza');

-- sin 2FA no se guarda nada
select pg_temp.como('00000000-0000-0000-0000-00000000001a', 'aal1');
select throws_ok($$ select public.guardar_landing('20000000-0000-0000-0000-000000000001', 'evento', '{}', '[]', null) $$,
  '42501', null, 'sin 2FA no se guarda');

-- anónimo: solo landing_publica, y solo lo publicado
reset role;
set local role anon;
select is((public.landing_publica('cms-l1') ->> 'plantilla'), 'evento', 'anon lee una landing publicada');
select is(public.landing_publica('cms-l2'), null, 'anon no lee una landing sin publicar');
select throws_ok($$ select count(*) from public.landing_paginas $$, '42501', null, 'anon no lee la tabla');

select * from finish();
rollback;
