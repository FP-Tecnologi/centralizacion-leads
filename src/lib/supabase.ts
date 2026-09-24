import { createClient } from '@supabase/supabase-js';
import { createAuthStorage } from './authStorage';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');

// "Recordarme": storage combinado local/sesión, ver src/lib/authStorage.ts.
// undefined en SSR (Next evalúa este módulo también en el server) — el SDK
// cae a su storage por defecto ahí, donde no persiste nada de todos modos.
const storage = typeof window === 'undefined' ? undefined : createAuthStorage(window.localStorage, window.sessionStorage);

export const supabase = createClient(url, anon, { auth: { storage } });
