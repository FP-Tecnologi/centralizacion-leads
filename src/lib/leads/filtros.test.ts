import { describe, expect, it } from 'vitest';
import { aplicarFiltro, columna, describirFiltro, quitarDeFiltro, FILTRO_VACIO, type ConsultaFiltrable } from './filtros';

function grabadora() {
  const llamadas: unknown[][] = [];
  const q = new Proxy({} as ConsultaFiltrable & { llamadas: unknown[][] }, {
    get(_t, prop) {
      if (prop === 'llamadas') return llamadas;
      return (...args: unknown[]) => { llamadas.push([prop, ...args]); return q; };
    },
  });
  return q;
}

describe('columna', () => {
  it('núcleo directo, resto en extra', () => {
    expect(columna('email')).toBe('email');
    expect(columna('status')).toBe('status');
    expect(columna('created_at')).toBe('created_at');
    expect(columna('talla')).toBe('extra->>talla');
  });
  it('rechaza claves con caracteres peligrosos', () => {
    expect(() => columna('a,b')).toThrow();
  });
});

describe('aplicarFiltro', () => {
  it('filtro vacío no agrega nada', () => {
    expect(aplicarFiltro(grabadora(), FILTRO_VACIO).llamadas).toEqual([]);
  });

  it('traduce búsqueda, fuentes, estados, fechas y condiciones', () => {
    const q = aplicarFiltro(grabadora(), {
      q: 'ana, (x)', fuentes: ['f1'], estados: ['nuevo'], desde: '2026-01-01', hasta: '2026-01-31',
      condiciones: [
        { campo: 'rubro', op: 'eq', valor: 'Minería' },
        { campo: 'ciudad', op: 'contiene', valor: 'lim' },
        { campo: 'empresa', op: 'vacio' },
        { campo: 'cargo', op: 'no_vacio' },
      ],
    });
    expect(q.llamadas).toEqual([
      ['or', 'nombres.ilike.*ana x*,apellido.ilike.*ana x*,email.ilike.*ana x*,empresa.ilike.*ana x*,telefono.ilike.*ana x*,ruc.ilike.*ana x*'],
      ['in', 'fuente_id', ['f1']],
      ['in', 'status', ['nuevo']],
      ['gte', 'created_at', '2026-01-01T00:00:00-05:00'],
      ['lte', 'created_at', '2026-01-31T23:59:59.999-05:00'],
      ['eq', 'rubro', 'Minería'],
      ['ilike', 'extra->>ciudad', '%lim%'],
      ['or', 'empresa.is.null,empresa.eq.'],
      ['not', 'cargo', 'is', null],
    ]);
  });
});

describe('chips', () => {
  const f = { ...FILTRO_VACIO, q: 'ana', estados: ['nuevo'], condiciones: [{ campo: 'rubro', op: 'eq' as const, valor: 'X' }] };
  it('describe cada filtro activo', () => {
    expect(describirFiltro(f, () => '').map((c) => c.texto)).toEqual(['Búsqueda: ana', 'Estado: nuevo', 'rubro = X']);
  });
  it('quita un filtro por clave', () => {
    expect(quitarDeFiltro(f, 'cond:0').condiciones).toEqual([]);
    expect(quitarDeFiltro(f, 'q').q).toBeUndefined();
  });
});
