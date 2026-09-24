'use client';
/*
 * Sistema de Leads — menú de visibilidad de columnas (Dropdown + checkbox por columna).
 * Nunca deja 0 columnas visibles: el último checkbox marcado queda deshabilitado.
 */
import { Dropdown } from '../ui/Dropdown';

export function ColumnasMenu({
  columnas,
  visibles,
  onCambiar,
}: {
  columnas: { key: string; label: string }[];
  visibles: string[];
  onCambiar: (v: string[]) => void;
}) {
  const toggle = (key: string, on: boolean) => {
    if (!on && visibles.length <= 1) return;
    onCambiar(on ? [...visibles, key] : visibles.filter((k) => k !== key));
  };

  return (
    <Dropdown
      className="ax-dropdown-wrap"
      panelClassName="ax-dropdown"
      panelAriaLabel="Columnas visibles"
      trigger={({ triggerProps }) => (
        <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" {...triggerProps}>
          <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h6v16h-6z" />
            <path d="M14 4h6v16h-6z" />
          </svg>
          <span className="ax-btn__label">Columnas</span>
        </button>
      )}
    >
      {columnas.map((c) => {
        const on = visibles.includes(c.key);
        return (
          <label key={c.key} className="ax-menu__item" style={{ cursor: 'pointer', gap: 'var(--ax-space-2)' }}>
            <input
              type="checkbox"
              className="ax-checkbox"
              checked={on}
              disabled={on && visibles.length <= 1}
              onChange={(e) => toggle(c.key, e.target.checked)}
            />
            <span>{c.label}</span>
          </label>
        );
      })}
    </Dropdown>
  );
}

export default ColumnasMenu;
