'use client';
import { use } from 'react';
import { GestionarFuente } from '../../../../../src/components/fuentes/GestionarFuente';

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <GestionarFuente slug={slug} tipo="landing" />;
}
