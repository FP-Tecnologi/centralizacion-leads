'use client';

import { Suspense } from 'react';
import { PageHead } from '../../../src/components/shell/PageHead';
import { LeadsTable } from '../../../src/components/leads/LeadsTable';
import { ImportarBoton } from '../../../src/components/leads/ImportarBoton';

export default function Page() {
  return (
    <>
      <PageHead title="Todos los leads" actions={<ImportarBoton />} />
      <Suspense fallback={null}>
        <LeadsTable />
      </Suspense>
    </>
  );
}
