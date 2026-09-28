'use client';
/*
 * Vista previa en vivo del asistente. Renderiza la landing real
 * (LandingRender) a un ancho fijo — 1200px "escritorio" o 390px "móvil" — y la
 * escala para que entre en el panel. Como la landing responde a container
 * queries, el ancho fijo basta para ver cada layout tal cual. Los enlaces de la
 * landing no navegan dentro de la vista previa.
 */
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { LandingRender, type LandingRenderProps } from '../LandingRender';

type Dispositivo = 'escritorio' | 'movil';
const ANCHO: Record<Dispositivo, number> = { escritorio: 1200, movil: 390 };

export function VistaPrevia(props: Omit<LandingRenderProps, 'modo'>) {
  const [dispositivo, setDispositivo] = useState<Dispositivo>('escritorio');
  const marco = useRef<HTMLDivElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [alto, setAlto] = useState(0);
  const ancho = ANCHO[dispositivo];

  useLayoutEffect(() => {
    const m = marco.current;
    const c = contenido.current;
    if (!m || !c) return;
    const medir = () => {
      setEscala(Math.min(1, m.clientWidth / ancho));
      setAlto(c.offsetHeight);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(m);
    ro.observe(c);
    return () => ro.disconnect();
  }, [ancho]);

  const sinNavegar = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) e.preventDefault();
  };

  return (
    <section className="ax-card lw-preview" aria-label="Vista previa">
      <div className="ax-card__header">
        <div className="ax-card__titles"><h2 className="ax-card__title">Vista previa</h2></div>
        <div className="ax-segment" role="group" aria-label="Tamaño de pantalla">
          <button type="button" className="ax-segment__option" aria-pressed={dispositivo === 'escritorio'} onClick={() => setDispositivo('escritorio')}>Computadora</button>
          <button type="button" className="ax-segment__option" aria-pressed={dispositivo === 'movil'} onClick={() => setDispositivo('movil')}>Celular</button>
        </div>
      </div>
      <div className="ax-card__body" style={{ paddingTop: 0 }}>
        <div ref={marco} className={`lw-marco${dispositivo === 'movil' ? ' lw-marco--movil' : ''}`}>
          <div className="lw-marco__caja" style={{ width: ancho * escala, height: alto * escala }}>
            <div
              ref={contenido}
              className="lw-marco__escala"
              style={{ width: ancho, transform: `scale(${escala})` }}
              onClickCapture={sinNavegar}
            >
              <LandingRender {...props} modo="vista-previa" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
