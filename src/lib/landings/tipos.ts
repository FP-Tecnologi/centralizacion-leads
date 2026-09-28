/*
 * Sistema de Leads — CMS de landings: forma del contenido editable de una
 * landing (`landing_paginas.contenido`). Es común a todas las plantillas: cada
 * plantilla usa solo las partes que muestra (ver `grupos` en plantillas.ts), así
 * que cambiar de plantilla no pierde lo ya escrito. Todo es texto plano; un
 * string vacío oculta ese elemento en la página.
 */
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';

export type Tema = 'claro' | 'oscuro' | 'auto';

export interface LogoLanding { url: string; url_oscuro: string; alt: string; enlace: string }
export interface ValorLanding { titulo: string; texto: string }

export interface ContenidoLanding {
  marca: { logo_url: string; color_primario: string; color_destacado: string; tema: Tema };
  evento: { nombre: string; fecha: string; lugar: string };
  hero: { etiqueta: string; titulo: string; titulo_destacado: string; descripcion: string; imagen_url: string };
  formulario: { titulo: string; subtitulo: string; boton: string; aviso: string; en_pasos: boolean };
  gracias: { titulo: string; mensaje: string };
  logos: { titulo: string; items: LogoLanding[] };
  nosotros: { titulo: string; texto: string; boton_texto: string; boton_url: string; valores: ValorLanding[] };
  pie: { texto: string; web: string; correo: string };
  seo: { titulo: string; descripcion: string };
}

/** Lo que el render público necesita (resultado de la RPC landing_publica). */
export interface LandingPublica {
  slug: string;
  nombre: string;
  estado: 'activa' | 'cerrada';
  plantilla: string;
  contenido: ContenidoLanding;
  campos: CampoFormulario[];
}

/** Correo de agradecimiento tal como se guarda en `fuentes.correo_gracias`.
 *  `texto` es el mensaje simple que escribe el usuario en el editor;
 *  `plantilla` es el HTML que manda send-thank-you (generado desde `texto`,
 *  o HTML propio heredado de landings anteriores al CMS). */
export interface CorreoGracias { activo: boolean; asunto?: string; plantilla?: string; texto?: string }
