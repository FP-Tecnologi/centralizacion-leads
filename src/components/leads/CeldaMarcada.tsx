'use client';
/*
 * Celda con un dato a revisar (lead.invalidos): el valor se muestra igual — si no cupo en
 * su columna (fecha 31/02, estado "ganado") se muestra el texto original del archivo — con
 * fondo de advertencia y la causa al pasar el mouse. Se usa en la tabla de leads y en la
 * vista previa de la importación.
 */
export interface Marca { valor: string; causa: string }

export function CeldaMarcada({ valor, marca }: { valor?: string; marca?: Marca }) {
  if (!marca) return <>{valor || '—'}</>;
  const mostrado = valor || marca.valor;
  return (
    <span
      title={marca.causa}
      aria-label={`${mostrado || 'Vacío'}. A revisar: ${marca.causa}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--ax-warning-50)', border: '1px solid var(--ax-warning-200)',
        borderRadius: 4, padding: '0 4px', color: 'var(--ax-text-strong)',
      }}
    >
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ax-warning-500)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" /></svg>
      {mostrado || <em style={{ color: 'var(--ax-text-muted)' }}>vacío</em>}
    </span>
  );
}

export default CeldaMarcada;
