/*
 * Sistema de Leads — lectura pública (sin sesión) de una landing del CMS, para
 * la ruta /l/[slug]. Llama a la RPC `landing_publica` con la anon key: esa
 * función solo devuelve landings publicadas y solo columnas públicas (nunca
 * clave_hash ni correo_gracias). Sin supabase-js: un fetch basta y no arrastra
 * el cliente con sesión (src/lib/supabase.ts) al server.
 */
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';
import { contenidoDe } from './contenido';
import type { LandingPublica } from './tipos';

export async function cargarLandingPublica(slug: string): Promise<LandingPublica | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;

  const res = await fetch(`${url}/rest/v1/rpc/landing_publica`, {
    method: 'POST',
    headers: { apikey: anon, authorization: `Bearer ${anon}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_slug: slug }),
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('landing_publica', res.status);
    return null;
  }
  const d = (await res.json()) as {
    slug: string; nombre: string; estado: 'activa' | 'cerrada'; plantilla: string; contenido: unknown; campos: CampoFormulario[] | null;
  } | null;
  if (!d) return null;
  return {
    slug: d.slug,
    nombre: d.nombre,
    estado: d.estado,
    plantilla: d.plantilla,
    contenido: contenidoDe(d.plantilla, d.contenido),
    campos: Array.isArray(d.campos) ? d.campos : [],
  };
}
