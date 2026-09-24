'use client';
/*
 * Sistema de Leads — shared auth helpers (non-route), portado de apps/web.
 *
 * El área de auth es un set de páginas STANDALONE (sin app shell): layout
 * "cover" (split 52/48 — panel de marca + formulario), a diferencia del HUB
 * que usa el layout "basic" centrado — así el login de Leads se distingue a
 * simple vista del HUB. El loader de página y el glow ambiental los pone el
 * layout (bare); el toggle de tema fijo arriba a la derecha y el panel de
 * marca viven aquí.
 *
 * Sin login social (Task 8 no lo pide) — a diferencia de apps/web, aquí no
 * hay lib/api.ts ni flujo de Google.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export const SYSTEM_NAME = 'Sistema de Centralización de Leads';
export const SYSTEM_SUBTITLE = 'FPTecnologi · Gestión unificada de leads de landings, importaciones y apps offline';

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

/*
 * Breakpoints del panel de marca (mobile-first):
 * <768: banda compacta arriba (clamp 180–220px) con logo + título centrados,
 *   formulario debajo a todo el ancho. 768–1199: panel lateral angosto
 *   (~40%). >=1200: panel lateral ~50/50. El fondo (imagen + overlay) y el
 *   texto van siempre, solo cambia el tamaño del panel.
 */
const COVER_STYLE = `
.ax-auth-cover__panel { min-block-size: clamp(180px, 26vw, 220px); }
@media (min-width: 768px) {
  .ax-auth-cover { grid-template-columns: 40% 60% !important; grid-template-rows: 1fr !important; }
  .ax-auth-cover__panel { min-block-size: 100% !important; border-inline-end: 1px solid rgba(255,255,255,.08); }
}
@media (min-width: 1200px) {
  .ax-auth-cover { grid-template-columns: 50% 50% !important; }
}
@media (min-width: 640px) {
  .ax-auth-cover__main { padding: var(--ax-space-8) var(--ax-space-6) !important; }
}
`;

/**
 * Panel de marca del layout cover: imagen de fondo (centralización de
 * datos) con overlay navy + logo/título/subtítulo centrados horizontal y
 * verticalmente. El fondo es puramente decorativo (CSS background, sin
 * <img>/alt) — el texto NO lleva aria-hidden, es contenido real de la
 * página (a diferencia de la versión anterior que ocultaba todo el panel).
 */
function AuthCoverPanel() {
  return (
    <aside className="ax-auth-cover__panel"
      style={{
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        backgroundImage: 'linear-gradient(165deg, rgba(7,13,24,.78) 0%, rgba(7,13,24,.72) 100%), url(/images/auth/centralizacion.svg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
      <div style={{ margin: 'auto', padding: 'var(--ax-space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--ax-space-4)', maxInlineSize: '32ch' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-fptecnologi.svg" alt="FPTecnologi" width={150} style={{ height: 'auto', filter: 'brightness(0) invert(1)' }} />
        <div>
          <p style={{ margin: 0, fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', lineHeight: 1.3, fontWeight: 'var(--ax-weight-semibold)', color: '#fff', letterSpacing: '-.015em' }}>{SYSTEM_NAME}</p>
          <p style={{ margin: 'var(--ax-space-3) 0 0', fontSize: 'var(--ax-text-sm)', lineHeight: 1.5, color: 'rgba(255,255,255,.78)' }}>{SYSTEM_SUBTITLE}</p>
        </div>
      </div>
    </aside>
  );
}

/**
 * Shell del layout cover: split 52/48 (panel de marca + panel de formulario).
 * Cada pantalla de auth le pasa su tarjeta/formulario como children.
 */
export function AuthCoverShell({ children }: { children: ReactNode }) {
  return (
    <AuthStandalone cover>
      <style>{COVER_STYLE}</style>
      <div className="ax-auth-cover" style={{ position: 'relative', zIndex: 1, minBlockSize: '100dvh', display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: 'auto 1fr' }}>
        <AuthCoverPanel />
        <main className="ax-center ax-auth-cover__main" id="ax-main" style={{ position: 'relative', padding: 'var(--ax-space-6) var(--ax-space-4)' }}>
          <OffappTools style={{ position: 'absolute', insetBlockStart: 'var(--ax-space-5)', insetInlineEnd: 'var(--ax-space-5)' }} />
          {/* La marca (logo + título) ya la lleva el panel, visible en todos los anchos — no se repite aquí. */}
          <div style={{ inlineSize: '100%', maxInlineSize: 440, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-6)' }}>
            {children}
          </div>
        </main>
      </div>
    </AuthStandalone>
  );
}

/**
 * Standalone page wrapper: sets <body class="ax-standalone"> while mounted
 * (layout centrado) — `cover` usa margin:0 en su lugar (igual que apps/web).
 * El loader de página y el glow ambiental los pone el layout (bare), no se
 * repiten aquí.
 */
export function AuthStandalone({ cover = false, children }: { cover?: boolean; children: ReactNode }) {
  useEffect(() => {
    const b = document.body;
    const had = b.className;
    if (cover) {
      b.style.margin = '0';
    } else {
      b.classList.add('ax-standalone');
    }
    return () => {
      b.className = had;
      b.style.margin = '';
    };
  }, [cover]);
  return <>{children}</>;
}

/* Password reveal eye icons. */
export const EYE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>
);
export const EYE_OFF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" /><path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" /><path d="M3 3l18 18" /></svg>
);
