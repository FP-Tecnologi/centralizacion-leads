/*
 * Sistema de Leads — adaptador de storage para "Recordarme" en el login.
 *
 * Supabase guarda la sesión en un solo storage fijo (localStorage por
 * defecto). Para que "Recordarme" desmarcado limite la sesión al browser
 * tab, envolvemos localStorage/sessionStorage detrás de un flag
 * `ax:recordar` en localStorage: '0' → usar sessionStorage, cualquier otro
 * valor (o ausente) → localStorage (comportamiento actual, recordar=true
 * por defecto). Todo acceso va envuelto en try/catch (Safari privado, SSR,
 * storage bloqueado por política no deben tirar la app).
 *
 * Factorizado como función pura sobre `StorageLike` (no `window.*`
 * directamente) para poder testear con storages falsos sin jsdom.
 */

export const RECORDAR_FLAG = 'ax:recordar';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Storage combinado: lee/escribe en localStorage o sessionStorage según el flag `ax:recordar`. */
export function createAuthStorage(local: StorageLike, session: StorageLike): StorageLike {
  function backing(): StorageLike {
    try {
      return local.getItem(RECORDAR_FLAG) === '0' ? session : local;
    } catch {
      return local;
    }
  }
  return {
    getItem(key) {
      try {
        return backing().getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        backing().setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    removeItem(key) {
      try {
        backing().removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

/** Borra cualquier token de sesión de Supabase (`sb-*-auth-token`) del storage dado. */
function clearAuthKeys(store: StorageLike & { length?: number; key?(i: number): string | null }) {
  try {
    const keys: string[] = [];
    const len = store.length ?? 0;
    for (let i = 0; i < len; i++) {
      const k = store.key?.(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) keys.push(k);
    }
    keys.forEach((k) => store.removeItem(k));
  } catch {
    /* ignore */
  }
}

/**
 * Fija la preferencia "Recordarme" ANTES de iniciar sesión y limpia el token
 * de sesión que pudiera haber quedado en el storage que se deja de usar, para
 * que no sobreviva una sesión "fantasma" en el storage contrario.
 */
export function setRecordar(
  local: StorageLike & { length?: number; key?(i: number): string | null },
  session: StorageLike & { length?: number; key?(i: number): string | null },
  recordar: boolean,
) {
  try {
    if (recordar) {
      local.removeItem(RECORDAR_FLAG);
      clearAuthKeys(session);
    } else {
      local.setItem(RECORDAR_FLAG, '0');
      clearAuthKeys(local);
    }
  } catch {
    /* ignore */
  }
}
