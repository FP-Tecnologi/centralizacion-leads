'use client';

import { Suspense } from 'react';
import { Importar } from '../../../../src/screens/Importar';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Importar />
    </Suspense>
  );
}
