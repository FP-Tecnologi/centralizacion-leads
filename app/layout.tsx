/*
 * FPTecnologi-HUB · Dashboard — ROOT layout (App Router).
 *
 * Replicates the reference document <head> contract (BUILD-CONVENTIONS §3):
 *   1. The anti-flash theme-restore IIFE is the FIRST executable thing in
 *      <head>, before any stylesheet — inlined as a raw <script> with
 *      dangerouslySetInnerHTML so the bundler NEVER defers it. It reads
 *      ax:theme / ax:collapsed and sets data-ax-theme / data-ax-collapsed on
 *      <html> before paint. Every other visual choice (shell style, font,
 *      accent) is now FIXED — no personalization UI exists anymore, so there
 *      is nothing else to restore from storage.
 *   2. Google Fonts — Montserrat (sans + display) / JetBrains Mono (code) +
 *      preconnects.
 *   3. The shared --ax-* token core (app.css) imported once below.
 *
 * `suppressHydrationWarning` on <html> is required: the IIFE mutates
 * data-ax-theme/data-ax-collapsed before React hydrates, so the server markup
 * and the post-IIFE DOM intentionally differ on those two — that is the
 * anti-flash design, not a bug. `data-ax-shell-style="detached"` is rendered
 * directly on <html> below (never restored from storage), so there is no
 * flash to guard for it.
 *
 * The whole app is wrapped in <CustomizerProvider> (a client component) so
 * header controls (dark-mode toggle, collapsed rail) share one source of truth.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { CustomizerProvider } from '../src/context/CustomizerContext';
import { AuthProvider } from '../src/context/AuthContext';
import '../src/styles/app.css';

/* The anti-flash IIFE. MUST run before the stylesheet and before React. Kept
   as a string so Next inlines it untouched. Only theme + collapsed remain —
   every other data-ax-* attribute is now fixed (rendered on <html> below or
   not used at all), so there is nothing else to restore before paint. */
const ANTI_FLASH = `
(function () {
  var D = document.documentElement, LS;
  try { LS = window.localStorage; } catch (e) { LS = null; }
  function get(k){ try { return LS && LS.getItem(k); } catch(e){ return null; } }

  /* schema guard: wipe unknown shape, never throw */
  try { if (LS && get('ax:schema') && get('ax:schema') !== '1') {
    Object.keys(LS).forEach(function(k){ if (k.indexOf('ax:')===0) LS.removeItem(k); });
  } if (LS) LS.setItem('ax:schema','1'); } catch(e){}

  /* ---- THEME (light | dark | system) ---- */
  var theme = get('ax:theme') || 'system';
  var sysDark = false;
  try { sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch(e){}
  var resolved = (theme === 'system') ? (sysDark ? 'dark' : 'light') : theme;
  D.setAttribute('data-ax-theme', resolved);

  /* ---- COLLAPSED RAIL (sidebar header toggle; default expanded) ---- */
  if (get('ax:collapsed') === '1') D.setAttribute('data-ax-collapsed', '');
  else D.removeAttribute('data-ax-collapsed');
})();
`;

export const metadata: Metadata = {
  // `default` covers routes that supply no title of their own; `template` wraps
  // the bare page name each route exports via metadataForSlug().
  title: {
    default: 'Sistema de Centralización de Leads',
    template: '%s · Centralización de Leads',
  },
  description:
    'Sistema de Leads de FPTecnologi: landings, importación, dashboard y conexiones.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0C11' },
    { media: '(prefers-color-scheme: light)', color: '#FCFBF9' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning data-ax-shell-style="detached">
      <head>
        {/* Anti-flash theme-restore — FIRST in <head>, before app.css. */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
        {/* Google Fonts — Montserrat (sans + display) · JetBrains Mono (mono) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <CustomizerProvider>{children}</CustomizerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
