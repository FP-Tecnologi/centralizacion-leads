begin;
select plan(7);

alter table public.leads alter column fuente_id drop not null;
-- El índice único existe ya en el esquema final; aquí simulamos el estado
-- previo a la migración, donde todavía no estaba.
drop index public.leads_fuente_email_uq;
delete from public.leads;
insert into public.leads (nombres, apellido, cargo, ruc, empresa, rubro, telefono, email, evento, created_at) values
  ('Ana','Ruiz','Jefe','12345678','Mina A','Minería','987654321','ana@x.com','EXPOMINA Perú 2026', now() - interval '3 days'),
  ('Ana','Ruiz','Gerente','12345678','Mina A','Minería','987654321','ANA@x.com','EXPOMINA Perú 2026', now() - interval '1 day'),
  ('Luis','Paz','Geólogo','87654321','','Geología','912345678','luis@x.com','Semana de Ingeniería Geológica', now()),
  ('Ana','Ruiz','Jefe','12345678','Mina A','Minería','987654321','ana@x.com','Semana de Ingeniería Geológica', now());

select public._backfill_fuentes();

select is((select count(*)::int from public.leads), 4, 'no se pierde ninguna fila');
select is((select count(*)::int from public.fuentes where tipo = 'landing'), 2, 'una fuente por evento');
select ok((select slug from public.fuentes where nombre = 'Semana de Ingeniería Geológica') = 'semana-de-ingenieria-geologica', 'slug sin tildes');
select is((select count(*)::int from public.leads where fuente_id is null), 0, 'toda fila tiene fuente');
select is((select count(*)::int from public.leads where duplicado_de is not null), 1, 'solo el registro viejo de Ana en EXPOMINA es duplicado');
select ok((select cargo from public.leads where duplicado_de is null and lower(email) = 'ana@x.com'
           and fuente_id = (select id from public.fuentes where slug = 'expomina-peru-2026')) = 'Gerente', 'el más reciente queda principal');
select is((select count(*)::int from public.leads where lower(email) = 'ana@x.com' and duplicado_de is null), 2, 'Ana existe en 2 fuentes distintas');

select * from finish();
rollback;
