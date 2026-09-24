'use client';
/*
 * Sistema de Leads — shared auth helpers (non-route), portado de apps/web.
 *
 * El área de auth es un set de páginas STANDALONE (sin app shell). Cada
 * página es una pantalla full-viewport con: el loader de página, el glow
 * ambiental (ambos ya los pone el layout (bare)), el toggle de tema fijo
 * arriba a la derecha, y una marca de marca.
 *
 * Sin login social (Task 8 no lo pide) — a diferencia de apps/web, aquí no
 * hay lib/api.ts ni flujo de Google.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';

const SUN = (
  <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={22} height={22} aria-hidden="true"><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>
);
const MOON = (
  <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={22} height={22} aria-hidden="true"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008" /></svg>
);

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-ax-theme') === 'dark' ? 'dark' : 'light');
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-ax-theme', next);
    try {
      localStorage.setItem('ax:theme', next);
    } catch {
      /* ignore */
    }
    document.dispatchEvent(new CustomEvent('ax:change'));
  };
  return { theme, toggle };
}

/** Off-app tools: theme icon-btn (todas las pantallas de auth). */
export function OffappTools({ style }: { style?: CSSProperties }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', ...style }}>
      <button type="button" className="ax-icon-btn" onClick={toggle} aria-pressed={theme === 'dark'} aria-label="Toggle dark mode">
        {theme === 'dark' ? SUN : MOON}
      </button>
    </div>
  );
}

/** Centered brand lockup. */
export function BrandCentered({ logoWidth = 190 }: { logoWidth?: number }) {
  return (
    <Link href="/" className="ax-center" aria-label="FPTecnologi home" style={{ textDecoration: 'none', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-fptecnologi.svg" alt="FPTecnologi" width={logoWidth} style={{ height: 'auto' }} />
    </Link>
  );
}

/**
 * Standalone page wrapper: sets <body class="ax-standalone"> while mounted.
 * El loader de página + el glow ambiental los pone el layout (bare), no se
 * repiten aquí.
 */
export function AuthStandalone({ children }: { children: ReactNode }) {
  useEffect(() => {
    const b = document.body;
    const had = b.className;
    b.classList.add('ax-standalone');
    return () => {
      b.className = had;
    };
  }, []);
  return <>{children}</>;
}

/* Password reveal eye icons. */
export const EYE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>
);
export const EYE_OFF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" /><path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" /><path d="M3 3l18 18" /></svg>
);
