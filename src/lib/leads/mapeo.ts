import { separarLead, validarLead, type CampoFormulario, type ErrorCampo, type LeadEntrada } from '../../../supabase/functions/_shared/lead';

export type Mapeo = Record<string, string | null>;

export function normalizarEncabezado(h: string): string {
  return h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Debe coincidir con public.slugify (SQL): minúsculas, acentos fuera, no-alfanumérico → '-', sin '-' en las puntas.
export function slugify(h: string): string {
  return h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const SINONIMOS: Record<string, string> = {
  nombre: 'nombres', nombres: 'nombres', first_name: 'nombres',
  apellido: 'apellido', apellidos: 'apellido', last_name: 'apellido',
  email: 'email', e_mail: 'email', correo: 'email', correo_electronico: 'email', mail: 'email',
  telefono: 'telefono', celular: 'telefono', movil: 'telefono', whatsapp: 'telefono', phone: 'telefono',
  empresa: 'empresa', razon_social: 'empresa', compania: 'empresa', company: 'empresa',
  ruc: 'ruc', dni: 'ruc', ruc_dni: 'ruc', documento: 'ruc',
  cargo: 'cargo', puesto: 'cargo', rubro: 'rubro', sector: 'rubro', industria: 'rubro',
  fecha_nacimiento: 'fecha_nacimiento', cumpleanos: 'fecha_nacimiento', nacimiento: 'fecha_nacimiento',
};

export function sugerirMapeo(encabezados: string[], campos: CampoFormulario[]): Mapeo {
  const porCampo = new Map<string, string>();
  for (const c of campos) {
    porCampo.set(normalizarEncabezado(c.key), c.key);
    porCampo.set(normalizarEncabezado(c.label), c.key);
  }
  const out: Mapeo = {};
  for (const h of encabezados) {
    const n = normalizarEncabezado(h);
    out[h] = SINONIMOS[n] ?? porCampo.get(n) ?? (n || null);
  }
  return out;
}

export function construirFilas(filas: Record<string, unknown>[], mapeo: Mapeo, campos: CampoFormulario[]) {
  const validas: { fila: number; lead: LeadEntrada }[] = [];
  const errores: { fila: number; errores: ErrorCampo[]; original: Record<string, unknown> }[] = [];
  filas.forEach((original, i) => {
    const datos: Record<string, unknown> = {};
    for (const [h, destino] of Object.entries(mapeo)) if (destino) datos[destino] = original[h];
    const lead = separarLead(datos);
    const errs = validarLead(lead, campos);
    if (errs.length) errores.push({ fila: i + 2, errores: errs, original });
    else validas.push({ fila: i + 2, lead });
  });
  return { validas, errores };
}
