/*
 * Sistema de Leads — CMS de landings: lógica pura (sin React) para el editor y
 * el render público. Aparte para poder testearla directo.
 *
 * Seguridad del render: el contenido lo escribe gente del equipo, pero se
 * muestra en una página pública, así que todo pasa por colorSeguro/urlSegura
 * antes de llegar a un `style` o un `href` (nada de `javascript:` ni CSS
 * inyectado vía un "color"). El texto se renderiza siempre como texto (React
 * lo escapa); no hay HTML libre en la página.
 */
import type { CampoFormulario, ErrorCampo } from '../../../supabase/functions/_shared/lead';
import { plantillaPorId } from './plantillas';
import type { ContenidoLanding } from './tipos';

type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Completa `parcial` (lo guardado, quizá de una versión anterior del esquema o
 * con claves de más) con `base`: solo se conservan claves que existen en
 * `base` y con el mismo tipo; los arreglos guardados reemplazan a los de base.
 */
export function completarContenido(base: ContenidoLanding, parcial: unknown): ContenidoLanding {
  const unir = (b: unknown, p: unknown): unknown => {
    if (esObj(b)) {
      const out: Obj = {};
      for (const k of Object.keys(b)) out[k] = unir(b[k], esObj(p) ? p[k] : undefined);
      return out;
    }
    if (Array.isArray(b)) {
      if (!Array.isArray(p)) return b;
      // Molde de ítem = forma del primero de la plantilla pero vacío: un ítem
      // guardado sin algún dato no debe heredar el valor del logo/tarjeta de ejemplo.
      if (!esObj(b[0])) return p.filter(esObj);
      const molde = Object.fromEntries(Object.entries(b[0]).map(([k, v]) => [k, typeof v === 'string' ? '' : v]));
      return p.filter(esObj).map((item) => unir(molde, item));
    }
    return typeof p === typeof b ? p : b;
  };
  return unir(base, parcial) as ContenidoLanding;
}

/** Contenido listo para renderizar: el guardado completado con la plantilla. */
export function contenidoDe(plantilla: string, guardado: unknown): ContenidoLanding {
  return completarContenido(plantillaPorId(plantilla).contenido, guardado);
}

export function leerRuta(obj: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => (esObj(acc) ? acc[k] : undefined), obj);
}

/** Copia inmutable de `obj` con `valor` en `ruta` ("hero.titulo"). */
export function escribirRuta<T>(obj: T, ruta: string, valor: unknown): T {
  const [k, ...resto] = ruta.split('.');
  const actual: Obj = esObj(obj) ? obj : {};
  return { ...actual, [k]: resto.length ? escribirRuta(actual[k], resto.join('.'), valor) : valor } as T;
}

const HEX = /^#[0-9a-f]{6}$/i;
export function esColor(v: string): boolean {
  return HEX.test(v);
}
export function colorSeguro(v: string | undefined, porDefecto: string): string {
  return v && HEX.test(v) ? v.toLowerCase() : porDefecto;
}

/**
 * Deja pasar solo https/http absolutos, rutas del propio sitio ("/algo", no
 * "//otro-dominio") y, si se pide, mailto:. Cualquier otra cosa → ''.
 */
export function urlSegura(v: string | undefined, { correo = false } = {}): string {
  const s = (v ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
  if (/^\/(?!\/)[^\s]*$/.test(s)) return s;
  if (correo && /^mailto:[^\s@]+@[^\s@]+$/i.test(s)) return s;
  return '';
}

export function esCorreo(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** Separa un texto en párrafos por líneas en blanco (se renderizan como <p>). */
export function parrafos(texto: string): string[] {
  return texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** Reparte los campos en pasos de hasta `porPaso` (formulario "por pasos"). */
export function dividirEnPasos<T>(campos: T[], porPaso = 3): T[][] {
  if (!campos.length) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < campos.length; i += porPaso) out.push(campos.slice(i, i + porPaso));
  return out;
}

export function slugValido(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/** Mensaje visible para un error de validarLead (lead.ts). */
export function mensajeError(e: ErrorCampo, campo?: CampoFormulario): string {
  if (e.motivo === 'requerido') return 'Este campo es obligatorio.';
  if (e.motivo === 'contacto') return 'Déjanos al menos un correo o un teléfono.';
  switch (campo?.tipo) {
    case 'email': return 'Ingresa un correo válido, ej. nombre@empresa.com.';
    case 'telefono': return 'Ingresa un teléfono válido (solo números).';
    case 'documento': return 'Ingresa un RUC (11 dígitos) o DNI (8 dígitos).';
    case 'fecha': return 'Ingresa una fecha válida.';
    case 'numero': return 'Ingresa solo números.';
    case 'opcion': return 'Elige una de las opciones.';
    default: return 'Revisa este dato.';
  }
}

/** Normaliza los campos antes de guardar: recorta textos, quita opciones
 *  vacías (o todas, si el campo ya no es una lista) y placeholders vacíos. */
export function limpiarCampos(campos: CampoFormulario[]): CampoFormulario[] {
  return campos.map((c) => {
    const out: CampoFormulario = { key: c.key, label: c.label.trim(), tipo: c.tipo, requerido: !!c.requerido };
    const ph = c.placeholder?.trim();
    if (ph && c.tipo !== 'fecha') out.placeholder = ph;
    if (c.tipo === 'opcion') out.opciones = [...new Set((c.opciones ?? []).map((o) => o.trim()).filter(Boolean))];
    return out;
  });
}

export interface ItemRevision { id: string; texto: string; ok: boolean; bloquea: boolean }

/** Lista de chequeo del paso "Revisar y publicar". `bloquea` impide publicar. */
export function revisarLanding(c: ContenidoLanding, campos: CampoFormulario[], estado: 'activa' | 'cerrada'): ItemRevision[] {
  const claves = new Set(campos.map((x) => x.key));
  const conOpciones = campos.every((x) => x.tipo !== 'opcion' || (x.opciones ?? []).some((o) => o.trim()));
  return [
    { id: 'titulo', texto: 'La portada tiene un título', ok: !!c.hero.titulo.trim(), bloquea: true },
    { id: 'campos', texto: 'El formulario tiene al menos un campo', ok: campos.length > 0, bloquea: true },
    {
      id: 'contacto',
      texto: 'El formulario pide correo o teléfono (sin eso no se guarda el registro)',
      ok: claves.has('email') || claves.has('telefono'),
      bloquea: true,
    },
    { id: 'etiquetas', texto: 'Todos los campos tienen nombre', ok: campos.every((x) => !!x.label.trim()), bloquea: true },
    { id: 'opciones', texto: 'Las listas desplegables tienen opciones', ok: conOpciones, bloquea: true },
    { id: 'boton', texto: 'El botón del formulario tiene texto', ok: !!c.formulario.boton.trim(), bloquea: false },
    { id: 'gracias', texto: 'Hay un mensaje de agradecimiento', ok: !!c.gracias.titulo.trim(), bloquea: false },
    { id: 'activa', texto: 'La fuente está activa (si está cerrada, la página no acepta registros)', ok: estado === 'activa', bloquea: false },
  ];
}

function escapar(v: string): string {
  return v.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

/**
 * HTML del correo de agradecimiento a partir del mensaje simple del editor.
 * `{{nombre}}` se deja tal cual: lo reemplaza send-thank-you. `origen` sirve
 * para volver absolutas las rutas del propio sitio (el logo) — un correo no
 * puede resolver "/plantillas/...".
 */
export function correoHtml(c: ContenidoLanding, titulo: string, mensaje: string, origen: string): string {
  const color = colorSeguro(c.marca.color_primario, '#1c7fa8');
  const abs = (u: string) => (u.startsWith('/') ? `${origen}${u}` : u);
  const logo = urlSegura(c.marca.logo_url);
  const web = urlSegura(c.pie.web);
  const correo = esCorreo(c.pie.correo) ? c.pie.correo.trim() : '';
  // Escapar primero protege el HTML; el marcador {{nombre}} no tiene caracteres especiales.
  const cuerpo = parrafos(mensaje)
    .map((p) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:25px;color:#3f5568;">${escapar(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background-color:#eef3f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef3f7;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="height:6px;background:${color};font-size:0;line-height:0;">&nbsp;</td></tr>
${logo ? `<tr><td align="center" style="padding:28px 40px 8px 40px;"><img src="${escapar(abs(logo))}" alt="" height="40" style="height:40px;width:auto;display:block;margin:0 auto;"></td></tr>` : ''}
<tr><td style="padding:24px 40px 8px 40px;">
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:31px;color:#0f2942;font-weight:800;">${escapar(titulo)}</h1>
${cuerpo}
</td></tr>
${web ? `<tr><td align="center" style="padding:8px 40px 36px 40px;"><a href="${escapar(abs(web))}" target="_blank" style="display:inline-block;padding:14px 30px;border-radius:12px;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;background-color:${color};color:#ffffff;text-decoration:none;">Visitar sitio web</a></td></tr>` : ''}
${correo ? `<tr><td align="center" style="padding:18px 30px;border-top:1px solid #eef3f7;font-size:12px;color:#6b8299;">¿Dudas? Escríbenos a <a href="mailto:${escapar(correo)}" style="color:${color};">${escapar(correo)}</a></td></tr>` : ''}
</table></td></tr></table>
</body></html>`;
}
