'use client';
/*
 * FPTecnologi-HUB · Dashboard — theme state provider.
 *
 * The visual style is fixed (detached shell, Montserrat, azul-logo accent) —
 * there is no personalization UI anymore. This provider only carries what is
 * still user-controlled: light/dark mode (the header's quick-toggle) and the
 * collapsed sidebar rail. It mirrors the current <html> data-ax-theme /
 * data-ax-collapsed attributes into React state; the anti-flash IIFE in
 * app/layout.tsx <head> has already painted the correct first frame, so this
 * provider re-reads it AFTER mount (useEffect) to keep server/client render in
 * sync, then stays in sync on every ax:change.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as theme from '../lib/theme';

export interface CustomizerState {
  themeResolved: string; // light | dark (actual painted)
  collapsed: boolean;
}

export interface CustomizerApi extends CustomizerState {
  toggleTheme: () => void;
  toggleCollapsed: () => void;
}

/* Deterministic state for the server/first-client render. The anti-flash IIFE
   has already set the correct <html> attributes before paint, but React must
   render the SAME tree on server and on first client pass to avoid a hydration
   mismatch — so we start from canonical defaults and re-`read()` the real DOM in
   a mount effect (see CustomizerProvider). */
const SSR_STATE: CustomizerState = {
  themeResolved: 'light',
  collapsed: false,
};

function read(): CustomizerState {
  if (typeof document === 'undefined') return SSR_STATE;
  const D = document.documentElement;
  return {
    themeResolved: D.getAttribute('data-ax-theme') === 'dark' ? 'dark' : 'light',
    collapsed: theme.isCollapsed(),
  };
}

const Ctx = createContext<CustomizerApi | null>(null);

export function CustomizerProvider({ children }: { children: ReactNode }) {
  // Start from the SSR-safe default so server and first-client render match,
  // then read the real <html> attributes (set by the anti-flash IIFE) on mount.
  const [state, setState] = useState<CustomizerState>(SSR_STATE);
  const sync = useCallback(() => setState(read()), []);

  useEffect(() => {
    sync();
    theme.listenSystem();
    const onChange = () => sync();
    document.addEventListener('ax:change', onChange);
    return () => document.removeEventListener('ax:change', onChange);
  }, [sync]);

  const api = useMemo<CustomizerApi>(
    () => ({
      ...state,
      toggleTheme: () => {
        theme.quickToggleTheme();
        sync();
      },
      toggleCollapsed: () => {
        theme.toggleCollapsed();
        sync();
      },
    }),
    [state, sync],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCustomizer(): CustomizerApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCustomizer must be used within CustomizerProvider');
  return ctx;
}
