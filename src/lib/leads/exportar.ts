import type { Lead } from './datos';

export interface FilaLeida { fila: number; datos: Record<string, unknown> }

// Cabeceras/valores que Excel/Sheets pueden interpretar como fórmula al abrir el CSV
// (inyección CSV / "formula injection"): se neutralizan anteponiendo una comilla simple.
const RE_INYECCION = /^[=+\-@\t\r]/;
export function sanitizarCsv(v: string): string {
  return RE_INYECCION.test(v) ? `'${v}` : v;
}

function letraColumna(i: number): string {
  let n = i;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function decodificarCsv(buf: ArrayBuffer): string {
  // UTF-8 sin BOM es el caso normal (Excel/Sheets/Numbers lo exportan así); si los bytes
  // no son UTF-8 válido, es casi seguro un CSV legado en windows-1252 (Excel "CSV" clásico).
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

/**
 * Núcleo puro de lectura: recibe los bytes ya en memoria (ArrayBuffer) + el nombre de
 * archivo (para decidir csv vs xlsx/xls), sin depender de File/Blob — así se puede probar
 * con buffers construidos en el propio test, sin DOM.
 *
 * dateNF va en XLSX.read (no en sheet_to_json): en SheetJS 0.20.3 el dateNF de
 * sheet_to_json se ignora y una celda de fecha real (formato 14) sale como "3/15/23" en
 * vez de "2023-03-15" — verificado. Puesto en XLSX.read sí formatea la fecha como texto ISO.
 */
export async function parsearBuffer(buf: ArrayBuffer, nombreArchivo: string): Promise<{ encabezados: string[]; filas: FilaLeida[] }> {
  const XLSX = await import('xlsx');
  const esCsv = /\.csv$/i.test(nombreArchivo);
  const wb = esCsv
    ? XLSX.read(decodificarCsv(buf), { type: 'string', dateNF: 'yyyy-mm-dd' })
    : XLSX.read(buf, { dateNF: 'yyyy-mm-dd' });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const crudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '', raw: false });

  // Los encabezados deben ser EXACTAMENTE las claves que sheet_to_json ya generó para las
  // filas (mismo dedup "Email"/"Email_1" que aplica ahí) — si no, la 2ª columna duplicada
  // nunca se lee y las claves de React chocan. Encabezado en blanco → columna_<letra>.
  const clavesOriginales = crudas.length ? Object.keys(crudas[0]) : (XLSX.utils.sheet_to_json<string[]>(hoja, { header: 1 })[0] ?? []).map(String);
  const encabezados = clavesOriginales.map((k, i) => (k === '' ? `columna_${letraColumna(i)}` : k));

  const filas: FilaLeida[] = crudas.map((original, i) => {
    // sheet_to_json salta filas totalmente vacías, así que i+2 se desalinea en cuanto hay
    // una: __rowNum__ es el índice 0-based real dentro de la hoja (0 = fila de encabezado),
    // así que la fila de Excel que ve el usuario es __rowNum__ + 1.
    const rowNum = (original as { __rowNum__?: number }).__rowNum__;
    const fila = rowNum !== undefined ? rowNum + 1 : i + 2;
    const datos: Record<string, unknown> = {};
    clavesOriginales.forEach((k, idx) => { datos[encabezados[idx]] = original[k]; });
    return { fila, datos };
  });
  return { encabezados, filas };
}

export async function leerArchivo(file: File): Promise<{ encabezados: string[]; filas: FilaLeida[] }> {
  return parsearBuffer(await file.arrayBuffer(), file.name);
}

export function valorColumna(l: Lead, key: string): string {
  if (key === 'nombre') return `${l.nombres ?? ''} ${l.apellido ?? ''}`.trim();
  if (key === 'fuente') return l.fuentes?.nombre ?? '';
  const v = (l as unknown as Record<string, unknown>)[key];
  if (v !== undefined && v !== null && typeof v !== 'object') return String(v);
  return l.extra?.[key] ?? '';
}

export async function exportarLeads(leads: Lead[], columnas: { key: string; label: string }[], formato: 'xlsx' | 'csv', nombre: string) {
  const XLSX = await import('xlsx');
  const filas = leads.map((l) => Object.fromEntries(columnas.map((c) => {
    const v = valorColumna(l, c.key);
    return [c.label, formato === 'csv' ? sanitizarCsv(v) : v];
  })));
  const hoja = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, 'Leads');
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}

/**
 * Exporta filas "crudas" (clave de columna → valor) tal cual, sin pasar por valorColumna
 * (que tiene casos especiales para "nombre"/"fuente" de Lead y por eso pierde columnas con
 * esos nombres literales cuando las filas no son Leads — p.ej. el CSV de errores de
 * importación, que puede traer una columna del archivo llamada "nombre").
 */
export async function exportarObjetos(filas: Record<string, unknown>[], columnas: string[], formato: 'xlsx' | 'csv', nombre: string) {
  const XLSX = await import('xlsx');
  const out = filas.map((f) => Object.fromEntries(columnas.map((c) => {
    const v = f[c];
    const s = v === undefined || v === null ? '' : String(v);
    return [c, formato === 'csv' ? sanitizarCsv(s) : s];
  })));
  const hoja = XLSX.utils.json_to_sheet(out);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, 'Datos');
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}
