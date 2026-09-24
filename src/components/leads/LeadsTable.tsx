'use client';
/*
 * Sistema de Leads — tabla principal: búsqueda, filtros avanzados, columnas
 * configurables, orden, paginación, selección + cambio de estado en lote y
 * edición por fila. Markup portado de vireo/crm/Leads.tsx + tables/DataTables.tsx
 * (clases ax-table*, ax-badge--*, ax-checkbox, paginación, estado vacío).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import {
  cambiarEstado,
  ESTADOS,
  listarColumnasExtra,
  listarFuentes,
  listarLeads,
  todosLosLeads,
  type ColumnaExtra,
  type Fuente,
  type Lead,
  type Orden,
} from '../../lib/leads/datos';
import { esNucleo } from '../../../supabase/functions/_shared/lead';
import { FILTRO_VACIO, type FiltroLeads } from '../../lib/leads/filtros';
import { exportarLeads } from '../../lib/leads/exportar';
import { useAuth } from '../../context/AuthContext';
import { ChipsFiltros } from './ChipsFiltros';
import { ColumnasMenu } from './ColumnasMenu';
import { FiltrosPanel } from './FiltrosPanel';
import { EditarLeadModal } from './EditarLeadModal';
import { ConfirmarEliminarModal } from './ConfirmarEliminarModal';
import { EXPORTAR_SLOT_ID } from './ExportarSlot';
import { Dropdown } from '../ui/Dropdown';

interface Columna { key: string; label: string; render?: (l: Lead) => string; orden?: string; grupo?: string }

const BASE: Columna[] = [
  { key: 'nombre', label: 'Nombre', render: (l: Lead) => `${l.nombres ?? ''} ${l.apellido ?? ''}`.trim() || '—', orden: 'nombres' },
  { key: 'email', label: 'Correo', orden: 'email' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'empresa', label: 'Empresa', orden: 'empresa' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'rubro', label: 'Rubro', orden: 'rubro' },
  { key: 'ruc', label: 'RUC/DNI' },
  { key: 'fuente', label: 'Fuente', render: (l: Lead) => l.fuentes?.nombre ?? '—' },
  { key: 'status', label: 'Estado', orden: 'status' },
  { key: 'created_at', label: 'Registrado', orden: 'created_at', render: (l: Lead) => new Date(l.created_at).toLocaleString('es-PE') },
];

const claseEstado: Record<string, string> = {
  nuevo: 'ax-badge--info', contactado: 'ax-badge--accent', asistio: 'ax-badge--success', descartado: 'ax-badge--danger',
};

const PORPAGINA_OPC = [25, 50, 100];

function SortGlyph({ activo, asc }: { activo: boolean; asc: boolean }): ReactElement {
  if (!activo) return <svg className="ax-table__sort" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.4 }}><path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" /></svg>;
  return asc
    ? <svg className="ax-table__sort" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6 -6l6 6" /></svg>
    : <svg className="ax-table__sort" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>;
}

function pageList(total: number, actual: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  if (actual > 3) out.push('…');
  for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) out.push(i);
  if (actual < total - 2) out.push('…');
  out.push(total);
  return out;
}

function contarFiltrosActivos(f: FiltroLeads, ocultarFuente: boolean): number {
  let n = 0;
  if (!ocultarFuente && f.fuentes?.length) n++;
  if (f.estados?.length) n++;
  if (f.desde) n++;
  if (f.hasta) n++;
  n += f.condiciones.length;
  return n;
}

export function LeadsTable({ fuenteFija }: { fuenteFija?: Fuente }) {
  const { puedeEditar, esAdmin } = useAuth();
  const searchParams = useSearchParams();
  const claveColumnas = `leads:columnas:${fuenteFija?.slug ?? 'todas'}`;
  const [columnasExtra, setColumnasExtra] = useState<ColumnaExtra[]>([]);
  // las columnas extra globales cargan async: hasta que no terminen, `columnas` todavía no
  // las incluye — restaurar/filtrar contra localStorage antes de eso las perdería para
  // siempre (ver el efecto de restauración más abajo).
  const [extrasListas, setExtrasListas] = useState(false);
  useEffect(() => {
    listarColumnasExtra().then(setColumnasExtra).catch(() => setColumnasExtra([])).finally(() => setExtrasListas(true));
  }, []);

  const columnas = useMemo<Columna[]>(() => {
    // con fuenteFija: primero sus campos declarados (en el orden del formulario), luego el
    // resto de columnas extra globales que no sean ya uno de esos campos. Sin fuenteFija:
    // todas las columnas extra globales. `orden: c.key` — columna() ya mapea a extra->>key.
    const deFuente = (fuenteFija?.campos ?? []).filter((c) => !esNucleo(c.key));
    const clavesFuente = new Set(deFuente.map((c) => c.key));
    const globales = columnasExtra.filter((c) => !clavesFuente.has(c.key));
    const extra = [...deFuente, ...globales].map((c) => ({
      key: c.key,
      label: c.label,
      orden: c.key,
      grupo: 'Campos adicionales',
      render: (l: Lead) => l.extra?.[c.key] ?? '—',
    }));
    return [...BASE, ...extra];
  }, [fuenteFija, columnasExtra]);

  const [filtro, setFiltro] = useState<FiltroLeads>(() => {
    if (fuenteFija) return { ...FILTRO_VACIO, fuentes: [fuenteFija.id] };
    const fuenteQuery = searchParams.get('fuente');
    return fuenteQuery ? { ...FILTRO_VACIO, fuentes: [fuenteQuery] } : FILTRO_VACIO;
  });
  const [orden, setOrden] = useState<Orden>({ campo: 'created_at', asc: false });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [visibles, setVisibles] = useState<string[]>(() => columnas.map((c) => c.key));
  const [qInput, setQInput] = useState('');
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [editando, setEditando] = useState<Lead | null>(null);
  const [eliminando, setEliminando] = useState<{ ids: string[]; titulo: string; descripcion: string } | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [fuentes, setFuentes] = useState<Fuente[]>(fuenteFija ? [fuenteFija] : []);
  const [filas, setFilas] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnasListas, setColumnasListas] = useState(false);
  const [loteError, setLoteError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const cargaId = useRef(0);

  // columnas visibles: restaurar de localStorage al montar / cambiar de fuente — solo
  // cuando `extrasListas`, para que `columnas` ya incluya las extra globales (si se
  // restaura antes, el filtro contra `columnas` las descarta y el guardado de abajo
  // las borra de localStorage para siempre). Se guardan dos listas: la de columnas
  // visibles, y la de TODAS las claves ya vistas alguna vez — cualquier clave de
  // `columnas` que no esté en esa segunda lista es nueva (p.ej. una columna extra que
  // se registró después de la última visita) y se agrega como visible por defecto,
  // sin pisar lo que el usuario ya haya ocultado a propósito.
  // El guardado (efecto siguiente) espera a `columnasListas` para no pisar el valor
  // persistido con el estado inicial todavía no restaurado (carrera agravada por el
  // doble-invoke de efectos de React StrictMode en dev).
  useEffect(() => {
    if (!extrasListas) return;
    const claveVistas = `${claveColumnas}:vistas`;
    const clavesActuales = columnas.map((c) => c.key);
    try {
      const rawVisibles = window.localStorage.getItem(claveColumnas);
      const rawVistas = window.localStorage.getItem(claveVistas);
      const vistasPrevias = new Set<string>(rawVistas ? (JSON.parse(rawVistas) as string[]) : []);
      const nuevas = clavesActuales.filter((k) => !vistasPrevias.has(k));
      const guardadas = rawVisibles ? (JSON.parse(rawVisibles) as string[]).filter((k) => clavesActuales.includes(k)) : null;
      setVisibles(guardadas ? [...new Set([...guardadas, ...nuevas])] : clavesActuales);
      window.localStorage.setItem(claveVistas, JSON.stringify([...new Set([...vistasPrevias, ...clavesActuales])]));
    } catch {
      setVisibles(clavesActuales);
    }
    setColumnasListas(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveColumnas, extrasListas]);

  useEffect(() => {
    if (!columnasListas || !visibles.length) return;
    try { window.localStorage.setItem(claveColumnas, JSON.stringify(visibles)); } catch { /* noop */ }
  }, [visibles, claveColumnas, columnasListas]);

  useEffect(() => {
    if (fuenteFija) { setFuentes([fuenteFija]); return; }
    listarFuentes().then(setFuentes).catch(() => setFuentes([]));
  }, [fuenteFija]);

  // búsqueda con debounce de 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltro((f) => (f.q === (qInput || undefined) ? f : { ...f, q: qInput || undefined }));
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);
  useEffect(() => { setQInput(filtro.q ?? ''); }, [filtro.q]);

  const cargar = useCallback(() => {
    const id = ++cargaId.current;
    setCargando(true);
    setError(null);
    listarLeads(filtro, orden, pagina, porPagina)
      .then(({ filas: f, total: t }) => {
        if (id !== cargaId.current) return; // respuesta de una carga vieja: descartar
        setFilas(f);
        setTotal(t);
      })
      .catch((e: unknown) => {
        if (id !== cargaId.current) return;
        setError(e instanceof Error ? e.message : 'Error al cargar leads');
      })
      .finally(() => {
        if (id !== cargaId.current) return;
        setCargando(false);
      });
  }, [filtro, orden, pagina, porPagina]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setSeleccion(new Set()); }, [filtro, orden]);
  useEffect(() => {
    if (!mensajeExito) return;
    const t = setTimeout(() => setMensajeExito(null), 3000);
    return () => clearTimeout(t);
  }, [mensajeExito]);

  const nombreFuente = (id: string) => fuentes.find((f) => f.id === id)?.nombre ?? id;

  const aplicarDesdePanel = (f: FiltroLeads) => {
    const final = fuenteFija ? { ...f, fuentes: [fuenteFija.id] } : f;
    setFiltro(final);
    setPagina(1);
    setPanelAbierto(false);
  };
  const cambiarChips = (f: FiltroLeads) => {
    const final = fuenteFija ? { ...f, fuentes: [fuenteFija.id] } : f;
    setFiltro(final);
    setPagina(1);
  };
  const limpiarFiltros = () => cambiarChips(FILTRO_VACIO);

  const sortBy = (campo?: string) => {
    if (!campo) return;
    setOrden((o) => (o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: true }));
    setPagina(1);
  };
  const ariaSort = (campo?: string): 'ascending' | 'descending' | 'none' =>
    campo && orden.campo === campo ? (orden.asc ? 'ascending' : 'descending') : 'none';

  const pagedIds = filas.map((f) => f.id);
  const todasSeleccionadas = pagedIds.length > 0 && pagedIds.every((id) => seleccion.has(id));
  const algunasSeleccionadas = pagedIds.some((id) => seleccion.has(id)) && !todasSeleccionadas;
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = algunasSeleccionadas; }, [algunasSeleccionadas]);

  const toggleTodas = (on: boolean) => setSeleccion((s) => {
    const n = new Set(s);
    pagedIds.forEach((id) => (on ? n.add(id) : n.delete(id)));
    return n;
  });
  const toggleFila = (id: string) => setSeleccion((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const cambiarEstadoLote = async (estado: string) => {
    if (!estado || !seleccion.size) return;
    setLoteError(null);
    try {
      await cambiarEstado([...seleccion], estado);
      setSeleccion(new Set());
      cargar();
    } catch (e) {
      setLoteError(e instanceof Error ? e.message : 'No se pudo cambiar el estado. Intenta de nuevo.');
    }
  };

  const nombreLead = (l: Lead) => `${l.nombres ?? ''} ${l.apellido ?? ''}`.trim() || l.email || 'este lead';

  const pedirEliminarFila = (l: Lead) => setEliminando({
    ids: [l.id],
    titulo: 'Eliminar lead',
    descripcion: `¿Eliminar a ${nombreLead(l)}${l.email ? ` (${l.email})` : ''}?`,
  });
  const pedirEliminarLote = () => setEliminando({
    ids: [...seleccion],
    titulo: 'Eliminar leads seleccionados',
    descripcion: `¿Eliminar ${seleccion.size} lead${seleccion.size === 1 ? '' : 's'} seleccionado${seleccion.size === 1 ? '' : 's'}?`,
  });
  const alEliminar = () => {
    const n = eliminando?.ids.length ?? 1;
    setEliminando(null);
    setSeleccion(new Set());
    setMensajeExito(n === 1 ? 'Lead eliminado' : `${n} leads eliminados`);
    cargar();
  };

  const exportar = async (formato: 'xlsx' | 'csv') => {
    setExportError(null);
    setExportando(true);
    try {
      const columnasExport = columnasVisibles.map(({ key, label }) => ({ key, label }));
      const registros = seleccion.size ? filas.filter((l) => seleccion.has(l.id)) : await todosLosLeads(filtro, orden);
      const fecha = new Date().toISOString().slice(0, 10);
      await exportarLeads(registros, columnasExport, formato, `leads-${fecha}`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'No se pudo exportar. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total ? (pagina - 1) * porPagina + 1 : 0;
  const hasta = Math.min(pagina * porPagina, total);

  const columnasVisibles = columnas.filter((c) => visibles.includes(c.key));
  const contadorFiltros = contarFiltrosActivos(filtro, !!fuenteFija);

  // Exportar vive en la cabecera de página, junto a Importar (pedido del usuario) — se
  // porta ahí vía ExportarSlot para no duplicar el estado (filtro/orden/columnas
  // visibles/selección) fuera de LeadsTable, que sigue siendo la única fuente de verdad.
  // useLayoutEffect (no useEffect) para encontrar el slot antes del primer paint: si no,
  // el botón parpadearía un frame en la posición vieja (toolbar) antes de saltar al header.
  const [exportarSlotEl, setExportarSlotEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setExportarSlotEl(document.getElementById(EXPORTAR_SLOT_ID)); }, []);

  const exportarMenu = (
    <Dropdown
      className="ax-dropdown-wrap"
      panelClassName="ax-dropdown"
      panelAriaLabel="Exportar leads"
      trigger={({ triggerProps }) => (
        <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" disabled={exportando} {...triggerProps}>
          <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
          <span className="ax-btn__label">{exportando ? 'Preparando…' : 'Exportar'}</span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <button type="button" className="ax-menu__item" onClick={() => { close(); exportar('xlsx'); }}>Excel (.xlsx)</button>
          <button type="button" className="ax-menu__item" onClick={() => { close(); exportar('csv'); }}>CSV (.csv)</button>
        </>
      )}
    </Dropdown>
  );

  return (
    <>
      <div className="ax-dash-grid">
        <section className="ax-card ax-col--12" role="region" aria-label="Tabla de leads">
          <div className="ax-card__header" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Leads</h2>
              <p className="ax-card__subtitle ax-num" style={{ fontFamily: 'var(--ax-font-mono)' }}>{total} en total</p>
            </div>
            <div className="ax-card__actions" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-2)' }}>
              <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--ax-text-subtle)' }}><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                <input
                  type="search"
                  className="ax-input ax-input--sm"
                  placeholder="Buscar nombre, correo, empresa…"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  style={{ paddingInlineStart: 34 }}
                  aria-label="Buscar leads"
                />
              </div>
              <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={() => setPanelAbierto(true)} aria-expanded={panelAbierto}>
                <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6l16 0" /><path d="M10 12l4 0" /><path d="M8 18l8 0" /></svg>
                <span className="ax-btn__label">Filtros{contadorFiltros > 0 ? ` (${contadorFiltros})` : ''}</span>
              </button>
              <ColumnasMenu columnas={columnas.map(({ key, label, grupo }) => ({ key, label, grupo }))} visibles={visibles} onCambiar={setVisibles} />
              {!exportarSlotEl && exportarMenu}
            </div>
          </div>

          <div className="ax-card__body" style={{ paddingTop: 0, paddingBottom: 'var(--ax-space-4)' }}>
            <ChipsFiltros filtro={filtro} onCambio={cambiarChips} nombreFuente={nombreFuente} />
          </div>

          {puedeEditar && seleccion.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', margin: '0 var(--ax-space-5) var(--ax-space-3)', padding: 'var(--ax-space-2) var(--ax-space-4)', background: 'var(--ax-accent-wash)', border: '1px solid var(--ax-accent)', borderRadius: 'var(--ax-radius-md)', flexWrap: 'wrap' }}>
              <b className="ax-num" style={{ color: 'var(--ax-accent)', fontSize: 'var(--ax-text-sm)' }}>{seleccion.size} seleccionados</b>
              <span style={{ width: 1, height: 18, background: 'var(--ax-border-strong)' }} />
              <select className="ax-select ax-select--sm" defaultValue="" onChange={(e) => { cambiarEstadoLote(e.target.value); e.target.value = ''; }} aria-label="Cambiar estado">
                <option value="" disabled>Cambiar estado…</option>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              {esAdmin && (
                <button type="button" className="ax-btn ax-btn--danger ax-btn--sm" onClick={pedirEliminarLote}>
                  Eliminar seleccionados
                </button>
              )}
              <span style={{ flex: '1 1 auto' }} />
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Limpiar selección" onClick={() => setSeleccion(new Set())}>
                <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {mensajeExito && (
            <p role="status" style={{ margin: '0 var(--ax-space-5) var(--ax-space-3)', color: 'var(--ax-success-500)', fontSize: 'var(--ax-text-sm)' }}>{mensajeExito}</p>
          )}

          {loteError && (
            <p role="alert" style={{ margin: '0 var(--ax-space-5) var(--ax-space-3)', color: 'var(--ax-danger-500)', fontSize: 'var(--ax-text-sm)' }}>{loteError}</p>
          )}

          {exportError && (
            <p role="alert" style={{ margin: '0 var(--ax-space-5) var(--ax-space-3)', color: 'var(--ax-danger-500)', fontSize: 'var(--ax-text-sm)' }}>{exportError}</p>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: 'var(--ax-space-8) var(--ax-space-5)' }}>
              <p style={{ color: 'var(--ax-danger-500)', marginBottom: 'var(--ax-space-3)' }}>{error}</p>
              <button type="button" className="ax-btn ax-btn--secondary" onClick={cargar}>Reintentar</button>
            </div>
          )}

          {!error && (
            <div className="ax-table-wrap">
              <table className="ax-table ax-table--hover" style={{ minWidth: 980 }}>
                <caption className="ax-visually-hidden">Leads, ordenables y filtrables</caption>
                <thead className="ax-table__head">
                  <tr>
                    <th className="ax-table__th" scope="col" style={{ width: 38 }}>
                      <input
                        type="checkbox"
                        className="ax-checkbox"
                        aria-label="Seleccionar todas las filas de esta página"
                        checked={todasSeleccionadas}
                        ref={selectAllRef}
                        onChange={(e) => toggleTodas(e.target.checked)}
                      />
                    </th>
                    {columnasVisibles.map((c) => (
                      <th
                        key={c.key}
                        className={`ax-table__th${c.orden ? ' ax-table__th--sortable' : ''}`}
                        scope="col"
                        aria-sort={ariaSort(c.orden)}
                      >
                        {c.orden ? (
                          <button
                            type="button"
                            onClick={() => sortBy(c.orden)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, padding: 0, margin: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                          >
                            {c.label} <SortGlyph activo={orden.campo === c.orden} asc={orden.asc} />
                          </button>
                        ) : c.label}
                      </th>
                    ))}
                    <th className="ax-table__th" scope="col" style={{ width: 80 }}><span className="ax-visually-hidden">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((l) => (
                    <tr
                      key={l.id}
                      className="ax-table__row"
                      style={seleccion.has(l.id) ? { background: 'var(--ax-accent-wash)' } : undefined}
                      onClick={(e) => { if ((e.target as HTMLElement).closest('input,button')) return; setEditando(l); }}
                    >
                      <td className="ax-table__td">
                        <input type="checkbox" className="ax-checkbox" checked={seleccion.has(l.id)} onChange={() => toggleFila(l.id)} aria-label={`Seleccionar ${l.nombres ?? l.email ?? l.id}`} />
                      </td>
                      {columnasVisibles.map((c) => (
                        <td key={c.key} className="ax-table__td">
                          {c.key === 'status' ? (
                            <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ${claseEstado[l.status] ?? 'ax-badge--neutral'}`}>
                              <span className="ax-badge__dot" /><span>{l.status}</span>
                            </span>
                          ) : c.render ? c.render(l) : (l[c.key as keyof Lead] as string) || '—'}
                        </td>
                      ))}
                      <td className="ax-table__td" style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                          title={puedeEditar ? 'Editar' : 'Ver'}
                          aria-label={`${puedeEditar ? 'Editar' : 'Ver'} ${l.nombres ?? l.email ?? 'lead'}`}
                          onClick={() => setEditando(l)}
                        >
                          <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" /><path d="M16 5l3 3" /></svg>
                        </button>
                        {esAdmin && (
                          <button
                            type="button"
                            className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                            title="Eliminar"
                            aria-label={`Eliminar ${l.nombres ?? l.email ?? 'lead'}`}
                            onClick={() => pedirEliminarFila(l)}
                          >
                            <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="var(--ax-danger-500)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!error && !cargando && !filas.length && (
            <div style={{ textAlign: 'center', padding: 'var(--ax-space-10) var(--ax-space-5)' }}>
              <h3 style={{ color: 'var(--ax-text-strong)', fontFamily: 'var(--ax-font-display)', marginBottom: 'var(--ax-space-2)' }}>No hay leads con estos filtros</h3>
              <button type="button" className="ax-btn ax-btn--secondary" onClick={limpiarFiltros}>Limpiar filtros</button>
            </div>
          )}

          {!error && !!total && (
            <div className="ax-card__footer ax-flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
              <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)' }}>
                <span className="ax-pagination__summary ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)' }}>
                  Mostrando {desde}–{hasta} de {total}
                </span>
                <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>
                  Por página
                  <select className="ax-select ax-select--sm" value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }} aria-label="Filas por página" style={{ minWidth: 72 }}>
                    {PORPAGINA_OPC.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <nav className="ax-pagination" aria-label="Paginación">
                <button type="button" className="ax-pagination__prev" disabled={pagina === 1} aria-disabled={pagina === 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} aria-label="Página anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg></button>
                <ul className="ax-pagination__pages">
                  {pageList(totalPaginas, pagina).map((p, i) => (
                    <li key={`${p}-${i}`}>
                      {p === '…' ? <span className="ax-pagination__ellipsis">…</span>
                        : <button type="button" className={`ax-pagination__page${pagina === p ? ' is-active' : ''}`} aria-current={pagina === p ? 'page' : undefined} onClick={() => setPagina(p)}>{p}</button>}
                    </li>
                  ))}
                </ul>
                <button type="button" className="ax-pagination__next" disabled={pagina === totalPaginas} aria-disabled={pagina === totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} aria-label="Página siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6" /></svg></button>
              </nav>
            </div>
          )}
        </section>
      </div>

      {exportarSlotEl && createPortal(exportarMenu, exportarSlotEl)}

      <FiltrosPanel
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        filtro={filtro}
        onAplicar={aplicarDesdePanel}
        fuentes={fuentes}
        fuenteFija={fuenteFija}
        columnasExtra={columnasExtra}
      />

      {editando && (
        <EditarLeadModal
          lead={editando}
          fuente={fuentes.find((f) => f.id === editando.fuente_id)}
          columnasExtra={columnasExtra}
          puedeEditar={puedeEditar}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar(); }}
        />
      )}

      {eliminando && (
        <ConfirmarEliminarModal
          titulo={eliminando.titulo}
          descripcion={eliminando.descripcion}
          ids={eliminando.ids}
          onCerrar={() => setEliminando(null)}
          onEliminado={alEliminar}
        />
      )}
    </>
  );
}

export default LeadsTable;
