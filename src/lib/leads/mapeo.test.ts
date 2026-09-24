import { describe, expect, it } from 'vitest';
import { claveDestinoSegura, construirFilas, inferirTipo, labelParaClaveSobrante, normalizarEncabezado, sugerirMapeo } from './mapeo';
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
  it('aplica mapeo, ignora columnas null y separa válidas de errores', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', B: 'ana@x.com', C: 'ignorar' } }, { datos: { A: 'Luis', B: 'malo', C: '' } }],
      { A: 'nombres', B: 'email', C: null },
      [],
    );
    expect(r.validas).toEqual([{ fila: 2, lead: { nombres: 'Ana', email: 'ana@x.com', extra: {} } }]);
    expect(r.errores[0].fila).toBe(3);
    expect(r.errores[0].errores).toEqual([{ campo: 'email', motivo: 'formato' }]);
  });

  it('usa el número de fila real cuando se provee (filas con huecos)', () => {
    const r = construirFilas(
      [{ fila: 2, datos: { A: 'Ana', B: 'ana@x.com' } }, { fila: 4, datos: { A: 'Luis', B: 'malo' } }],
      { A: 'nombres', B: 'email' },
      [],
    );
    expect(r.validas[0].fila).toBe(2);
    expect(r.errores[0].fila).toBe(4);
  });

  it('dos columnas mapeadas al mismo destino: la vacía no pisa a la llena', () => {
    const r = construirFilas(
      [{ datos: { Celular: '987654321', 'Celular 2': '' } }],
      { Celular: 'telefono', 'Celular 2': 'telefono' },
      [],
    );
    expect(r.validas[0].lead.telefono).toBe('987654321');
  });

  it('dos columnas mapeadas al mismo destino, ambas llenas y distintas: la segunda va a extra', () => {
    const r = construirFilas(
      [{ datos: { Celular: '987654321', 'Celular 2': '999888777' } }],
      { Celular: 'telefono', 'Celular 2': 'telefono' },
      [],
    );
    expect(r.validas[0].lead.telefono).toBe('987654321');
    expect(r.validas[0].lead.extra.celular_2).toBe('999888777');
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
    expect(r.validas[0].lead.telefono).toBe('987654321');
    expect(r.validas[0].lead.extra.telefono_2).toBe('111222333');
  });

  it('normaliza a ISO una columna extra tipada como fecha en formato DD/MM/YYYY antes de enviar (leads_completo solo castea ISO)', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', T: '987654321', B: '15/01/2024' } }],
      { A: 'nombres', T: 'telefono', B: 'visita' },
      [],
      { visita: 'fecha' },
    );
    expect(r.validas[0].lead.extra.visita).toBe('2024-01-15');
  });

  it('deja una fecha extra ya ISO tal cual', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', T: '987654321', B: '2024-01-15' } }],
      { A: 'nombres', T: 'telefono', B: 'visita' },
      [],
      { visita: 'fecha' },
    );
    expect(r.validas[0].lead.extra.visita).toBe('2024-01-15');
  });

  it('no toca una columna extra que no está tipada como fecha', () => {
    const r = construirFilas(
      [{ datos: { A: 'Ana', T: '987654321', B: '15/01/2024' } }],
      { A: 'nombres', T: 'telefono', B: 'notas' },
      [],
      { notas: 'texto' },
    );
    expect(r.validas[0].lead.extra.notas).toBe('15/01/2024');
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
