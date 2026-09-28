'use client';
/*
 * Sistema de Leads — columnas visibles de la tabla: botón "Columnas" que abre un panel
 * lateral (mismo offcanvas que Filtros) con buscador, contador y checkboxes por grupo.
 * Los cambios se aplican al instante. Nunca deja 0 columnas visibles.
 */
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';

type Columna = { key: string; label: string; grupo?: string };

export function ColumnasMenu({
  columnas,
  visibles,
  onCambiar,
}: {
  columnas: Columna[];
  visibles: string[];
  onCambiar: (v: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ocultas = columnas.length - visibles.length;
  return (
    <>
      <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={() => setAbierto(true)} aria-expanded={abierto} aria-haspopup="dialog">
        <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h6v16h-6z" />
          <path d="M14 4h6v16h-6z" />
        </svg>
        <span className="ax-btn__label">Columnas{ocultas > 0 ? ` (${visibles.length})` : ''}</span>
      </button>
      {/* portal a <body>: el botón vive dentro de la tarjeta de la tabla, cuyo
          backdrop-filter vuelve "fixed" relativo a la tarjeta y recortaba el panel. */}
      {abierto && createPortal(
        <ColumnasPanel columnas={columnas} visibles={visibles} onCambiar={onCambiar} onCerrar={() => setAbierto(false)} />,
        document.body,
      )}
    </>
  );
}

function ColumnasPanel({
  columnas, visibles, onCambiar, onCerrar,
}: { columnas: Columna[]; visibles: string[]; onCambiar: (v: string[]) => void; onCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, 'input[type="search"]');
  const [q, setQ] = useState('');

  // agrupa preservando el orden de aparición (sin grupo = "Datos del lead", primero).
  const grupos = useMemo(() => {
    const filtro = q.trim().toLowerCase();
    const out: { nombre: string; items: Columna[] }[] = [];
    for (const c of columnas) {
      if (filtro && !c.label.toLowerCase().includes(filtro)) continue;
      const nombre = c.grupo || 'Datos del lead';
      let g = out.find((x) => x.nombre === nombre);
      if (!g) { g = { nombre, items: [] }; out.push(g); }
      g.items.push(c);
    }
    return out;
  }, [columnas, q]);

  const set = new Set(visibles);
  // mantiene el orden original de `columnas` al guardar
  const guardar = (s: Set<string>) => { if (s.size) onCambiar(columnas.map((c) => c.key).filter((k) => s.has(k))); };
  const toggle = (key: string) => {
    const s = new Set(set);
    if (s.has(key)) { if (s.size <= 1) return; s.delete(key); } else s.add(key);
    guardar(s);
  };
  const grupoTodo = (items: Columna[], on: boolean) => {
    const s = new Set(set);
    for (const c of items) { if (on) s.add(c.key); else s.delete(c.key); }
    guardar(s);
  };

  return (
    <div className="ax-offcanvas" onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" className="ax-offcanvas__backdrop" onClick={onCerrar} aria-label="Cerrar columnas" tabIndex={-1} style={{ border: 0, cursor: 'default' }} />
      <div className="ax-offcanvas__panel ax-offcanvas__panel--end" role="dialog" aria-modal="true" aria-label="Columnas visibles" ref={ref}>
        <div className="ax-offcanvas__header">
          <div>
            <h2 className="ax-offcanvas__title">Columnas</h2>
            <p className="col-panel__contador">{visibles.length} de {columnas.length} visibles</p>
          </div>
          <button type="button" className="ax-offcanvas__close" onClick={onCerrar} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="ax-offcanvas__body col-panel">
          <input type="search" className="ax-input ax-input--sm" placeholder="Buscar columna…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar columna" />

          {grupos.map((g) => {
            const marcadas = g.items.filter((c) => set.has(c.key)).length;
            return (
              <section key={g.nombre} className="col-panel__grupo">
                <div className="col-panel__cab">
                  <span className="col-panel__nombre">{g.nombre} <span className="col-panel__n">{marcadas}/{g.items.length}</span></span>
                  <span className="col-panel__acciones">
                    <button type="button" onClick={() => grupoTodo(g.items, true)} disabled={marcadas === g.items.length}>Todas</button>
                    <button type="button" onClick={() => grupoTodo(g.items, false)} disabled={marcadas === 0 || marcadas === set.size}>Ninguna</button>
                  </span>
                </div>
                <div className="col-panel__lista">
                  {g.items.map((c) => {
                    const on = set.has(c.key);
                    return (
                      <label key={c.key} className={`col-panel__item${on ? ' is-on' : ''}`}>
                        <input type="checkbox" className="ax-checkbox" checked={on} disabled={on && set.size <= 1} onChange={() => toggle(c.key)} />
                        <span>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {!grupos.length && <p className="ax-text-subtle">Ninguna columna coincide con “{q}”.</p>}
        </div>

        <div className="ax-offcanvas__footer">
          <button type="button" className="ax-btn ax-btn--ghost" onClick={() => guardar(new Set(columnas.map((c) => c.key)))} disabled={visibles.length === columnas.length}>
            Mostrar todas
          </button>
          <button type="button" className="ax-btn ax-btn--primary" onClick={onCerrar}>Listo</button>
        </div>
      </div>
    </div>
  );
}

export default ColumnasMenu;
