-- Datos de DEMOSTRACIÓN para el Sistema de Leads (no son leads reales).
-- Idempotente: se puede correr varias veces. Todo lead demo lleva origen = 'demo'
-- y las fuentes demo tienen slug con sufijo -demo, así que se borran con:
--   delete from public.leads where origen = 'demo';
--   delete from public.fuentes where slug like '%-demo';
-- Cargar en la nube:
--   docker exec -i supabase_db_leads psql "<db-url>" < supabase/demo/datos-demo.sql
-- (o pegar en Supabase > SQL Editor).

insert into public.fuentes (nombre, slug, tipo, dominio, campos, correo_gracias) values
  ('EXPOMINA Perú 2026 (demo)', 'expomina-peru-2026-demo', 'landing', 'registro.fptecnologi.com',
   public._campos_expomina() || '[{"key":"interes","label":"Interés","tipo":"opcion","requerido":false,"opciones":["Drones","Topografía","Monitoreo","Software"]}]'::jsonb,
   '{"activo": false}'::jsonb),
  ('Semana de Ingeniería Geológica (demo)', 'semana-ingenieria-geologica-demo', 'landing', 'registro.fptecnologi.com',
   public._campos_expomina(), '{"activo": false}'::jsonb),
  ('App offline Feria Arequipa (demo)', 'feria-arequipa-offline-demo', 'offline', null,
   '[{"key":"nombres","label":"Nombres","tipo":"texto","requerido":true},
     {"key":"telefono","label":"Teléfono","tipo":"telefono","requerido":true},
     {"key":"ciudad","label":"Ciudad","tipo":"texto","requerido":false}]'::jsonb, null),
  ('Importación base comercial (demo)', 'base-comercial-demo', 'importacion', null, '[]'::jsonb, null)
on conflict (slug) do nothing;

do $$
declare
  nombres text[] := array['José','María','Luis','Ana','Carlos','Rosa','Jorge','Lucía','Miguel','Carmen','Pedro','Elena','Raúl','Patricia','Diego','Sofía','Víctor','Gabriela','Andrés','Milagros'];
  apellidos text[] := array['Quispe','Mamani','Flores','García','Rodríguez','Huamán','Torres','Chávez','Ramírez','Vargas','Castillo','Rojas','Mendoza','Paredes','Salazar'];
  empresas text[] := array['Minera Andina SAC','GeoPerú Consultores','Southern Andes Mining','Cementos del Sur','Topografía Integral EIRL','Volcan Servicios','Hidro Energía Perú','Constructora Arequipa','Antamina Contratistas','Tecnominería SAC'];
  rubros text[] := array['Minería','Geología','Construcción','Energía','Topografía','Medio ambiente'];
  cargos text[] := array['Gerente de operaciones','Jefe de mina','Geólogo senior','Ingeniero de seguridad','Supervisor de campo','Analista de datos','Jefe de compras','Topógrafo'];
  ciudades text[] := array['Lima','Arequipa','Cusco','Cajamarca','Trujillo','Moquegua','Tacna','Huancayo'];
  intereses text[] := array['Drones','Topografía','Monitoreo','Software'];
  estados public.lead_status[] := array['nuevo','nuevo','nuevo','contactado','contactado','asistio','descartado']::public.lead_status[];
  f_expo uuid; f_semana uuid; f_offline uuid; f_import uuid;
  i int; n text; a text; fuente uuid; extra jsonb;
begin
  if exists (select 1 from public.leads where origen = 'demo') then
    raise notice 'Datos demo ya cargados; no se insertan de nuevo.';
    return;
  end if;
  select id into f_expo from public.fuentes where slug = 'expomina-peru-2026-demo';
  select id into f_semana from public.fuentes where slug = 'semana-ingenieria-geologica-demo';
  select id into f_offline from public.fuentes where slug = 'feria-arequipa-offline-demo';
  select id into f_import from public.fuentes where slug = 'base-comercial-demo';

  for i in 1..160 loop
    n := nombres[1 + (i * 7) % array_length(nombres, 1)];
    a := apellidos[1 + (i * 11) % array_length(apellidos, 1)];
    fuente := case i % 4 when 0 then f_expo when 1 then f_semana when 2 then f_offline else f_import end;
    extra := jsonb_build_object('ciudad', ciudades[1 + (i * 3) % array_length(ciudades, 1)]);
    if fuente = f_expo then
      extra := extra || jsonb_build_object('interes', intereses[1 + i % array_length(intereses, 1)]);
    elsif fuente = f_import then
      extra := extra || jsonb_build_object('presupuesto', ((1 + i % 9) * 5000)::text);
    end if;

    insert into public.leads (fuente_id, nombres, apellido, email, telefono, empresa, ruc, cargo, rubro,
                              fecha_nacimiento, status, extra, origen, created_at)
    values (
      fuente, n, a,
      case when fuente = f_offline and i % 3 = 0 then null
           else lower(translate(n || '.' || a, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN')) || i || '@demo.fptecnologi.pe' end,
      '9' || lpad(((i * 7919) % 100000000)::text, 8, '0'),
      case when fuente = f_offline then null else empresas[1 + (i * 5) % array_length(empresas, 1)] end,
      case when i % 3 = 0 then '20' || lpad(((i * 104729) % 1000000000)::text, 9, '0')
           else lpad(((i * 7331) % 100000000)::text, 8, '0') end,
      cargos[1 + (i * 13) % array_length(cargos, 1)],
      rubros[1 + (i * 17) % array_length(rubros, 1)],
      case when i % 5 = 0 then (date '1975-01-01' + (i * 97) % 9000) else null end,
      estados[1 + (i * 19) % array_length(estados, 1)],
      extra, 'demo',
      now() - ((i * 4.5) || ' hours')::interval
    );
  end loop;

  -- Registro global de columnas extra (si la tabla existe: Task 13b).
  if to_regclass('public.columnas_extra') is not null then
    execute $q$insert into public.columnas_extra (key, label, tipo) values
      ('ciudad','Ciudad','texto'), ('interes','Interés','texto'), ('presupuesto','Presupuesto','numero')
      on conflict (key) do nothing$q$;
  end if;
end $$;

select f.nombre, count(l.id) as leads
from public.fuentes f left join public.leads l on l.fuente_id = f.id and l.origen = 'demo'
where f.slug like '%-demo' group by f.nombre order by f.nombre;
