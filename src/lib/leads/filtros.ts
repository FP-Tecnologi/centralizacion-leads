import { esNucleo } from '../../../supabase/functions/_shared/lead';

export type Operador = 'eq' | 'neq' | 'contiene' | 'gte' | 'lte' | 'vacio' | 'no_vacio';
export interface Condicion { campo: string; op: Operador; valor?: string }
export interface FiltroLeads { q?: string; fuentes?: string[]; estados?: string[]; desde?: string; hasta?: string; condiciones: Condicion[] }
export interface ConsultaFiltrable {
  eq(c: string, v: unknown): this; neq(c: string, v: unknown): this; ilike(c: string, v: string): this;
  gte(c: string, v: unknown): this; lte(c: string, v: unknown): this; in(c: string, v: unknown[]): this;
  is(c: string, v: null): this; not(c: string, op: string, v: unknown): this; or(expr: string): this;
}

export const FILTRO_VACIO: FiltroLeads = { condiciones: [] };
export const OPERADORES: Record<Operador, string> = {
  eq: '=', neq: '≠', contiene: 'contiene', gte: '≥', lte: '≤', vacio: 'está vacío', no_vacio: 'no está vacío',
};

const CLAVE_OK = /^[a-z0-9_]+$/i;
const COLUMNAS_DIRECTAS = new Set(['status', 'evento', 'created_at', 'actualizado_en', 'fuente_id']);

export function columna(campo: string): string {
  if (!CLAVE_OK.test(campo)) throw new Error(`campo inválido: ${campo}`);
  return esNucleo(campo) || COLUMNAS_DIRECTAS.has(campo) ? campo : `extra->>${campo}`;
}

// PostgREST usa , ( ) como sintaxis dentro de or(): se quitan del texto buscado.
const limpiar = (s: string) => s.replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
const BUSCABLES = ['nombres', 'apellido', 'email', 'empresa', 'telefono', 'ruc'];

export function aplicarFiltro<Q extends ConsultaFiltrable>(q: Q, f: FiltroLeads): Q {
  const texto = f.q ? limpiar(f.q) : '';
  if (texto) q = q.or(BUSCABLES.map((c) => `${c}.ilike.*${texto}*`).join(','));
  if (f.fuentes?.length) q = q.in('fuente_id', f.fuentes);
  if (f.estados?.length) q = q.in('status', f.estados);
  if (f.desde) q = q.gte('created_at', `${f.desde}T00:00:00-05:00`);
  if (f.hasta) q = q.lte('created_at', `${f.hasta}T23:59:59.999-05:00`);
  for (const c of f.condiciones) {
    const col = columna(c.campo);
    const v = c.valor ?? '';
    switch (c.op) {
      case 'eq': q = q.eq(col, v); break;
      case 'neq': q = q.neq(col, v); break;
      case 'contiene': q = q.ilike(col, `%${v}%`); break;
      case 'gte': q = q.gte(col, v); break;
      case 'lte': q = q.lte(col, v); break;
      case 'vacio': q = q.or(`${col}.is.null,${col}.eq.`); break;
      case 'no_vacio': q = q.not(col, 'is', null); break;
    }
  }
  return q;
}

export function describirFiltro(f: FiltroLeads, nombreFuente: (id: string) => string): { clave: string; texto: string }[] {
  const out: { clave: string; texto: string }[] = [];
  if (f.q) out.push({ clave: 'q', texto: `Búsqueda: ${f.q}` });
  if (f.fuentes?.length) out.push({ clave: 'fuentes', texto: `Fuente: ${f.fuentes.map(nombreFuente).join(', ')}` });
  if (f.estados?.length) out.push({ clave: 'estados', texto: `Estado: ${f.estados.join(', ')}` });
  if (f.desde) out.push({ clave: 'desde', texto: `Desde ${f.desde}` });
  if (f.hasta) out.push({ clave: 'hasta', texto: `Hasta ${f.hasta}` });
  f.condiciones.forEach((c, i) => out.push({
    clave: `cond:${i}`,
    texto: `${c.campo} ${OPERADORES[c.op]}${c.op === 'vacio' || c.op === 'no_vacio' ? '' : ` ${c.valor ?? ''}`}`,
  }));
  return out;
}

export function quitarDeFiltro(f: FiltroLeads, clave: string): FiltroLeads {
  if (clave.startsWith('cond:')) {
    const i = Number(clave.slice(5));
    return { ...f, condiciones: f.condiciones.filter((_, j) => j !== i) };
  }
  const copia = { ...f };
  delete copia[clave as 'q' | 'fuentes' | 'estados' | 'desde' | 'hasta'];
  return copia;
}
