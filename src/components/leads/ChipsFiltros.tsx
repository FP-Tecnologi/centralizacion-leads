'use client';
/*
 * Sistema de Leads — chips de filtros activos, bajo la toolbar de LeadsTable.
 * Cada chip se puede quitar individualmente; "Limpiar todo" resetea a FILTRO_VACIO.
 */
import { describirFiltro, quitarDeFiltro, FILTRO_VACIO, type FiltroLeads } from '../../lib/leads/filtros';

export function ChipsFiltros({
  filtro,
  onCambio,
  nombreFuente,
}: {
  filtro: FiltroLeads;
  onCambio: (f: FiltroLeads) => void;
  nombreFuente: (id: string) => string;
}) {
  const chips = describirFiltro(filtro, nombreFuente);
  if (!chips.length) return null;
  return (
    <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
      {chips.map((c) => (
        <span key={c.clave} className="ax-badge ax-badge--neutral">
          {c.texto}
          <button
            type="button"
            className="ax-btn ax-btn--ghost ax-btn--sm"
            aria-label={`Quitar ${c.texto}`}
            onClick={() => onCambio(quitarDeFiltro(filtro, c.clave))}
          >
            ×
          </button>
        </span>
      ))}
      <button type="button" className="ax-btn ax-btn--link ax-btn--sm" onClick={() => onCambio(FILTRO_VACIO)}>
        Limpiar todo
      </button>
    </div>
  );
}

export default ChipsFiltros;
