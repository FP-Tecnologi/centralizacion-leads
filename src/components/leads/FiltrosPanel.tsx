'use client';
/*
 * Sistema de Leads — drawer de filtros avanzados: fuentes, estados, rango de
 * fechas, constructor de condiciones (campo/operador/valor) y filtros guardados.
 * Trabaja sobre un borrador local; "Aplicar" lo sube a LeadsTable y "Limpiar" lo resetea.
 */
import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDialogo } from '../ui/Dialogo';
import { supabase } from '../../lib/supabase';
import { ESTADOS, type ColumnaExtra, type Fuente } from '../../lib/leads/datos';
import { FILTRO_VACIO, OPERADORES, type Condicion, type FiltroLeads, type Operador } from '../../lib/leads/filtros';
import type { CampoFormulario, TipoCampo } from '../../../supabase/functions/_shared/lead';

const NUCLEO_INFO: Record<string, { label: string; tipo: TipoCampo }> = {
  nombres: { label: 'Nombres', tipo: 'texto' },
  apellido: { label: 'Apellido', tipo: 'texto' },
  email: { label: 'Correo', tipo: 'email' },
  telefono: { label: 'Teléfono', tipo: 'telefono' },
  empresa: { label: 'Empresa', tipo: 'texto' },
  ruc: { label: 'RUC/DNI', tipo: 'documento' },
  cargo: { label: 'Cargo', tipo: 'texto' },
  rubro: { label: 'Rubro', tipo: 'texto' },
  fecha_nacimiento: { label: 'Fecha de nacimiento', tipo: 'fecha' },
};

interface CampoInfo { key: string; label: string; tipo: TipoCampo; opciones?: string[] }
interface FilaGuardada { id: string; nombre: string; definicion: FiltroLeads }

function camposDisponibles(fuenteFija: Fuente | undefined, fuentes: Fuente[], columnasExtra: ColumnaExtra[]): CampoInfo[] {
  const out: CampoInfo[] = Object.entries(NUCLEO_INFO).map(([key, v]) => ({ key, ...v }));
  const extra: CampoFormulario[] = fuenteFija
    ? fuenteFija.campos
    : fuentes.flatMap((f) => f.campos);
  const vistos = new Set(out.map((c) => c.key));
  for (const c of extra) {
    if (vistos.has(c.key)) continue;
    vistos.add(c.key);
    out.push({ key: c.key, label: c.label, tipo: c.tipo, opciones: c.opciones });
  }
  for (const c of columnasExtra) {
    if (vistos.has(c.key)) continue;
    vistos.add(c.key);
    out.push({ key: c.key, label: c.label, tipo: c.tipo });
  }
  return out;
}

export function FiltrosPanel({
  abierto,
  onCerrar,
  filtro,
  onAplicar,
  fuentes,
  fuenteFija,
  columnasExtra,
}: {
  abierto: boolean;
  onCerrar: () => void;
  filtro: FiltroLeads;
  onAplicar: (f: FiltroLeads) => void;
  fuentes: Fuente[];
  fuenteFija?: Fuente;
  columnasExtra: ColumnaExtra[];
}) {
  const [borrador, setBorrador] = useState<FiltroLeads>(filtro);
  const [misFiltros, setMisFiltros] = useState<FilaGuardada[]>([]);
  const [errorGuardados, setErrorGuardados] = useState<string | null>(null);
  const { confirmar, pedirTexto } = useDialogo();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, abierto);

  useEffect(() => { if (abierto) setBorrador(filtro); }, [abierto, filtro]);

  useEffect(() => {
    if (!abierto) return;
    supabase.from('filtros_guardados').select('id,nombre,definicion').order('nombre')
      .then(({ data }) => setMisFiltros((data ?? []) as FilaGuardada[]));
  }, [abierto]);

  const campos = camposDisponibles(fuenteFija, fuentes, columnasExtra);
  const campoInfo = (key: string) => campos.find((c) => c.key === key);

  const toggleFuente = (id: string) => {
    const actuales = borrador.fuentes ?? [];
    const siguientes = actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id];
    setBorrador({ ...borrador, fuentes: siguientes.length ? siguientes : undefined });
  };
  const toggleEstado = (e: string) => {
    const actuales = borrador.estados ?? [];
    const siguientes = actuales.includes(e) ? actuales.filter((x) => x !== e) : [...actuales, e];
    setBorrador({ ...borrador, estados: siguientes.length ? siguientes : undefined });
  };

  const condiciones = borrador.condiciones;
  const setCondicion = (i: number, c: Partial<Condicion>) => {
    const siguientes = condiciones.map((x, j) => (j === i ? { ...x, ...c } : x));
    setBorrador({ ...borrador, condiciones: siguientes });
  };
  const agregarCondicion = () => {
    const primero = campos[0]?.key ?? '';
    setBorrador({ ...borrador, condiciones: [...condiciones, { campo: primero, op: 'contiene' }] });
  };
  const quitarCondicion = (i: number) => setBorrador({ ...borrador, condiciones: condiciones.filter((_, j) => j !== i) });

  const aplicar = () => onAplicar(borrador);
  const limpiar = () => {
    const vacio: FiltroLeads = fuenteFija ? { ...FILTRO_VACIO, fuentes: [fuenteFija.id] } : FILTRO_VACIO;
    setBorrador(vacio);
    onAplicar(vacio);
  };

  const guardarActual = async () => {
    setErrorGuardados(null);
    try {
      const nombre = await pedirTexto({
        titulo: 'Guardar filtro',
        mensaje: 'Podrás volver a aplicarlo desde "Mis filtros".',
        etiqueta: 'Nombre del filtro',
        placeholder: 'Ej.: EXPOMINA sin contactar',
      });
      if (!nombre) return;
      const { data, error } = await supabase.from('filtros_guardados').insert({ nombre, definicion: borrador }).select('id,nombre,definicion').single();
      if (error) throw error;
      setMisFiltros((prev) => [...prev, data as FilaGuardada].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch {
      setErrorGuardados('No se pudo guardar el filtro. Intenta de nuevo.');
    }
  };
  const borrarGuardado = async (id: string) => {
    setErrorGuardados(null);
    try {
      const nombre = misFiltros.find((f) => f.id === id)?.nombre;
      const ok = await confirmar({
        titulo: `¿Borrar el filtro${nombre ? ` "${nombre}"` : ''}?`,
        confirmarTexto: 'Borrar',
        tono: 'peligro',
      });
      if (!ok) return;
      const { error } = await supabase.from('filtros_guardados').delete().eq('id', id);
      if (error) throw error;
      setMisFiltros((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setErrorGuardados('No se pudo borrar el filtro. Intenta de nuevo.');
    }
  };
  const cargarGuardado = (id: string) => {
    const fila = misFiltros.find((f) => f.id === id);
    if (!fila) return;
    setBorrador(fila.definicion);
    onAplicar(fila.definicion);
  };

  if (!abierto) return null;

  return (
    <div className="ax-offcanvas" onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" className="ax-offcanvas__backdrop" onClick={onCerrar} aria-label="Cerrar filtros" tabIndex={-1} style={{ border: 0, cursor: 'default' }} />
      <div className="ax-offcanvas__panel ax-offcanvas__panel--end" role="dialog" aria-modal="true" aria-label="Filtros avanzados" ref={ref}>
        <div className="ax-offcanvas__header">
          <h2 className="ax-offcanvas__title">Filtros</h2>
          <button type="button" className="ax-offcanvas__close" onClick={onCerrar} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="ax-offcanvas__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
          {!fuenteFija && (
            <div className="ax-field">
              <span className="ax-label">Fuentes</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
                {fuentes.map((f) => (
                  <label key={f.id} className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
                    <input type="checkbox" className="ax-checkbox" checked={(borrador.fuentes ?? []).includes(f.id)} onChange={() => toggleFuente(f.id)} />
                    <span>{f.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="ax-field">
            <span className="ax-label">Estados</span>
            <div className="ax-cluster" style={{ gap: 6, flexWrap: 'wrap' }}>
              {ESTADOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`ax-badge ax-badge--pill ax-badge--filter ${(borrador.estados ?? []).includes(e) ? 'ax-badge--accent' : 'ax-badge--soft ax-badge--neutral'}`}
                  aria-pressed={(borrador.estados ?? []).includes(e)}
                  onClick={() => toggleEstado(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="ax-field">
            <span className="ax-label">Rango de fechas</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-3)' }}>
              <input type="date" className="ax-input" aria-label="Desde" value={borrador.desde ?? ''} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value || undefined })} />
              <input type="date" className="ax-input" aria-label="Hasta" value={borrador.hasta ?? ''} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value || undefined })} />
            </div>
          </div>

          <div className="ax-field">
            <span className="ax-label">Condiciones</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
              {condiciones.map((c, i) => {
                const info = campoInfo(c.campo);
                const sinValor = c.op === 'vacio' || c.op === 'no_vacio';
                return (
                  <div key={i} className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
                    <select className="ax-select ax-select--sm" value={c.campo} onChange={(e) => setCondicion(i, { campo: e.target.value })} aria-label="Campo">
                      {campos.map((cc) => <option key={cc.key} value={cc.key}>{cc.label}</option>)}
                    </select>
                    <select className="ax-select ax-select--sm" value={c.op} onChange={(e) => setCondicion(i, { op: e.target.value as Operador })} aria-label="Operador">
                      {(Object.keys(OPERADORES) as Operador[]).map((op) => <option key={op} value={op}>{OPERADORES[op]}</option>)}
                    </select>
                    {!sinValor && (
                      info?.tipo === 'opcion'
                        ? (
                          <select className="ax-select ax-select--sm" value={c.valor ?? ''} onChange={(e) => setCondicion(i, { valor: e.target.value })} aria-label="Valor">
                            <option value="">—</option>
                            {(info.opciones ?? []).map((op) => <option key={op} value={op}>{op}</option>)}
                          </select>
                        )
                        : (
                          <input
                            type={info?.tipo === 'fecha' ? 'date' : 'text'}
                            className="ax-input ax-input--sm"
                            value={c.valor ?? ''}
                            onChange={(e) => setCondicion(i, { valor: e.target.value })}
                            aria-label="Valor"
                            style={{ minWidth: 120 }}
                          />
                        )
                    )}
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Quitar condición" onClick={() => quitarCondicion(i)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
                    </button>
                  </div>
                );
              })}
              <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={agregarCondicion} style={{ alignSelf: 'flex-start' }}>
                Agregar condición
              </button>
            </div>
          </div>

          <div className="ax-field">
            <span className="ax-label">Filtros guardados</span>
            <select className="ax-select" defaultValue="" onChange={(e) => { if (e.target.value) cargarGuardado(e.target.value); e.target.value = ''; }} aria-label="Mis filtros">
              <option value="">Mis filtros…</option>
              {misFiltros.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
            {misFiltros.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 'var(--ax-space-2) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {misFiltros.map((f) => (
                  <li key={f.id} className="ax-cluster" style={{ justifyContent: 'space-between', fontSize: 'var(--ax-text-sm)' }}>
                    <button type="button" className="ax-btn ax-btn--link ax-btn--sm" onClick={() => cargarGuardado(f.id)}>{f.nombre}</button>
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Borrar ${f.nombre}`} onClick={() => borrarGuardado(f.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={guardarActual} style={{ marginTop: 'var(--ax-space-2)' }}>
              Guardar filtro actual
            </button>
            {errorGuardados && (
              <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)', marginTop: 'var(--ax-space-2)' }}>{errorGuardados}</p>
            )}
          </div>
        </div>

        <div className="ax-offcanvas__footer">
          <button type="button" className="ax-btn ax-btn--ghost" onClick={limpiar}>Limpiar</button>
          <button type="button" className="ax-btn ax-btn--primary" onClick={aplicar}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

export default FiltrosPanel;
