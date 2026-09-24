'use client';
/*
 * Punto de montaje en la cabecera de página (PageHead actions) para el menú Exportar
 * que LeadsTable porta ahí (ver LeadsTable.tsx) — así queda junto a Importar, visible a
 * cualquiera que vea la tabla (lector incluido; Importar sigue solo para puedeEditar),
 * y LeadsTable sigue siendo la única fuente de verdad de qué se exporta (filtros/columnas
 * visibles/selección actuales), sin duplicar ese estado en cada página.
 */
export const EXPORTAR_SLOT_ID = 'leads-exportar-slot';

export function ExportarSlot() {
  return <span id={EXPORTAR_SLOT_ID} className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }} />;
}

export default ExportarSlot;
