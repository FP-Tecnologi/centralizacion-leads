'use client';
/*
 * Sistema de Leads — dashboard con 5 KPIs y 6 gráficas ApexCharts, alimentado por
 * la RPC dashboard_resumen(p_fuentes, p_desde, p_hasta) (RLS-scoped, invoker).
 * Filtros de fuente/fecha re-disparan la RPC; ApexChart ya se re-tematiza solo
 * con el evento ax:change que dispara src/lib/theme.ts en el toggle claro/oscuro.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listarFuentes, type Fuente } from '../lib/leads/datos';
import { ApexChart } from '../components/charts/ApexChart';
import { PageHead } from '../components/shell/PageHead';

interface Resumen {
  total: number; personas_unicas: number; hoy: number; semana: number; contactados: number;
  por_dia: { dia: string; n: number }[]; por_fuente: { fuente: string; n: number }[];
  por_estado: { estado: string; n: number }[]; por_rubro: { rubro: string; n: number }[];
  por_cargo: { cargo: string; n: number }[];
}
const ORDEN_EMBUDO = ['nuevo', 'contactado', 'asistio'];

export function Dashboard() {
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [sel, setSel] = useState<string>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [r, setR] = useState<Resumen | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { listarFuentes().then(setFuentes).catch(() => setFuentes([])); }, []);
  useEffect(() => {
    setError('');
    supabase.rpc('dashboard_resumen', { p_fuentes: sel ? [sel] : null, p_desde: desde || null, p_hasta: hasta || null })
      .then(({ data, error: e }) => (e ? setError('No se pudo cargar el resumen.') : setR(data as Resumen)));
  }, [sel, desde, hasta]);

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
      <PageHead title="Dashboard" />
      <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', marginBottom: 'var(--ax-space-4)', flexWrap: 'wrap' }}>
        <select className="ax-select" aria-label="Fuente" value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Todas las fuentes</option>
          {fuentes.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        <input className="ax-input" type="date" aria-label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <input className="ax-input" type="date" aria-label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>
      {error && <div className="ax-card" role="alert"><div className="ax-card__body">{error}</div></div>}
      {r && (
        <div className="ax-dash-grid">
          {kpis.map((k) => (
            <div key={k.label} className="ax-card ax-kpi ax-col--3">
              <div className="ax-card__body">
                <div className="ax-kpi__label">{k.label}</div>
                <div className="ax-kpi__value ax-num">{k.valor}</div>
              </div>
            </div>
          ))}
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
