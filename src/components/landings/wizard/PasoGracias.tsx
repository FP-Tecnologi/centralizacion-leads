'use client';
/*
 * Paso 4 — agradecimiento: el mensaje que aparece en la página al enviar y,
 * opcional, el correo automático (lo manda send-thank-you vía ingresar-lead).
 * El correo se escribe como texto simple; el HTML se genera al guardar
 * (correoHtml). Landings de antes del CMS pueden traer un HTML hecho a mano:
 * se respeta tal cual hasta que el usuario elija reemplazarlo.
 */
import { useState } from 'react';
import { correoHtml } from '../../../lib/landings/contenido';
import type { ContenidoLanding, CorreoGracias } from '../../../lib/landings/tipos';

export function PasoGracias({
  gracias, onGracias, correo, onCorreo, contenido,
}: {
  gracias: ContenidoLanding['gracias'];
  onGracias: (campo: 'titulo' | 'mensaje', v: string) => void;
  correo: CorreoGracias;
  onCorreo: (c: CorreoGracias) => void;
  contenido: ContenidoLanding;
}) {
  const [verCorreo, setVerCorreo] = useState(false);
  const htmlPropio = correo.texto === undefined && !!correo.plantilla;
  const origen = typeof window === 'undefined' ? '' : window.location.origin;
  const vista = correo.texto !== undefined
    ? correoHtml(contenido, correo.asunto || gracias.titulo, correo.texto, origen).replaceAll('{{nombre}}', 'María')
    : (correo.plantilla ?? '').replaceAll('{{nombre}}', 'María');

  return (
    <>
      <div className="lw-grupo">
        <h3 className="lw-h3">En la página</h3>
        <p className="lw-intro">Lo que ve la persona apenas envía el formulario (mira la vista previa).</p>
        <div className="ax-field">
          <label className="ax-label" htmlFor="lw-g-titulo">Título</label>
          <input id="lw-g-titulo" className="ax-input" value={gracias.titulo} onChange={(e) => onGracias('titulo', e.target.value)} />
        </div>
        <div className="ax-field">
          <label className="ax-label" htmlFor="lw-g-msg">Mensaje</label>
          <textarea id="lw-g-msg" className="ax-textarea" rows={3} value={gracias.mensaje} onChange={(e) => onGracias('mensaje', e.target.value)} />
        </div>
      </div>

      <div className="lw-grupo">
        <h3 className="lw-h3">Por correo</h3>
        <label className="lw-switch">
          <input type="checkbox" className="ax-switch" checked={correo.activo} onChange={(e) => onCorreo({ ...correo, activo: e.target.checked })} />
          <span>Enviar un correo de agradecimiento a quien se registra</span>
        </label>

        {correo.activo && (
          <>
            <div className="ax-field">
              <label className="ax-label" htmlFor="lw-c-asunto">Asunto</label>
              <input id="lw-c-asunto" className="ax-input" value={correo.asunto ?? ''} onChange={(e) => onCorreo({ ...correo, asunto: e.target.value })} placeholder="Gracias por registrarte" />
            </div>

            {htmlPropio ? (
              <div className="ax-alert ax-alert--info">
                <div className="ax-alert__content">
                  <p className="ax-alert__title">Este correo usa un diseño hecho a medida</p>
                  <p className="ax-alert__message">Se seguirá enviando igual. Si prefieres editarlo aquí, cámbialo por un mensaje simple (el diseño a medida se reemplaza al guardar).</p>
                  <div className="ax-alert__actions">
                    <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={() => onCorreo({ ...correo, texto: `Hola {{nombre}},\n\n${gracias.mensaje}` })}>
                      Cambiar a mensaje simple
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ax-field">
                <label className="ax-label" htmlFor="lw-c-texto">Mensaje</label>
                <textarea id="lw-c-texto" className="ax-textarea" rows={6} value={correo.texto ?? ''} onChange={(e) => onCorreo({ ...correo, texto: e.target.value })} />
                <p className="lw-hint">Escribe {'{{nombre}}'} donde quieras saludar por su nombre. El correo lleva tu logo, tu color principal y los datos del pie de página.</p>
              </div>
            )}

            <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setVerCorreo((v) => !v)} aria-expanded={verCorreo}>
              {verCorreo ? 'Ocultar cómo se ve el correo' : 'Ver cómo se ve el correo'}
            </button>
            {verCorreo && <iframe className="lw-correo-previa" title="Vista previa del correo" sandbox="" srcDoc={vista} />}
          </>
        )}
      </div>
    </>
  );
}
