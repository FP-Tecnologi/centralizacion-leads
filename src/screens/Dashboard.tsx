'use client';
/*
 * Sistema de Leads — dashboard con 5 KPIs y 6 gráficas ApexCharts, alimentado por
 * la RPC dashboard_resumen(p_fuentes, p_desde, p_hasta) (RLS-scoped, invoker).
 * Filtros de fuente/fecha re-disparan la RPC; ApexChart ya se re-tematiza solo
 * con el evento ax:change que dispara src/lib/theme.ts en el toggle claro/oscuro.
 * La respuesta se descarta si el usuario ya cambió de filtro (guarda de carrera
 * por request-id) para que una RPC lenta no pise el resultado del filtro actual.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listarFuentes, type Fuente } from '../lib/leads/datos';
import { ApexChart } from '../components/charts/ApexChart';
import { PageHead } from '../components/shell/PageHead';
import { RangoFechas } from '../components/ui/RangoFechas';
import { Icon } from '../components/ui/Icon';

interface Resumen {
  total: number; personas_unicas: number; hoy: number; semana: number; contactados: number;
  por_dia: { dia: string; n: number }[]; por_fuente: { fuente: string; n: number }[];
  por_estado: { estado: string; n: number }[]; por_rubro: { rubro: string; n: number }[];
  por_cargo: { cargo: string; n: number }[];
}
const ORDEN_EMBUDO = ['nuevo', 'contactado', 'asistio'];
const KPI_ICONOS = ['users-group', 'user', 'bell', 'folders', 'diamond'] as const;

export function Dashboard() {
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [sel, setSel] = useState<string>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [r, setR] = useState<Resumen | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const peticion = useRef(0);

  useEffect(() => { listarFuentes().then(setFuentes).catch(() => setFuentes([])); }, []);
  useEffect(() => {
    const id = ++peticion.current;
    setCargando(true);
    setError('');
    supabase.rpc('dashboard_resumen', { p_fuentes: sel ? [sel] : null, p_desde: desde || null, p_hasta: hasta || null })
      .then(({ data, error: e }) => {
        if (id !== peticion.current) return; // respuesta obsoleta: llegó un filtro más nuevo
        setCargando(false);
        if (e) setError('No se pudo cargar el resumen.');
        else setR(data as Resumen);
      });
  }, [sel, desde, hasta]);

  const hayFiltro = sel !== '' || desde !== '' || hasta !== '';
  function limpiar() { setSel(''); setDesde(''); setHasta(''); }

  const pct = r && r.total ? Math.round((r.contactados / r.total) * 100) : 0;
  const kpis = r ? [
    { label: 'Total leads', valor: r.total },
    { label: 'Personas únicas', valor: r.personas_unicas },
    { label: 'Nuevos hoy', valor: r.hoy },
    { label: 'Últimos 7 días', valor: r.semana },
    { label: '% contactados', valor: `${pct}%` },
  ] : [];

  return (
    <>
      <PageHead
        title="Dashboard"
        actions={
          <div className="dash-filtros" role="group" aria-label="Filtros del dashboard">
            <label className="dash-filtro dash-filtro--fuente">
              <span>Fuente</span>
              <select className="ax-select ax-select--sm" value={sel} onChange={(e) => setSel(e.target.value)}>
                <option value="">Todas las fuentes</option>
                {fuentes.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </label>
            <div className="dash-filtro dash-filtro--fechas">
              <span>Fechas</span>
              <RangoFechas desde={desde} hasta={hasta} onCambio={(d, h) => { setDesde(d); setHasta(h); }} />
            </div>
            {hayFiltro && (
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm dash-filtros__limpiar" onClick={limpiar}>
                Limpiar
              </button>
            )}
          </div>
        }
      />
      {error && <div className="ax-card" role="alert"><div className="ax-card__body">{error}</div></div>}
      {cargando && !r && !error && <p className="ax-text-subtle">Cargando…</p>}
      {r && (
        <>
          <div className="ax-kpi-row">
            {kpis.map((k, i) => (
              <div key={k.label} className="ax-card ax-kpi">
                <div className="ax-card__body">
                  <div className="ax-kpi__top">
                    <span className={`ax-kpi__icon ax-kpi__icon--c${(i % 4) + 1}`}><Icon name={KPI_ICONOS[i]} /></span>
                  </div>
                  <div className="ax-kpi__label">{k.label}</div>
                  <div className="ax-kpi__value ax-num">{k.valor}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="ax-dash-grid">
            <Tarjeta titulo="Leads por día" col={12}>
              {r.por_dia.length ? (
                <ApexChart type="area" height={300} ariaLabel="Leads por día"
                  series={[{ name: 'Leads', data: r.por_dia.map((d) => ({ x: d.dia, y: d.n })) }]}
                  apex={{ xaxis: { type: 'datetime' } }} />
              ) : <Vacio />}
            </Tarjeta>
            <Tarjeta titulo="Por fuente" col={6}>
              {r.por_fuente.length ? (
                <ApexChart type="bar" height={300} ariaLabel="Leads por fuente"
                  series={[{ name: 'Leads', data: r.por_fuente.map((d) => d.n) }]}
                  apex={{ xaxis: { categories: r.por_fuente.map((d) => d.fuente) }, plotOptions: { bar: { horizontal: true } } }} />
              ) : <Vacio />}
            </Tarjeta>
            <Tarjeta titulo="Por estado" col={6}>
              {r.por_estado.length ? (
                <ApexChart type="donut" height={300} ariaLabel="Leads por estado"
                  series={r.por_estado.map((d) => d.n)} apex={{ labels: r.por_estado.map((d) => d.estado) }} />
              ) : <Vacio />}
            </Tarjeta>
            <Tarjeta titulo="Top rubros" col={6}>
              {r.por_rubro.length ? (
                <ApexChart type="bar" height={300} ariaLabel="Top rubros"
                  series={[{ name: 'Leads', data: r.por_rubro.map((d) => d.n) }]}
                  apex={{ xaxis: { categories: r.por_rubro.map((d) => d.rubro) } }} />
              ) : <Vacio />}
            </Tarjeta>
            <Tarjeta titulo="Embudo" col={6}>
              <ApexChart type="bar" height={300} ariaLabel="Embudo de estados"
                series={[{ name: 'Leads', data: ORDEN_EMBUDO.map((e) => r.por_estado.find((x) => x.estado === e)?.n ?? 0) }]}
                apex={{ xaxis: { categories: ORDEN_EMBUDO }, plotOptions: { bar: { horizontal: true, isFunnel: true } } }} />
            </Tarjeta>
            <Tarjeta titulo="Top cargos" col={12}>
              {r.por_cargo.length ? (
                <ApexChart type="bar" height={300} ariaLabel="Top cargos"
                  series={[{ name: 'Leads', data: r.por_cargo.map((d) => d.n) }]}
                  apex={{ xaxis: { categories: r.por_cargo.map((d) => d.cargo) } }} />
              ) : <Vacio />}
            </Tarjeta>
          </div>
        </>
      )}
    </>
  );
}

function Tarjeta({ titulo, col, children }: { titulo: string; col: 3 | 4 | 6 | 12; children: React.ReactNode }) {
  return (
    <section className={`ax-card ax-col--${col}`}>
      <header className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">{titulo}</h2></div></header>
      <div className="ax-card__body">{children}</div>
    </section>
  );
}
function Vacio() { return <p className="ax-text-subtle">Sin datos en este rango.</p>; }

export default Dashboard;
