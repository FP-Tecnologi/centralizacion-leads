'use client';
/* Botón "Importar" para la cabecera de página (PageHead actions). Visible solo
 * si puedeEditar; con `fuenteId` enlaza directo a esa fuente preseleccionada. */
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export function ImportarBoton({ fuenteId }: { fuenteId?: string }) {
  const { puedeEditar } = useAuth();
  if (!puedeEditar) return null;
  const href = fuenteId ? `/leads/importar?fuente=${fuenteId}` : '/leads/importar';
  return (
    <Link href={href} className="ax-btn ax-btn--primary ax-btn--sm">
      <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>
      <span className="ax-btn__label">Importar</span>
    </Link>
  );
}

export default ImportarBoton;
