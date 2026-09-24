begin;
select plan(18);

-- usuarios de prueba
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@t.com'),
  ('00000000-0000-0000-0000-00000000000e', 'editor@t.com'),
  ('00000000-0000-0000-0000-00000000000c', 'lector@t.com');
insert into public.perfiles (user_id, rol) values
  ('00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-00000000000e', 'editor'),
  ('00000000-0000-0000-0000-00000000000c', 'lector');
insert into public.fuentes (id, nombre, slug, tipo) values
  ('10000000-0000-0000-0000-000000000001', 'F1', 'f1', 'landing'),
  ('10000000-0000-0000-0000-000000000002', 'F2', 'f2', 'landing');
insert into public.perfil_fuentes values
  ('00000000-0000-0000-0000-00000000000e', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001');
insert into public.leads (fuente_id, email) values
  ('10000000-0000-0000-0000-000000000001', 'a@f1.com'),
  ('10000000-0000-0000-0000-000000000002', 'b@f2.com');

create function pg_temp.como(uid text, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'aal', aal, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal1');
select is((select count(*)::int from public.leads), 0, 'sin 2FA (aal1) no ve nada');

select pg_temp.como('00000000-0000-0000-0000-00000000000a', 'aal2');
select is((select count(*)::int from public.leads where email in ('a@f1.com','b@f2.com')), 2, 'admin ve todas las fuentes');

-- admin elimina un lead que tiene duplicados: el duplicado se borra en cascada
-- (mismo principal, no toca a@f1.com/b@f2.com que usan los bloques siguientes).
insert into public.leads (id, fuente_id, email) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'dup-principal@f1.com');
insert into public.leads (fuente_id, email, duplicado_de) values
  ('10000000-0000-0000-0000-000000000001', 'dup-principal@f1.com', '30000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.leads where duplicado_de = '30000000-0000-0000-0000-000000000001'), 1, 'hay un duplicado del principal de prueba');
select lives_ok($$ delete from public.leads where id = '30000000-0000-0000-0000-000000000001' $$, 'admin elimina el principal con duplicados');
select is((select count(*)::int from public.leads where email = 'dup-principal@f1.com'), 0, 'el duplicado se borra en cascada junto al principal');

select pg_temp.como('00000000-0000-0000-0000-00000000000e', 'aal2');
select is((select count(*)::int from public.leads where email in ('a@f1.com','b@f2.com')), 1, 'editor solo ve su fuente');
select lives_ok($$ update public.leads set cargo = 'X' where email = 'a@f1.com' $$, 'editor edita su fuente');
select throws_ok($$ insert into public.leads (fuente_id, email) values ('10000000-0000-0000-0000-000000000002', 'z@z.com') $$,
  '42501', null, 'editor no inserta en fuente ajena');
select throws_ok($$ insert into public.fuentes (nombre, slug, tipo) values ('X','x','landing') $$,
  '42501', null, 'editor no crea fuentes');

-- escalamiento de privilegios: un editor no puede auto-promoverse a admin.
update public.perfiles set rol = 'admin' where user_id = '00000000-0000-0000-0000-00000000000e';
select is((select rol from public.perfiles where user_id = '00000000-0000-0000-0000-00000000000e'),
  'editor', 'editor no puede cambiar su propio rol a admin');

-- escalamiento de privilegios: un editor no puede darse acceso a otra fuente.
select throws_ok($$ insert into public.perfil_fuentes values
  ('00000000-0000-0000-0000-00000000000e', '10000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'editor no se auto-asigna a fuente ajena');

-- escalamiento de privilegios: un editor no puede "mover" un lead a otra fuente
-- para saltarse el scoping (with check se re-evalúa contra la fuente nueva).
select throws_ok($$ update public.leads set fuente_id = '10000000-0000-0000-0000-000000000002'
  where email = 'a@f1.com' $$, '42501', null, 'editor no reasigna un lead a fuente ajena');

-- editor no es admin: el delete no lanza error, pero tampoco borra nada (0 filas).
delete from public.leads;
select is((select count(*)::int from public.leads where email in ('a@f1.com','b@f2.com')), 1,
  'editor no admin: delete no borra nada (RLS filtra las filas, no lanza error)');

-- TRUNCATE ignora RLS: debe bloquearse a nivel de GRANT, no de política.
select throws_ok($$ truncate public.leads $$, '42501', null, 'ningún autenticado puede truncar leads');

select pg_temp.como('00000000-0000-0000-0000-00000000000c', 'aal2');
select is((select count(*)::int from public.leads where email in ('a@f1.com','b@f2.com')), 1, 'lector ve su fuente');
update public.leads set cargo = 'Y' where email = 'a@f1.com';
select is((select cargo from public.leads where email = 'a@f1.com'), 'X', 'lector no puede actualizar');
delete from public.leads;
select is((select count(*)::int from public.leads where email in ('a@f1.com','b@f2.com')), 1,
  'lector no admin: delete no borra nada (RLS filtra las filas, no lanza error)');

reset role;
set local role anon;
select throws_ok($$ select count(*) from public.leads $$, '42501', null, 'anon no ve nada');

select * from finish();
rollback;
