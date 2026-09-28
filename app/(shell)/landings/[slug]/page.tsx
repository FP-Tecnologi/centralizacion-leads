'use client';
import { use } from 'react';
import { LandingWizard } from '../../../../src/components/landings/wizard/LandingWizard';

// Gestionar = editor visual de la landing (plantilla, contenido, colores, formulario,
// agradecimiento y publicación). Lo técnico (datos, conexión, clave) vive en /configuracion.
export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { slug } = use(params);
  const { paso } = use(searchParams);
  return <LandingWizard slug={slug} pasoInicial={Number(paso) || 0} />;
}
