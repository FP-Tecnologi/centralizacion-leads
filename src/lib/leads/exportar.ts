import type { Lead } from './datos';

export async function leerArchivo(file: File) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: false });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  // raw:false + dateNF → las fechas de Excel llegan como texto ISO, no como número serial.
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
  const encabezados = (XLSX.utils.sheet_to_json<string[]>(hoja, { header: 1 })[0] ?? []).map(String);
  return { encabezados, filas };
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
  const filas = leads.map((l) => Object.fromEntries(columnas.map((c) => [c.label, valorColumna(l, c.key)])));
  const hoja = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, 'Leads');
  XLSX.writeFile(wb, `${nombre}.${formato}`, { bookType: formato });
}
