/*
 * Sistema de Leads — catálogo de plantillas del CMS de landings.
 *
 * Una plantilla = un componente de render (src/components/landings/plantillas)
 * + esta ficha: contenido y formulario de partida, y qué grupos de contenido
 * muestra el editor (paso "Contenido"). Agregar una plantilla nueva:
 *   1. sumar su ficha aquí (id en kebab-case, igual que el check de la tabla),
 *   2. sumar su componente en LandingRender.tsx.
 * No hace falta migración: `landing_paginas.plantilla` guarda solo el id.
 *
 * "evento" es la landing de registro de EXPOMINA 2026 (repo
 * landing-registro-expomina) convertida en plantilla: mismos textos, logos y
 * colores de partida, todo editable.
 */
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';
import type { ContenidoLanding } from './tipos';

export type TipoEditor = 'texto' | 'parrafo' | 'url' | 'imagen' | 'color' | 'tema' | 'correo';
export interface CampoEditor { ruta: string; etiqueta: string; tipo: TipoEditor; ayuda?: string; placeholder?: string }
export interface GrupoEditor { id: string; titulo: string; descripcion: string; campos: CampoEditor[]; lista?: 'logos' | 'valores' }

export interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string;
  contenido: ContenidoLanding;
  campos: CampoFormulario[];
  grupos: GrupoEditor[];
}

const ASSETS = '/plantillas/evento';

const CARGOS = [
  'Gerente General', 'Gerente de TI / Sistemas', 'Jefe de Operaciones', 'Jefe de Compras / Logística',
  'Jefe de Mantenimiento', 'Superintendente', 'Analista / Especialista', 'Otro',
];
const RUBROS = [
  'Minería', 'Construcción', 'Energía', 'Industria / Manufactura', 'Tecnología', 'Retail / Comercio',
  'Servicios', 'Gobierno', 'Otro',
];

/** Campos que se ofrecen como "agregar rápido" en el constructor de formulario. */
export const CAMPOS_SUGERIDOS: CampoFormulario[] = [
  { key: 'nombres', label: 'Nombres', tipo: 'texto', requerido: true, placeholder: 'Ej. Juan' },
  { key: 'apellido', label: 'Apellido', tipo: 'texto', requerido: true, placeholder: 'Ej. Pérez' },
  { key: 'email', label: 'Correo electrónico', tipo: 'email', requerido: true, placeholder: 'tucorreo@empresa.com' },
  { key: 'telefono', label: 'Teléfono', tipo: 'telefono', requerido: true, placeholder: '999 999 999' },
  { key: 'empresa', label: 'Empresa', tipo: 'texto', requerido: false, placeholder: 'Ej. Minera Andina SAC' },
  { key: 'ruc', label: 'RUC / DNI', tipo: 'documento', requerido: false, placeholder: 'RUC (11) o DNI (8)' },
  { key: 'cargo', label: 'Cargo', tipo: 'opcion', requerido: false, opciones: CARGOS },
  { key: 'rubro', label: 'Rubro de empresa', tipo: 'opcion', requerido: false, opciones: RUBROS },
  { key: 'fecha_nacimiento', label: 'Fecha de cumpleaños', tipo: 'fecha', requerido: false },
];

const sugerido = (key: string, cambios: Partial<CampoFormulario> = {}): CampoFormulario => ({
  ...CAMPOS_SUGERIDOS.find((c) => c.key === key)!,
  ...cambios,
});

const MARCA_FP = {
  logo_url: `${ASSETS}/logo-fp-color.svg`,
  color_primario: '#1c7fa8',
  color_destacado: '#c93131',
  tema: 'auto' as const,
};

const PIE_FP = { texto: '', web: 'https://www.fptecnologi.com', correo: 'marketing@fptecnologi.com' };

const G_MARCA: GrupoEditor = {
  id: 'marca',
  titulo: 'Marca y colores',
  descripcion: 'Logo, colores y modo claro/oscuro de la página.',
  campos: [
    { ruta: 'marca.logo_url', etiqueta: 'Logo', tipo: 'imagen', ayuda: 'Enlace a la imagen (SVG o PNG con fondo transparente).' },
    { ruta: 'marca.color_primario', etiqueta: 'Color principal', tipo: 'color', ayuda: 'Botones, enlaces y detalles.' },
    { ruta: 'marca.color_destacado', etiqueta: 'Color de acento', tipo: 'color', ayuda: 'Palabras resaltadas y brillo del fondo.' },
    { ruta: 'marca.tema', etiqueta: 'Apariencia', tipo: 'tema' },
  ],
};
const G_EVENTO: GrupoEditor = {
  id: 'evento',
  titulo: 'Evento',
  descripcion: 'Nombre, fecha y lugar. Déjalos vacíos si no aplica.',
  campos: [
    { ruta: 'evento.nombre', etiqueta: 'Nombre del evento', tipo: 'texto', placeholder: 'Ej. EXPOMINA Perú 2026' },
    { ruta: 'evento.fecha', etiqueta: 'Fecha', tipo: 'texto', placeholder: 'Ej. Del 16 al 18 de octubre' },
    { ruta: 'evento.lugar', etiqueta: 'Lugar', tipo: 'texto', placeholder: 'Ej. Centro de Exposiciones Jockey, Lima' },
  ],
};
const G_PIE: GrupoEditor = {
  id: 'pie',
  titulo: 'Pie de página',
  descripcion: 'Datos de contacto al final de la página.',
  campos: [
    { ruta: 'pie.texto', etiqueta: 'Texto', tipo: 'texto', placeholder: 'Ej. EXPOMINA Perú 2026' },
    { ruta: 'pie.web', etiqueta: 'Sitio web', tipo: 'url', placeholder: 'https://www.fptecnologi.com' },
    { ruta: 'pie.correo', etiqueta: 'Correo de contacto', tipo: 'correo', placeholder: 'marketing@fptecnologi.com' },
  ],
};
const G_SEO: GrupoEditor = {
  id: 'seo',
  titulo: 'Google y redes sociales',
  descripcion: 'Título y descripción al compartir el enlace. Si los dejas vacíos se usa la portada.',
  campos: [
    { ruta: 'seo.titulo', etiqueta: 'Título de la pestaña', tipo: 'texto' },
    { ruta: 'seo.descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
  ],
};

const EVENTO: Plantilla = {
  id: 'evento',
  nombre: 'Evento con registro',
  descripcion: 'La landing de EXPOMINA: portada con el formulario al costado, logos de aliados, sección "Sobre nosotros" y pie.',
  contenido: {
    marca: MARCA_FP,
    evento: { nombre: 'EXPOMINA Perú 2026', fecha: '', lugar: '' },
    hero: {
      etiqueta: 'Semana de Ingeniería Geológica · FP Tecnologi & System',
      titulo: 'Registra tu asistencia',
      titulo_destacado: 'a la semana de Ingeniería Geológica',
      descripcion:
        'Ingresa aquí tus datos para explorar las soluciones avanzadas de FP Tecnologi & System y participa por uno de los 4 maletines DELL. ¡Asegura tu oportunidad y equipa a tu empresa con el rendimiento que necesitas para tus operaciones en mina!',
      imagen_url: '',
    },
    formulario: {
      titulo: 'Registra tu asistencia',
      subtitulo: 'Completa tus datos',
      boton: 'Confirmar mi visita',
      aviso: 'Al registrarte aceptas que FP Tecnologi & System use tus datos de contacto.',
      en_pasos: true,
    },
    gracias: {
      titulo: '¡Registro confirmado!',
      mensaje: 'Gracias por registrar tu asistencia en la Semana de Ingeniería Geológica, FP Tecnologi & System, EXPOMINA Perú 2026.',
    },
    logos: {
      titulo: 'Presente en',
      items: [
        { url: `${ASSETS}/logo-expomina-light.png`, url_oscuro: `${ASSETS}/logo-expomina.webp`, alt: 'EXPOMINA Perú', enlace: 'https://expominaperu.com' },
        { url: `${ASSETS}/logo-cip.png`, url_oscuro: '', alt: 'Colegio de Ingenieros del Perú', enlace: '' },
      ],
    },
    nosotros: {
      titulo: 'F.P. Tecnologi & System',
      texto: 'Somos el área de sistemas externa de tu empresa: equipos, redes, software y soporte que funcionan de verdad, sin complicarte la operación.',
      boton_texto: 'Conócenos',
      boton_url: 'https://www.fptecnologi.com',
      valores: [
        { titulo: 'Claridad', texto: 'Te escuchamos antes de recomendar. Sin tecnicismos ni propuestas sobredimensionadas.' },
        { titulo: 'Respaldo', texto: 'Productos originales, factura y garantía directa de un solo proveedor responsable.' },
        { titulo: 'Continuidad', texto: 'Respuesta ágil en menos de 24 horas para que tu operación nunca se detenga.' },
      ],
    },
    pie: { ...PIE_FP, texto: 'EXPOMINA Perú 2026 · Semana de Ingeniería Geológica' },
    seo: {
      titulo: 'Registro de Asistencia — Semana de Ingeniería Geológica | FP Tecnologi & System',
      descripcion: 'Confirma tu visita a FP Tecnologi & System en la Semana de Ingeniería Geológica, EXPOMINA Perú 2026.',
    },
  },
  campos: [
    sugerido('nombres'),
    sugerido('apellido'),
    sugerido('fecha_nacimiento'),
    sugerido('cargo', { requerido: true }),
    sugerido('ruc', { requerido: true }),
    sugerido('empresa'),
    sugerido('rubro', { requerido: true }),
    sugerido('telefono'),
    sugerido('email'),
  ],
  grupos: [
    G_MARCA,
    G_EVENTO,
    {
      id: 'portada',
      titulo: 'Portada',
      descripcion: 'Lo primero que ve el visitante, junto al formulario.',
      campos: [
        { ruta: 'hero.etiqueta', etiqueta: 'Etiqueta superior', tipo: 'texto' },
        { ruta: 'hero.titulo', etiqueta: 'Título', tipo: 'texto' },
        { ruta: 'hero.titulo_destacado', etiqueta: 'Segunda línea (en color)', tipo: 'texto' },
        { ruta: 'hero.descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
      ],
    },
    {
      id: 'logos',
      titulo: 'Logos aliados',
      descripcion: 'Logos que acompañan al tuyo en la portada (organizadores, auspiciadores).',
      campos: [{ ruta: 'logos.titulo', etiqueta: 'Texto antes de los logos', tipo: 'texto', placeholder: 'Presente en' }],
      lista: 'logos',
    },
    {
      id: 'nosotros',
      titulo: 'Sobre nosotros',
      descripcion: 'Sección debajo de la portada con hasta 3 tarjetas.',
      campos: [
        { ruta: 'nosotros.titulo', etiqueta: 'Título', tipo: 'texto' },
        { ruta: 'nosotros.texto', etiqueta: 'Texto', tipo: 'parrafo' },
        { ruta: 'nosotros.boton_texto', etiqueta: 'Texto del botón', tipo: 'texto' },
        { ruta: 'nosotros.boton_url', etiqueta: 'Enlace del botón', tipo: 'url' },
      ],
      lista: 'valores',
    },
    G_PIE,
    G_SEO,
  ],
};

const SIMPLE: Plantilla = {
  id: 'simple',
  nombre: 'Formulario simple',
  descripcion: 'Una sola columna centrada: logo, título, texto, imagen opcional y el formulario. Ideal para promociones y contacto.',
  contenido: {
    marca: { ...MARCA_FP, color_primario: '#2181af', color_destacado: '#18778b', tema: 'claro' },
    evento: { nombre: '', fecha: '', lugar: '' },
    hero: {
      etiqueta: 'FP Tecnologi & System',
      titulo: 'Déjanos tus datos',
      titulo_destacado: 'y te contactamos hoy',
      descripcion: 'Un asesor te escribirá en menos de 24 horas con una propuesta a la medida de tu empresa.',
      imagen_url: '',
    },
    formulario: {
      titulo: 'Solicita información',
      subtitulo: 'Te toma menos de un minuto',
      boton: 'Enviar',
      aviso: 'Al enviar aceptas que FP Tecnologi & System use tus datos de contacto.',
      en_pasos: false,
    },
    gracias: { titulo: '¡Gracias!', mensaje: 'Recibimos tus datos. Pronto un asesor se pondrá en contacto contigo.' },
    logos: { titulo: '', items: [] },
    nosotros: { titulo: '', texto: '', boton_texto: '', boton_url: '', valores: [] },
    pie: { ...PIE_FP, texto: 'FP Tecnologi & System S.A.C.' },
    seo: { titulo: '', descripcion: '' },
  },
  campos: [sugerido('nombres'), sugerido('email'), sugerido('telefono', { requerido: false }), sugerido('empresa')],
  grupos: [
    G_MARCA,
    G_EVENTO,
    {
      id: 'portada',
      titulo: 'Portada',
      descripcion: 'Título, texto e imagen sobre el formulario.',
      campos: [
        { ruta: 'hero.etiqueta', etiqueta: 'Etiqueta superior', tipo: 'texto' },
        { ruta: 'hero.titulo', etiqueta: 'Título', tipo: 'texto' },
        { ruta: 'hero.titulo_destacado', etiqueta: 'Segunda línea (en color)', tipo: 'texto' },
        { ruta: 'hero.descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
        { ruta: 'hero.imagen_url', etiqueta: 'Imagen (opcional)', tipo: 'imagen' },
      ],
    },
    G_PIE,
    G_SEO,
  ],
};

export const PLANTILLAS: Plantilla[] = [EVENTO, SIMPLE];
export const PLANTILLA_POR_DEFECTO = EVENTO.id;

export function plantillaPorId(id: string | null | undefined): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? EVENTO;
}
