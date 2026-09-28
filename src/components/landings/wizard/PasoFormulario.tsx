'use client';
/*
 * Paso 3 — constructor del formulario. Lista ordenable de campos (arrastrar
 * desde el asa, o con ↑/↓ para teclado y pantallas táctiles); cada campo se
 * abre para editar nombre, tipo, texto de ayuda, si es obligatorio y las
 * opciones de una lista. Solo un campo abierto a la vez.
 *
 * Claves (`key`): se derivan solas del nombre (claveDesdeLabel) mientras el
 * campo es nuevo; una vez guardado, la clave queda fija para no romper los
 * datos ya registrados (mismo criterio que CamposEditor).
 */
import { useState, type DragEvent } from 'react';
import type { CampoFormulario, TipoCampo } from '../../../../supabase/functions/_shared/lead';
import { claveDesdeLabel, clavesInvalidas } from '../../../lib/leads/camposUtil';
import { CAMPOS_SUGERIDOS } from '../../../lib/landings/plantillas';
import type { ContenidoLanding } from '../../../lib/landings/tipos';

const TIPOS: { value: TipoCampo; label: string }[] = [
  { value: 'texto', label: 'Texto' },
  { value: 'email', label: 'Correo' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'opcion', label: 'Lista desplegable' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'numero', label: 'Número' },
  { value: 'documento', label: 'RUC / DNI' },
];
const NOMBRE_TIPO = Object.fromEntries(TIPOS.map((t) => [t.value, t.label])) as Record<TipoCampo, string>;

const svg = (d: string, grosor = 1.8) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICONO_ASA = svg('M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01', 3.2);
const ICONO_ARRIBA = svg('M6 15l6-6l6 6');
const ICONO_ABAJO = svg('M6 9l6 6l6-6');
const ICONO_QUITAR = svg('M18 6L6 18M6 6l12 12');

export function PasoFormulario({
  campos, onCampos, textos, onTexto, clavesGuardadas,
}: {
  campos: CampoFormulario[];
  onCampos: (v: CampoFormulario[]) => void;
  textos: ContenidoLanding['formulario'];
  onTexto: (campo: keyof ContenidoLanding['formulario'], v: string | boolean) => void;
  clavesGuardadas: Set<string>;
}) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [destino, setDestino] = useState<{ i: number; despues: boolean } | null>(null);
  const invalidas = clavesInvalidas(campos);
  const claves = new Set(campos.map((c) => c.key));
  const sugeridos = CAMPOS_SUGERIDOS.filter((s) => !claves.has(s.key));
  const sinContacto = !claves.has('email') && !claves.has('telefono');

  const set = (i: number, cambios: Partial<CampoFormulario>) => onCampos(campos.map((c, j) => (j === i ? { ...c, ...cambios } : c)));

  const cambiarNombre = (i: number, label: string) => {
    const c = campos[i];
    if (clavesGuardadas.has(c.key)) { set(i, { label }); return; }
    const otras = campos.filter((_, j) => j !== i).map((x) => x.key);
    set(i, { label, key: claveDesdeLabel(label, otras) });
  };

  const mover = (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= campos.length || desde === hacia) return;
    const next = [...campos];
    const [item] = next.splice(desde, 1);
    next.splice(hacia, 0, item);
    onCampos(next);
    if (abierto === desde) setAbierto(hacia);
    else if (abierto !== null) {
      // El abierto se corre si el movido pasó por encima de él.
      if (desde < abierto && hacia >= abierto) setAbierto(abierto - 1);
      else if (desde > abierto && hacia <= abierto) setAbierto(abierto + 1);
    }
  };

  const agregar = (c: CampoFormulario) => {
    const nuevo = { ...c, key: claves.has(c.key) ? claveDesdeLabel(c.label, [...claves]) : c.key };
    onCampos([...campos, nuevo]);
    setAbierto(campos.length);
  };

  const quitar = (i: number) => {
    onCampos(campos.filter((_, j) => j !== i));
    setAbierto(null);
  };

  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    if (arrastrando !== null && destino) {
      let hacia = destino.i + (destino.despues ? 1 : 0);
      if (arrastrando < hacia) hacia -= 1;
      mover(arrastrando, hacia);
    }
    setArrastrando(null);
    setDestino(null);
  };

  return (
    <>
      <div className="lw-grupo">
        <h3 className="lw-h3">Textos del formulario</h3>
        <div className="lw-dos">
          <div className="ax-field">
            <label className="ax-label" htmlFor="lw-f-titulo">Título</label>
            <input id="lw-f-titulo" className="ax-input" value={textos.titulo} onChange={(e) => onTexto('titulo', e.target.value)} />
          </div>
          <div className="ax-field">
            <label className="ax-label" htmlFor="lw-f-sub">Subtítulo</label>
            <input id="lw-f-sub" className="ax-input" value={textos.subtitulo} onChange={(e) => onTexto('subtitulo', e.target.value)} />
          </div>
          <div className="ax-field">
            <label className="ax-label" htmlFor="lw-f-boton">Texto del botón</label>
            <input id="lw-f-boton" className="ax-input" value={textos.boton} onChange={(e) => onTexto('boton', e.target.value)} placeholder="Enviar" />
          </div>
          <div className="ax-field">
            <label className="ax-label" htmlFor="lw-f-aviso">Aviso bajo el botón</label>
            <input id="lw-f-aviso" className="ax-input" value={textos.aviso} onChange={(e) => onTexto('aviso', e.target.value)} />
          </div>
        </div>
        <label className="lw-switch">
          <input type="checkbox" className="ax-switch" checked={textos.en_pasos} onChange={(e) => onTexto('en_pasos', e.target.checked)} />
          <span>Mostrar el formulario por pasos (3 campos por paso)</span>
        </label>
      </div>

      <div className="lw-grupo">
        <h3 className="lw-h3">Campos</h3>
        <p className="lw-intro">Arrastra desde <span aria-hidden="true">⋮⋮</span> o usa las flechas para ordenar. Toca un campo para editarlo.</p>

        {sinContacto && (
          <div className="ax-alert ax-alert--warning" role="alert">
            <div className="ax-alert__content">
              <p className="ax-alert__title">Falta un dato de contacto</p>
              <p className="ax-alert__message">Agrega “Correo electrónico” o “Teléfono”: sin al menos uno de ellos el registro no se guarda.</p>
            </div>
          </div>
        )}

        <ol className="lw-campos" onDragOver={(e) => arrastrando !== null && e.preventDefault()} onDrop={alSoltar}>
          {campos.map((c, i) => {
            const abiertoAqui = abierto === i;
            const razon = invalidas.get(i);
            const cls = [
              'lw-campo',
              abiertoAqui && 'is-abierto',
              arrastrando === i && 'is-arrastrando',
              destino?.i === i && arrastrando !== i && (destino.despues ? 'is-destino-despues' : 'is-destino-antes'),
              (razon || !c.label.trim()) && !abiertoAqui && 'is-invalido',
            ].filter(Boolean).join(' ');
            const pid = `lw-c-${i}`;
            return (
              <li
                // Índice como key: la clave cambia mientras se escribe el nombre
                // de un campo nuevo, y usarla remontaría el input a cada tecla.
                key={i}
                className={cls}
                onDragOver={(e) => {
                  if (arrastrando === null) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  setDestino({ i, despues: e.clientY > r.top + r.height / 2 });
                }}
              >
                <div className="lw-campo__cab">
                  <span
                    className="lw-campo__asa"
                    draggable
                    title="Arrastrar para ordenar"
                    onDragStart={(e) => { setArrastrando(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                    onDragEnd={() => { setArrastrando(null); setDestino(null); }}
                  >
                    {ICONO_ASA}
                  </span>
                  <button type="button" className="lw-campo__info" aria-expanded={abiertoAqui} aria-controls={pid} onClick={() => setAbierto(abiertoAqui ? null : i)}>
                    <span className={`lw-campo__nombre${c.label.trim() ? '' : ' is-vacio'}`}>{c.label.trim() || 'Campo sin nombre'}</span>
                    <span className="ax-badge ax-badge--neutral ax-badge--sm">{NOMBRE_TIPO[c.tipo] ?? c.tipo}</span>
                    {c.requerido && <span className="ax-badge ax-badge--soft ax-badge--accent ax-badge--sm">Obligatorio</span>}
                  </button>
                  <div className="lw-campo__acc">
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Subir ${c.label || 'campo'}`} disabled={i === 0} onClick={() => mover(i, i - 1)}>{ICONO_ARRIBA}</button>
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Bajar ${c.label || 'campo'}`} disabled={i === campos.length - 1} onClick={() => mover(i, i + 1)}>{ICONO_ABAJO}</button>
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Quitar ${c.label || 'campo'}`} onClick={() => quitar(i)}>{ICONO_QUITAR}</button>
                  </div>
                </div>

                {abiertoAqui && (
                  <div className="lw-campo__cuerpo" id={pid}>
                    <div className="lw-dos">
                      <div className="ax-field">
                        <label className="ax-label" htmlFor={`${pid}-label`}>Nombre del campo</label>
                        <input id={`${pid}-label`} className="ax-input" value={c.label} onChange={(e) => cambiarNombre(i, e.target.value)} autoFocus placeholder="Ej. Talla de polo" />
                      </div>
                      <div className="ax-field">
                        <label className="ax-label" htmlFor={`${pid}-tipo`}>Tipo de respuesta</label>
                        <select id={`${pid}-tipo`} className="ax-select" value={c.tipo} onChange={(e) => set(i, { tipo: e.target.value as TipoCampo })}>
                          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {c.tipo !== 'fecha' && (
                      <div className="ax-field">
                        <label className="ax-label" htmlFor={`${pid}-ph`}>{c.tipo === 'opcion' ? 'Texto antes de elegir' : 'Texto de ejemplo dentro del campo'}</label>
                        <input id={`${pid}-ph`} className="ax-input" value={c.placeholder ?? ''} onChange={(e) => set(i, { placeholder: e.target.value })} placeholder={c.tipo === 'opcion' ? 'Selecciona una opción' : 'Opcional'} />
                      </div>
                    )}
                    {c.tipo === 'opcion' && (
                      <div className="ax-field">
                        <label className="ax-label" htmlFor={`${pid}-op`}>Opciones (una por línea)</label>
                        <textarea
                          id={`${pid}-op`}
                          className="ax-textarea"
                          rows={5}
                          value={(c.opciones ?? []).join('\n')}
                          onChange={(e) => set(i, { opciones: e.target.value.split('\n').map((s) => s.trimStart()) })}
                          onBlur={() => set(i, { opciones: (c.opciones ?? []).map((s) => s.trim()).filter(Boolean) })}
                        />
                        {!(c.opciones ?? []).some((o) => o.trim()) && <p className="lw-error">Agrega al menos una opción.</p>}
                      </div>
                    )}
                    <label className="lw-switch">
                      <input type="checkbox" className="ax-switch" checked={c.requerido} onChange={(e) => set(i, { requerido: e.target.checked })} />
                      <span>Obligatorio</span>
                    </label>
                    <p className="lw-hint">
                      Se guarda como <span className="lw-clave">{c.key}</span>
                      {clavesGuardadas.has(c.key) ? ' (fija: ya hay registros con este nombre interno).' : '.'}
                    </p>
                    {razon === 'duplicada' && <p className="lw-error">Ya hay otro campo con este nombre interno. Cambia el nombre.</p>}
                    {!c.label.trim() && <p className="lw-error">Ponle un nombre al campo.</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="lw-grupo">
          <span className="ax-label">Agregar campo</span>
          <div className="lw-agregar">
            {sugeridos.map((s) => (
              <button key={s.key} type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={() => agregar(s)}>+ {s.label}</button>
            ))}
            <button type="button" className="ax-btn ax-btn--tonal ax-btn--sm" onClick={() => agregar({ key: claveDesdeLabel('', [...claves]), label: '', tipo: 'texto', requerido: false })}>
              + Campo personalizado
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
