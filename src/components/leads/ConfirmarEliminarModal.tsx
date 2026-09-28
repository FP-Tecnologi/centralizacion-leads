'use client';
/*
 * Sistema de Leads — confirmación de borrado (fila o selección en lote).
 * Markup portado de EditarLeadModal: role="dialog", aria-modal, focus trap, Escape.
 */
import { useRef, useState } from 'react';
import { EnBody } from '../ui/EnBody';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { eliminarLeads } from '../../lib/leads/datos';

export function ConfirmarEliminarModal({
  titulo,
  descripcion,
  ids,
  onCerrar,
  onEliminado,
}: {
  titulo: string;
  descripcion: string;
  ids: string[];
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setError(null);
    setEliminando(true);
    try {
      await eliminarLeads(ids);
      onEliminado();
    } catch {
      setError('No se pudo eliminar. Intenta de nuevo.');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <EnBody>
    <div onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="ax-backdrop" onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 'var(--ax-z-modal)', background: 'rgba(0,0,0,.45)', border: 0 }} />
      <div className="ax-flex" role="dialog" aria-modal="true" aria-label={titulo} ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--ax-z-modal) + 1)', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)' }}>
        <div className="ax-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px,100%)' }}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{titulo}</h2></div>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" onClick={onCerrar} aria-label="Cerrar">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <p>{descripcion}</p>
            <p className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>Esta acción no se puede deshacer.</p>
            {error && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>}
          </div>
          <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ax-space-2)', borderTop: '1px solid var(--ax-border)' }}>
            <button type="button" className="ax-btn ax-btn--ghost" onClick={onCerrar} disabled={eliminando}>Cancelar</button>
            <button type="button" className="ax-btn ax-btn--danger" onClick={confirmar} disabled={eliminando}>
              {eliminando ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </EnBody>
  );
}

export default ConfirmarEliminarModal;
