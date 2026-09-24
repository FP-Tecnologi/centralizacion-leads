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
 * Todo se lee en modo posicional (`header: 1`, arrays) en vez de modo-objeto: el modo-objeto
 * de sheet_to_json arma las claves con `Object.keys`, y JS reordena las claves que parecen
 * enteras (p.ej. un encabezado "2024") al principio del objeto sin importar el orden de
 * inserción — así se perdía el orden real de columnas. Con arrays no hay reordenamiento
 * posible, y de paso controlamos nosotros mismos el nombre de cada columna (encabezado en
 * blanco → columna_<letra> por posición; encabezado repetido → sufijo _1, _2…) en vez de
 * depender de que SheetJS use "__EMPTY"/"Email_1" — mismo resultado, sin acoplarnos a su
 * convención interna.
 *
 * dateNF va en XLSX.read, no en sheet_to_json: en SheetJS 0.20.3 el dateNF de sheet_to_json
 * se ignora y una celda de fecha real (formato 14) sale como "3/15/23" en vez de
 * "2023-03-15" — verificado. Puesto en XLSX.read sí formatea la fecha como texto ISO.
 *
 * Para CSV NO se pasa dateNF: un CSV no tiene celdas de fecha reales, solo texto, y dateNF
 * hace que XLSX intente reinterpretar texto tipo "03/04/2023" como fecha y lo reescriba como
 * "2023-03-04" (mes/día invertidos) — regresión verificada. `raw: true` deja el texto del CSV
 * tal cual el usuario lo escribió (incluye ceros a la izquierda); `separarLead` ya convierte
 * DD/MM/YYYY → ISO para `fecha_nacimiento` más adelante en el flujo.
 */
export async function parsearBuffer(buf: ArrayBuffer, nombreArchivo: string): Promise<{ encabezados: string[]; filas: FilaLeida[] }> {
  const XLSX = await import('xlsx');
  const esCsv = /\.csv$/i.test(nombreArchivo);
  const wb = esCsv
    ? XLSX.read(decodificarCsv(buf), { type: 'string', raw: true })
    : XLSX.read(buf, { dateNF: 'yyyy-mm-dd' });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const filasCrudas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: '', raw: false });
  if (!filasCrudas.length) return { encabezados: [], filas: [] };

  const cabecera = filasCrudas[0].map(String);
  const vistos = new Map<string, number>();
  const encabezados = cabecera.map((h, i) => {
    const base = h === '' ? `columna_${letraColumna(i)}` : h;
    const n = vistos.get(base) ?? 0;
    vistos.set(base, n + 1);
    return n === 0 ? base : `${base}_${n}`;
  });

  const filas: FilaLeida[] = [];
  for (let i = 1; i < filasCrudas.length; i++) {
    const cruda = filasCrudas[i];
    // header:1 no salta filas vacías (a diferencia del modo-objeto): las saltamos nosotros,
    // así que el índice de fila i (0-based, 0 = encabezado) sigue siendo la fila real de
    // Excel (1-based) sin necesidad de __rowNum__.
    if (cruda.every((v) => String(v ?? '').trim() === '')) continue;
    const datos: Record<string, unknown> = {};
    encabezados.forEach((h, idx) => { datos[h] = cruda[idx] ?? ''; });
    filas.push({ fila: i + 1, datos });
  }
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
  // los encabezados de la hoja son las `label` — también hay que sanearlos en CSV, no solo
  // las celdas: un `label` de columna personalizada (viene de un encabezado de archivo
  // importado, ver mapeo.ts) puede empezar con = + - @ igual que cualquier valor.
  const etiqueta = (l: string) => (formato === 'csv' ? sanitizarCsv(l) : l);
  const filas = leads.map((l) => Object.fromEntries(columnas.map((c) => {
    const v = valorColumna(l, c.key);
    return [etiqueta(c.label), formato === 'csv' ? sanitizarCsv(v) : v];
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
  // `columnas` son encabezados tal cual vinieron del archivo importado: en CSV hay que
  // sanearlos igual que las celdas (ver exportarLeads).
  const etiquetas = formato === 'csv' ? columnas.map(sanitizarCsv) : columnas;
  const out = filas.map((f) => Object.fromEntries(columnas.map((c, i) => {
    const v = f[c];
    const s = v === undefined || v === null ? '' : String(v);
    return [etiquetas[i], formato === 'csv' ? sanitizarCsv(s) : s];
  })));
  const hoja = XLSX.utils.json_to_sheet(out);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, 'Datos');
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}
