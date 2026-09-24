'use client';
/*
 * Sistema de Leads — Verificación en dos pasos (app autenticadora / TOTP).
 * Sin códigos de respaldo (el brief los quita).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthStandalone, OffappTools, BrandCentered } from './authShared';
import { useAuth } from '../../context/AuthContext';

export function TwoStepTotp() {
  const router = useRouter();
  const { user, loading, verificarTotp } = useAuth();
  const [code, setCode] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState('Código inválido. Intenta de nuevo.');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/auth/sign-in');
  }, [loading, user, router]);

  function verify(ev: React.FormEvent) {
    ev.preventDefault();
    if (!code.trim()) return;
    setEnviando(true);
    setInvalid(false);
    verificarTotp(code.trim())
      .then(() => {
        setEnviando(false);
        router.push('/');
      })
      .catch((err: unknown) => {
        setEnviando(false);
        setInvalid(true);
        setInvalidMessage(err instanceof Error ? err.message : 'Código inválido. Intenta de nuevo.');
        setCode('');
      });
  }

  return (
    <AuthStandalone>
      <OffappTools style={{ position: 'fixed', insetBlockStart: 'var(--ax-space-5)', insetInlineEnd: 'var(--ax-space-5)', zIndex: 5 }} />

      <main className="ax-center" id="ax-main" style={{ inlineSize: '100%', maxInlineSize: 400, position: 'relative', zIndex: 1 }}>
        <div style={{ inlineSize: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
          <BrandCentered />

          <section className="ax-card" role="region" aria-label="Verificación con app autenticadora" style={{ borderRadius: 'var(--ax-radius-xl)' }}>
            <div className="ax-card__body" style={{ padding: 'var(--ax-space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
              <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)', alignItems: 'center' }}>
                <span className="ax-center" aria-hidden="true" style={{ inlineSize: 56, blockSize: 56, borderRadius: 'var(--ax-radius-pill)', background: 'var(--ax-accent-wash)', color: 'var(--ax-accent)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <path d="M12 18h.01" />
                  </svg>
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
                  <h1 style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', letterSpacing: '-.015em' }}>Verificación en dos pasos</h1>
                  <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>Ingresa el código de tu app autenticadora.</p>
                </div>
              </header>

              {invalid && (
                <div role="alert" className="ax-alert ax-alert--danger" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
                  <svg className="ax-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                  <div className="ax-alert__content"><p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{invalidMessage}</p></div>
                </div>
              )}

              <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }} noValidate>
                <div className="ax-field">
                  <label className="ax-label" htmlFor="totp-code">Código de 6 dígitos</label>
                  <input id="totp-code" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
                    className={`ax-input${invalid ? ' is-invalid' : ''}`} placeholder="123456"
                    value={code} onChange={(e) => { setInvalid(false); setCode(e.target.value); }} aria-invalid={invalid ? 'true' : 'false'} />
                </div>

                <button type="submit" className={`ax-btn ax-btn--primary ax-btn--lg ax-btn--block${enviando ? ' is-loading' : ''}`} disabled={!code.trim()} aria-busy={enviando}>
                  <span className="ax-btn__spinner" aria-hidden="true"></span>
                  <span className="ax-btn__label">Verificar</span>
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </AuthStandalone>
  );
}

export default TwoStepTotp;
