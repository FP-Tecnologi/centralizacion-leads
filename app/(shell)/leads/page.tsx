'use client';

import { Suspense } from 'react';
import { PageHead } from '../../../src/components/shell/PageHead';
import { LeadsTable } from '../../../src/components/leads/LeadsTable';

export default function Page() {
  return (
    <>
      <PageHead title="Todos los leads" />
      <Suspense fallback={null}>
        <LeadsTable />
      </Suspense>
    </>
  );
}
