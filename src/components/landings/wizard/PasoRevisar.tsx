'use client';
/* Paso 5 — revisar y publicar: lista de chequeo, dirección pública y publicar. */
import { useState } from 'react';
import type { ItemRevision } from '../../../lib/landings/contenido';
import { IconoCheck } from '../iconos';

function IconoX() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>;
}
function IconoAviso() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M12 8v5M12 17h.01" /></svg>;
}

export function PasoRevisar({
  revision, url, publicada, puedePublicar, ocupado, onPublicar, nueva,
}: {
  revision: ItemRevision[];
  url: string;
  publicada: boolean;
  puedePublicar: boolean;
  ocupado: boolean;
  onPublicar: (publicar: boolean) => void;
  nueva: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const bloqueos = revision.filter((r) => !r.ok && r.bloquea);

  const copiar = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }).catch(() => {});
  };

  return (
    <>
      <div className="lw-grupo">
        <h3 className="lw-h3">Antes de publicar</h3>
        <ul className="lw-checklist">
          {revision.map((r) => (
            <li key={r.id} className={`lw-check ${r.ok ? 'is-ok' : r.bloquea ? 'is-mal' : 'is-aviso'}`}>
              <span className="lw-check__ic">{r.ok ? <IconoCheck /> : r.bloquea ? <IconoX /> : <IconoAviso />}</span>
              <span>{r.texto}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lw-grupo">
        <h3 className="lw-h3">Publicación</h3>
        <div className="lw-estado">
          <div>
            <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ${publicada ? 'ax-badge--success' : 'ax-badge--neutral'}`}>
              <span className="ax-badge__dot" /><span>{publicada ? 'Publicada' : 'Borrador (no visible)'}</span>
            </span>
            <p className="lw-url" style={{ marginTop: 'var(--ax-space-2)' }}><code>{url}</code></p>
          </div>
          <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar enlace'}</button>
            {publicada && <a className="ax-btn ax-btn--secondary ax-btn--sm" href={url} target="_blank" rel="noopener noreferrer">Abrir página</a>}
          </div>
        </div>

        {puedePublicar ? (
          publicada ? (
            <button type="button" className="ax-btn ax-btn--secondary" style={{ alignSelf: 'flex-start' }} disabled={ocupado} onClick={() => onPublicar(false)}>
              Despublicar
            </button>
          ) : (
            <>
              <button type="button" className="ax-btn ax-btn--primary" style={{ alignSelf: 'flex-start' }} disabled={ocupado || bloqueos.length > 0} onClick={() => onPublicar(true)}>
                {nueva ? 'Crear y publicar' : 'Guardar y publicar'}
              </button>
              {bloqueos.length > 0 && <p className="lw-error">Corrige los puntos en rojo para poder publicar.</p>}
            </>
          )
        ) : (
          <p className="lw-hint">Solo un administrador puede publicar o despublicar. Guarda tus cambios y avísale.</p>
        )}
        <p className="lw-hint">Si esta landing vive en otro sitio (por ejemplo el repositorio de EXPOMINA), no hace falta publicarla aquí: los campos y el correo que guardes se aplican igual a ese formulario.</p>
      </div>
    </>
  );
}
