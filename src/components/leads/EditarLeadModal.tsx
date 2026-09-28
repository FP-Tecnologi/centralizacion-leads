'use client';
/*
 * Sistema de Leads — modal de edición de un lead: núcleo + status + extra
 * (por campos declarados de la fuente, o pares clave/valor sueltos si no los declara).
 * Solo lectura si el usuario no puede editar. Valida con validarLead, pero no bloquea el
 * guardado: igual que al importar, lo incompleto o inválido se guarda marcado en
 * `invalidos` (la tabla lo pinta) y una marca desaparece cuando el dato queda bien.
 */
import { useMemo, useRef, useState } from 'react';
import { EnBody } from '../ui/EnBody';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { actualizarLead, ESTADOS, type ColumnaExtra, type Fuente, type Lead } from '../../lib/leads/datos';
import { NUCLEO, separarLead, validarLead, type ErrorCampo } from '../../../supabase/functions/_shared/lead';
import { describirError, LABEL_DESTINO } from '../../lib/leads/mapeo';

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
  columnasExtra,
  puedeEditar,
  onCerrar,
  onGuardado,
}: {
  lead: Lead;
  fuente?: Fuente;
  columnasExtra: ColumnaExtra[];
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
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const marcasPrevias = lead.invalidos ?? {};
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const campoExtra = (key: string) => fuente?.campos.find((c) => c.key === key) ?? columnasExtra.find((c) => c.key === key);
  const extraKeys = useMemo(() => {
    const declaradas = (fuente?.campos ?? []).map((c) => c.key);
    const globales = columnasExtra.map((c) => c.key);
    const sueltas = Object.keys(lead.extra ?? {}).filter((k) => !declaradas.includes(k) && !globales.includes(k));
    return [...new Set([...declaradas, ...globales, ...sueltas])];
  }, [fuente, columnasExtra, lead.extra]);

  const errorDe = (campo: string) => errores.find((e) => e.campo === campo);
  const setCampo = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setTocados((t) => new Set(t).add(k));
  };
  // marca vigente de un campo: la del último intento de guardar, o la que trajo la importación
  // mientras no se haya tocado ese campo.
  const marcaDe = (k: string) => (tocados.has(k) ? undefined : marcasPrevias[k]);

  const guardar = async () => {
    setErrorGuardado(null);
    const entrada = separarLead(form);
    const errs = validarLead(entrada, fuente?.campos ?? []);
    setErrores(errs);
    // marcas nuevas = lo que sigue mal; más las de la importación que no se pueden revalidar
    // desde el formulario (p.ej. fecha "31/02/1980" que no cupo en la columna) mientras no
    // se haya tocado ese campo ni el estado.
    const invalidos: Record<string, { valor: string; causa: string }> = {};
    for (const [k, m] of Object.entries(marcasPrevias)) {
      const sinValor = !(form[k] ?? '').trim();
      if (!tocados.has(k) && (sinValor || k === 'created_at') && !(k === 'status' && status !== lead.status)) invalidos[k] = m;
    }
    for (const e of errs) {
      const campo = fuente?.campos.find((c) => c.key === e.campo);
      invalidos[e.campo] = { valor: form[e.campo] ?? '', causa: describirError(e, form[e.campo], campo) };
    }
    setGuardando(true);
    try {
      const cambios: Partial<Lead> = { status, extra: entrada.extra, invalidos };
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
    <EnBody>
    <div onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="ax-backdrop" onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 'var(--ax-z-modal)', background: 'rgba(0,0,0,.45)', border: 0 }} />
      <div className="ax-flex" role="dialog" aria-modal="true" aria-label="Editar lead" style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--ax-z-modal) + 1)', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)' }}>
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
            {Object.keys(marcasPrevias).length > 0 && (
              <div role="note" style={{ background: 'var(--ax-warning-50)', border: '1px solid var(--ax-warning-200)', borderRadius: 'var(--ax-radius-md)', padding: 'var(--ax-space-3)', fontSize: 'var(--ax-text-sm)' }}>
                <b>Datos a revisar</b> (llegaron así del archivo importado):
                <ul style={{ margin: 'var(--ax-space-1) 0 0', paddingInlineStart: 'var(--ax-space-5)' }}>
                  {Object.entries(marcasPrevias).map(([k, m]) => <li key={k}>{m.causa}</li>)}
                </ul>
                Puedes corregirlos aquí; si guardas sin corregir, siguen marcados.
              </div>
            )}
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
                    {!err && marcaDe(k) && (
                      <p className="ax-note" style={{ color: 'var(--ax-warning-500)' }}>
                        A revisar{marcaDe(k)!.valor && !form[k] ? ` · en el archivo: "${marcaDe(k)!.valor}"` : ''}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="ax-field">
                <label className="ax-label" htmlFor="ld-status">{LABEL_DESTINO.status}{marcasPrevias.status ? ` (archivo: "${marcasPrevias.status.valor}")` : ''}</label>
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
    </EnBody>
  );
}

export default EditarLeadModal;
