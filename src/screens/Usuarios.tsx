'use client';
/*
 * Sistema de Leads — Usuarios: invitar por correo, editar rol/fuentes,
 * desactivar/reactivar, reenviar invitación y eliminar. Todo pasa por la Edge
 * Function admin-usuarios (service_role); la fila de acciones solo aparece
 * para cuentas que quien mira puede gestionar (`gestionable`, calculado allá).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EnBody } from '../components/ui/EnBody';
import { useAuth, type Rol } from '../context/AuthContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { listarFuentes, type Fuente } from '../lib/leads/datos';
import {
  accionUsuario, actualizarUsuario, invitarUsuario, listarUsuarios, nombreRol, rolConFuentes, rolesAsignables, ROLES,
  type Usuario,
} from '../lib/usuarios';
import { Avatar } from '../components/ui/Avatar';
import { PageHead } from '../components/shell/PageHead';

const BADGE_ROL: Record<Rol, string> = { superadmin: 'ax-badge--accent', admin: 'ax-badge--info', editor: 'ax-badge--success', lector: 'ax-badge--neutral' };

type Modal =
  | { tipo: 'invitar' }
  | { tipo: 'editar'; usuario: Usuario }
  | { tipo: 'confirmar'; accion: 'desactivar' | 'eliminar'; usuario: Usuario }
  | null;

function fecha(v: string | null) {
  return v ? new Date(v).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca';
}

export function Usuarios() {
  const { esAdmin, perfil } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = () => {
    setCargando(true);
    setError(null);
    Promise.all([listarUsuarios(), listarFuentes()])
      .then(([u, f]) => {
        const orden: (Rol | null)[] = ['superadmin', 'admin', 'editor', 'lector', null];
        setUsuarios([...u.usuarios].sort((a, b) => orden.indexOf(a.rol) - orden.indexOf(b.rol) || a.email.localeCompare(b.email)));
        setFuentes(f);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios.'))
      .finally(() => setCargando(false));
  };
  useEffect(() => {
    if (esAdmin) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin]);

  const nombresFuente = useMemo(() => Object.fromEntries(fuentes.map((f) => [f.id, f.nombre])), [fuentes]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? usuarios.filter((u) => `${u.nombre} ${u.email}`.toLowerCase().includes(q)) : usuarios;
  }, [usuarios, busqueda]);

  const ejecutar = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setOcupado(id);
    setAviso(null);
    setError(null);
    try {
      await fn();
      setAviso(ok);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setOcupado(null);
    }
  };

  if (!esAdmin) {
    return (
      <>
        <PageHead title="Usuarios" />
        <div className="ax-card"><div className="ax-card__body"><p>Solo administradores.</p></div></div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Usuarios"
        subtitle="Cuentas con acceso al sistema de leads, su rol y las fuentes que pueden ver."
        actions={<button type="button" className="ax-btn ax-btn--primary" onClick={() => setModal({ tipo: 'invitar' })}>Invitar usuario</button>}
      />

      {aviso && (
        <div role="status" className="ax-alert ax-alert--success" style={{ marginBottom: 'var(--ax-space-4)', padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
          <div className="ax-alert__content"><p className="ax-alert__message">{aviso}</p></div>
        </div>
      )}
      {error && (
        <div role="alert" className="ax-alert ax-alert--danger" style={{ marginBottom: 'var(--ax-space-4)', padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
          <div className="ax-alert__content">
            <p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>
          </div>
          <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={cargar}>Reintentar</button>
        </div>
      )}

      <section className="ax-card ax-col--12">
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <h2 className="ax-card__title">{usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'}</h2>
          </div>
          <input className="ax-input" type="search" placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ maxWidth: 280 }} />
        </div>
        <div className="ax-table-wrap">
          <table className="ax-table ax-table--hover">
            <caption className="ax-visually-hidden">Usuarios</caption>
            <thead className="ax-table__head">
              <tr>
                <th className="ax-table__th" scope="col">Usuario</th>
                <th className="ax-table__th" scope="col">Rol</th>
                <th className="ax-table__th" scope="col">Fuentes</th>
                <th className="ax-table__th" scope="col">2FA</th>
                <th className="ax-table__th" scope="col">Último ingreso</th>
                <th className="ax-table__th" scope="col">Estado</th>
                <th className="ax-table__th" scope="col"><span className="ax-visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => {
                const esYo = u.user_id === perfil?.user_id;
                return (
                  <tr key={u.user_id} className="ax-table__row">
                    <td className="ax-table__td">
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                        <Avatar nombre={u.nombre} email={u.email} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{u.nombre || '—'}{esYo && <span className="ax-text-subtle"> (tú)</span>}</div>
                          <div className="ax-text-subtle" style={{ fontSize: 'var(--ax-text-sm)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="ax-table__td">
                      <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ${u.rol ? BADGE_ROL[u.rol] : 'ax-badge--warning'}`}>{nombreRol(u.rol)}</span>
                    </td>
                    <td className="ax-table__td" style={{ maxWidth: 260 }}>
                      {rolConFuentes(u.rol)
                        ? (u.fuentes.length ? u.fuentes.map((f) => nombresFuente[f] ?? '¿?').join(', ') : <span className="ax-text-subtle">Ninguna</span>)
                        : u.rol ? 'Todas' : '—'}
                    </td>
                    <td className="ax-table__td">
                      <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ${u.mfa ? 'ax-badge--success' : 'ax-badge--neutral'}`}>{u.mfa ? 'Activo' : 'Pendiente'}</span>
                    </td>
                    <td className="ax-table__td">{fecha(u.ultimo_ingreso)}</td>
                    <td className="ax-table__td">
                      {u.desactivado ? (
                        <span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--danger"><span className="ax-badge__dot" /><span>Desactivado</span></span>
                      ) : u.invitacion_pendiente ? (
                        <span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--warning"><span className="ax-badge__dot" /><span>Invitado</span></span>
                      ) : (
                        <span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--success"><span className="ax-badge__dot" /><span>Activo</span></span>
                      )}
                    </td>
                    <td className="ax-table__td" style={{ textAlign: 'end' }}>
                      {u.gestionable && (
                        <div className="ax-cluster" style={{ gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" disabled={ocupado === u.user_id} onClick={() => setModal({ tipo: 'editar', usuario: u })}>Editar</button>
                          {u.invitacion_pendiente && !u.desactivado && (
                            <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" disabled={ocupado === u.user_id}
                              onClick={() => ejecutar(u.user_id, () => accionUsuario('reenviar', u.user_id), `Invitación reenviada a ${u.email}.`)}>Reenviar</button>
                          )}
                          {u.desactivado ? (
                            <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" disabled={ocupado === u.user_id}
                              onClick={() => ejecutar(u.user_id, () => accionUsuario('reactivar', u.user_id), `${u.email} puede volver a ingresar.`)}>Reactivar</button>
                          ) : (
                            <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" disabled={ocupado === u.user_id}
                              onClick={() => setModal({ tipo: 'confirmar', accion: 'desactivar', usuario: u })}>Desactivar</button>
                          )}
                          <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" style={{ color: 'var(--ax-danger-500)' }} disabled={ocupado === u.user_id}
                            onClick={() => setModal({ tipo: 'confirmar', accion: 'eliminar', usuario: u })}>Eliminar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!cargando && !filtrados.length && !error && (
          <div style={{ textAlign: 'center', padding: 'var(--ax-space-8) var(--ax-space-5)' }}>
            <p className="ax-text-subtle">{busqueda ? 'Ningún usuario coincide con la búsqueda.' : 'No hay usuarios todavía.'}</p>
          </div>
        )}
        {cargando && !usuarios.length && (
          <div style={{ textAlign: 'center', padding: 'var(--ax-space-8) var(--ax-space-5)' }}><p className="ax-text-subtle">Cargando…</p></div>
        )}
      </section>

      {(modal?.tipo === 'invitar' || modal?.tipo === 'editar') && (
        <UsuarioModal
          usuario={modal.tipo === 'editar' ? modal.usuario : undefined}
          quien={perfil?.rol ?? null}
          fuentes={fuentes}
          onCerrar={() => setModal(null)}
          onGuardado={(msg) => { setModal(null); setAviso(msg); cargar(); }}
        />
      )}

      {modal?.tipo === 'confirmar' && (
        <ConfirmarModal
          accion={modal.accion}
          usuario={modal.usuario}
          onCerrar={() => setModal(null)}
          onConfirmar={() => {
            const { accion, usuario } = modal;
            setModal(null);
            ejecutar(usuario.user_id, () => accionUsuario(accion, usuario.user_id),
              accion === 'eliminar' ? `Se eliminó la cuenta de ${usuario.email}.` : `${usuario.email} ya no puede ingresar.`);
          }}
        />
      )}
    </>
  );
}

function ModalBase({ titulo, children, pie, onCerrar, onSubmit }: {
  titulo: string; children: React.ReactNode; pie: React.ReactNode; onCerrar: () => void; onSubmit: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  useFocusTrap(ref, true);
  return (
    <EnBody>
    <div onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="ax-backdrop" onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 'var(--ax-z-modal)', background: 'rgba(0,0,0,.45)', border: 0 }} />
      <div className="ax-flex" role="dialog" aria-modal="true" aria-label={titulo} style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--ax-z-modal) + 1)', alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)', pointerEvents: 'none' }}>
        <form className="ax-card" ref={ref} onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          style={{ width: 'min(520px,100%)', maxHeight: '90vh', overflow: 'auto', pointerEvents: 'auto' }}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{titulo}</h2></div>
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" onClick={onCerrar} aria-label="Cerrar">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>{children}</div>
          <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ax-space-2)', borderTop: '1px solid var(--ax-border)' }}>{pie}</div>
        </form>
      </div>
    </div>
    </EnBody>
  );
}

function UsuarioModal({ usuario, quien, fuentes, onCerrar, onGuardado }: {
  usuario?: Usuario; quien: Rol | null; fuentes: Fuente[]; onCerrar: () => void; onGuardado: (msg: string) => void;
}) {
  const asignables = rolesAsignables(quien);
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? asignables[asignables.length - 1]?.valor ?? 'lector');
  const [sel, setSel] = useState<string[]>(usuario?.fuentes ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const puedeGuardar = !guardando && nombre.trim() !== '' && (usuario || emailValido);

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    const fs = rolConFuentes(rol) ? sel : [];
    try {
      if (usuario) {
        await actualizarUsuario({ user_id: usuario.user_id, nombre, rol, fuentes: fs });
        onGuardado(`Se actualizó a ${usuario.email}.`);
      } else {
        await invitarUsuario({ email: email.trim().toLowerCase(), nombre, rol, fuentes: fs });
        onGuardado(`Invitación enviada a ${email.trim().toLowerCase()}. Deberá crear su contraseña y activar 2FA.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      setGuardando(false);
    }
  };

  return (
    <ModalBase
      titulo={usuario ? `Editar ${usuario.email}` : 'Invitar usuario'}
      onCerrar={onCerrar}
      onSubmit={guardar}
      pie={<>
        <button type="button" className="ax-btn ax-btn--ghost" onClick={onCerrar}>Cancelar</button>
        <button type="submit" className="ax-btn ax-btn--primary" disabled={!puedeGuardar}>{usuario ? 'Guardar' : 'Enviar invitación'}</button>
      </>}
    >
      {!usuario && (
        <p className="ax-note">La persona recibe un correo para crear su contraseña; al primer ingreso se le pide activar la verificación en dos pasos.</p>
      )}
      {!usuario && (
        <div className="ax-field">
          <label className="ax-label" htmlFor="um-email">Correo</label>
          <input id="um-email" className="ax-input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={email.length > 0 && !emailValido} required />
        </div>
      )}
      <div className="ax-field">
        <label className="ax-label" htmlFor="um-nombre">Nombre</label>
        <input id="um-nombre" className="ax-input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <fieldset className="ax-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="ax-label">Rol</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
          {ROLES.filter((r) => asignables.some((a) => a.valor === r.valor)).map((r) => (
            <label key={r.valor} className="ax-cluster" style={{ gap: 'var(--ax-space-2)', alignItems: 'flex-start', flexWrap: 'nowrap', cursor: 'pointer' }}>
              <input type="radio" name="um-rol" value={r.valor} checked={rol === r.valor} onChange={() => setRol(r.valor)} style={{ marginTop: 4 }} />
              <span><strong>{r.nombre}</strong><br /><span className="ax-text-subtle" style={{ fontSize: 'var(--ax-text-sm)' }}>{r.descripcion}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      {rolConFuentes(rol) && (
        <div className="ax-field">
          <span className="ax-label">Fuentes que puede ver{rol === 'editor' ? ' y editar' : ''}</span>
          {fuentes.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
              {fuentes.map((f) => (
                <label key={f.id} className="ax-cluster" style={{ gap: 'var(--ax-space-2)', cursor: 'pointer' }}>
                  <input type="checkbox" className="ax-checkbox" checked={sel.includes(f.id)}
                    onChange={() => setSel((s) => (s.includes(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id]))} />
                  <span>{f.nombre}</span>
                </label>
              ))}
            </div>
          ) : <p className="ax-note">No hay fuentes creadas.</p>}
          {!sel.length && <p className="ax-note">Sin fuentes asignadas no verá ningún lead.</p>}
        </div>
      )}
      {error && <p role="alert" className="ax-note" style={{ color: 'var(--ax-danger-500)' }}>{error}</p>}
    </ModalBase>
  );
}

function ConfirmarModal({ accion, usuario, onCerrar, onConfirmar }: {
  accion: 'desactivar' | 'eliminar'; usuario: Usuario; onCerrar: () => void; onConfirmar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const eliminar = accion === 'eliminar';
  const listo = !eliminar || texto.trim().toLowerCase() === usuario.email.toLowerCase();
  return (
    <ModalBase
      titulo={eliminar ? 'Eliminar cuenta' : 'Desactivar cuenta'}
      onCerrar={onCerrar}
      onSubmit={() => listo && onConfirmar()}
      pie={<>
        <button type="button" className="ax-btn ax-btn--ghost" onClick={onCerrar}>Cancelar</button>
        <button type="submit" className={`ax-btn ${eliminar ? 'ax-btn--danger' : 'ax-btn--primary'}`} disabled={!listo}>
          {eliminar ? 'Eliminar definitivamente' : 'Desactivar'}
        </button>
      </>}
    >
      {eliminar ? (
        <>
          <p>Se borra la cuenta de <strong>{usuario.email}</strong> y ya no podrá ingresar. Los leads y las importaciones que hizo se conservan. <strong>No se puede deshacer.</strong></p>
          <div className="ax-field">
            <label className="ax-label" htmlFor="cm-email">Escribe el correo para confirmar</label>
            <input id="cm-email" className="ax-input" autoComplete="off" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={usuario.email} />
          </div>
        </>
      ) : (
        <p><strong>{usuario.email}</strong> no podrá ingresar hasta que lo reactives. Su rol y sus fuentes se conservan.</p>
      )}
    </ModalBase>
  );
}

export default Usuarios;
