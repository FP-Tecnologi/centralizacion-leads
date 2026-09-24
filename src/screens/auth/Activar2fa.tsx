'use client';
/*
 * Sistema de Leads — Activar 2FA (TOTP obligatorio).
 * Se muestra justo después de crear contraseña o al hacer login por primera
 * vez sin factor TOTP verificado. Genera el QR y pide el primer código.
 *
 * El efecto de enroll corre UNA vez por usuario montado — no en cada `user`
 * nuevo que onAuthStateChange dispara (SIGNED_IN al refocar la pestaña,
 * TOKEN_REFRESHED, MFA_CHALLENGE_VERIFIED cambian la referencia de `user`
 * sin que cambie el usuario real). Si el efecto dependiera de `user`
 * completo, cada uno de esos eventos re-ejecutaba iniciarActivacion(), que
 * borra el factor no verificado y crea uno nuevo — el QR ya escaneado deja
 * de servir a mitad del setup. Se clavea en `user?.id` + un ref "ya
 * arrancado" para que ni siquiera el doble-mount de StrictMode dispare dos
 * enrolls en carrera.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCoverShell } from './authShared';
import { useAuth } from '../../context/AuthContext';

export function Activar2fa() {
  const { user, loading, iniciarActivacion, confirmarActivacion } = useAuth();
  const router = useRouter();
  const [f, setF] = useState<{ factorId: string; qr: string; secreto: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const userId = user?.id;
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!userId) { router.replace('/auth/sign-in'); return; }
    if (started.current === userId) return;
    started.current = userId;
    iniciarActivacion().then(setF).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [loading, userId, iniciarActivacion, router]);

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
    <AuthCoverShell>
      <section className="ax-card" role="region" aria-label="Activar verificación en dos pasos" style={{ borderRadius: 'var(--ax-radius-xl)' }}>
        <div className="ax-card__body" style={{ padding: 'var(--ax-space-8)' }}>
          <form onSubmit={enviar} className="ax-stack" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', letterSpacing: '-.015em' }}>Activa la verificación en dos pasos</h1>
            <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>Escanea el código con Google Authenticator, Microsoft Authenticator o similar.</p>
            {f && (
              <div className="ax-center" style={{ flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.qr} alt="Código QR para 2FA" width={200} height={200} />
                <p style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>O ingresa la clave: <code>{f.secreto}</code></p>
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
    </AuthCoverShell>
  );
}

export default Activar2fa;
