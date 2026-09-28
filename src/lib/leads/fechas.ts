// Conversión de fechas que llegan de archivos importados a ISO (yyyy-mm-dd), el único
// formato que `upsert_lead`/`leads_completo` (SQL) saben castear.

// Excel guarda una fecha como número de días desde 1899-12-30 (serial), p.ej. 46281 =
// 2026-09-16. Un CSV exportado desde una hoja sin formato de fecha trae ese número tal
// cual. Se calcula en UTC para no correr un día según la zona horaria del navegador.
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);
// 2958465 = 9999-12-31, el serial más alto que Excel acepta.
const SERIAL_MAX = 2958465;

export function serialExcelAISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > SERIAL_MAX) return null;
  const d = new Date(EPOCA_EXCEL + Math.floor(serial) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

const MESES: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

function iso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Intenta leer `v` como fecha y devolverla en ISO. Acepta:
 *  - ISO (2026-09-16), también con hora (2026-09-16 10:30 / 2026-09-16T10:30:00Z)
 *  - DD/MM/AAAA y DD-MM-AAAA (formato peruano: día primero)
 *  - 16-Sep-2026 / 16 set 2026 (mes abreviado en español o inglés)
 *  - serial de Excel (46281) solo si `permitirSerial`: un número suelto solo es fecha
 *    cuando la columna ya se sabe de fecha, si no "46281" podría ser cualquier cosa.
 * Devuelve null si no reconoce el valor.
 */
export function aFechaISO(v: string, permitirSerial = false): string | null {
  const s = v.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s.*)?$/.exec(s);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = /^(\d{1,2})[\s/.-]+([a-zA-Z]{3,})\.?[\s/.-]+(\d{4})$/.exec(s);
  if (m) {
    const mes = MESES[m[2].slice(0, 3).toLowerCase()];
    return mes ? iso(+m[3], mes, +m[1]) : null;
  }
  if (permitirSerial && /^\d+(\.\d+)?$/.test(s)) return serialExcelAISO(Number(s));
  return null;
}
