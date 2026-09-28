/*
 * Plantilla "evento" — la landing de registro de EXPOMINA 2026 como plantilla:
 * nav con logo, portada en dos columnas (texto + logos aliados | formulario en
 * panel de vidrio), sección "Sobre nosotros" con tarjetas y pie de contacto.
 */
import type { ReactNode } from 'react';
import { esCorreo, parrafos, urlSegura } from '../../../lib/landings/contenido';
import type { ContenidoLanding } from '../../../lib/landings/tipos';
import { ICONOS_VALOR } from '../iconos';
import { Logos, MetaEvento, Pie } from './comunes';

export function PlantillaEvento({ c, formulario }: { c: ContenidoLanding; formulario: ReactNode }) {
  const logo = urlSegura(c.marca.logo_url);
  const valores = c.nosotros.valores.filter((v) => v.titulo.trim() || v.texto.trim());
  const botonUrl = urlSegura(c.nosotros.boton_url);
  const hayNosotros = c.nosotros.titulo.trim() || c.nosotros.texto.trim() || valores.length;

  return (
    <>
      <header className="lp-nav">
        <div className="lp-wrap lp-nav__in">
          {logo ? <img src={logo} alt="Logo" className="lp-nav__logo" /> : <span />}
          {c.evento.nombre && <span className="lp-nav__evento">{c.evento.nombre}</span>}
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-wrap lp-hero">
          <div className="lp-hero__texto">
            {c.hero.etiqueta && <p className="lp-eyebrow lp-anim">{c.hero.etiqueta}</p>}
            <h1 className="lp-h1 lp-anim lp-anim--2">
              {c.hero.titulo && <span>{c.hero.titulo}</span>}
              {c.hero.titulo_destacado && <span className="lp-h1__dest">{c.hero.titulo_destacado}</span>}
            </h1>
            {c.hero.descripcion && (
              <div className="lp-desc lp-anim lp-anim--3">{parrafos(c.hero.descripcion).map((p, i) => <p key={i}>{p}</p>)}</div>
            )}
            <MetaEvento c={c} />
            <Logos c={c} />
          </div>

          <div className="lp-panel lp-anim lp-anim--4" id="registro">
            {c.formulario.titulo && <h2 className="lp-panel__titulo">{c.formulario.titulo}</h2>}
            <p className="lp-panel__sub">{c.formulario.subtitulo}</p>
            {formulario}
          </div>
        </section>

        {hayNosotros ? (
          <section className="lp-wrap lp-about">
            <div className="lp-about__texto">
              {c.nosotros.titulo && <h2 className="lp-about__titulo">{c.nosotros.titulo}</h2>}
              {c.nosotros.texto && <div className="lp-desc">{parrafos(c.nosotros.texto).map((p, i) => <p key={i}>{p}</p>)}</div>}
              {botonUrl && c.nosotros.boton_texto && (
                <a className="lp-btn" href={botonUrl} target="_blank" rel="noopener noreferrer">{c.nosotros.boton_texto}</a>
              )}
            </div>
            {valores.length > 0 && (
              <div className="lp-valores">
                {valores.map((v, i) => {
                  const Icono = ICONOS_VALOR[i % ICONOS_VALOR.length];
                  return (
                    <div className="lp-valor" key={i}>
                      <div className="lp-valor__icono"><Icono /></div>
                      <h3 className="lp-valor__titulo">{v.titulo}</h3>
                      <p className="lp-valor__texto">{v.texto}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </main>

      <Pie c={c} logo={logo} correo={esCorreo(c.pie.correo) ? c.pie.correo.trim() : ''} />
    </>
  );
}
