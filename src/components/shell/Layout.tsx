'use client';
/*
 * FPTecnologi-HUB · Dashboard — application shell layout (client component).
 *
 * Reproduces the reference body structure (index.html): page loader, ambient
 * glow, .ax-layout → Sidebar + .ax-shell (Header + <main>{children} + Footer),
 * then the Customizer drawer + Command palette overlays.
 *
 * In the App Router the routed page arrives as `children` (not a router
 * <Outlet/>): app/(shell)/layout.tsx renders <Layout>{children}</Layout>, so
 * every route under the (shell) group is wrapped in this chrome. The active
 * route is read from usePathname() to keep <html data-ax-route> in sync (used by
 * the anti-flash IIFE + breadcrumb/active-trail resolution).
 *
 * MOBILE DRAWER (< md) -- below 768px base.css §10 turns .ax-sidebar into an
 * off-canvas drawer that only slides in while <html data-ax-drawer="open">. The
 * state lives here, in the component that owns .ax-layout, because the SCRIM has
 * to be a SIBLING OF .ax-sidebar: .ax-layout is `isolation:isolate`, so the
 * sidebar's z-index is scoped to that context and a scrim parked on <body> would
 * compare against .ax-layout itself and paint ABOVE the open drawer — dimming it
 * and swallowing every tap on the menu. Same parent ⇒ 900 (scrim) < 1100 (drawer).
 * The scrim stays MOUNTED and toggles `.is-visible`; base.css gives
 * `.ax-backdrop[data-ax-drawer-scrim]` a hidden resting state so it can fade, and
 * the attribute (never the bare .ax-backdrop class) is what distinguishes it from
 * the scrims content pages paint for themselves.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { Loader } from './Loader';
import { Customizer } from './Customizer';
import { CommandPalette } from './CommandPalette';
import { slugFromPath } from '../../lib/manifest';
import { useCustomizer } from '../../context/CustomizerContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const c = useCustomizer();
  const [commandOpen, setCommandOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767.98px)');

  // Keep <html data-ax-route> aligned with the active route.
  useEffect(() => {
    document.documentElement.setAttribute('data-ax-route', slugFromPath(pathname));
  }, [pathname]);

  // Global ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Growing past the drawer band (rotate a phone, drag a desktop window) hands
  // the sidebar back to the docked layout — the open STATE is ours, and without
  // this it would survive: the attribute, the body scroll-lock and the scrim all
  // staying put beside a sidebar that is no longer a drawer.
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  // Route changes close it too — tapping a nav link is a navigation, not a
  // reason to keep the menu covering the page you just asked for.
  useEffect(() => setDrawerOpen(false), [pathname]);

  // The runtime contract: <html data-ax-drawer="open"> + the body scroll-lock.
  useEffect(() => {
    const D = document.documentElement;
    if (drawerOpen) {
      D.setAttribute('data-ax-drawer', 'open');
      document.body.style.overflow = 'hidden';
    } else {
      D.removeAttribute('data-ax-drawer');
      document.body.style.overflow = '';
    }
    return () => {
      D.removeAttribute('data-ax-drawer');
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // The burger: on a phone it opens the drawer, otherwise it collapses the rail
  // (the reference's axHeader.toggleSidebar()).
  const onNavToggle = () => {
    if (isMobile) setDrawerOpen(true);
    else c.toggleCollapsed();
  };

  return (
    <>
      <Loader />
      <div className="ax-ambient" aria-hidden="true"><i></i></div>
      <div className="ax-layout">
        <Sidebar drawerOpen={drawerOpen} onNavToggle={onNavToggle} />
        <div
          className={`ax-backdrop${drawerOpen ? ' is-visible' : ''}`}
          data-ax-drawer-scrim
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        ></div>
        <div className="ax-shell">
          <Header
            onCommand={() => setCommandOpen(true)}
            onCustomizer={() => setCustomizerOpen(true)}
            onNavToggle={onNavToggle}
          />
          <main className="ax-main" id="ax-main">
            {children}
          </main>
          <Footer />
        </div>
      </div>
      <Customizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onCustomizer={() => setCustomizerOpen(true)}
      />
    </>
  );
}

export default Layout;
