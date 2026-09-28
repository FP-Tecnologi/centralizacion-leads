'use client';
/*
 * Sistema de Leads — gestión de una fuente (landing/offline): datos, formulario
 * (CamposEditor), clave de envío (solo admin: fuentes_adm en RLS exige
 * es_admin para escribir en `fuentes`) y un resumen de registros vía
 * dashboard_resumen (RPC ya existente, evita duplicar el conteo por-fuente).
 * En las landings, formulario y correo de agradecimiento se editan en el
 * asistente del CMS (src/components/landings/wizard); aquí solo se enlaza.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { fuentePorSlug, guardarFuente, type Fuente } from '../../lib/leads/datos';
import { refrescarFuentes } from '../../hooks/useFuentesMenu';
import { hayClavesInvalidas } from '../../lib/leads/camposUtil';
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';
import { CamposEditor } from './CamposEditor';
import { paginaDeFuente, type PaginaGuardada } from '../../lib/landings/datos';
import { PageHead } from '../shell/PageHead';

export function GestionarFuente({ slug, tipo }: { slug: string; tipo: 'landing' | 'offline' }) {
  const { esAdmin } = useAuth();
  const base = tipo === 'landing' ? 'landings' : 'offline';

  const [f, setF] = useState<Fuente | null | undefined>(undefined);
  const [nombre, setNombre] = useState('');
  const [dominio, setDominio] = useState('');
  const [estado, setEstado] = useState<'activa' | 'cerrada'>('activa');
  const [campos, setCampos] = useState<CampoFormulario[]>([]);

  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [guardandoCampos, setGuardandoCampos] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const [clave, setClave] = useState<string | null>(null);
  const [regenerando, setRegenerando] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);

  const [resumen, setResumen] = useState<{ total: number; semana: number } | null>(null);

  const cargar = () => {
    fuentePorSlug(slug)
      .then((fuente) => {
        setF(fuente);
        if (fuente) {
          setNombre(fuente.nombre);
          setDominio(fuente.dominio ?? '');
          setEstado(fuente.estado);
          setCampos(fuente.campos ?? []);
        }
      })
      .catch(() => setF(null));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cargar, [slug]);

  useEffect(() => {
    if (!f) return;
    supabase
      .rpc('dashboard_resumen', { p_fuentes: [f.id], p_desde: null, p_hasta: null })
      .then(({ data }) => {
        const d = data as { total?: number; semana?: number } | null;
        if (d) setResumen({ total: d.total ?? 0, semana: d.semana ?? 0 });
      });
  }, [f]);

  // Claves tal como quedaron persistidas la última vez que se cargó/guardó la
  // fuente — no un snapshot fijo al montar: así un campo recién guardado pasa
  // a ser de solo lectura de inmediato y no se le puede regenerar la clave
  // editando la etiqueta de nuevo en la misma sesión.
  const clavesGuardadas = useMemo(() => new Set((f?.campos ?? []).map((c) => c.key)), [f]);
  const camposInvalidos = hayClavesInvalidas(campos);

  if (f === undefined) return null;
  if (f === null) return <p>{tipo === 'landing' ? 'Landing' : 'App offline'} no encontrada o sin acceso.</p>;

  const guardarDatos = async () => {
    setErrorGuardado(null);
    setGuardandoDatos(true);
    try {
      const actualizado = await guardarFuente({ id: f.id, nombre, dominio: dominio || null, estado });
      setF(actualizado);
      refrescarFuentes(tipo);
    } catch {
      setErrorGuardado('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardandoDatos(false);
    }
  };

  const guardarCampos = async () => {
    setErrorGuardado(null);
    if (camposInvalidos) {
      setErrorGuardado('Hay campos con una clave vacía, con formato inválido o repetida. Corrígelos antes de guardar.');
      return;
    }
    setGuardandoCampos(true);
    try {
      const actualizado = await guardarFuente({ id: f.id, campos });
      setF(actualizado);
      setCampos(actualizado.campos ?? []);
    } catch {
      setErrorGuardado('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardandoCampos(false);
    }
  };

  const regenerarClave = async () => {
    if (!window.confirm('Las landings que usen la clave anterior dejarán de enviar datos. ¿Continuar?')) return;
    setErrorClave(null);
    setRegenerando(true);
    try {
      const { data, error } = await supabase.rpc('regenerar_clave_fuente', { p_fuente: f.id });
      if (error) throw error;
      setClave(data as string);
      cargar();
    } catch {
      setErrorClave('No se pudo generar la clave. Intenta de nuevo.');
    } finally {
      setRegenerando(false);
    }
  };

  const copiarClave = () => { if (clave) navigator.clipboard?.writeText(clave).catch(() => {}); };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '<proyecto>.supabase.co';
  const snippet = `fetch('${url}/functions/v1/ingresar-lead', {\n  method: 'POST', headers: { 'content-type': 'application/json' },\n  body: JSON.stringify({ slug: '${f.slug}', clave: '${clave ?? '<clave>'}', datos: { nombres, email, ... } })\n});`;

  return (
    <>
      <PageHead title={`Gestionar · ${f.nombre}`} />
      <div className="ax-dash-grid">
        <section className="ax-card ax-col--12">
          <div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Datos</h2></div></div>
          <div className="ax-card__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-4)' }}>
            <div className="ax-field">
              <label className="ax-label" htmlFor="gf-nombre">Nombre</label>
              <input id="gf-nombre" className="ax-input" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!esAdmin} />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="gf-slug">Slug</label>
              <input id="gf-slug" className="ax-input" value={f.slug} disabled readOnly />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="gf-dominio">Dominio</label>
              <input id="gf-dominio" className="ax-input" value={dominio} onChange={(e) => setDominio(e.target.value)} disabled={!esAdmin} placeholder="ejemplo.com" />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="gf-estado">Estado</label>
              <select id="gf-estado" className="ax-select" value={estado} onChange={(e) => setEstado(e.target.value as 'activa' | 'cerrada')} disabled={!esAdmin}>
                <option value="activa">Activa</option>
                <option value="cerrada">Cerrada</option>
              </select>
            </div>
          </div>
          {esAdmin && (
            <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--ax-border)' }}>
              <button type="button" className="ax-btn ax-btn--primary" disabled={guardandoDatos} onClick={guardarDatos}>Guardar</button>
            </div>
          )}
        </section>

        {tipo === 'landing' ? (
          <PaginaLanding fuente={f} />
        ) : (
        <section className="ax-card ax-col--12">
          <div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Formulario</h2></div></div>
          <div className="ax-card__body">
            {esAdmin ? (
              <CamposEditor value={campos} onChange={setCampos} clavesGuardadas={clavesGuardadas} />
            ) : campos.length ? (
              <ul style={{ margin: 0, paddingInlineStart: 'var(--ax-space-5)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {campos.map((c) => <li key={c.key}>{c.label || c.key} ({c.tipo}){c.requerido ? ' · requerido' : ''}</li>)}
              </ul>
            ) : <p className="ax-text-subtle">Sin campos adicionales.</p>}
          </div>
          {esAdmin && (
            <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--ax-space-3)', borderTop: '1px solid var(--ax-border)' }}>
              {camposInvalidos && (
                <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)', margin: 0 }}>
                  Hay campos con una clave vacía, con formato inválido o repetida. Corrígelos antes de guardar.
                </p>
              )}
              <button type="button" className="ax-btn ax-btn--primary" disabled={guardandoCampos || camposInvalidos} onClick={guardarCampos} style={{ marginInlineStart: 'auto' }}>
                Guardar
              </button>
            </div>
          )}
        </section>
        )}

        {esAdmin && (
          <section className="ax-card ax-col--12">
            <div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Clave de envío</h2></div></div>
            <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
              <p>
                <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ${f.clave_hash ? 'ax-badge--success' : 'ax-badge--neutral'}`}>
                  <span className="ax-badge__dot" /><span>{f.clave_hash ? 'Configurada' : 'Sin clave'}</span>
                </span>
              </p>
              <button type="button" className="ax-btn ax-btn--secondary" disabled={regenerando} onClick={regenerarClave} style={{ alignSelf: 'flex-start' }}>
                {f.clave_hash ? 'Regenerar clave' : 'Generar clave'}
              </button>
              {errorClave && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{errorClave}</p>}
              {clave && (
                <div style={{ padding: 'var(--ax-space-3)', background: 'var(--ax-accent-wash)', border: '1px solid var(--ax-accent)', borderRadius: 'var(--ax-radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
                  <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
                    <code className="ax-num" style={{ wordBreak: 'break-all' }}>{clave}</code>
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={copiarClave}>Copiar</button>
                  </div>
                  <p className="ax-note">Guárdala ahora, no se vuelve a mostrar.</p>
                </div>
              )}
              <div>
                <p className="ax-label">Snippet de integración</p>
                <pre style={{ margin: 0, padding: 'var(--ax-space-3)', background: 'var(--ax-fill-hover)', borderRadius: 'var(--ax-radius-md)', overflowX: 'auto', fontSize: 'var(--ax-text-xs)', fontFamily: 'var(--ax-font-mono)' }}>
                  <code>{snippet}</code>
                </pre>
              </div>
            </div>
          </section>
        )}

        <section className="ax-card ax-col--12">
          <div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Resumen</h2></div></div>
          <div className="ax-card__body ax-cluster" style={{ gap: 'var(--ax-space-8)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <p className="ax-note" style={{ margin: 0 }}>Total registros</p>
              <p className="ax-num" style={{ fontSize: 'var(--ax-text-xl)', margin: 0 }}>{resumen?.total ?? '—'}</p>
            </div>
            <div>
              <p className="ax-note" style={{ margin: 0 }}>Últimos 7 días</p>
              <p className="ax-num" style={{ fontSize: 'var(--ax-text-xl)', margin: 0 }}>{resumen?.semana ?? '—'}</p>
            </div>
            <Link className="ax-btn ax-btn--secondary" href={`/${base}/${f.slug}/registros`}>Ver registros</Link>
          </div>
        </section>
      </div>

      {errorGuardado && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{errorGuardado}</p>}
    </>
  );
}

/** Landings: el formulario y el correo se editan en el asistente del CMS. */
function PaginaLanding({ fuente }: { fuente: Fuente }) {
  const { puedeEditar } = useAuth();
  const [pagina, setPagina] = useState<PaginaGuardada | null | undefined>(undefined);
  useEffect(() => {
    paginaDeFuente(fuente.id).then(setPagina).catch(() => setPagina(null));
  }, [fuente.id]);

  const estado = pagina === undefined ? null : pagina?.publicada ? 'Publicada' : pagina ? 'Borrador' : 'Sin página propia';
  return (
    <section className="ax-card ax-col--12">
      <div className="ax-card__header"><div className="ax-card__titles"><h2 className="ax-card__title">Página, formulario y agradecimiento</h2></div></div>
      <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
        {estado && (
          <p>
            <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ${pagina?.publicada ? 'ax-badge--success' : 'ax-badge--neutral'}`}>
              <span className="ax-badge__dot" /><span>{estado}</span>
            </span>
          </p>
        )}
        <p className="ax-text-subtle" style={{ margin: 0 }}>
          {fuente.campos?.length ?? 0} campos en el formulario · correo de agradecimiento {fuente.correo_gracias?.activo ? 'activo' : 'inactivo'}.
        </p>
        <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
          {puedeEditar && <Link className="ax-btn ax-btn--primary" href={`/landings/${fuente.slug}/editar`}>Abrir editor</Link>}
          {pagina?.publicada && <a className="ax-btn ax-btn--secondary" href={`/l/${fuente.slug}`} target="_blank" rel="noopener noreferrer">Ver página</a>}
        </div>
      </div>
    </section>
  );
}

export default GestionarFuente;
