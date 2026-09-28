/*
 * Landing pública del CMS: /l/<slug>. Sin sesión (middleware.ts deja pasar
 * /l). Lee la landing publicada vía la RPC landing_publica y la renderiza con
 * el mismo componente que usa la vista previa del asistente. Dinámica en cada
 * request: publicar/despublicar o editar se ve al instante, sin revalidación.
 */
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingRender } from '../../../src/components/landings/LandingRender';
import { cargarLandingPublica } from '../../../src/lib/landings/publica';

export const dynamic = 'force-dynamic';

const cargar = cache(cargarLandingPublica);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await cargar(slug);
  if (!d) return { title: { absolute: 'Página no disponible' }, robots: { index: false } };
  const c = d.contenido;
  const titulo = c.seo.titulo || [c.hero.titulo, c.hero.titulo_destacado].filter(Boolean).join(' ') || d.nombre;
  const descripcion = c.seo.descripcion || c.hero.descripcion.slice(0, 160);
  return {
    title: { absolute: titulo },
    description: descripcion,
    openGraph: { title: titulo, description: descripcion, type: 'website' },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await cargar(slug);
  if (!d) notFound();
  return (
    <LandingRender
      plantilla={d.plantilla}
      contenido={d.contenido}
      campos={d.campos}
      slug={d.slug}
      cerrada={d.estado !== 'activa'}
      modo="publico"
    />
  );
}
