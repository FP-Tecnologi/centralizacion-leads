import { describe, expect, it } from 'vitest';
import {
  claveDestinoSegura, construirFilas, describirErrorServidor, inferirTipo, labelParaClaveSobrante, limpiarDocumento, normalizarEncabezado,
  separarCorreos, separarTelefonos, sugerirMapeo,
} from './mapeo';
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';

const campos: CampoFormulario[] = [{ key: 'ciudad', label: 'Ciudad', tipo: 'texto', requerido: false }];

describe('normalizarEncabezado', () => {
  it('quita tildes, mayúsculas y símbolos', () => {
    expect(normalizarEncabezado('  Correo Electrónico* ')).toBe('correo_electronico');
  });
});

describe('sugerirMapeo', () => {
  it('reconoce sinónimos comunes y campos de la fuente', () => {
    expect(sugerirMapeo(['Nombre', 'Apellidos', 'E-mail', 'Celular', 'Razón Social', 'DNI', 'Ciudad', 'Notas'], campos)).toEqual({
      Nombre: 'nombres', Apellidos: 'apellido', 'E-mail': 'email', Celular: 'telefono',
      'Razón Social': 'empresa', DNI: 'ruc', Ciudad: 'ciudad', Notas: 'notas',
    });
  });

  it('reconoce "Fecha de nacimiento" como fecha_nacimiento (no a extra)', () => {
    expect(sugerirMapeo(['Fecha de nacimiento'], [])).toEqual({ 'Fecha de nacimiento': 'fecha_nacimiento' });
  });
});

describe('construirFilas', () => {
  it('aplica mapeo, ignora columnas null; la fila con error se guarda igual, marcada', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', B: 'ana@x.com', C: 'ignorar' } }, { datos: { A: 'Luis', B: 'malo', C: '' } }],
      { A: 'nombres', B: 'email', C: null },
      [],
    );
    expect(r.filas[0]).toEqual({ fila: 2, lead: { nombres: 'Ana', email: 'ana@x.com', extra: {} } });
    expect(r.filas[1].lead.email).toBe('malo');
    expect(r.filas[1].lead.invalidos).toEqual({ email: { valor: 'malo', causa: 'Correo "malo" no es un correo válido (ej. nombre@empresa.com)' } });
    expect(r.observadas[0].fila).toBe(3);
    expect(r.observadas[0].errores).toEqual([{ campo: 'email', motivo: 'formato' }]);
  });

  it('usa el número de fila real cuando se provee (filas con huecos)', () => {
    const r = construirFilas(
      [{ fila: 2, datos: { A: 'Ana', B: 'ana@x.com' } }, { fila: 4, datos: { A: 'Luis', B: 'malo' } }],
      { A: 'nombres', B: 'email' },
      [],
    );
    expect(r.filas[0].fila).toBe(2);
    expect(r.observadas[0].fila).toBe(4);
  });

  it('dos columnas mapeadas al mismo destino: la vacía no pisa a la llena', () => {
    const r = construirFilas(
      [{ datos: { Celular: '987654321', 'Celular 2': '' } }],
      { Celular: 'telefono', 'Celular 2': 'telefono' },
      [],
    );
    expect(r.filas[0].lead.telefono).toBe('987654321');
  });

  it('dos columnas mapeadas al mismo destino, ambas llenas y distintas: la segunda va a extra', () => {
    const r = construirFilas(
      [{ datos: { Celular: '987654321', 'Celular 2': '999888777' } }],
      { Celular: 'telefono', 'Celular 2': 'telefono' },
      [],
    );
    expect(r.filas[0].lead.telefono).toBe('987654321');
    expect(r.filas[0].lead.extra.celular_2).toBe('999888777');
  });

  it('Nombre/Celular/Teléfono con mapeo sugerido: "Teléfono" normaliza al propio destino "telefono" y no debe pisar a Celular', () => {
    const encabezados = ['Nombre', 'Celular', 'Teléfono'];
    const mapeo = sugerirMapeo(encabezados, []);
    expect(mapeo).toEqual({ Nombre: 'nombres', Celular: 'telefono', Teléfono: 'telefono' });
    const r = construirFilas(
      [{ datos: { Nombre: 'Ana', Celular: '987654321', Teléfono: '111222333' } }],
      mapeo,
      [],
    );
    expect(r.filas[0].lead.telefono).toBe('987654321');
    expect(r.filas[0].lead.extra.telefono_2).toBe('111222333');
  });

  it('normaliza a ISO una columna extra tipada como fecha en formato DD/MM/YYYY antes de enviar (leads_completo solo castea ISO)', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', T: '987654321', B: '15/01/2024' } }],
      { A: 'nombres', T: 'telefono', B: 'visita' },
      [],
      { visita: 'fecha' },
    );
    expect(r.filas[0].lead.extra.visita).toBe('2024-01-15');
  });

  it('deja una fecha extra ya ISO tal cual', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', T: '987654321', B: '2024-01-15' } }],
      { A: 'nombres', T: 'telefono', B: 'visita' },
      [],
      { visita: 'fecha' },
    );
    expect(r.filas[0].lead.extra.visita).toBe('2024-01-15');
  });

  it('no toca una columna extra que no está tipada como fecha', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', T: '987654321', B: '15/01/2024' } }],
      { A: 'nombres', T: 'telefono', B: 'notas' },
      [],
      { notas: 'texto' },
    );
    expect(r.filas[0].lead.extra.notas).toBe('15/01/2024');
  });
});

describe('inferirTipo', () => {
  it('detecta fecha ISO', () => {
    expect(inferirTipo(['2024-01-15', '2024-02-20'])).toBe('fecha');
  });

  it('detecta fecha DD/MM/YYYY', () => {
    expect(inferirTipo(['15/01/2024', '20-02-2024'])).toBe('fecha');
  });

  it('detecta numero', () => {
    expect(inferirTipo(['1000', '2500.50', '-30'])).toBe('numero');
  });

  it('ignora valores vacios al decidir', () => {
    expect(inferirTipo(['1000', '', '  ', '2500'])).toBe('numero');
  });

  it('no confunde numeros con ceros a la izquierda con "numero" (código postal, etc)', () => {
    expect(inferirTipo(['0123', '0456'])).toBe('texto');
  });

  it('no confunde IDs largos (DNI/telefono/RUC de 8+ dígitos) con "numero"', () => {
    expect(inferirTipo(['12345678', '87654321'])).toBe('texto');
  });

  it('texto por defecto', () => {
    expect(inferirTipo(['Lima', 'Arequipa'])).toBe('texto');
  });

  it('mezcla de tipos cae a texto', () => {
    expect(inferirTipo(['1000', 'Lima'])).toBe('texto');
  });

  it('todo vacio cae a texto', () => {
    expect(inferirTipo(['', '  '])).toBe('texto');
  });
});

describe('claveDestinoSegura', () => {
  it('deja pasar una clave corta y libre tal cual', () => {
    expect(claveDestinoSegura('presupuesto', [])).toBe('presupuesto');
  });

  it('trunca a 63 caracteres una clave larga', () => {
    const larga = 'a'.repeat(120);
    const clave = claveDestinoSegura(larga, []);
    expect(clave.length).toBeLessThanOrEqual(63);
    expect(clave).toBe('a'.repeat(63));
  });

  it('sufija cuando la clave ya está ocupada, y el resultado sigue <= 63', () => {
    expect(claveDestinoSegura('ciudad', ['ciudad'])).toBe('ciudad_2');
    expect(claveDestinoSegura('ciudad', ['ciudad', 'ciudad_2'])).toBe('ciudad_3');
  });

  it('sufija una clave larga que trunca a algo ya ocupado, y el resultado sigue <= 63', () => {
    const larga = 'a'.repeat(120);
    const truncada = 'a'.repeat(63);
    const clave = claveDestinoSegura(larga, [truncada]);
    expect(clave.length).toBeLessThanOrEqual(63);
    expect(clave).not.toBe(truncada);
  });

  it('sufija una clave reservada (columna real de leads o de la vista)', () => {
    expect(claveDestinoSegura('fuente_slug', [])).toBe('fuente_slug_2');
    expect(claveDestinoSegura('status', [])).toBe('status_2');
    expect(claveDestinoSegura('created_at', [])).toBe('created_at_2');
  });
});

describe('labelParaClaveSobrante', () => {
  it('encuentra el encabezado original cuya clave normalizada coincide', () => {
    expect(labelParaClaveSobrante('telefono_2', { Celular: 'telefono', 'Teléfono': 'telefono_2' })).toBe('Teléfono');
  });

  it('si la clave trae sufijo pero el encabezado normaliza a la base, tambien la encuentra', () => {
    expect(labelParaClaveSobrante('telefono_2', { Celular: 'telefono', Telefono: 'telefono' })).toBe('Telefono');
  });

  it('sin match, devuelve la clave tal cual', () => {
    expect(labelParaClaveSobrante('algo_2', { Celular: 'telefono' })).toBe('algo_2');
  });
});

// Encabezados reales del consolidado de EXPOMINA 2026 (CSV y XLSX que mandó el usuario).
const ENCABEZADOS_EXPOMINA = [
  'ID', 'Fecha', 'Nombres / Contacto', 'Apellidos', 'Cargo', 'RUC / DNI', 'Empresa / Cliente', 'Rubro', 'Teléfono',
  'Email', 'Necesidad Detectada', 'Próxima Acción', 'Evento', 'Estado', 'Fecha de nacimiento', 'Fuente',
];

describe('sugerirMapeo — consolidado EXPOMINA', () => {
  it('cada columna va a su campo; ninguna choca con un nombre reservado', () => {
    expect(sugerirMapeo(ENCABEZADOS_EXPOMINA, [])).toEqual({
      ID: null,
      Fecha: 'created_at',
      'Nombres / Contacto': 'nombres',
      Apellidos: 'apellido',
      Cargo: 'cargo',
      'RUC / DNI': 'ruc',
      'Empresa / Cliente': 'empresa',
      Rubro: 'rubro',
      'Teléfono': 'telefono',
      Email: 'email',
      'Necesidad Detectada': 'necesidad_detectada',
      'Próxima Acción': 'proxima_accion',
      Evento: 'evento',
      Estado: 'status',
      'Fecha de nacimiento': 'fecha_nacimiento',
      Fuente: 'fuente_origen',
    });
  });

  it('reglas por palabra: "Nombre de la empresa" es empresa, "Cargo en la empresa" es cargo, "Correo empresa" es correo', () => {
    expect(sugerirMapeo(['Nombre de la empresa', 'Cargo en la empresa', 'Correo empresa', 'Teléfono / Celular', 'Fecha de registro'], [])).toEqual({
      'Nombre de la empresa': 'empresa', 'Cargo en la empresa': 'cargo', 'Correo empresa': 'email',
      'Teléfono / Celular': 'telefono', 'Fecha de registro': 'created_at',
    });
  });

  it('reusa una columna extra ya registrada por su label', () => {
    expect(sugerirMapeo(['Necesidad'], [], [{ key: 'necesidad_detectada', label: 'Necesidad' }])).toEqual({ Necesidad: 'necesidad_detectada' });
  });

  it('una columna nueva que normaliza a un nombre reservado se sufija', () => {
    expect(sugerirMapeo(['User agent'], [])).toEqual({ 'User agent': 'user_agent_2' });
  });
});

describe('construirFilas — datos reales de un consolidado', () => {
  const mapeo = sugerirMapeo(ENCABEZADOS_EXPOMINA, []);
  const fila = (d: Record<string, string>) => ({ datos: Object.fromEntries(ENCABEZADOS_EXPOMINA.map((h) => [h, d[h] ?? ''])) });

  it('fecha en serial de Excel, estado y evento van a su columna; lo demás a extra', () => {
    const r = construirFilas([fila({
      ID: '2', Fecha: '46281', 'Nombres / Contacto': 'Fernando', Apellidos: 'Aguilar', 'RUC / DNI': '07627328',
      'Empresa / Cliente': 'Praeveni', 'Teléfono': '913023553', Email: 'fernando@praeveni.com.pe',
      'Necesidad Detectada': 'Cámaras', Evento: 'Semana de Ingeniería Geológica', Estado: 'Nuevo',
      'Fecha de nacimiento': '24/08/1972', Fuente: 'leads-expomina.xlsx',
    })], mapeo, []);
    expect(r.observadas).toEqual([]);
    expect(r.filas[0].lead).toEqual({
      nombres: 'Fernando', apellido: 'Aguilar', ruc: '07627328', empresa: 'Praeveni', telefono: '913023553',
      email: 'fernando@praeveni.com.pe', fecha_nacimiento: '1972-08-24',
      created_at: '2026-09-16', status: 'nuevo', evento: 'Semana de Ingeniería Geológica',
      extra: { necesidad_detectada: 'Cámaras', fuente_origen: 'leads-expomina.xlsx' },
    });
  });

  it('varios teléfonos en una celda: el primero a Teléfono, el resto a telefono_2', () => {
    const r = construirFilas([fila({ 'Nombres / Contacto': 'Luis', 'Teléfono': '914 117 489 / 997 589 940 |' })], mapeo, []);
    expect(r.filas[0].lead.telefono).toBe('914117489');
    expect(r.filas[0].lead.extra.telefono_2).toBe('997589940');
  });

  it('correo con espacios adentro se limpia en vez de rechazarse', () => {
    const r = construirFilas([fila({ Email: 'ventas @rrhpart.com' })], mapeo, []);
    expect(r.filas[0].lead.email).toBe('ventas@rrhpart.com');
  });

  it('fila sin correo ni teléfono: error con causa legible', () => {
    const r = construirFilas([fila({ 'Nombres / Contacto': 'Pedro' })], mapeo, []);
    expect(r.observadas[0].causas).toEqual(['Sin correo ni teléfono: se guarda, pero no se podrá contactar ni detectar si está repetido']);
    expect(r.filas).toHaveLength(1);
  });

  it('estado desconocido y teléfono inválido: la causa dice el valor y qué se espera', () => {
    const r = construirFilas([fila({ Email: 'a@x.com', Estado: 'ganado', 'Teléfono': '123' })], mapeo, []);
    expect(r.observadas[0].causas).toEqual([
      'Teléfono "123" no es un teléfono válido (6 a 15 dígitos, puede empezar con +)',
      'Estado "ganado" no es válido (usa: nuevo, contactado, asistio, descartado)',
    ]);
  });

  it('campo obligatorio vacío: se importa marcado como incompleto', () => {
    const campos: CampoFormulario[] = [{ key: 'ruc', label: 'RUC / DNI', tipo: 'documento', requerido: true }];
    const r = construirFilas([fila({ Email: 'a@x.com' })], mapeo, campos);
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0].lead.invalidos).toEqual({ ruc: { valor: '', causa: 'RUC / DNI está vacío y es obligatorio en esta fuente' } });
  });

  it('fecha imposible (31/02): no va a la columna de fecha, queda el texto original marcado', () => {
    const r = construirFilas([fila({ Email: 'a@x.com', 'Fecha de nacimiento': '31/02/1980', Estado: 'ganado' })], mapeo, []);
    const { lead } = r.filas[0];
    expect(lead.fecha_nacimiento).toBeUndefined();
    expect(lead.status).toBeUndefined();
    expect(lead.invalidos).toMatchObject({
      fecha_nacimiento: { valor: '31/02/1980' },
      status: { valor: 'ganado' },
    });
  });

  it('DNI que perdió el cero inicial en Excel se completa a 8 dígitos', () => {
    const campos: CampoFormulario[] = [{ key: 'ruc', label: 'RUC / DNI', tipo: 'documento', requerido: false }];
    const r = construirFilas([fila({ Email: 'a@x.com', 'RUC / DNI': '7627328' })], mapeo, campos);
    expect(r.filas[0].lead.ruc).toBe('07627328');
  });

  it('fecha extra en serial se convierte cuando la columna está tipada como fecha', () => {
    const r = construirFilas([{ datos: { Email: 'a@x.com', 'Fecha de visita': '46281' } }], { Email: 'email', 'Fecha de visita': 'fecha_de_visita' }, [], { fecha_de_visita: 'fecha' });
    expect(r.filas[0].lead.extra.fecha_de_visita).toBe('2026-09-16');
  });
});

describe('limpieza de valores', () => {
  it('separarTelefonos', () => {
    expect(separarTelefonos('946569075_946560073')).toEqual(['946569075', '946560073']);
    expect(separarTelefonos('Cel 989 670 737')).toEqual(['989670737']);
    expect(separarTelefonos('+51 908 807 157 / +51 984 169 469')).toEqual(['+51908807157', '+51984169469']);
    expect(separarTelefonos('(01) 234-5678')).toEqual(['012345678']);
    expect(separarTelefonos('no tiene')).toEqual(['no tiene']);
  });
  it('separarCorreos', () => {
    expect(separarCorreos('Ana@X.com; luis@x.com')).toEqual(['ana@x.com', 'luis@x.com']);
    expect(separarCorreos('jose.sandoval@enduria .com.pe')).toEqual(['jose.sandoval@enduria.com.pe']);
  });
  it('limpiarDocumento', () => {
    expect(limpiarDocumento('20.613.344.548')).toBe('20613344548');
    expect(limpiarDocumento('7627328')).toBe('07627328');
    expect(limpiarDocumento('10075977145.0')).toBe('10075977145');
    expect(limpiarDocumento('CE 001234')).toBe('CE 001234');
  });
  it('describirErrorServidor traduce los códigos de upsert_lead', () => {
    expect(describirErrorServidor('fila_sin_contacto')).toMatch(/Sin correo ni teléfono/);
    expect(describirErrorServidor('estado_invalido')).toMatch(/Estado no válido/);
    expect(describirErrorServidor('algo raro')).toBe('Error del servidor: algo raro');
  });
});

describe('inferirTipo — serial de Excel', () => {
  it('columna "Fecha de visita" con seriales es fecha', () => {
    expect(inferirTipo(['46281', '46276'], 'Fecha de visita')).toBe('fecha');
  });
  it('sin encabezado de fecha, un número sigue siendo número', () => {
    expect(inferirTipo(['46281', '46276'], 'Cantidad')).toBe('numero');
  });
});
