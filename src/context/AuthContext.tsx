'use client';
/*
 * Sistema de Leads — AuthContext sobre Supabase Auth.
 * Flujo: email+contraseña (aal1) → TOTP (aal2). Si la cuenta no tiene factor
 * TOTP todavía, se fuerza a activarlo antes de entrar: toda política RLS de
 * datos exige aal2, así que sin 2FA no hay nada que ver.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Perfil { user_id: string; nombre: string; rol: 'admin' | 'editor' | 'lector' }

interface AuthValue {
  user: User | null;
  perfil: Perfil | null;
  aal2: boolean;
  loading: boolean;
  login(email: string, password: string): Promise<'totp' | 'activar'>;
  tieneTotp(): Promise<boolean>;
  verificarTotp(code: string): Promise<void>;
  iniciarActivacion(): Promise<{ factorId: string; qr: string; secreto: string }>;
  confirmarActivacion(factorId: string, code: string): Promise<void>;
  crearClave(password: string): Promise<void>;
  logout(): Promise<void>;
  puedeEditar: boolean;
  esAdmin: boolean;
}

const Ctx = createContext<AuthValue | null>(null);
// Marcador liviano para middleware.ts (Edge no puede leer localStorage). No es la sesión.
const COOKIE = 'ax_session';
function marcarCookie(on: boolean) {
  document.cookie = on ? `${COOKIE}=1; path=/; SameSite=Lax` : `${COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aal2, setAal2] = useState(false);
  const [loading, setLoading] = useState(true);

  const refrescar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const ok = aal?.currentLevel === 'aal2';
    setAal2(ok);
    marcarCookie(ok);
    if (ok && session) {
      const { data } = await supabase.from('perfiles').select('user_id, nombre, rol').eq('user_id', session.user.id).maybeSingle();
      setPerfil((data as Perfil) ?? null);
    } else {
      setPerfil(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refrescar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refrescar(); });
    return () => sub.subscription.unsubscribe();
  }, [refrescar]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data } = await supabase.auth.mfa.listFactors();
    return (data?.totp.some((f) => f.status === 'verified') ? 'totp' : 'activar') as 'totp' | 'activar';
  }, []);

  // ¿La cuenta ya tiene un factor TOTP verificado? Usado por TwoStepTotp para
  // no quedarse atascada en "No hay 2FA activo" cuando el usuario llega ahí
  // sin haber terminado nunca la activación (p.ej. recargó a mitad del enroll).
  const tieneTotp = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    return !!data?.totp.some((f) => f.status === 'verified');
  }, []);

  const verificarTotp = useCallback(async (code: string) => {
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp.find((f) => f.status === 'verified');
    if (!factor) throw new Error('No hay 2FA activo');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) throw error;
    await refrescar();
  }, [refrescar]);

  const iniciarActivacion = useCallback(async () => {
    // Borra factores no verificados de intentos anteriores (Supabase no deja duplicar nombre).
    const { data: lista } = await supabase.auth.mfa.listFactors();
    for (const f of lista?.all ?? []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Leads' });
    if (error) throw error;
    return { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret };
  }, []);

  const confirmarActivacion = useCallback(async (factorId: string, code: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) throw error;
    await refrescar();
  }, [refrescar]);

  const crearClave = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    marcarCookie(false);
    router.push('/auth/sign-in');
  }, [router]);

  const value = useMemo<AuthValue>(() => ({
    user, perfil, aal2, loading, login, tieneTotp, verificarTotp, iniciarActivacion, confirmarActivacion, crearClave, logout,
    puedeEditar: perfil?.rol === 'admin' || perfil?.rol === 'editor',
    esAdmin: perfil?.rol === 'admin',
  }), [user, perfil, aal2, loading, login, tieneTotp, verificarTotp, iniciarActivacion, confirmarActivacion, crearClave, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
