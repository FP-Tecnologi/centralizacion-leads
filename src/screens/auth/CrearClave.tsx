'use client';
/*
 * Sistema de Leads — Crear contraseña.
 * Llega desde el enlace de invitación de Supabase (la sesión ya está
 * iniciada al abrir esta pantalla). Solo pide la contraseña dos veces.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCoverShell, EYE, EYE_OFF } from './authShared';
import { useAuth } from '../../context/AuthContext';

const MIN_LEN = 10;

export function CrearClave() {
  const router = useRouter();
  const { crearClave } = useAuth();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const match = confirm.length > 0 && pw === confirm;
  const largoOk = pw.length >= MIN_LEN;
  const canSubmit = largoOk && match;

  const mensajeConfirm = useMemo(() => {
    if (confirm.length === 0 || match) return '';
    return 'Las contraseñas no coinciden.';
  }, [confirm, match]);

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    crearClave(pw)
      .then(() => router.push('/auth/activar-2fa'))
      .catch((err: unknown) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'No se pudo guardar la contraseña. Intenta de nuevo.');
      });
  }

  return (
    <AuthCoverShell>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', letterSpacing: '-.015em' }}>Crea tu contraseña</h1>
        <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>Elige una contraseña de al menos {MIN_LEN} caracteres.</p>
      </header>

      {error && (
        <div role="alert" className="ax-alert ax-alert--danger" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
          <svg className="ax-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
          <div className="ax-alert__content"><p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{error}</p></div>
        </div>
      )}

      <form className="ax-stack" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }} noValidate>
        <div className="ax-field">
          <label className="ax-label" htmlFor="cc-pw">Contraseña</label>
          <div className="ax-field__control">
            <input id="cc-pw" className="ax-input ax-input--with-trailing" autoComplete="new-password" placeholder="••••••••••"
              type={reveal ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} required />
            <button type="button" className="ax-field__affix ax-field__affix--trailing ax-field__affix--button" onClick={() => setReveal((v) => !v)} aria-pressed={reveal} aria-label={reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {reveal ? EYE_OFF : EYE}
            </button>
          </div>
          {pw.length > 0 && !largoOk && <p className="ax-field__message ax-field__message--error">Debe tener al menos {MIN_LEN} caracteres.</p>}
        </div>

        <div className="ax-field">
          <label className="ax-label" htmlFor="cc-confirm">Confirmar contraseña</label>
          <input id="cc-confirm" className="ax-input" autoComplete="new-password" placeholder="••••••••••"
            type={reveal ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={confirm.length > 0 && !match} required />
          {mensajeConfirm && <p className="ax-field__message ax-field__message--error">{mensajeConfirm}</p>}
        </div>

        <button type="submit" className={`ax-btn ax-btn--primary ax-btn--lg ax-btn--block${loading ? ' is-loading' : ''}`} disabled={!canSubmit || loading} aria-busy={loading}>
          <span className="ax-btn__spinner" aria-hidden="true"></span>
          <span className="ax-btn__label">Continuar</span>
        </button>
      </form>
    </AuthCoverShell>
  );
}

export default CrearClave;
