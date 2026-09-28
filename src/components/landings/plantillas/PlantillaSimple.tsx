/*
 * Plantilla "simple" — una columna centrada: logo, título, texto, imagen
 * opcional y el formulario en un panel. Para promociones o contacto rápido.
 */
import type { ReactNode } from 'react';
import { esCorreo, parrafos, urlSegura } from '../../../lib/landings/contenido';
import type { ContenidoLanding } from '../../../lib/landings/tipos';
import { MetaEvento, Pie } from './comunes';

export function PlantillaSimple({ c, formulario }: { c: ContenidoLanding; formulario: ReactNode }) {
  const logo = urlSegura(c.marca.logo_url);
  const imagen = urlSegura(c.hero.imagen_url);
  return (
    <>
      <main className="lp-simple">
        {logo && <img src={logo} alt="Logo" className="lp-simple__logo lp-anim" />}
        {c.hero.etiqueta && <p className="lp-eyebrow lp-anim">{c.hero.etiqueta}</p>}
        <h1 className="lp-h1 lp-anim lp-anim--2">
          {c.hero.titulo && <span>{c.hero.titulo}</span>}
          {c.hero.titulo_destacado && <span className="lp-h1__dest">{c.hero.titulo_destacado}</span>}
        </h1>
        {c.hero.descripcion && (
          <div className="lp-desc lp-anim lp-anim--3">{parrafos(c.hero.descripcion).map((p, i) => <p key={i}>{p}</p>)}</div>
        )}
        <MetaEvento c={c} />
        {imagen && <img src={imagen} alt="" className="lp-simple__imagen lp-anim lp-anim--3" />}
        <div className="lp-panel lp-anim lp-anim--4" id="registro">
          {c.formulario.titulo && <h2 className="lp-panel__titulo">{c.formulario.titulo}</h2>}
          <p className="lp-panel__sub">{c.formulario.subtitulo}</p>
          {formulario}
        </div>
      </main>
      <Pie c={c} logo="" correo={esCorreo(c.pie.correo) ? c.pie.correo.trim() : ''} />
    </>
  );
}
