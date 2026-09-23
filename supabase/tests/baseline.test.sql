begin;
select plan(3);
select has_table('public', 'leads', 'tabla leads existe');
select has_column('public', 'leads', 'evento', 'leads.evento existe');
select has_column('public', 'leads', 'fecha_nacimiento', 'leads.fecha_nacimiento existe');
select * from finish();
rollback;
