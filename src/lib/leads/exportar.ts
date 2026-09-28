import type { Lead } from './datos';
import { serialExcelAISO } from './fechas';

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

type SheetJS = typeof import('xlsx');
type Celda = { t?: string; v?: unknown; w?: string; z?: string | number };

/**
 * Valor de una celda de Excel como texto, sin depender del formato visual de la hoja:
 *  - fecha real (número con formato de fecha, sea cual sea: "d-mmm-yyyy", "dd/mm/yy"…)
 *    → ISO yyyy-mm-dd. Antes se usaba el texto formateado y "16-Sep-2026" llegaba tal cual.
 *  - número entero → sus dígitos exactos (RUC 20613344548 o un teléfono de 15 dígitos no
 *    deben salir "2.06E+10" ni "20,613,344,548" por el formato de la celda).
 *  - decimal → hasta 15 cifras significativas (lo que Excel realmente guarda).
 *  - celda de error (#N/A, #REF!) → vacío.
 */
function celdaExcelATexto(XLSX: SheetJS, c: Celda | undefined): string {
  if (!c || c.v === undefined || c.v === null) return '';
  if (c.t === 'e') return '';
  if (c.t === 'd' && c.v instanceof Date) return c.v.toISOString().slice(0, 10);
  if (c.t === 'n' && typeof c.v === 'number') {
    const fmt = typeof c.z === 'string' ? c.z : typeof c.z === 'number' ? XLSX.SSF.get_table()[c.z] : undefined;
    if (fmt && XLSX.SSF.is_date(fmt)) return serialExcelAISO(c.v) ?? String(c.v);
    if (Number.isInteger(c.v)) return BigInt(c.v).toString();
    return String(Number(c.v.toPrecision(15)));
  }
  if (c.t === 'b') return c.v ? 'VERDADERO' : 'FALSO';
  return String(c.v);
}

// Devuelve también `primeraFila` (0-based): si la hoja no empieza en A1 (p.ej. un título
// arriba o datos desde B3), el número de fila que se reporta sigue siendo el real de Excel.
function grillaExcel(XLSX: SheetJS, hoja: import('xlsx').WorkSheet | undefined): { grilla: string[][]; primeraFila: number } {
  if (!hoja || !hoja['!ref']) return { grilla: [], primeraFila: 0 };
  const rango = XLSX.utils.decode_range(hoja['!ref']);
  const out: string[][] = [];
  for (let r = rango.s.r; r <= rango.e.r; r++) {
    const fila: string[] = [];
    for (let c = rango.s.c; c <= rango.e.c; c++) {
      fila.push(celdaExcelATexto(XLSX, hoja[XLSX.utils.encode_cell({ r, c })] as Celda | undefined));
    }
    out.push(fila);
  }
  return { grilla: out, primeraFila: rango.s.r };
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
 * Excel (.xlsx/.xls) se lee celda por celda con celdaExcelATexto en vez de usar el texto
 * formateado de SheetJS: el dateNF de XLSX.read solo reescribía el formato de fecha por
 * defecto (14), y una fecha con formato propio ("d-mmm-yyyy", como en los consolidados de
 * EXPOMINA) llegaba como "16-Sep-2026"; igual un número con formato "#,##0" llegaba con
 * comas y uno de 12+ dígitos en notación científica.
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
  let filasCrudas: unknown[][];
  let primeraFila = 0;
  if (esCsv) {
    const wb = XLSX.read(decodificarCsv(buf), { type: 'string', raw: true });
    filasCrudas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
  } else {
    // cellNF: conserva el formato numérico de cada celda (.z) para distinguir una fecha real
    // de un número cualquiera sin depender del texto formateado (ver celdaExcelATexto).
    const wb = XLSX.read(buf, { cellNF: true });
    ({ grilla: filasCrudas, primeraFila } = grillaExcel(XLSX, wb.Sheets[wb.SheetNames[0]]));
  }
  // el encabezado es la primera fila con algo escrito (una hoja puede traer filas vacías arriba).
  const vaciaFila = (f: unknown[]) => f.every((v) => String(v ?? '').trim() === '');
  const iCabecera = filasCrudas.findIndex((f) => !vaciaFila(f));
  if (iCabecera < 0) return { encabezados: [], filas: [] };

  // BOM (U+FEFF) pegado al primer encabezado de un CSV "UTF-8 con BOM" de Excel, y espacios
  // de más: "<BOM>ID " debe leerse "ID", si no ninguna regla de mapeo lo reconoce.
  const cabecera = filasCrudas[iCabecera].map((h) => String(h ?? '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim());
  const vistos = new Map<string, number>();
  const encabezados = cabecera.map((h, i) => {
    const base = h === '' ? `columna_${letraColumna(i)}` : h;
    const n = vistos.get(base) ?? 0;
    vistos.set(base, n + 1);
    return n === 0 ? base : `${base}_${n}`;
  });

  const filas: FilaLeida[] = [];
  for (let i = iCabecera + 1; i < filasCrudas.length; i++) {
    const cruda = filasCrudas[i];
    // las filas vacías se saltan acá, pero el número reportado sigue siendo la fila real de
    // Excel (1-based): índice en la grilla + fila donde empieza la hoja + 1.
    if (vaciaFila(cruda)) continue;
    const datos: Record<string, unknown> = {};
    encabezados.forEach((h, idx) => { datos[h] = cruda[idx] ?? ''; });
    filas.push({ fila: primeraFila + i + 1, datos });
  }
  return { encabezados, filas };
}

export async function leerArchivo(file: File): Promise<{ encabezados: string[]; filas: FilaLeida[] }> {
  return parsearBuffer(await file.arrayBuffer(), file.name);
}

// Fecha/hora de un timestamp de la base en hora de Lima, legible en Excel ("2026-09-16 10:30")
// en vez del ISO UTC crudo ("2026-09-16T15:30:00+00:00").
const FMT_LIMA = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
export function fechaHoraLima(ts: string): string {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : FMT_LIMA.format(d);
}

export function valorColumna(l: Lead, key: string): string {
  if (key === 'nombre') return `${l.nombres ?? ''} ${l.apellido ?? ''}`.trim();
  if (key === 'fuente') return l.fuentes?.nombre ?? '';
  const v = (l as unknown as Record<string, unknown>)[key];
  if ((key === 'created_at' || key === 'actualizado_en') && typeof v === 'string') return fechaHoraLima(v);
  if (v !== undefined && v !== null && typeof v !== 'object') return String(v);
  return l.extra?.[key] ?? '';
}

// Hoja de Excel legible: ancho de columna según el contenido (tope 60) y autofiltro en el
// encabezado. Todo va como texto: un RUC/DNI/teléfono no pierde ceros ni sale en notación
// científica al abrirlo.
function hojaExcel(XLSX: SheetJS, encabezados: string[], filas: string[][]) {
  const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  hoja['!cols'] = encabezados.map((h, i) => ({
    wch: Math.min(60, Math.max(h.length, ...filas.slice(0, 500).map((f) => (f[i] ?? '').length)) + 2),
  }));
  if (encabezados.length) {
    hoja['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: encabezados.length - 1 } }) };
  }
  return hoja;
}

export async function exportarLeads(leads: Lead[], columnas: { key: string; label: string }[], formato: 'xlsx' | 'csv', nombre: string) {
  const XLSX = await import('xlsx');
  // los encabezados de la hoja son las `label` — también hay que sanearlos en CSV, no solo
  // las celdas: un `label` de columna personalizada (viene de un encabezado de archivo
  // importado, ver mapeo.ts) puede empezar con = + - @ igual que cualquier valor.
  const limpiar = (v: string) => (formato === 'csv' ? sanitizarCsv(v) : v);
  // si algún lead trae datos marcados al importar, una columna más al final con las causas:
  // en Excel no hay colores de la tabla, pero sí se puede filtrar por esa columna.
  const conMarcas = leads.some((l) => l.invalidos && Object.keys(l.invalidos).length);
  const causas = (l: Lead) => Object.values(l.invalidos ?? {}).map((m) => m.causa).join('; ');
  const encabezados = [...columnas.map((c) => limpiar(c.label)), ...(conMarcas ? ['Datos a revisar'] : [])];
  const filas = leads.map((l) => [
    ...columnas.map((c) => limpiar(valorColumna(l, c.key))),
    ...(conMarcas ? [limpiar(causas(l))] : []),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hojaExcel(XLSX, encabezados, filas), 'Leads');
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}

/**
 * Exporta filas "crudas" (clave de columna → valor) tal cual, sin pasar por valorColumna
 * (que tiene casos especiales para "nombre"/"fuente" de Lead y por eso pierde columnas con
 * esos nombres literales cuando las filas no son Leads — p.ej. el registro de fallas de
 * importación, que puede traer una columna del archivo llamada "nombre").
 */
export async function exportarObjetos(filas: Record<string, unknown>[], columnas: string[], formato: 'xlsx' | 'csv', nombre: string, hojaNombre = 'Datos') {
  const XLSX = await import('xlsx');
  // `columnas` son encabezados tal cual vinieron del archivo importado: en CSV hay que
  // sanearlos igual que las celdas (ver exportarLeads).
  const limpiar = (v: string) => (formato === 'csv' ? sanitizarCsv(v) : v);
  const out = filas.map((f) => columnas.map((c) => {
    const v = f[c];
    return limpiar(v === undefined || v === null ? '' : String(v));
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hojaExcel(XLSX, columnas.map(limpiar), out), hojaNombre);
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}

export interface FallaImportacion { fila: number; causas: string[]; etapa: 'validacion' | 'servidor'; original: Record<string, unknown> }

/**
 * Registro de observaciones de una importación en Excel: una fila por fila del archivo que
 * se importó con datos a revisar o que no se pudo guardar, con el número de fila original,
 * la causa en palabras, el resultado y los datos tal cual venían.
 */
export function filasRegistroFallas(fallas: FallaImportacion[], encabezados: string[]) {
  // nombres de las columnas propias del registro: si el archivo ya trae una columna
  // "Fila"/"Causa del error" no se pisa, se renombra la del registro.
  const libre = (base: string) => {
    let n = base;
    for (let i = 2; encabezados.includes(n); i++) n = `${base} (${i})`;
    return n;
  };
  const colFila = libre('Fila en el archivo');
  const colCausa = libre('Causa');
  const colEtapa = libre('Resultado');
  const columnas = [colFila, colCausa, colEtapa, ...encabezados];
  const filas = [...fallas].sort((a, b) => a.fila - b.fila).map((f) => ({
    ...f.original,
    [colFila]: f.fila,
    [colCausa]: f.causas.join('; '),
    [colEtapa]: f.etapa === 'validacion' ? 'Importada, marcada para revisar' : 'No se guardó',
  }));
  return { columnas, filas };
}

export async function exportarRegistroFallas(fallas: FallaImportacion[], encabezados: string[], nombre: string) {
  const { columnas, filas } = filasRegistroFallas(fallas, encabezados);
  await exportarObjetos(filas, columnas, 'xlsx', nombre, 'Fallas');
}
