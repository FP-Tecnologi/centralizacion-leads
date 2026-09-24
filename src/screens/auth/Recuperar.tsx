'use client';
/*
 * Sistema de Leads — "¿Olvidaste tu contraseña?".
 * Siempre muestra el mismo mensaje neutral tras enviar, exista o no la
 * cuenta (anti-enumeración). El enlace de recuperación abre
 * /auth/crear-clave con una sesión de recovery (ver CrearClave.tsx).
 */
import { useState } from 'react';
import Link from 'next/link';
import { AuthCoverShell } from './authShared';
import { supabase } from '../../lib/supabase';

const MENSAJE_OK = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.';
const MENSAJE_RATE_LIMIT = 'Ya enviamos un enlace hace poco. Espera unos minutos antes de volver a intentar.';

function mensajeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (/rate limit|too many/i.test(msg)) return MENSAJE_RATE_LIMIT;
  return MENSAJE_RATE_LIMIT;
}

export function Recuperar() {
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setEmailErr('Ingresa un correo válido.');
      return;
    }
    setEmailErr('');
    setError('');
    setLoading(true);
    supabase.auth
      .resetPasswordForEmail(trimmed, { redirectTo: `${window.location.origin}/auth/crear-clave` })
      .then(({ error: err }) => {
        setLoading(false);
        // Éxito o "usuario no existe" (Supabase a veces sí devuelve error ahí):
        // en ambos casos mostramos el mismo mensaje neutral. Solo el rate
        // limit real se distingue, para no bloquear al usuario en silencio.
        if (err && /rate limit|too many/i.test(err.message)) {
          setError(mensajeError(err));
        } else {
          setEnviado(true);
        }
      });
  }

  return (
    <AuthCoverShell>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', letterSpacing: '-.015em' }}>Recuperar contraseña</h1>
        <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>Ingresa tu correo y te enviamos un enlace para restablecerla.</p>
      </header>

      {enviado && (
        <div role="status" className="ax-alert ax-alert--success" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
          <div className="ax-alert__content"><p className="ax-alert__message">{MENSAJE_OK}</p></div>
        </div>
      )}

      {error && (
        <div role="alert" className="ax-alert ax-alert--danger" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
          <div className="ax-alert__content"><p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{error}</p></div>
        </div>
      )}

      {!enviado && (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }} noValidate>
          <div className="ax-field">
            <label className="ax-label" htmlFor="rec-email">Correo</label>
            <input id="rec-email" type="email" className={`ax-input${emailErr ? ' is-invalid' : ''}`} autoComplete="username" placeholder="tu@correo.com"
              value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={emailErr ? 'true' : 'false'} aria-describedby="rec-email-msg" required />
            {emailErr && <p id="rec-email-msg" className="ax-field__message ax-field__message--error">{emailErr}</p>}
          </div>

          <button type="submit" className={`ax-btn ax-btn--primary ax-btn--lg ax-btn--block${loading ? ' is-loading' : ''}`} aria-busy={loading}>
            <span className="ax-btn__spinner" aria-hidden="true"></span>
            <span className="ax-btn__label">Enviar enlace</span>
          </button>
        </form>
      )}

      <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', textAlign: 'center' }}>
        <Link href="/auth/sign-in" className="ax-link">Volver a iniciar sesión</Link>
      </p>
    </AuthCoverShell>
  );
}

export default Recuperar;
