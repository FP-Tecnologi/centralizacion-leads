'use client';
/*
 * Paso 2 — contenido y colores. Los grupos (y sus campos) salen de la ficha de
 * la plantilla elegida (plantillas.ts → grupos), en un acordeón con un solo
 * grupo abierto a la vez para que la pantalla no se llene de campos.
 */
import { useState, type ReactNode } from 'react';
import { esColor, esCorreo, leerRuta, urlSegura } from '../../../lib/landings/contenido';
import type { CampoEditor, GrupoEditor } from '../../../lib/landings/plantillas';
import type { ContenidoLanding, LogoLanding, Tema, ValorLanding } from '../../../lib/landings/tipos';

const PALETA = ['#1c7fa8', '#2181af', '#155382', '#18778b', '#208497', '#c93131', '#e0a526', '#2e7d4f'];
const MAX_LOGOS = 6;
const MAX_VALORES = 3;

function Chevron() {
  return <svg className="lw-seccion__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6-6" /></svg>;
}
function IconoQuitar() {
  return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>;
}

function Campo({ id, etiqueta, ayuda, error, children }: { id: string; etiqueta: string; ayuda?: string; error?: string; children: ReactNode }) {
  return (
    <div className="ax-field">
      <label className="ax-label" htmlFor={id}>{etiqueta}</label>
      {children}
      {error ? <p className="lw-error">{error}</p> : ayuda ? <p className="lw-hint">{ayuda}</p> : null}
    </div>
  );
}

export function EntradaColor({ id, valor, onCambio }: { id: string; valor: string; onCambio: (v: string) => void }) {
  const [texto, setTexto] = useState(valor);
  const [previo, setPrevio] = useState(valor);
  if (valor !== previo) { setPrevio(valor); setTexto(valor); }
  return (
    <div className="lw-color">
      <input type="color" aria-label="Elegir color" value={esColor(valor) ? valor : '#000000'} onChange={(e) => onCambio(e.target.value)} />
      <input
        id={id}
        className="ax-input ax-input--sm"
        value={texto}
        maxLength={7}
        onChange={(e) => { setTexto(e.target.value); if (esColor(e.target.value)) onCambio(e.target.value.toLowerCase()); }}
        aria-invalid={!esColor(texto)}
      />
      <div className="lw-swatches" role="group" aria-label="Colores sugeridos">
        {PALETA.map((c) => (
          <button key={c} type="button" className="lw-swatch" style={{ background: c }} aria-label={c} aria-pressed={valor === c} onClick={() => onCambio(c)} />
        ))}
      </div>
    </div>
  );
}

function EntradaImagen({ id, valor, onCambio }: { id: string; valor: string; onCambio: (v: string) => void }) {
  const segura = urlSegura(valor);
  return (
    <div className="lw-imagen">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {segura ? <img className="lw-imagen__mini" src={segura} alt="" /> : <span className="lw-imagen__mini" />}
      <input id={id} className="ax-input" type="url" value={valor} onChange={(e) => onCambio(e.target.value)} placeholder="https://…/logo.png" />
    </div>
  );
}

function EntradaCampo({ c, valor, onCambio, idBase }: { c: CampoEditor; valor: string; onCambio: (v: string) => void; idBase: string }) {
  const id = `${idBase}-${c.ruta.replace('.', '-')}`;
  if (c.tipo === 'tema') {
    const opciones: { v: Tema; t: string }[] = [{ v: 'claro', t: 'Claro' }, { v: 'oscuro', t: 'Oscuro' }, { v: 'auto', t: 'Según el dispositivo' }];
    return (
      <div className="ax-field">
        <span className="ax-label" id={id}>{c.etiqueta}</span>
        <div className="ax-segment" role="group" aria-labelledby={id} style={{ flexWrap: 'wrap' }}>
          {opciones.map((o) => (
            <button key={o.v} type="button" className="ax-segment__option" aria-pressed={valor === o.v} onClick={() => onCambio(o.v)}>{o.t}</button>
          ))}
        </div>
      </div>
    );
  }
  if (c.tipo === 'color') {
    return <Campo id={id} etiqueta={c.etiqueta} ayuda={c.ayuda}><EntradaColor id={id} valor={valor} onCambio={onCambio} /></Campo>;
  }
  if (c.tipo === 'imagen') {
    const error = valor && !urlSegura(valor) ? 'El enlace debe empezar con https://' : undefined;
    return <Campo id={id} etiqueta={c.etiqueta} ayuda={c.ayuda} error={error}><EntradaImagen id={id} valor={valor} onCambio={onCambio} /></Campo>;
  }
  if (c.tipo === 'parrafo') {
    return (
      <Campo id={id} etiqueta={c.etiqueta} ayuda={c.ayuda ?? 'Deja una línea en blanco para separar párrafos.'}>
        <textarea id={id} className="ax-textarea" rows={4} value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={c.placeholder} />
      </Campo>
    );
  }
  const error = c.tipo === 'url' && valor && !urlSegura(valor) ? 'El enlace debe empezar con https://'
    : c.tipo === 'correo' && valor && !esCorreo(valor) ? 'Escribe un correo válido.' : undefined;
  return (
    <Campo id={id} etiqueta={c.etiqueta} ayuda={c.ayuda} error={error}>
      <input
        id={id}
        className="ax-input"
        type={c.tipo === 'url' ? 'url' : c.tipo === 'correo' ? 'email' : 'text'}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={c.placeholder}
      />
    </Campo>
  );
}

function ListaLogos({ items, onCambio }: { items: LogoLanding[]; onCambio: (v: LogoLanding[]) => void }) {
  const set = (i: number, cambios: Partial<LogoLanding>) => onCambio(items.map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  return (
    <>
      {items.map((l, i) => (
        <div className="lw-item" key={i}>
          <div className="lw-item__cab">
            <span>Logo {i + 1}</span>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Quitar logo ${i + 1}`} onClick={() => onCambio(items.filter((_, j) => j !== i))}><IconoQuitar /></button>
          </div>
          <Campo id={`lw-logo-${i}-url`} etiqueta="Imagen" error={l.url && !urlSegura(l.url) ? 'El enlace debe empezar con https://' : undefined}>
            <EntradaImagen id={`lw-logo-${i}-url`} valor={l.url} onCambio={(v) => set(i, { url: v })} />
          </Campo>
          <div className="lw-dos">
            <Campo id={`lw-logo-${i}-alt`} etiqueta="Nombre (para lectores de pantalla)">
              <input id={`lw-logo-${i}-alt`} className="ax-input" value={l.alt} onChange={(e) => set(i, { alt: e.target.value })} />
            </Campo>
            <Campo id={`lw-logo-${i}-enlace`} etiqueta="Enlace (opcional)">
              <input id={`lw-logo-${i}-enlace`} className="ax-input" type="url" value={l.enlace} onChange={(e) => set(i, { enlace: e.target.value })} placeholder="https://" />
            </Campo>
          </div>
          <Campo id={`lw-logo-${i}-osc`} etiqueta="Versión para fondo oscuro (opcional)" ayuda="Si el logo no se ve bien en modo oscuro, pon aquí una versión clara.">
            <EntradaImagen id={`lw-logo-${i}-osc`} valor={l.url_oscuro} onCambio={(v) => set(i, { url_oscuro: v })} />
          </Campo>
        </div>
      ))}
      {items.length < MAX_LOGOS && (
        <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" style={{ alignSelf: 'flex-start' }}
          onClick={() => onCambio([...items, { url: '', url_oscuro: '', alt: '', enlace: '' }])}>
          Agregar logo
        </button>
      )}
    </>
  );
}

function ListaValores({ items, onCambio }: { items: ValorLanding[]; onCambio: (v: ValorLanding[]) => void }) {
  const set = (i: number, cambios: Partial<ValorLanding>) => onCambio(items.map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  return (
    <>
      {items.map((v, i) => (
        <div className="lw-item" key={i}>
          <div className="lw-item__cab">
            <span>Tarjeta {i + 1}</span>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={`Quitar tarjeta ${i + 1}`} onClick={() => onCambio(items.filter((_, j) => j !== i))}><IconoQuitar /></button>
          </div>
          <Campo id={`lw-valor-${i}-t`} etiqueta="Título">
            <input id={`lw-valor-${i}-t`} className="ax-input" value={v.titulo} onChange={(e) => set(i, { titulo: e.target.value })} />
          </Campo>
          <Campo id={`lw-valor-${i}-x`} etiqueta="Texto">
            <textarea id={`lw-valor-${i}-x`} className="ax-textarea" rows={2} value={v.texto} onChange={(e) => set(i, { texto: e.target.value })} />
          </Campo>
        </div>
      ))}
      {items.length < MAX_VALORES && (
        <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" style={{ alignSelf: 'flex-start' }}
          onClick={() => onCambio([...items, { titulo: '', texto: '' }])}>
          Agregar tarjeta
        </button>
      )}
    </>
  );
}

export function PasoContenido({
  grupos, contenido, onCambio,
}: {
  grupos: GrupoEditor[];
  contenido: ContenidoLanding;
  onCambio: (ruta: string, valor: unknown) => void;
}) {
  const [abierto, setAbierto] = useState<string>(grupos[0]?.id ?? '');
  return (
    <>
      <p className="lw-intro">Abre cada sección y edita los textos. La vista previa se actualiza mientras escribes. Un campo vacío no se muestra en la página.</p>
      <div className="lw-acordeon">
        {grupos.map((g) => {
          const abierta = abierto === g.id;
          return (
            <section key={g.id} className={`lw-seccion${abierta ? ' is-abierta' : ''}`}>
              <button type="button" className="lw-seccion__cab" aria-expanded={abierta} aria-controls={`lw-g-${g.id}`} onClick={() => setAbierto(abierta ? '' : g.id)}>
                <span className="lw-seccion__titulos">
                  <span className="lw-seccion__titulo">{g.titulo}</span>
                  <span className="lw-seccion__desc">{g.descripcion}</span>
                </span>
                <Chevron />
              </button>
              {abierta && (
                <div className="lw-seccion__cuerpo" id={`lw-g-${g.id}`}>
                  {g.campos.map((c) => (
                    <EntradaCampo key={c.ruta} c={c} idBase={`lw-${g.id}`} valor={String(leerRuta(contenido, c.ruta) ?? '')} onCambio={(v) => onCambio(c.ruta, v)} />
                  ))}
                  {g.lista === 'logos' && <ListaLogos items={contenido.logos.items} onCambio={(v) => onCambio('logos.items', v)} />}
                  {g.lista === 'valores' && <ListaValores items={contenido.nosotros.valores} onCambio={(v) => onCambio('nosotros.valores', v)} />}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
