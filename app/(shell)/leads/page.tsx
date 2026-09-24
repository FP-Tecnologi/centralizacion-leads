'use client';

import { PageHead } from '../../../src/components/shell/PageHead';
import { LeadsTable } from '../../../src/components/leads/LeadsTable';

export default function Page() {
  return (
    <>
      <PageHead title="Todos los leads" />
      <LeadsTable />
    </>
  );
}
