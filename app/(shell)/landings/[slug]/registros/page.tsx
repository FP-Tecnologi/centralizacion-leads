'use client';
import { Suspense, use, useEffect, useState } from 'react';
import { fuentePorSlug, type Fuente } from '../../../../../src/lib/leads/datos';
import { LeadsTable } from '../../../../../src/components/leads/LeadsTable';
import { PageHead } from '../../../../../src/components/shell/PageHead';
import { ImportarBoton } from '../../../../../src/components/leads/ImportarBoton';

function Registros({ slug }: { slug: string }) {
  const [f, setF] = useState<Fuente | null | undefined>(undefined);
  useEffect(() => { fuentePorSlug(slug).then(setF).catch(() => setF(null)); }, [slug]);
  if (f === undefined) return null;
  if (f === null) return <p>Landing no encontrada o sin acceso.</p>;
  return (<><PageHead title={`Registros · ${f.nombre}`} actions={<ImportarBoton fuenteId={f.id} />} /><LeadsTable fuenteFija={f} /></>);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={null}>
      <Registros slug={slug} />
    </Suspense>
  );
}
