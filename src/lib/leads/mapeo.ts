import { esNucleo, separarLead, validarLead, type CampoFormulario, type ErrorCampo, type LeadEntrada } from '../../../supabase/functions/_shared/lead';

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
  apellido: 'apellido', apellidos: 'apellido', last_name: 'apellido', apellido_paterno: 'apellido',
  email: 'email', e_mail: 'email', correo: 'email', correo_electronico: 'email', mail: 'email',
  telefono: 'telefono', celular: 'telefono', movil: 'telefono', whatsapp: 'telefono', phone: 'telefono',
  telefono_celular: 'telefono', numero_de_celular: 'telefono', celular_1: 'telefono',
  empresa: 'empresa', razon_social: 'empresa', compania: 'empresa', company: 'empresa',
  ruc: 'ruc', dni: 'ruc', ruc_dni: 'ruc', documento: 'ruc',
  cargo: 'cargo', puesto: 'cargo', rubro: 'rubro', sector: 'rubro', industria: 'rubro',
  fecha_nacimiento: 'fecha_nacimiento', cumpleanos: 'fecha_nacimiento', nacimiento: 'fecha_nacimiento',
  fecha_de_nacimiento: 'fecha_nacimiento', fecha_nac: 'fecha_nacimiento',
  f_nacimiento: 'fecha_nacimiento', nacimiento_fecha: 'fecha_nacimiento',
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

// Fila de entrada a construirFilas: `fila` es el número real de fila de Excel (1-based,
// contando el encabezado) cuando se conoce (viene de parsearBuffer/FilaLeida); si no se da,
// se cae a i+2 (posición + fila de encabezado), asumiendo filas contiguas sin huecos.
export interface FilaEntrada { fila?: number; datos: Record<string, unknown> }

function vacio(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

// Clave libre para guardar el valor "sobrante" de una columna en conflicto: no puede ser
// un campo núcleo (esos van directo a esa propiedad, no a extra) ni una clave ya usada en
// `datos` — si no, pisaría al propio destino (p.ej. "Teléfono" normaliza a "telefono", que
// es exactamente el destino que se quiere proteger) o a otro valor ya guardado.
function claveExtraLibre(base: string, datos: Record<string, unknown>): string {
  let candidata = base;
  let n = 2;
  while (esNucleo(candidata) || Object.prototype.hasOwnProperty.call(datos, candidata)) {
    candidata = `${base}_${n}`;
    n += 1;
  }
  return candidata;
}

const ISO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DMY_FECHA = /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/;
const NUMERO = /^-?\d+(\.\d+)?$/;

// Documento (DNI/RUC/teléfono) suele venir como texto numérico: no debe volverse 'numero'
// (perdería ceros a la izquierda y no tiene sentido sumarlo/ordenarlo como cantidad).
function pareceDocumento(v: string): boolean {
  const entero = v.replace('-', '').split('.')[0];
  return (entero.length > 1 && entero[0] === '0') || entero.length >= 8;
}

export function inferirTipo(valores: string[]): 'texto' | 'fecha' | 'numero' {
  const vistos = valores.map((v) => v.trim()).filter((v) => v !== '');
  if (!vistos.length) return 'texto';
  if (vistos.every((v) => ISO_FECHA.test(v) || DMY_FECHA.test(v))) return 'fecha';
  if (vistos.every((v) => NUMERO.test(v) && !pareceDocumento(v))) return 'numero';
  return 'texto';
}

export function construirFilas(filas: FilaEntrada[], mapeo: Mapeo, campos: CampoFormulario[]) {
  const validas: { fila: number; lead: LeadEntrada }[] = [];
  const errores: { fila: number; errores: ErrorCampo[]; original: Record<string, unknown> }[] = [];
  filas.forEach(({ fila: filaNum, datos: original }, i) => {
    const datos: Record<string, unknown> = {};
    for (const [h, destino] of Object.entries(mapeo)) {
      if (!destino) continue;
      const valor = original[h];
      if (vacio(datos[destino])) {
        // primer valor visto para este destino (o el único no vacío hasta ahora): se guarda.
        datos[destino] = valor;
      } else if (!vacio(valor) && String(valor).trim() !== String(datos[destino]).trim()) {
        // dos columnas distintas mapeadas al mismo destino, ambas con datos y diferentes:
        // no pisar la primera — la segunda se guarda aparte, en una clave que no choque ni
        // con el destino ni con otra ya usada.
        datos[claveExtraLibre(normalizarEncabezado(h), datos)] = valor;
      }
      // valor vacío y el destino ya tiene algo: no se toca (el llenado gana sobre el blanco).
    }
    const lead = separarLead(datos);
    const errs = validarLead(lead, campos);
    const fila = filaNum ?? i + 2;
    if (errs.length) errores.push({ fila, errores: errs, original });
    else validas.push({ fila, lead });
  });
  return { validas, errores };
}
