'use client';
/*
 * Sistema de Leads — modal de edición de un lead: núcleo + status + extra
 * (por campos declarados de la fuente, o pares clave/valor sueltos si no los declara).
 * Solo lectura si el usuario no puede editar. Valida con validarLead antes de guardar.
 */
import { useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { actualizarLead, ESTADOS, type Fuente, type Lead } from '../../lib/leads/datos';
import { NUCLEO, separarLead, validarLead, type ErrorCampo } from '../../../supabase/functions/_shared/lead';

const LABELS: Record<string, string> = {
  nombres: 'Nombres', apellido: 'Apellido', email: 'Correo', telefono: 'Teléfono',
  empresa: 'Empresa', ruc: 'RUC/DNI', cargo: 'Cargo', rubro: 'Rubro', fecha_nacimiento: 'Fecha de nacimiento',
};
const MOTIVO: Record<ErrorCampo['motivo'], string> = {
  requerido: 'Requerido', formato: 'Formato inválido', contacto: 'Indica correo o teléfono',
};

export function EditarLeadModal({
  lead,
  fuente,
  puedeEditar,
  onCerrar,
  onGuardado,
}: {
  lead: Lead;
  fuente?: Fuente;
  puedeEditar: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  useFocusTrap(ref, true);

  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const k of NUCLEO) base[k] = lead[k as keyof Lead] as string ?? '';
    for (const [k, v] of Object.entries(lead.extra ?? {})) base[k] = v;
    return base;
  });
  const [status, setStatus] = useState(lead.status);
  const [errores, setErrores] = useState<ErrorCampo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const campoExtra = (key: string) => fuente?.campos.find((c) => c.key === key);
  const extraKeys = useMemo(() => {
    const declaradas = (fuente?.campos ?? []).map((c) => c.key);
    const sueltas = Object.keys(lead.extra ?? {}).filter((k) => !declaradas.includes(k));
    return [...declaradas, ...sueltas];
  }, [fuente, lead.extra]);

  const errorDe = (campo: string) => errores.find((e) => e.campo === campo);
  const setCampo = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async () => {
    setErrorGuardado(null);
    const entrada = separarLead(form);
    const errs = validarLead(entrada, fuente?.campos ?? []);
    setErrores(errs);
    if (errs.length) return;
    setGuardando(true);
    try {
      const cambios: Partial<Lead> = { status, extra: entrada.extra };
      for (const k of NUCLEO) (cambios as Record<string, unknown>)[k] = (entrada as Record<string, unknown>)[k] ?? null;
      await actualizarLead(lead.id, cambios);
      onGuardado();
    } catch {
      setErrorGuardado('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="ax-backdrop" onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', border: 0 }} />
      <div className="ax-flex" role="dialog" aria-modal="true" aria-label="Editar lead" style={{ position: 'fixed', inset: 0, zIndex: 51, alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)' }}>
        <form
          className="ax-card"
          ref={ref}
          onSubmit={(e) => { e.preventDefault(); guardar(); }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 'min(560px,100%)', maxHeight: '90vh', overflow: 'auto' }}
        >
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">Editar lead</h2></div>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" onClick={onCerrar} aria-label="Cerrar">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-4)' }}>
              {NUCLEO.map((k) => {
                const err = errorDe(k);
                return (
                  <div className="ax-field" key={k}>
                    <label className="ax-label" htmlFor={`ld-${k}`}>{LABELS[k]}</label>
                    <input
                      id={`ld-${k}`}
                      type={k === 'fecha_nacimiento' ? 'date' : 'text'}
                      className="ax-input"
                      value={form[k] ?? ''}
                      onChange={(e) => setCampo(k, e.target.value)}
                      disabled={!puedeEditar}
                      aria-invalid={!!err}
                      aria-describedby={err ? `ld-${k}-err` : undefined}
                    />
                    {err && <p id={`ld-${k}-err`} className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{MOTIVO[err.motivo]}</p>}
                  </div>
                );
              })}
              <div className="ax-field">
                <label className="ax-label" htmlFor="ld-status">Estado</label>
                <select id="ld-status" className="ax-select" value={status} onChange={(e) => setStatus(e.target.value)} disabled={!puedeEditar}>
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {extraKeys.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-4)' }}>
                {extraKeys.map((k) => {
                  const info = campoExtra(k);
                  const err = errorDe(k);
                  return (
                    <div className="ax-field" key={k}>
                      <label className="ax-label" htmlFor={`ld-x-${k}`}>{info?.label ?? k}</label>
                      {info?.tipo === 'opcion' ? (
                        <select id={`ld-x-${k}`} className="ax-select" value={form[k] ?? ''} onChange={(e) => setCampo(k, e.target.value)} disabled={!puedeEditar} aria-invalid={!!err}>
                          <option value="">—</option>
                          {(info.opciones ?? []).map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      ) : (
                        <input
                          id={`ld-x-${k}`}
                          type={info?.tipo === 'fecha' ? 'date' : 'text'}
                          className="ax-input"
                          value={form[k] ?? ''}
                          onChange={(e) => setCampo(k, e.target.value)}
                          disabled={!puedeEditar}
                          aria-invalid={!!err}
                          aria-describedby={err ? `ld-x-${k}-err` : undefined}
                        />
                      )}
                      {err && <p id={`ld-x-${k}-err`} className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{MOTIVO[err.motivo]}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {errorGuardado && (
            <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)', margin: '0 var(--ax-space-5) var(--ax-space-3)' }}>{errorGuardado}</p>
          )}

          <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ax-space-2)', borderTop: '1px solid var(--ax-border)' }}>
            <button type="button" className="ax-btn ax-btn--ghost" onClick={onCerrar}>Cancelar</button>
            {puedeEditar && <button type="submit" className="ax-btn ax-btn--primary" disabled={guardando}>Guardar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditarLeadModal;
