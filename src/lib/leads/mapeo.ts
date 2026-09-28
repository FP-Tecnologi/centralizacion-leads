import { aFechaISO } from './fechas';
import { esClaveReservada, esNucleo, separarLead, validarLead, type CampoFormulario, type ErrorCampo, type LeadEntrada } from '../../../supabase/functions/_shared/lead';

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

// Destinos que no son núcleo del lead pero tampoco van a `extra`: columnas reales de
// `leads` que solo la importación puede fijar (upsert_lead las lee aparte; ver migración
// 20260928000000_importar_estado_evento_fecha.sql). Las tres son claves reservadas, así
// que nunca chocan con una columna extra.
export const CAMPOS_IMPORTACION = ['status', 'evento', 'created_at'] as const;
export type CampoImportacion = typeof CAMPOS_IMPORTACION[number];
export function esCampoImportacion(k: string): k is CampoImportacion {
  return (CAMPOS_IMPORTACION as readonly string[]).includes(k);
}
// Destino que se guarda en su propia columna (no en extra ni como columna nueva).
export function esDestinoDirecto(k: string): boolean {
  return esNucleo(k) || esCampoImportacion(k);
}

export const LABEL_DESTINO: Record<string, string> = {
  nombres: 'Nombres', apellido: 'Apellido', email: 'Correo', telefono: 'Teléfono',
  empresa: 'Empresa', ruc: 'RUC/DNI', cargo: 'Cargo', rubro: 'Rubro', fecha_nacimiento: 'Fecha de nacimiento',
  status: 'Estado', evento: 'Evento', created_at: 'Fecha de registro',
};

export const ESTADOS_LEAD = ['nuevo', 'contactado', 'asistio', 'descartado'] as const;

// null = ignorar por defecto (el usuario puede elegir "Campo nuevo" igual en el paso 2).
const SINONIMOS: Record<string, string | null> = {
  nombre: 'nombres', nombres: 'nombres', first_name: 'nombres', contacto: 'nombres',
  nombre_completo: 'nombres', nombres_y_apellidos: 'nombres', nombre_y_apellido: 'nombres',
  apellido: 'apellido', apellidos: 'apellido', last_name: 'apellido', apellido_paterno: 'apellido',
  email: 'email', e_mail: 'email', correo: 'email', correo_electronico: 'email', mail: 'email',
  telefono: 'telefono', celular: 'telefono', movil: 'telefono', whatsapp: 'telefono', phone: 'telefono',
  telefono_celular: 'telefono', numero_de_celular: 'telefono', celular_1: 'telefono', tel: 'telefono', cel: 'telefono',
  empresa: 'empresa', razon_social: 'empresa', compania: 'empresa', company: 'empresa', cliente: 'empresa',
  ruc: 'ruc', dni: 'ruc', ruc_dni: 'ruc', dni_ruc: 'ruc', documento: 'ruc',
  cargo: 'cargo', puesto: 'cargo', rubro: 'rubro', sector: 'rubro', industria: 'rubro',
  fecha_nacimiento: 'fecha_nacimiento', cumpleanos: 'fecha_nacimiento', nacimiento: 'fecha_nacimiento',
  fecha_de_nacimiento: 'fecha_nacimiento', fecha_nac: 'fecha_nacimiento',
  f_nacimiento: 'fecha_nacimiento', nacimiento_fecha: 'fecha_nacimiento',
  estado: 'status', status: 'status', estatus: 'status',
  evento: 'evento', event: 'evento', feria: 'evento',
  fecha: 'created_at', fecha_registro: 'created_at', fecha_de_registro: 'created_at', created_at: 'created_at',
  fecha_captura: 'created_at', fecha_de_captura: 'created_at', fecha_contacto: 'created_at', fecha_de_contacto: 'created_at',
  // "Fuente"/"Origen" de un consolidado suele ser el archivo o el vendedor de donde salió la
  // fila: se guarda como columna extra con nombre propio. No "fuente" a secas, que en la
  // tabla/exportación ya es la fuente del sistema, ni "origen", que es columna reservada.
  fuente: 'fuente_origen', origen: 'fuente_origen', archivo: 'fuente_origen',
  // correlativo de la hoja (1, 2, 3…): no identifica al lead, solo agregaría ruido.
  id: null, n: null, no: null, nro: null, item: null, numero_de_fila: null,
};

// Reglas por palabra para encabezados compuestos que no están en SINONIMOS, p.ej.
// "Nombres / Contacto" → nombres, "Empresa / Cliente" → empresa, "Teléfono empresa" →
// teléfono. El orden importa: contacto primero (un "Correo de la empresa" es correo).
function destinoPorPalabras(n: string): string | undefined {
  const t = n.split('_').filter(Boolean);
  const tiene = (...ws: string[]) => t.some((w) => ws.includes(w));
  if (!t.length) return undefined;
  if (tiene('nacimiento', 'cumpleanos')) return 'fecha_nacimiento';
  if (tiene('correo', 'email', 'mail') || n.includes('e_mail')) return 'email';
  if (tiene('telefono', 'telefonos', 'celular', 'celulares', 'movil', 'whatsapp', 'phone', 'tel', 'cel')) return 'telefono';
  if (tiene('ruc', 'dni', 'documento')) return 'ruc';
  const empresa = tiene('empresa', 'compania', 'company', 'organizacion', 'institucion') || n.startsWith('razon_social');
  const [p] = t;
  if (p === 'apellido' || p === 'apellidos') return 'apellido';
  if (p === 'nombre' || p === 'nombres') return empresa ? 'empresa' : 'nombres';
  if (p === 'cargo' || p === 'puesto') return 'cargo';
  if (p === 'rubro' || p === 'sector' || p === 'industria') return 'rubro';
  if (p === 'estado' || p === 'status' || p === 'estatus') return 'status';
  if (p === 'evento') return 'evento';
  if (p === 'fecha' && tiene('registro', 'captura', 'ingreso', 'contacto', 'creacion', 'alta')) return 'created_at';
  if (empresa) return 'empresa';
  return undefined;
}

// Claves que la tabla/exportación ya usan para otra cosa (valorColumna/LeadsTable): una
// columna extra con ese nombre quedaría tapada. Se tratan como ocupadas.
export const CLAVES_UI = ['nombre', 'fuente'];

/**
 * Sugiere a qué campo va cada columna del archivo. Orden: sinónimo conocido → campo de la
 * fuente (por key o label) → columna extra ya registrada (por key o label) → regla por
 * palabras → columna extra nueva con el nombre del encabezado (nunca se pierde un dato).
 */
export function sugerirMapeo(encabezados: string[], campos: CampoFormulario[], columnasExtra: { key: string; label: string }[] = []): Mapeo {
  const porCampo = new Map<string, string>();
  for (const c of campos) {
    porCampo.set(normalizarEncabezado(c.key), c.key);
    porCampo.set(normalizarEncabezado(c.label), c.key);
  }
  const porExtra = new Map<string, string>();
  for (const c of columnasExtra) {
    porExtra.set(normalizarEncabezado(c.key), c.key);
    porExtra.set(normalizarEncabezado(c.label), c.key);
  }
  const out: Mapeo = {};
  for (const h of encabezados) {
    const n = normalizarEncabezado(h);
    if (!n) { out[h] = null; continue; }
    if (Object.prototype.hasOwnProperty.call(SINONIMOS, n)) { out[h] = SINONIMOS[n]; continue; }
    const directo = porCampo.get(n) ?? porExtra.get(n) ?? destinoPorPalabras(n);
    // sin match: columna extra nueva. claveDestinoSegura sufija si el nombre es reservado
    // ("origen", "user_agent"…) o lo usa la tabla; si ya existía como extra, lo tomó porExtra.
    out[h] = directo ?? claveDestinoSegura(n, CLAVES_UI);
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

// 63 = límite real de un identificador de Postgres (mismo tope que el check de
// columnas_extra.key en la migración SQL). Un encabezado de archivo largo (o que
// normaliza a un nombre reservado, o que choca con una columna ya ocupada) no puede
// mandarse tal cual a registrar_columnas: el check lo rechazaría (23514) y frenaría
// toda la importación con un error genérico. Se trunca y, si hace falta, se sufija
// _2/_3/… — reservando espacio del sufijo dentro del límite de 63.
const MAX_CLAVE = 63;

export function claveDestinoSegura(base: string, ocupadas: Iterable<string>): string {
  const ocupadasSet = ocupadas instanceof Set ? ocupadas : new Set(ocupadas);
  const libre = (c: string) => c !== '' && !esClaveReservada(c) && !ocupadasSet.has(c);
  const raiz = base.slice(0, MAX_CLAVE);
  if (libre(raiz)) return raiz;
  let n = 2;
  let candidata: string;
  do {
    const sufijo = `_${n}`;
    candidata = base.slice(0, Math.max(0, MAX_CLAVE - sufijo.length)) + sufijo;
    n += 1;
  } while (!libre(candidata));
  return candidata;
}

// Para una clave "sobrante" generada por claveExtraLibre (dos columnas del archivo
// mapeadas al mismo destino: la segunda cae en una clave aparte) reconstruye un label
// legible buscando, entre los encabezados del propio mapeo, cuál normaliza a esa clave
// (o a su base, si claveExtraLibre le agregó un sufijo _2/_3/…) — si no encuentra
// ninguno, usa la clave tal cual.
export function labelParaClaveSobrante(key: string, mapeo: Mapeo): string {
  for (const h of Object.keys(mapeo)) {
    if (mapeo[h] === key || normalizarEncabezado(h) === key) return h;
  }
  const base = key.replace(/_\d+$/, '');
  // sobrante de un campo núcleo con una sola columna del archivo apuntando ahí: no vino de
  // una segunda columna sino de separar una celda con varios valores ("987… / 912…"), así
  // que el encabezado sería el de la propia columna núcleo — "Teléfono 2" es más claro.
  if (base !== key && esNucleo(base) && Object.values(mapeo).filter((d) => d === base).length <= 1) {
    return `${LABEL_DESTINO[base] ?? base} ${key.slice(base.length + 1)}`;
  }
  for (const h of Object.keys(mapeo)) {
    if (normalizarEncabezado(h) === base) return h;
  }
  return key;
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

function encabezadoDeFecha(encabezado: string): boolean {
  return /(^|_)(fecha|date|dia|nacimiento|cumpleanos)(_|$)/.test(normalizarEncabezado(encabezado));
}

/**
 * Tipo de una columna extra nueva según sus valores. `encabezado` (opcional) permite
 * reconocer una columna de fecha exportada como serial de Excel (46281): un número suelto
 * solo se trata como fecha si el encabezado lo dice ("Fecha", "Fecha de visita"…).
 */
export function inferirTipo(valores: string[], encabezado?: string): 'texto' | 'fecha' | 'numero' {
  const vistos = valores.map((v) => v.trim()).filter((v) => v !== '');
  if (!vistos.length) return 'texto';
  if (vistos.every((v) => ISO_FECHA.test(v) || DMY_FECHA.test(v))) return 'fecha';
  if (encabezado && encabezadoDeFecha(encabezado) && vistos.every((v) => aFechaISO(v, true) !== null)) return 'fecha';
  if (vistos.every((v) => NUMERO.test(v) && !pareceDocumento(v))) return 'numero';
  return 'texto';
}

// ---------------------------------------------------------------------------
// Limpieza por destino: lo que un archivo real trae y el validador rechazaría sin motivo.
// ---------------------------------------------------------------------------

// "914 117 489 / 997 589 940 |", "946569075_946560073", "Cel 989 670 737",
// "+51 908 807 157 / +51 984 169 469": se separa en números y se queda cada uno con solo
// dígitos (y el + inicial). Si nada parece un teléfono, se devuelve el texto tal cual para
// que la validación lo marque con su causa en vez de inventar un número.
export function separarTelefonos(v: string): string[] {
  const partes = v.split(/[/,;|_\n]|\s+(?:y|o|ó)\s+/i)
    .map((p) => p.trim())
    .map((p) => {
      const mas = /^\D*\+/.test(p) ? '+' : '';
      return mas + p.replace(/\D/g, '');
    })
    .filter((p) => /^\+?\d{6,15}$/.test(p));
  return partes.length ? partes : [v.trim()];
}

// "ventas @rrhpart.com", "jose.sandoval@enduria .com.pe", "mailto:ana@x.com": un correo
// nunca lleva espacios; varios correos separados por ; , / → el primero va a Correo.
export function separarCorreos(v: string): string[] {
  const partes = v.replace(/mailto:/gi, '').split(/[;,/|\n]/)
    .map((p) => p.replace(/\s+/g, '').toLowerCase())
    .filter(Boolean);
  return partes.length ? partes : [v.trim()];
}

// RUC/DNI: "10-07597714-5" / "20.613.344.548" → solo dígitos cuando el resultado es un
// DNI (8) o RUC (11). Un DNI guardado como número en Excel pierde el cero inicial
// (07627328 → 7627328): 6 o 7 dígitos se completan a 8 con ceros. ".0" de un número que
// pasó por pandas/Sheets también se quita.
export function limpiarDocumento(v: string): string {
  const s = v.trim().replace(/\.0+$/, '');
  const digitos = s.replace(/[\s.\-]/g, '');
  if (!/^\d+$/.test(digitos)) return s;
  if (digitos.length === 6 || digitos.length === 7) return digitos.padStart(8, '0');
  return digitos;
}

// "Asistió", "NUEVO ", "Contactado" → valor del enum lead_status; si no calza se deja tal
// cual (en minúsculas) para que la validación lo marque.
export function normalizarEstado(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Causa legible de cada error: lo que ve el usuario en pantalla y en el Excel de fallas.
// ---------------------------------------------------------------------------

export function describirError(e: ErrorCampo, valor: string | undefined, campo?: CampoFormulario): string {
  const nombre = campo?.label ?? LABEL_DESTINO[e.campo] ?? e.campo;
  const muestra = valor !== undefined && valor !== '' ? ` "${valor}"` : '';
  if (e.motivo === 'contacto') return 'Sin correo ni teléfono: se necesita al menos uno para guardar el lead';
  if (e.motivo === 'requerido') return `${nombre} está vacío y es obligatorio en esta fuente`;
  const tipo = e.campo === 'status' ? 'status' : e.campo === 'created_at' ? 'fecha' : campo?.tipo
    ?? (e.campo === 'email' ? 'email' : e.campo === 'telefono' ? 'telefono' : e.campo === 'fecha_nacimiento' ? 'fecha' : undefined);
  switch (tipo) {
    case 'email': return `${nombre}${muestra} no es un correo válido (ej. nombre@empresa.com)`;
    case 'telefono': return `${nombre}${muestra} no es un teléfono válido (6 a 15 dígitos, puede empezar con +)`;
    case 'documento': return `${nombre}${muestra} no es un RUC/DNI válido (DNI 8 dígitos, RUC 11)`;
    case 'fecha': return `${nombre}${muestra} no es una fecha reconocida (usa AAAA-MM-DD o DD/MM/AAAA)`;
    case 'numero': return `${nombre}${muestra} no es un número`;
    case 'opcion': return `${nombre}${muestra} no es una opción válida (${(campo?.opciones ?? []).join(', ')})`;
    case 'status': return `${nombre}${muestra} no es válido (usa: ${ESTADOS_LEAD.join(', ')})`;
    default: return `${nombre}${muestra} tiene un formato inválido`;
  }
}

// Errores que devuelve el servidor (importar_leads → sqlerrm) traducidos a una causa legible.
export function describirErrorServidor(motivo: string): string {
  if (motivo.includes('fila_sin_contacto')) return 'Sin correo ni teléfono: se necesita al menos uno para guardar el lead';
  if (motivo.includes('estado_invalido')) return `Estado no válido (usa: ${ESTADOS_LEAD.join(', ')})`;
  if (motivo.includes('fecha_registro_invalida')) return 'Fecha de registro no reconocida';
  if (/invalid input syntax for type date|date\/time field value out of range/i.test(motivo)) return `Fecha inválida (${motivo})`;
  if (motivo.includes('sin_permiso')) return 'No tienes permiso para importar en esta fuente';
  return `Error del servidor: ${motivo}`;
}

function valorCampo(lead: LeadEntrada, key: string): string | undefined {
  const v = esNucleo(key) || esCampoImportacion(key) ? lead[key] : lead.extra[key];
  return typeof v === 'string' ? v : undefined;
}

export interface FilaConError { fila: number; errores: ErrorCampo[]; causas: string[]; original: Record<string, unknown> }

export function construirFilas(
  filas: FilaEntrada[],
  mapeo: Mapeo,
  campos: CampoFormulario[],
  tiposExtra: Record<string, 'texto' | 'fecha' | 'numero'> = {},
  // false: un campo obligatorio del formulario de la fuente vacío no bloquea la fila (un
  // consolidado de feria rara vez trae RUC o rubro de todos); sigue exigiéndose correo o
  // teléfono y que lo que venga tenga formato válido.
  { exigirRequeridos = true }: { exigirRequeridos?: boolean } = {},
) {
  const validas: { fila: number; lead: LeadEntrada }[] = [];
  const errores: FilaConError[] = [];
  const porKey = new Map(campos.map((c) => [c.key, c]));
  const tipoDe = (k: string) => porKey.get(k)?.tipo;
  filas.forEach(({ fila: filaNum, datos: original }, i) => {
    const datos: Record<string, unknown> = {};
    const guardar = (destino: string, clave: string, valor: unknown) => {
      if (vacio(datos[destino])) {
        // primer valor visto para este destino (o el único no vacío hasta ahora): se guarda.
        datos[destino] = valor;
      } else if (!vacio(valor) && String(valor).trim() !== String(datos[destino]).trim()) {
        // dos columnas distintas mapeadas al mismo destino, ambas con datos y diferentes:
        // no pisar la primera — la segunda se guarda aparte, en una clave que no choque ni
        // con el destino ni con otra ya usada.
        datos[claveExtraLibre(clave, datos)] = valor;
      }
      // valor vacío y el destino ya tiene algo: no se toca (el llenado gana sobre el blanco).
    };
    for (const [h, destino] of Object.entries(mapeo)) {
      if (!destino) continue;
      const valor = original[h];
      if (vacio(valor)) { guardar(destino, normalizarEncabezado(h), valor); continue; }
      const texto = String(valor).trim();
      // varios teléfonos/correos en una celda: el primero al destino, el resto a
      // "Teléfono 2"/"Correo 2"… (columna extra), nunca se pierden.
      const esTel = destino === 'telefono' || tipoDe(destino) === 'telefono';
      const esCorreo = destino === 'email' || tipoDe(destino) === 'email';
      if (esTel || esCorreo) {
        const [primero, ...resto] = esTel ? separarTelefonos(texto) : separarCorreos(texto);
        guardar(destino, normalizarEncabezado(h), primero);
        for (const otro of resto) datos[claveExtraLibre(destino, datos)] = otro;
        continue;
      }
      if (destino === 'ruc' || tipoDe(destino) === 'documento') { guardar(destino, normalizarEncabezado(h), limpiarDocumento(texto)); continue; }
      if (destino === 'status') { guardar(destino, normalizarEncabezado(h), normalizarEstado(texto)); continue; }
      const esFecha = destino === 'fecha_nacimiento' || destino === 'created_at' || tipoDe(destino) === 'fecha' || tiposExtra[destino] === 'fecha';
      // destino de fecha: serial de Excel (46281), DD/MM/AAAA, 16-Sep-2026… → ISO. Si no se
      // reconoce, va tal cual y la validación lo reporta con su causa.
      guardar(destino, normalizarEncabezado(h), esFecha ? (aFechaISO(texto, true) ?? texto) : texto);
    }

    // estado/evento/fecha de registro van en la raíz del lead (columnas reales), no en extra.
    const especiales: Partial<Record<CampoImportacion, string>> = {};
    for (const k of CAMPOS_IMPORTACION) {
      if (!vacio(datos[k])) especiales[k] = String(datos[k]).trim();
      delete datos[k];
    }
    const lead = separarLead(datos);
    Object.assign(lead, especiales);

    const errs = validarLead(lead, campos).filter((e) => exigirRequeridos || e.motivo !== 'requerido');
    if (especiales.status !== undefined && !(ESTADOS_LEAD as readonly string[]).includes(especiales.status)) {
      errs.push({ campo: 'status', motivo: 'formato' });
    }
    if (especiales.created_at !== undefined && !ISO_FECHA.test(especiales.created_at)) {
      errs.push({ campo: 'created_at', motivo: 'formato' });
    }
    const fila = filaNum ?? i + 2;
    if (errs.length) {
      errores.push({
        fila, errores: errs, original,
        causas: errs.map((e) => describirError(e, valorCampo(lead, e.campo), porKey.get(e.campo))),
      });
    } else validas.push({ fila, lead });
  });
  return { validas, errores };
}
