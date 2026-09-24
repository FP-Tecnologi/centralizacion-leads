'use client';
/*
 * Sistema de Leads — Sign in (login real vía AuthContext → Supabase).
 * Layout cover (split, panel de marca + formulario) — distinto del login
 * básico centrado del HUB, a pedido: bifurca a /auth/two-step-totp o
 * /auth/activar-2fa según si la cuenta ya tiene 2FA.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCoverShell, EYE, EYE_OFF } from './authShared';
import { useAuth } from '../../context/AuthContext';

function mensajeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  return 'Correo o contraseña incorrectos. Intenta de nuevo.';
}

export function SignIn() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Correo o contraseña incorrectos. Intenta de nuevo.');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = !email.trim()
      ? 'Ingresa tu correo.'
      : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
        ? 'Ingresa un correo válido.'
        : '';
    const p = !password ? 'Ingresa tu contraseña.' : '';
    setEmailErr(e);
    setPassErr(p);
    return !e && !p;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(false);
    if (!validate()) return;
    setLoading(true);
    login(email.trim(), password, recordar)
      .then((destino) => {
        setLoading(false);
        router.push(destino === 'totp' ? '/auth/two-step-totp' : '/auth/activar-2fa');
      })
      .catch((err: unknown) => {
        setLoading(false);
        setError(true);
        setErrorMessage(mensajeError(err));
      });
  }

  return (
    <AuthCoverShell>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', letterSpacing: '-.015em' }}>Iniciar sesión</h1>
        <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>Bienvenido de nuevo — ingresa a tu cuenta.</p>
      </header>

      {error && (
        <div role="alert" className="ax-alert ax-alert--danger" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
          <svg className="ax-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
          <div className="ax-alert__content"><p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{errorMessage}</p></div>
        </div>
      )}

      <form className="ax-stack" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }} noValidate>
        <div className="ax-field">
          <label className="ax-label" htmlFor="si-email">Correo</label>
          <input id="si-email" type="email" className={`ax-input${emailErr ? ' is-invalid' : ''}`} autoComplete="username" placeholder="tu@correo.com"
            value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={emailErr ? 'true' : 'false'} aria-describedby="si-email-msg" required />
          {emailErr && <p id="si-email-msg" className="ax-field__message ax-field__message--error">{emailErr}</p>}
        </div>

        <div className="ax-field">
          <label className="ax-label" htmlFor="si-pass">Contraseña</label>
          <div className="ax-field__control">
            <input id="si-pass" className={`ax-input ax-input--with-trailing${passErr ? ' is-invalid' : ''}`} autoComplete="current-password" placeholder="••••••••••"
              type={reveal ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={passErr ? 'true' : 'false'} aria-describedby="si-pass-msg" required />
            <button type="button" className="ax-field__affix ax-field__affix--trailing ax-field__affix--button" onClick={() => setReveal((v) => !v)} aria-pressed={reveal} aria-label={reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {reveal ? EYE_OFF : EYE}
            </button>
          </div>
          {passErr && <p id="si-pass-msg" className="ax-field__message ax-field__message--error">{passErr}</p>}
        </div>

        <div className="ax-cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="ax-cluster" style={{ gap: 'var(--ax-space-2)', alignItems: 'center', fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>
            <input type="checkbox" className="ax-checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
            Recordarme
          </label>
          <Link href="/auth/recuperar" className="ax-link" style={{ fontSize: 'var(--ax-text-sm)' }}>¿Olvidaste tu contraseña?</Link>
        </div>

        <button type="submit" className={`ax-btn ax-btn--primary ax-btn--lg ax-btn--block${loading ? ' is-loading' : ''}`} aria-busy={loading}>
          <span className="ax-btn__spinner" aria-hidden="true"></span>
          <span className="ax-btn__label">Iniciar sesión</span>
        </button>
      </form>
    </AuthCoverShell>
  );
}

export default SignIn;
