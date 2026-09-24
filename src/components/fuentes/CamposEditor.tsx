'use client';
/*
 * Sistema de Leads — editor de campos de formulario de una fuente. Cada fila
 * es un CampoFormulario; los campos ya guardados (presentes al montar) tienen
 * `key` de solo lectura para no romper el `extra` de leads ya registrados. Los
 * campos núcleo (email, telefono, ...) llevan un badge "núcleo".
 */
import { useState } from 'react';
import { normalizarEncabezado } from '../../lib/leads/mapeo';
import { NUCLEO, type CampoFormulario, type TipoCampo } from '../../../supabase/functions/_shared/lead';

const TIPOS: { value: TipoCampo; label: string }[] = [
  { value: 'texto', label: 'Texto' },
  { value: 'email', label: 'Correo' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'numero', label: 'Número' },
  { value: 'opcion', label: 'Opción (lista)' },
  { value: 'documento', label: 'Documento' },
];

function claveUnica(base: string, existentes: string[]): string {
  let candidata = base || 'campo';
  let n = 2;
  while (existentes.includes(candidata)) {
    candidata = `${base || 'campo'}_${n}`;
    n += 1;
  }
  return candidata;
}

function IconoFlecha({ abajo }: { abajo?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
      {abajo ? <path d="M6 9l6 6l6 -6" /> : <path d="M6 15l6 -6l6 6" />}
    </svg>
  );
}

export function CamposEditor({ value, onChange }: { value: CampoFormulario[]; onChange: (v: CampoFormulario[]) => void }) {
  const [clavesIniciales] = useState(() => new Set(value.map((c) => c.key)));

  const set = (i: number, cambios: Partial<CampoFormulario>) =>
    onChange(value.map((c, j) => (j === i ? { ...c, ...cambios } : c)));

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const eliminar = (i: number) => onChange(value.filter((_, j) => j !== i));

  const agregar = () => {
    const claves = value.map((c) => c.key);
    const key = claveUnica(normalizarEncabezado(''), claves);
    onChange([...value, { key, label: '', tipo: 'texto', requerido: false }]);
  };

  const cambiarLabel = (i: number, label: string) => {
    const c = value[i];
    if (clavesIniciales.has(c.key)) {
      set(i, { label });
      return;
    }
    const otras = value.filter((_, j) => j !== i).map((x) => x.key);
    const key = claveUnica(normalizarEncabezado(label), otras);
    onChange(value.map((x, j) => (j === i ? { ...x, label, key } : x)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
      {value.map((c, i) => {
        const esNucleoCampo = (NUCLEO as readonly string[]).includes(c.key);
        const soloLecturaKey = clavesIniciales.has(c.key);
        return (
          <div
            key={i}
            className="ax-card"
            style={{ padding: 'var(--ax-space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--ax-space-3)', alignItems: 'flex-end' }}
          >
            <div className="ax-field" style={{ flex: '1 1 160px' }}>
              <label className="ax-label" htmlFor={`ce-label-${i}`}>Etiqueta</label>
              <input id={`ce-label-${i}`} className="ax-input ax-input--sm" value={c.label} onChange={(e) => cambiarLabel(i, e.target.value)} />
            </div>
            <div className="ax-field" style={{ flex: '1 1 160px' }}>
              <label className="ax-label" htmlFor={`ce-key-${i}`}>
                Clave{esNucleoCampo && <span className="ax-badge ax-badge--neutral ax-badge--sm" style={{ marginInlineStart: 6 }}>núcleo</span>}
              </label>
              <input id={`ce-key-${i}`} className="ax-input ax-input--sm" value={c.key} disabled={soloLecturaKey} onChange={(e) => set(i, { key: e.target.value })} />
            </div>
            <div className="ax-field" style={{ flex: '0 1 160px' }}>
              <label className="ax-label" htmlFor={`ce-tipo-${i}`}>Tipo</label>
              <select id={`ce-tipo-${i}`} className="ax-select ax-select--sm" value={c.tipo} onChange={(e) => set(i, { tipo: e.target.value as TipoCampo })}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <label className="ax-cluster" style={{ gap: 6, paddingBottom: 8 }}>
              <input type="checkbox" className="ax-checkbox" checked={c.requerido} onChange={(e) => set(i, { requerido: e.target.checked })} />
              Requerido
            </label>
            {c.tipo === 'opcion' && (
              <div className="ax-field" style={{ flex: '1 1 200px' }}>
                <label className="ax-label" htmlFor={`ce-op-${i}`}>Opciones (separadas por coma)</label>
                <input
                  id={`ce-op-${i}`}
                  className="ax-input ax-input--sm"
                  value={(c.opciones ?? []).join(', ')}
                  onChange={(e) => set(i, { opciones: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
            )}
            <div className="ax-cluster" style={{ gap: 4, paddingBottom: 4 }}>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Subir campo" disabled={i === 0} onClick={() => mover(i, -1)}>
                <IconoFlecha />
              </button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Bajar campo" disabled={i === value.length - 1} onClick={() => mover(i, 1)}>
                <IconoFlecha abajo />
              </button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label="Eliminar campo" onClick={() => eliminar(i)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={agregar} style={{ alignSelf: 'flex-start' }}>
        Agregar campo
      </button>
    </div>
  );
}

export default CamposEditor;
