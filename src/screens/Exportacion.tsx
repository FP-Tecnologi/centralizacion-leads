'use client';
/*
 * Sistema de Leads — Tarea 14: exportación de leads (Excel/CSV con filtros y
 * columnas elegibles) + aplicaciones conectadas (claves de API para HUB u
 * otras apps, alcance por fuente, revocar/regenerar) + documentación de la
 * API v1 en la misma pantalla. Markup y componentes portados de las tareas
 * 9–12 (FiltrosPanel, ChipsFiltros, PageHead) y de GestionarFuente (patrón
 * "mostrar clave una sola vez + copiar").
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EnBody } from '../components/ui/EnBody';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PageHead } from '../components/shell/PageHead';
import { useDialogo } from '../components/ui/Dialogo';
import { FiltrosPanel } from '../components/leads/FiltrosPanel';
import { ChipsFiltros } from '../components/leads/ChipsFiltros';
import { listarColumnasExtra, listarFuentes, listarLeads, todosLosLeads, type ColumnaExtra, type Fuente, type Orden } from '../lib/leads/datos';
import { exportarLeads } from '../lib/leads/exportar';
import { FILTRO_VACIO, type FiltroLeads } from '../lib/leads/filtros';

const ORDEN: Orden = { campo: 'created_at', asc: false };

const COLUMNAS_BASE = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'email', label: 'Correo' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'ruc', label: 'RUC/DNI' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'rubro', label: 'Rubro' },
  { key: 'fecha_nacimiento', label: 'Fecha de nacimiento' },
  { key: 'fuente', label: 'Fuente' },
  { key: 'evento', label: 'Evento' },
  { key: 'status', label: 'Estado' },
  { key: 'created_at', label: 'Registrado' },
];

interface Aplicacion {
  id: string; nombre: string; permisos: string[]; fuentes: string[] | null;
  activa: boolean; ultimo_uso: string | null; creado_en: string;
}

// ---------------------------------------------------------------------------
// Tab 1: Exportar archivo
// ---------------------------------------------------------------------------
function ExportarTab({ fuentes, columnasExtra }: { fuentes: Fuente[]; columnasExtra: ColumnaExtra[] }) {
  const [filtro, setFiltro] = useState<FiltroLeads>(FILTRO_VACIO);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const columnasDisponibles = useMemo(
    () => [...COLUMNAS_BASE, ...columnasExtra.map((c) => ({ key: c.key, label: c.label }))],
    [columnasExtra],
  );
  const [visibles, setVisibles] = useState<string[]>(() => columnasDisponibles.map((c) => c.key));
  useEffect(() => { setVisibles((prev) => [...new Set([...prev, ...columnasDisponibles.map((c) => c.key)])]); }, [columnasDisponibles]);
  const [formato, setFormato] = useState<'xlsx' | 'csv'>('xlsx');
  const [conteo, setConteo] = useState<number | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    listarLeads(filtro, ORDEN, 1, 1).then(({ total }) => { if (vivo) setConteo(total); }).catch(() => { if (vivo) setConteo(null); });
    return () => { vivo = false; };
  }, [filtro]);

  const nombreFuente = (id: string) => fuentes.find((f) => f.id === id)?.nombre ?? id;
  const toggleColumna = (key: string) => setVisibles((v) => (v.includes(key) ? v.filter((k) => k !== key) : [...v, key]));

  const descargar = async () => {
    setError(null);
    setDescargando(true);
    try {
      const columnas = columnasDisponibles.filter((c) => visibles.includes(c.key));
      const leads = await todosLosLeads(filtro, ORDEN);
      const fecha = new Date().toISOString().slice(0, 10);
      await exportarLeads(leads, columnas, formato, `leads-${fecha}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar. Intenta de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
      <div className="ax-cluster" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ax-space-2)' }}>
        <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={() => setPanelAbierto(true)} aria-expanded={panelAbierto}>
          Filtros
        </button>
        <p className="ax-num" style={{ margin: 0 }}>
          {conteo === null ? 'Calculando…' : `${conteo} lead${conteo === 1 ? '' : 's'} a exportar`}
        </p>
      </div>

      <ChipsFiltros filtro={filtro} onCambio={setFiltro} nombreFuente={nombreFuente} />

      <div className="ax-field">
        <span className="ax-label">Columnas</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--ax-space-2)' }}>
          {columnasDisponibles.map((c) => (
            <label key={c.key} className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
              <input type="checkbox" className="ax-checkbox" checked={visibles.includes(c.key)} onChange={() => toggleColumna(c.key)} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="ax-field" style={{ maxWidth: 260 }}>
        <span className="ax-label">Formato</span>
        <div className="ax-cluster" style={{ gap: 'var(--ax-space-4)' }}>
          <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
            <input type="radio" className="ax-radio" name="exp-formato" checked={formato === 'xlsx'} onChange={() => setFormato('xlsx')} />
            <span>Excel (.xlsx)</span>
          </label>
          <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
            <input type="radio" className="ax-radio" name="exp-formato" checked={formato === 'csv'} onChange={() => setFormato('csv')} />
            <span>CSV (.csv)</span>
          </label>
        </div>
      </div>

      {error && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>}

      <div>
        <button type="button" className="ax-btn ax-btn--primary" disabled={descargando || !visibles.length} onClick={descargar}>
          {descargando ? 'Preparando…' : 'Descargar'}
        </button>
      </div>

      <FiltrosPanel
        abierto={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        filtro={filtro}
        onAplicar={(f) => { setFiltro(f); setPanelAbierto(false); }}
        fuentes={fuentes}
        columnasExtra={columnasExtra}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: nueva aplicación
// ---------------------------------------------------------------------------
function NuevaAplicacionModal({ fuentes, onCerrar, onCreada }: { fuentes: Fuente[]; onCerrar: () => void; onCreada: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  useFocusTrap(ref, true);
  const [nombre, setNombre] = useState('');
  const [alcance, setAlcance] = useState<'todas' | 'elegir'>('todas');
  const [fuentesElegidas, setFuentesElegidas] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clave, setClave] = useState<string | null>(null);

  const toggleFuente = (id: string) => setFuentesElegidas((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const crear = async () => {
    setError(null);
    if (!nombre.trim()) { setError('Ingresa un nombre.'); return; }
    if (alcance === 'elegir' && !fuentesElegidas.length) { setError('Elige al menos una fuente.'); return; }
    setCreando(true);
    try {
      const { data, error: err } = await supabase.rpc('crear_aplicacion', {
        p_nombre: nombre.trim(),
        p_permisos: ['leer'],
        p_fuentes: alcance === 'todas' ? null : fuentesElegidas,
      });
      if (err) throw err;
      setClave((data as { clave: string }).clave);
      onCreada();
    } catch {
      setError('No se pudo crear la aplicación. Intenta de nuevo.');
    } finally {
      setCreando(false);
    }
  };

  const copiarClave = () => { if (clave) navigator.clipboard?.writeText(clave).catch(() => {}); };

  return (
    <EnBody>
    <div onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="ax-backdrop" onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 'var(--ax-z-modal)', background: 'rgba(0,0,0,.45)', border: 0 }} />
      <div className="ax-flex" role="dialog" aria-modal="true" aria-label="Nueva aplicación" style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--ax-z-modal) + 1)', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)' }}>
        <form
          className="ax-card"
          ref={ref}
          onSubmit={(e) => { e.preventDefault(); if (!clave) crear(); }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 'min(520px,100%)', maxHeight: '90vh', overflow: 'auto' }}
        >
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">Nueva aplicación</h2></div>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" onClick={onCerrar} aria-label="Cerrar">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {!clave ? (
              <>
                <div className="ax-field">
                  <label className="ax-label" htmlFor="app-nombre">Nombre</label>
                  <input id="app-nombre" className="ax-input" placeholder="ej. HUB FPTecnologi" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={creando} />
                </div>

                <div className="ax-field">
                  <span className="ax-label">Permisos</span>
                  <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                    <input type="checkbox" className="ax-checkbox" checked disabled />
                    <span>Leer</span>
                  </label>
                  <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                    <input type="checkbox" className="ax-checkbox" disabled />
                    <span>Escribir <span className="ax-note">(Disponible en fase 2)</span></span>
                  </label>
                </div>

                <div className="ax-field">
                  <span className="ax-label">Alcance</span>
                  <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
                    <input type="radio" className="ax-radio" name="app-alcance" checked={alcance === 'todas'} onChange={() => setAlcance('todas')} disabled={creando} />
                    <span>Todas las fuentes</span>
                  </label>
                  <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
                    <input type="radio" className="ax-radio" name="app-alcance" checked={alcance === 'elegir'} onChange={() => setAlcance('elegir')} disabled={creando} />
                    <span>Elegir fuentes</span>
                  </label>
                  {alcance === 'elegir' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)', marginTop: 'var(--ax-space-2)', paddingInlineStart: 'var(--ax-space-5)' }}>
                      {fuentes.map((f) => (
                        <label key={f.id} className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
                          <input type="checkbox" className="ax-checkbox" checked={fuentesElegidas.includes(f.id)} onChange={() => toggleFuente(f.id)} disabled={creando} />
                          <span>{f.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {error && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>}
              </>
            ) : (
              <div style={{ padding: 'var(--ax-space-3)', background: 'var(--ax-accent-wash)', border: '1px solid var(--ax-accent)', borderRadius: 'var(--ax-radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
                <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
                  <code className="ax-num" style={{ wordBreak: 'break-all' }}>{clave}</code>
                  <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={copiarClave}>Copiar</button>
                </div>
                <p className="ax-note">Guárdala ahora, no se vuelve a mostrar.</p>
              </div>
            )}
          </div>

          <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ax-space-2)', borderTop: '1px solid var(--ax-border)' }}>
            {!clave ? (
              <>
                <button type="button" className="ax-btn ax-btn--ghost" onClick={onCerrar} disabled={creando}>Cancelar</button>
                <button type="submit" className="ax-btn ax-btn--primary" disabled={creando}>{creando ? 'Creando…' : 'Crear'}</button>
              </>
            ) : (
              <button type="button" className="ax-btn ax-btn--primary" onClick={onCerrar}>Cerrar</button>
            )}
          </div>
        </form>
      </div>
    </div>
    </EnBody>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Aplicaciones conectadas (admin)
// ---------------------------------------------------------------------------
function AplicacionesTab({ fuentes }: { fuentes: Fuente[] }) {
  const { confirmar } = useDialogo();
  const [apps, setApps] = useState<Aplicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creandoModal, setCreandoModal] = useState(false);
  const [claveRegenerada, setClaveRegenerada] = useState<{ nombre: string; clave: string } | null>(null);
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    const { data, error: err } = await supabase.from('aplicaciones').select('*').order('creado_en', { ascending: false });
    if (err) setError('No se pudo cargar las aplicaciones.');
    else setApps((data ?? []) as Aplicacion[]);
    setCargando(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, []);

  const nombreFuente = (id: string) => fuentes.find((f) => f.id === id)?.nombre ?? id;
  const alcanceDe = (a: Aplicacion) => (a.fuentes === null ? 'Todas las fuentes' : a.fuentes.map(nombreFuente).join(', ') || '—');

  const toggleActiva = async (a: Aplicacion) => {
    const siguiente = !a.activa;
    setApps((prev) => prev.map((x) => (x.id === a.id ? { ...x, activa: siguiente } : x)));
    const { error: err } = await supabase.from('aplicaciones').update({ activa: siguiente }).eq('id', a.id);
    if (err) setApps((prev) => prev.map((x) => (x.id === a.id ? { ...x, activa: a.activa } : x)));
  };

  const regenerarClave = async (a: Aplicacion) => {
    const ok = await confirmar({
      titulo: `¿Regenerar la clave de "${a.nombre}"?`,
      mensaje: 'Las integraciones que usan la clave actual dejarán de funcionar hasta que pongas la nueva.',
      confirmarTexto: 'Regenerar clave',
      tono: 'aviso',
    });
    if (!ok) return;
    setClaveRegenerada(null);
    setRegenerandoId(a.id);
    try {
      const { data, error: err } = await supabase.rpc('regenerar_clave_aplicacion', { p_app: a.id });
      if (err) throw err;
      setClaveRegenerada({ nombre: a.nombre, clave: data as string });
    } catch {
      setError('No se pudo regenerar la clave. Intenta de nuevo.');
    } finally {
      setRegenerandoId(null);
    }
  };

  const eliminar = async (a: Aplicacion) => {
    const ok = await confirmar({
      titulo: `¿Eliminar la aplicación "${a.nombre}"?`,
      mensaje: 'Dejará de poder leer leads con su clave. Esta acción no se puede deshacer.',
      confirmarTexto: 'Eliminar',
      tono: 'peligro',
    });
    if (!ok) return;
    const { error: err } = await supabase.from('aplicaciones').delete().eq('id', a.id);
    if (err) { setError('No se pudo eliminar la aplicación.'); return; }
    setApps((prev) => prev.filter((x) => x.id !== a.id));
  };

  const copiarClave = () => { if (claveRegenerada) navigator.clipboard?.writeText(claveRegenerada.clave).catch(() => {}); };

  const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? '<proyecto>.supabase.co'}/functions/v1/api-v1`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
      <div className="ax-cluster" style={{ justifyContent: 'space-between' }}>
        <h3 className="ax-card__title" style={{ fontSize: 'var(--ax-text-md)', margin: 0 }}>Aplicaciones</h3>
        <button type="button" className="ax-btn ax-btn--primary ax-btn--sm" onClick={() => setCreandoModal(true)}>Nueva aplicación</button>
      </div>

      {error && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>}

      {claveRegenerada && (
        <div style={{ padding: 'var(--ax-space-3)', background: 'var(--ax-accent-wash)', border: '1px solid var(--ax-accent)', borderRadius: 'var(--ax-radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
          <p className="ax-note" style={{ margin: 0 }}>Nueva clave de &quot;{claveRegenerada.nombre}&quot;:</p>
          <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
            <code className="ax-num" style={{ wordBreak: 'break-all' }}>{claveRegenerada.clave}</code>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={copiarClave}>Copiar</button>
          </div>
          <p className="ax-note">Guárdala ahora, no se vuelve a mostrar.</p>
        </div>
      )}

      {cargando ? null : !apps.length ? (
        <p className="ax-text-subtle">Aún no hay aplicaciones conectadas.</p>
      ) : (
        <div className="ax-table-wrap">
          <table className="ax-table">
            <thead className="ax-table__head">
              <tr>
                <th className="ax-table__th" scope="col">Nombre</th>
                <th className="ax-table__th" scope="col">Permisos</th>
                <th className="ax-table__th" scope="col">Alcance</th>
                <th className="ax-table__th" scope="col">Activa</th>
                <th className="ax-table__th" scope="col">Último uso</th>
                <th className="ax-table__th" scope="col"><span className="ax-visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="ax-table__row">
                  <td className="ax-table__td">{a.nombre}</td>
                  <td className="ax-table__td">{a.permisos.join(', ')}</td>
                  <td className="ax-table__td">{alcanceDe(a)}</td>
                  <td className="ax-table__td">
                    <input type="checkbox" className="ax-switch" checked={a.activa} onChange={() => toggleActiva(a)} aria-label={`Activar/desactivar ${a.nombre}`} />
                  </td>
                  <td className="ax-table__td ax-num">{a.ultimo_uso ? new Date(a.ultimo_uso).toLocaleString('es-PE') : 'Nunca'}</td>
                  <td className="ax-table__td" style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" disabled={regenerandoId === a.id} onClick={() => regenerarClave(a)}>
                      {regenerandoId === a.id ? 'Regenerando…' : 'Regenerar clave'}
                    </button>
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" style={{ color: 'var(--ax-danger-500)' }} onClick={() => eliminar(a)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creandoModal && (
        <NuevaAplicacionModal
          fuentes={fuentes}
          onCerrar={() => { setCreandoModal(false); cargar(); }}
          onCreada={cargar}
        />
      )}

      <div className="ax-card" style={{ marginTop: 'var(--ax-space-2)' }}>
        <div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Cómo conectar</h2></div></div>
        <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
          <p>
            URL base: <code className="ax-num">{baseUrl}</code>. Cada solicitud debe llevar la cabecera{' '}
            <code className="ax-num">x-api-key</code> con la clave de la aplicación.
          </p>
          <pre style={{ margin: 0, padding: 'var(--ax-space-3)', background: 'var(--ax-fill-hover)', borderRadius: 'var(--ax-radius-md)', overflowX: 'auto', fontSize: 'var(--ax-text-xs)', fontFamily: 'var(--ax-font-mono)' }}>
            <code>{`BASE="${baseUrl}"

curl "$BASE/fuentes" -H "x-api-key: app_..."

curl "$BASE/leads?fuente=expomina-peru-2026&limite=100" -H "x-api-key: app_..."

curl "$BASE/leads?actualizado_desde=2026-09-01T00:00:00Z&cursor=<siguiente>" -H "x-api-key: app_..."`}</code>
          </pre>
          <div>
            <p className="ax-label">Campos de respuesta (endpoint /leads)</p>
            <p className="ax-note">
              id, fuente, nombres, apellido, email, telefono, empresa, ruc, cargo, rubro, fecha_nacimiento, estado, extra, creado_en, actualizado_en
            </p>
          </div>
          <div>
            <p className="ax-label">Paginación</p>
            <p className="ax-note">
              La respuesta trae <code className="ax-num">siguiente</code>: pásalo como <code className="ax-num">cursor</code> en la
              siguiente solicitud. Cuando es <code className="ax-num">null</code>, no hay más páginas.
            </p>
            <p className="ax-note">
              Para sincronizar incrementalmente, guarda el <code className="ax-num">actualizado_en</code> del último lead recibido y
              úsalo en <code className="ax-num">actualizado_desde</code> la próxima vez.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export function Exportacion() {
  const { esAdmin } = useAuth();
  const [tab, setTab] = useState<'exportar' | 'apps'>('exportar');
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [columnasExtra, setColumnasExtra] = useState<ColumnaExtra[]>([]);

  useEffect(() => { listarFuentes().then(setFuentes).catch(() => setFuentes([])); }, []);
  useEffect(() => { listarColumnasExtra().then(setColumnasExtra).catch(() => setColumnasExtra([])); }, []);

  return (
    <>
      <PageHead title="Exportación y conexiones" />

      <div className="ax-card ax-col--12">
        <div className="ax-tabs ax-tabs--pill" style={{ padding: 'var(--ax-space-4) var(--ax-space-5) 0' }}>
          <div className="ax-tabs__list" role="tablist" aria-label="Exportación y conexiones">
            <button type="button" role="tab" aria-selected={tab === 'exportar'} className={`ax-tabs__tab${tab === 'exportar' ? ' is-active' : ''}`} onClick={() => setTab('exportar')}>
              Exportar archivo
            </button>
            {esAdmin && (
              <button type="button" role="tab" aria-selected={tab === 'apps'} className={`ax-tabs__tab${tab === 'apps' ? ' is-active' : ''}`} onClick={() => setTab('apps')}>
                Aplicaciones conectadas
              </button>
            )}
          </div>
        </div>

        <div className="ax-card__body">
          {tab === 'exportar' && <ExportarTab fuentes={fuentes} columnasExtra={columnasExtra} />}
          {tab === 'apps' && esAdmin && <AplicacionesTab fuentes={fuentes} />}
        </div>
      </div>
    </>
  );
}

export default Exportacion;
