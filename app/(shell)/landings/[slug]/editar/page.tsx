import { redirect } from 'next/navigation';

// Ruta antigua del editor: ahora el editor es la página "Gestionar" de la landing.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { slug } = await params;
  const { paso } = await searchParams;
  redirect(`/landings/${slug}${paso ? `?paso=${paso}` : ''}`);
}
