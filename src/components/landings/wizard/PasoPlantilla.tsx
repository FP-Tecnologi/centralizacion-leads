'use client';
/* Paso 1 — elegir plantilla (y, si es nueva, nombre y dirección). */
import { PLANTILLAS } from '../../../lib/landings/plantillas';
import { slugValido } from '../../../lib/landings/contenido';
import { IconoCheck } from '../iconos';

function Miniatura({ id }: { id: string }) {
  if (id === 'simple') {
    return (
      <div className="lw-mini lw-mini--simple" aria-hidden="true">
        <i style={{ width: 28, height: 6 }} />
        <i style={{ width: '58%', height: 8 }} />
        <i className="a" style={{ width: '40%', height: 6 }} />
        <div className="lw-mini__panel"><i style={{ height: 6 }} /><i style={{ height: 6 }} /><i className="a" style={{ height: 8 }} /></div>
      </div>
    );
  }
  return (
    <div className="lw-mini" aria-hidden="true">
      <i style={{ width: 34, height: 6 }} />
      <div className="lw-mini__fila">
        <div className="lw-mini__col">
          <i className="d" style={{ width: '46%', height: 5 }} />
          <i style={{ width: '90%', height: 9 }} />
          <i className="a" style={{ width: '75%', height: 9 }} />
          <i style={{ width: '80%', height: 4 }} />
          <i style={{ width: '60%', height: 4 }} />
        </div>
        <div className="lw-mini__panel"><i style={{ height: 6 }} /><i style={{ height: 6 }} /><i style={{ height: 6 }} /><i className="a" style={{ height: 9 }} /></div>
      </div>
    </div>
  );
}

export function PasoPlantilla({
  plantilla, onPlantilla, nueva, nombre, onNombre, slug, onSlug,
}: {
  plantilla: string;
  onPlantilla: (id: string) => void;
  nueva: boolean;
  nombre: string;
  onNombre: (v: string) => void;
  slug: string;
  onSlug: (v: string) => void;
}) {
  const origen = typeof window === 'undefined' ? '' : window.location.origin;
  return (
    <>
      {nueva && (
        <div className="lw-grupo">
          <h3 className="lw-h3">Datos básicos</h3>
          <div className="lw-dos">
            <div className="ax-field">
              <label className="ax-label" htmlFor="lw-nombre">Nombre interno</label>
              <input id="lw-nombre" className="ax-input" value={nombre} onChange={(e) => onNombre(e.target.value)} placeholder="Ej. Expomina 2027" />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="lw-slug">Dirección</label>
              <input id="lw-slug" className="ax-input" value={slug} onChange={(e) => onSlug(e.target.value)} aria-invalid={slug.length > 0 && !slugValido(slug)} placeholder="expomina-2027" />
            </div>
          </div>
          {slug.length > 0 && !slugValido(slug)
            ? <p className="lw-error">Solo minúsculas, números y guiones (sin empezar ni terminar en guion).</p>
            : <p className="lw-url">Quedará en <code>{origen}/l/{slug || 'tu-direccion'}</code></p>}
        </div>
      )}

      <div className="lw-grupo">
        <h3 className="lw-h3">Elige un diseño</h3>
        <p className="lw-intro">Podrás cambiar textos, colores e imágenes en el siguiente paso. Si cambias de diseño después, lo que escribiste se mantiene.</p>
        <div className="lw-plantillas" role="radiogroup" aria-label="Plantillas">
          {PLANTILLAS.map((p) => (
            <label key={p.id} className="lw-plantilla">
              <input type="radio" name="lw-plantilla" value={p.id} checked={plantilla === p.id} onChange={() => onPlantilla(p.id)} />
              <span className="lw-plantilla__check"><IconoCheck /></span>
              <Miniatura id={p.id} />
              <span className="lw-plantilla__nombre">{p.nombre}</span>
              <span className="lw-plantilla__desc">{p.descripcion}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
