/* Piezas compartidas entre plantillas: datos del evento, logos aliados y pie. */
import { urlSegura } from '../../../lib/landings/contenido';
import type { ContenidoLanding } from '../../../lib/landings/tipos';
import { IconoCalendario, IconoCorreo, IconoLugar, IconoWeb } from '../iconos';

export function MetaEvento({ c }: { c: ContenidoLanding }) {
  if (!c.evento.fecha && !c.evento.lugar) return null;
  return (
    <div className="lp-meta lp-anim lp-anim--3">
      {c.evento.fecha && <span className="lp-chip"><IconoCalendario />{c.evento.fecha}</span>}
      {c.evento.lugar && <span className="lp-chip"><IconoLugar />{c.evento.lugar}</span>}
    </div>
  );
}

export function Logos({ c }: { c: ContenidoLanding }) {
  const items = c.logos.items
    .map((l) => ({ ...l, url: urlSegura(l.url), url_oscuro: urlSegura(l.url_oscuro), enlace: urlSegura(l.enlace) }))
    .filter((l) => l.url);
  if (!items.length) return null;
  return (
    <div className="lp-logos lp-anim lp-anim--4">
      {c.logos.titulo && <span className="lp-logos__titulo">{c.logos.titulo}</span>}
      {items.map((l, i) => {
        const imgs = (
          <>
            <img src={l.url} alt={l.alt} className={`lp-logo lp-logo--claro${l.url_oscuro ? ' lp-logo--con-alterno' : ''}`} />
            {l.url_oscuro && <img src={l.url_oscuro} alt={l.alt} className="lp-logo lp-logo--oscuro" />}
          </>
        );
        return l.enlace
          ? <a key={i} href={l.enlace} target="_blank" rel="noopener noreferrer" aria-label={l.alt || undefined}>{imgs}</a>
          : <span key={i}>{imgs}</span>;
      })}
    </div>
  );
}

export function Pie({ c, logo, correo }: { c: ContenidoLanding; logo: string; correo: string }) {
  const web = urlSegura(c.pie.web);
  if (!logo && !c.pie.texto && !web && !correo) return null;
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__in">
        <div className="lp-footer__marca">
          {logo && <img src={logo} alt="Logo" className="lp-footer__logo" />}
          {c.pie.texto && <span className="lp-footer__texto">{c.pie.texto}</span>}
        </div>
        {(web || correo) && (
          <div className="lp-footer__links">
            {web && (
              <a className="lp-footer__link" href={web} target="_blank" rel="noopener noreferrer">
                <IconoWeb />{web.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
            {correo && <a className="lp-footer__link" href={`mailto:${correo}`}><IconoCorreo />{correo}</a>}
          </div>
        )}
      </div>
    </footer>
  );
}
