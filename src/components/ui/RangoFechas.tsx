'use client';
/*
 * Sistema de Leads — selector de rango de fechas en un solo campo.
 * Abre un calendario: el primer clic marca el inicio, el segundo el fin (si el
 * segundo es anterior, se invierten) y se resalta el tramo al pasar el mouse.
 * Atajos: Hoy, Últimos 7/30 días, Este mes, Mes pasado. Fechas como 'YYYY-MM-DD'
 * (hora local); onCambio solo se dispara con un rango completo o al limpiar.
 */
import { useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const desdeIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const corta = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
const sumarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function atajos(): { nombre: string; desde: string; hasta: string }[] {
  const hoy = new Date();
  const h = iso(hoy);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  return [
    { nombre: 'Hoy', desde: h, hasta: h },
    { nombre: 'Últimos 7 días', desde: iso(sumarDias(hoy, -6)), hasta: h },
    { nombre: 'Últimos 30 días', desde: iso(sumarDias(hoy, -29)), hasta: h },
    { nombre: 'Este mes', desde: iso(inicioMes), hasta: h },
    { nombre: 'Mes pasado', desde: iso(inicioMesPasado), hasta: iso(finMesPasado) },
  ];
}

export function RangoFechas({
  desde,
  hasta,
  onCambio,
  placeholder = 'Todas las fechas',
  ariaLabel = 'Rango de fechas',
}: {
  desde: string;
  hasta: string;
  onCambio: (desde: string, hasta: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  // selección en curso dentro del calendario (inicio ya marcado, falta el fin)
  const [inicio, setInicio] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [mes, setMes] = useState(() => { const b = desde ? desdeIso(desde) : new Date(); return new Date(b.getFullYear(), b.getMonth(), 1); });
  const wrap = useRef<HTMLDivElement>(null);

  const cerrar = () => { setAbierto(false); setInicio(null); setSobre(null); };
  useClickOutside(wrap, abierto, cerrar);

  const abrir = () => {
    const b = desde ? desdeIso(desde) : new Date();
    setMes(new Date(b.getFullYear(), b.getMonth(), 1));
    setInicio(null);
    setAbierto((a) => !a);
  };

  const elegir = (dia: string) => {
    if (!inicio) { setInicio(dia); return; }
    const [a, b] = dia < inicio ? [dia, inicio] : [inicio, dia];
    onCambio(a, b);
    cerrar();
  };

  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const offset = (primero.getDay() + 6) % 7; // semana empieza en lunes
    const comienzo = sumarDias(primero, -offset);
    return Array.from({ length: 42 }, (_, i) => sumarDias(comienzo, i));
  }, [mes]);

  // tramo a pintar: en curso (inicio + mouse) o el ya aplicado
  const [ra, rb] = inicio
    ? [inicio, sobre ?? inicio].sort()
    : [desde, hasta];
  const hoy = iso(new Date());

  const texto = desde && hasta ? (desde === hasta ? corta(desde) : `${corta(desde)} – ${corta(hasta)}`) : placeholder;

  return (
    <div className="rf" ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape' && abierto) { e.stopPropagation(); cerrar(); } }}>
      <button
        type="button"
        className={`rf__campo ax-input ax-input--sm${desde ? ' has-valor' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`${ariaLabel}: ${texto}`}
        onClick={abrir}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /></svg>
        <span className="rf__texto">{texto}</span>
      </button>
      {desde && (
        <button type="button" className="rf__limpiar" aria-label="Quitar rango de fechas" onClick={() => { onCambio('', ''); cerrar(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
        </button>
      )}

      {abierto && (
        <div className="rf__panel" role="dialog" aria-label={ariaLabel}>
          <div className="rf__atajos">
            {atajos().map((a) => (
              <button key={a.nombre} type="button"
                className={`rf__atajo${a.desde === desde && a.hasta === hasta ? ' is-activo' : ''}`}
                onClick={() => { onCambio(a.desde, a.hasta); cerrar(); }}>
                {a.nombre}
              </button>
            ))}
          </div>

          <div className="rf__cal">
            <div className="rf__cab">
              <button type="button" className="rf__nav" aria-label="Mes anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</button>
              <span className="rf__mes">{MESES[mes.getMonth()]} {mes.getFullYear()}</span>
              <button type="button" className="rf__nav" aria-label="Mes siguiente" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>›</button>
            </div>
            <div className="rf__grid" onMouseLeave={() => setSobre(null)}>
              {DIAS.map((d, i) => <span key={i} className="rf__dow" aria-hidden="true">{d}</span>)}
              {celdas.map((d) => {
                const s = iso(d);
                const fuera = d.getMonth() !== mes.getMonth();
                const enRango = ra && rb && s >= ra && s <= rb;
                const cls = ['rf__dia'];
                if (fuera) cls.push('is-fuera');
                if (s === hoy) cls.push('is-hoy');
                if (enRango) cls.push('is-rango');
                if (s === ra) cls.push('is-inicio');
                if (s === rb) cls.push('is-fin');
                return (
                  <button key={s} type="button" className={cls.join(' ')}
                    aria-label={corta(s)} aria-pressed={s === ra || s === rb}
                    onMouseEnter={() => inicio && setSobre(s)}
                    onFocus={() => inicio && setSobre(s)}
                    onClick={() => elegir(s)}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <p className="rf__ayuda">{inicio ? `Inicio: ${corta(inicio)} · ahora elige la fecha de fin` : 'Elige la fecha de inicio'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RangoFechas;
