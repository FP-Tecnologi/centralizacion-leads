// Lógica única de normalización/validación de leads. La usan la app Next
// (import relativo) y las Edge Functions (Deno). Sin dependencias: debe
// correr igual en ambos runtimes.

export const NUCLEO = [
  'nombres', 'apellido', 'email', 'telefono', 'empresa', 'ruc', 'cargo', 'rubro', 'fecha_nacimiento',
] as const;
export type CampoNucleo = typeof NUCLEO[number];
export type TipoCampo = 'texto' | 'email' | 'telefono' | 'fecha' | 'numero' | 'opcion' | 'documento';
export interface CampoFormulario { key: string; label: string; tipo: TipoCampo; requerido: boolean; opciones?: string[] }
export interface LeadEntrada { [k: string]: unknown; extra: Record<string, string> }
export interface ErrorCampo { campo: string; motivo: 'requerido' | 'formato' | 'contacto' }

export function esNucleo(k: string): k is CampoNucleo {
  return (NUCLEO as readonly string[]).includes(k);
}

// Debe reflejar public._claves_reservadas() en
// supabase/migrations/20260924000001_columnas_extra.sql: núcleo + columnas reales de
// `leads` + las dos que la vista leads_completo siempre agrega (join con fuentes). Una
// clave extra generada en el cliente (p.ej. el wizard de importación armando "Campo
// nuevo: <encabezado>") nunca debe caer en ninguna de estas — el check de la tabla las
// rechaza con 23514.
export const CLAVES_RESERVADAS = [
  ...NUCLEO,
  'status', 'extra', 'id', 'fuente_id', 'created_at', 'actualizado_en', 'duplicado_de',
  'id_externo', 'origen', 'user_agent', 'evento', 'invalidos', 'fuente_slug', 'fuente_nombre',
] as const;

export function esClaveReservada(k: string): boolean {
  return (CLAVES_RESERVADAS as readonly string[]).includes(k);
}

const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

function normalizar(key: string, v: string): string {
  if (key === 'email') return v.toLowerCase();
  if (key === 'telefono') return v.replace(/[\s\-()]/g, '');
  if (key === 'fecha_nacimiento') {
    const m = DMY.exec(v);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v;
  }
  return v;
}

export function separarLead(datos: Record<string, unknown>): LeadEntrada {
  const out: LeadEntrada = { extra: {} };
  for (const [k, raw] of Object.entries(datos)) {
    if (raw === null || raw === undefined || k === 'extra') continue;
    const v = normalizar(k, String(raw).trim());
    if (v === '') continue;
    if (esNucleo(k)) out[k] = v;
    else out.extra[k] = v;
  }
  return out;
}

const RE: Partial<Record<TipoCampo, RegExp>> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  telefono: /^\+?\d{6,15}$/,
  documento: /^\d{8}(\d{3})?$/,
  numero: /^-?\d+(\.\d+)?$/,
};

function fechaValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function valor(lead: LeadEntrada, key: string): string | undefined {
  const v = esNucleo(key) ? lead[key] : lead.extra[key];
  return typeof v === 'string' ? v : undefined;
}

export function validarLead(lead: LeadEntrada, campos: CampoFormulario[]): ErrorCampo[] {
  const errores: ErrorCampo[] = [];
  const tipos: Record<string, CampoFormulario> = {};
  for (const c of campos) tipos[c.key] = c;
  // Tipos implícitos del núcleo aunque la fuente no los declare.
  tipos.email ??= { key: 'email', label: 'Correo', tipo: 'email', requerido: false };
  tipos.telefono ??= { key: 'telefono', label: 'Teléfono', tipo: 'telefono', requerido: false };
  tipos.fecha_nacimiento ??= { key: 'fecha_nacimiento', label: 'Fecha', tipo: 'fecha', requerido: false };

  for (const c of Object.values(tipos)) {
    const v = valor(lead, c.key);
    if (v === undefined) {
      if (c.requerido) errores.push({ campo: c.key, motivo: 'requerido' });
      continue;
    }
    const ok = c.tipo === 'fecha' ? fechaValida(v)
      : c.tipo === 'opcion' ? (c.opciones ?? []).includes(v)
      : RE[c.tipo]?.test(v) ?? true;
    if (!ok) errores.push({ campo: c.key, motivo: 'formato' });
  }
  if (!valor(lead, 'email') && !valor(lead, 'telefono') && !errores.some((e) => e.campo === 'email' || e.campo === 'telefono')) {
    errores.push({ campo: 'email', motivo: 'contacto' });
  }
  return errores;
}
