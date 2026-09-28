'use client';
import { use } from 'react';
import { LandingWizard } from '../../../../../src/components/landings/wizard/LandingWizard';

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
