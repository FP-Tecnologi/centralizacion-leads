'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../shell/Loader';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, aal2, perfil, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/auth/sign-in');
    else if (!aal2) router.replace('/auth/two-step-totp');
  }, [loading, user, aal2, router]);

  if (loading || !user || !aal2) return <Loader />;
  if (!perfil) {
    return (
      <div className="ax-card" style={{ margin: 'var(--ax-space-8) auto', maxWidth: 480 }}>
        <div className="ax-card__body">Tu cuenta no tiene un perfil asignado. Pide a un administrador que te dé acceso.</div>
      </div>
    );
  }
  return <>{children}</>;
}

export default RequireAuth;
