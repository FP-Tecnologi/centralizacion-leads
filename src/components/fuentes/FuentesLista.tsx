'use client';
/*
 * Sistema de Leads — lista de fuentes (landings o apps offline): tabla con
 * nombre, dominio, estado, nº de registros propios (excluye duplicados de
 * importación) y última actualización. "Nueva"/"Duplicar" son solo-admin
 * (fuentes_adm en RLS exige es_admin para escribir en `fuentes`).
 */
import { useEffect, useRef, useState } from 'react';
import { EnBody } from '../ui/EnBody';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { supabase } from '../../lib/supabase';
import { listarFuentes, guardarFuente, type Fuente } from '../../lib/leads/datos';
import { slugify } from '../../lib/leads/mapeo';
import { refrescarFuentes } from '../../hooks/useFuentesMenu';
import { PageHead } from '../shell/PageHead';

const TEXTOS = {
  landing: { titulo: 'Landings', base: 'landings', nuevo: 'Nueva landing', vacio: 'No hay landings todavía.' },
  offline: { titulo: 'Apps offline', base: 'offline', nuevo: 'Nueva app offline', vacio: 'No hay apps offline todavía.' },
} as const;

type ModalState = { modo: 'nueva' } | { modo: 'duplicar'; fuente: Fuente } | null;

export function FuentesLista({ tipo }: { tipo: 'landing' | 'offline' }) {
  const { esAdmin } = useAuth();
  const router = useRouter();
  const t = TEXTOS[tipo];
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const cargar = () => {
    setCargando(true);
    setError(null);
    listarFuentes(tipo)
      .then(async (datos) => {
        setFuentes(datos);
        const entradas = await Promise.all(
          datos.map(async (f) => {
            const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('fuente_id', f.id).is('duplicado_de', null);
            return [f.id, count ?? 0] as const;
          }),
        );
        setConteos(Object.fromEntries(entradas));
      })
      .catch(() => setError('No se pudieron cargar las fuentes.'))
      .finally(() => setCargando(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cargar, [tipo]);

  return (
    <>
      <PageHead
        title={t.titulo}
        actions={esAdmin ? (
          // Las landings se crean con el asistente del CMS (plantilla, contenido, formulario).
          tipo === 'landing'
            ? <Link className="ax-btn ax-btn--primary" href="/landings/nueva">{t.nuevo}</Link>
            : <button type="button" className="ax-btn ax-btn--primary" onClick={() => setModal({ modo: 'nueva' })}>{t.nuevo}</button>
        ) : undefined}
      />

      {error && (
        <div className="ax-card" role="alert"><div className="ax-card__body">
          <p style={{ marginBottom: 'var(--ax-space-3)' }}>{error}</p>
          <button type="button" className="ax-btn ax-btn--secondary" onClick={cargar}>Reintentar</button>
        </div></div>
      )}

      {!error && (
        <section className="ax-card ax-col--12">
          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <caption className="ax-visually-hidden">{t.titulo}</caption>
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">Nombre</th>
                  <th className="ax-table__th" scope="col">Dominio</th>
                  <th className="ax-table__th" scope="col">Estado</th>
                  <th className="ax-table__th" scope="col">Nº registros</th>
                  <th className="ax-table__th" scope="col">Última actualización</th>
                  <th className="ax-table__th" scope="col"><span className="ax-visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {fuentes.map((f) => (
                  <tr key={f.id} className="ax-table__row">
                    <td className="ax-table__td">{f.nombre}</td>
                    <td className="ax-table__td">{f.dominio ?? '—'}</td>
                    <td className="ax-table__td">
                      <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ${f.estado === 'activa' ? 'ax-badge--success' : 'ax-badge--neutral'}`}>
                        <span className="ax-badge__dot" /><span>{f.estado}</span>
                      </span>
                    </td>
                    <td className="ax-table__td ax-num">{conteos[f.id] ?? '—'}</td>
                    <td className="ax-table__td">{new Date(f.actualizado_en).toLocaleString('es-PE')}</td>
                    <td className="ax-table__td" style={{ textAlign: 'end' }}>
                      <div className="ax-cluster" style={{ gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Link className="ax-btn ax-btn--ghost ax-btn--sm" href={`/${t.base}/${f.slug}`}>Gestionar</Link>
                        {tipo === 'landing' && (
                          <Link className="ax-btn ax-btn--ghost ax-btn--sm" href={`/landings/${f.slug}/configuracion`}>Configuración</Link>
                        )}
                        <Link className="ax-btn ax-btn--ghost ax-btn--sm" href={`/${t.base}/${f.slug}/registros`}>Registros</Link>
                        {esAdmin && (
                          <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={() => setModal({ modo: 'duplicar', fuente: f })}>Duplicar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!cargando && !fuentes.length && (
            <div style={{ textAlign: 'center', padding: 'var(--ax-space-8) var(--ax-space-5)' }}>
              <p className="ax-text-subtle">{t.vacio}</p>
            </div>
          )}
        </section>
      )}

      {modal && (
        <FuenteModal
          tipo={tipo}
          origen={modal.modo === 'duplicar' ? modal.fuente : undefined}
          onCerrar={() => setModal(null)}
          onCreada={(slug) => {
            setModal(null);
            refrescarFuentes(tipo);
            router.push(`/${t.base}/${slug}`);
          }}
        />
      )}
    </>
  );
}

function FuenteModal({
  tipo,
  origen,
  onCerrar,
  onCreada,
}: {
  tipo: 'landing' | 'offline';
  origen?: Fuente;
  onCerrar: () => void;
  onCreada: (slug: string) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  useFocusTrap(ref, true);

  const [nombre, setNombre] = useState(origen ? `${origen.nombre} copia` : '');
  const [slug, setSlug] = useState(origen ? slugify(`${origen.slug}-copia`) : '');
  const [slugTocado, setSlugTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiarNombre = (v: string) => {
    setNombre(v);
    if (!slugTocado) setSlug(slugify(v));
  };
  const cambiarSlug = (v: string) => {
    setSlugTocado(true);
    setSlug(v);
  };

  const slugValido = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);

  const guardar = async () => {
    if (!nombre.trim() || !slugValido) return;
    setError(null);
    setGuardando(true);
    try {
      if (origen) {
        const { error: e } = await supabase.rpc('duplicar_fuente', { p_fuente: origen.id, p_nombre: nombre, p_slug: slug });
        if (e) throw e;
      } else {
        await guardarFuente({ nombre, slug, tipo, campos: [] });
      }
      onCreada(slug);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(/duplicate|unique/i.test(msg) ? 'Ese slug ya está en uso.' : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <EnBody>
    <div onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="ax-backdrop" onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 'var(--ax-z-modal)', background: 'rgba(0,0,0,.45)', border: 0 }} />
      <div className="ax-flex" role="dialog" aria-modal="true" aria-label={origen ? 'Duplicar fuente' : 'Nueva fuente'} style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--ax-z-modal) + 1)', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)' }}>
        <form
          className="ax-card"
          ref={ref}
          onSubmit={(e) => { e.preventDefault(); guardar(); }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 'min(480px,100%)' }}
        >
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{origen ? `Duplicar ${origen.nombre}` : (tipo === 'landing' ? 'Nueva landing' : 'Nueva app offline')}</h2>
            </div>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" onClick={onCerrar} aria-label="Cerrar">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
            {origen && (
              <p className="ax-note">Se copian campos del formulario, dominio, correo de agradecimiento y la página del CMS (queda sin publicar). Los registros no se copian.</p>
            )}
            <div className="ax-field">
              <label className="ax-label" htmlFor="fm-nombre">Nombre</label>
              <input id="fm-nombre" className="ax-input" value={nombre} onChange={(e) => cambiarNombre(e.target.value)} required />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="fm-slug">Slug</label>
              <input id="fm-slug" className="ax-input" value={slug} onChange={(e) => cambiarSlug(e.target.value)} aria-invalid={slug.length > 0 && !slugValido} required />
              {slug.length > 0 && !slugValido && <p className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>Solo minúsculas, números y guiones (sin empezar/terminar en guion).</p>}
            </div>
            {error && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>}
          </div>
          <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ax-space-2)', borderTop: '1px solid var(--ax-border)' }}>
            <button type="button" className="ax-btn ax-btn--ghost" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="ax-btn ax-btn--primary" disabled={guardando || !nombre.trim() || !slugValido}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
    </EnBody>
  );
}

export default FuentesLista;
