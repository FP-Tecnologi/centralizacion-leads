'use client';
/*
 * Sistema de Leads — Activar 2FA (TOTP obligatorio).
 * Se muestra justo después de crear contraseña o al hacer login por primera
 * vez sin factor TOTP verificado. Genera el QR y pide el primer código.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthStandalone, OffappTools, BrandCentered } from './authShared';
import { useAuth } from '../../context/AuthContext';

export function Activar2fa() {
  const { user, loading, iniciarActivacion, confirmarActivacion } = useAuth();
  const router = useRouter();
  const [f, setF] = useState<{ factorId: string; qr: string; secreto: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/auth/sign-in'); return; }
    iniciarActivacion().then(setF).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await confirmarActivacion(f!.factorId, code.trim());
      router.push('/');
    } catch {
      setError('Código incorrecto. Revisa la hora del teléfono y vuelve a intentar.');
    }
  }

  return (
    <AuthStandalone>
      <OffappTools style={{ position: 'fixed', insetBlockStart: 'var(--ax-space-5)', insetInlineEnd: 'var(--ax-space-5)', zIndex: 5 }} />

      <main className="ax-center" id="ax-main" style={{ inlineSize: '100%', maxInlineSize: 400, position: 'relative', zIndex: 1 }}>
        <div style={{ inlineSize: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
          <BrandCentered />

          <section className="ax-card" role="region" aria-label="Activar verificación en dos pasos" style={{ borderRadius: 'var(--ax-radius-xl)' }}>
            <div className="ax-card__body" style={{ padding: 'var(--ax-space-8)' }}>
              <form onSubmit={enviar} className="ax-stack" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
                <h1 className="ax-card__title" style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', letterSpacing: '-.015em' }}>Activa la verificación en dos pasos</h1>
                <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>Escanea el código con Google Authenticator, Microsoft Authenticator o similar.</p>
                {f && (
                  <div className="ax-center" style={{ flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.qr} alt="Código QR para 2FA" width={200} height={200} />
                    <p className="ax-text-subtle" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>O ingresa la clave: <code>{f.secreto}</code></p>
                  </div>
                )}
                <label className="ax-field">
                  <span className="ax-label">Código de 6 dígitos</span>
                  <input className="ax-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                    value={code} onChange={(e) => setCode(e.target.value)} required />
                </label>
                {error && (
                  <div role="alert" className="ax-alert ax-alert--danger" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
                    <div className="ax-alert__content"><p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{error}</p></div>
                  </div>
                )}
                <button className="ax-btn ax-btn--primary ax-btn--lg ax-btn--block" disabled={!f || code.length !== 6}>Activar y entrar</button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </AuthStandalone>
  );
}

export default Activar2fa;
