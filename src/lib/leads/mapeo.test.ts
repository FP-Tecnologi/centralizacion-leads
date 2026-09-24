import { describe, expect, it } from 'vitest';
import { construirFilas, normalizarEncabezado, sugerirMapeo } from './mapeo';
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
});

describe('construirFilas', () => {
  it('aplica mapeo, ignora columnas null y separa válidas de errores', () => {
    const r = construirFilas(
      [{ A: 'Ana', B: 'ana@x.com', C: 'ignorar' }, { A: 'Luis', B: 'malo', C: '' }],
      { A: 'nombres', B: 'email', C: null },
      [],
    );
    expect(r.validas).toEqual([{ fila: 2, lead: { nombres: 'Ana', email: 'ana@x.com', extra: {} } }]);
    expect(r.errores[0].fila).toBe(3);
    expect(r.errores[0].errores).toEqual([{ campo: 'email', motivo: 'formato' }]);
  });
});
