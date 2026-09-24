'use client';
/*
 * FPTecnologi-HUB · Dashboard — HeaderUtils (the shared right-hand utility cluster).
 *
 * 1:1 with partials/header-utils.html: fullscreen, light/dark
 * quick-toggle, app grid, cart, notifications, profile, customizer trigger
 * (items 4–11 of the reference header).
 *
 * WHY THIS EXISTS — the dashboard <Header> and the full-screen <AppBar> render
 * the exact same cluster. The reference extracted it into one partial so the two
 * chromes can never drift; this component is that partial. Never copy these
 * controls into a chrome component — import this instead.
 *
 * Rendered DOM is byte-identical to what Header.tsx used to inline, so pixels
 * and ARIA are unchanged for every dashboard page.
 *
 * RESPONSIVE SHED (02-shell §4.12) — eleven controls do not fit a phone bar, so
 * shell.css §18 hides .ax-lang/.ax-fullscreen/.ax-apps below 992px and
 * .ax-cart/.ax-cog below 768px, and reveals the matching `[data-ax-shed]` rows
 * inside the "More" menu at the end of the run. The rows are STATIC and live in
 * this same component, so they reuse the identical toggleFullscreen /
 * onCustomizer handlers as the bar copies — one behavior, two rendering sites.
 * CSS owns per-row visibility; `useOverflowShed()` only decides whether the
 * trigger exists at all (mirrors `$store.ax.overflow` in the reference).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dropdown } from '../ui/Dropdown';
import { Avatar } from '../ui/Avatar';
import { useCustomizer } from '../../context/CustomizerContext';
import { useOverflowShed } from '../../hooks/useOverflowShed';

const ICON = {
  cog: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M6 4v4" /><path d="M6 12v8" /><path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M12 4v10" /><path d="M12 18v2" /><path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M18 4v1" /><path d="M18 9v11" /></svg>
  ),
  /* the "More" trigger */
  dots: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M11 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M11 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
  ),
  /* leading icons for the shed rows (.ax-dropdown__lead) */
  fullscreenLead: (
    <svg className="ax-icon ax-dropdown__lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /></svg>
  ),
  cogLead: (
    <svg className="ax-icon ax-dropdown__lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M6 4v4" /><path d="M6 12v8" /><path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M12 4v10" /><path d="M12 18v2" /><path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M18 4v1" /><path d="M18 9v11" /></svg>
  ),
};

export function HeaderUtils({ onCustomizer }: { onCustomizer: () => void }) {
  const c = useCustomizer();
  const [full, setFull] = useState(false);
  const shed = useOverflowShed();
  // ponytail: placeholder hasta Task 8 (AuthContext real de Supabase).
  const perfil = null as { rol: string } | null;
  const user = null as { nombre?: string; email?: string; avatarUrl?: string } | null;
  const logout = () => {};
  const roleLabel = perfil?.rol ?? '';

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <>
      {/* 5 · FULLSCREEN */}
      <button
        type="button"
        className="ax-fullscreen ax-icon-btn"
        onClick={toggleFullscreen}
        aria-pressed={full}
        aria-label="Toggle fullscreen"
      >
        {!full ? (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /></svg>
        ) : (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M15 19v-2a2 2 0 0 1 2 -2h2" /><path d="M15 5v2a2 2 0 0 0 2 2h2" /><path d="M5 15h2a2 2 0 0 1 2 2v2" /><path d="M5 9h2a2 2 0 0 0 2 -2v-2" /></svg>
        )}
      </button>

      {/* 6 · LIGHT/DARK QUICK-TOGGLE */}
      <button
        type="button"
        className="ax-theme-toggle ax-icon-btn"
        data-ax-toggle="theme"
        onClick={c.toggleTheme}
        aria-pressed={c.themeResolved === 'dark'}
        aria-label="Toggle dark mode"
      >
        {c.themeResolved === 'dark' ? (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>
        ) : (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008" /></svg>
        )}
      </button>

      {/* 10 · PROFILE */}
      <Dropdown
        className="ax-profile"
        panelClassName="ax-dropdown ax-profile__menu"
        trigger={({ open, triggerProps }) => (
          <button type="button" className="ax-profile__trigger has-meta" aria-label="Account menu" {...triggerProps} aria-expanded={open}>
            <span className="ax-profile__meta" style={{ textAlign: 'right' }}>
              <b>{user?.nombre || user?.email || 'Cuenta'}</b>
              {roleLabel && <small>{roleLabel}</small>}
            </span>
            <Avatar className="ax-avatar ax-profile__avatar" nombre={user?.nombre} email={user?.email} avatarUrl={user?.avatarUrl} size={32} />
          </button>
        )}
      >
        <div className="ax-profile__card">
          <Avatar className="ax-avatar" nombre={user?.nombre} email={user?.email} avatarUrl={user?.avatarUrl} size={40} />
          <span className="ax-profile__card-meta"><b>{user?.nombre || 'Cuenta'}</b><small>{user?.email || ''}</small></span>
        </div>
        <Link className="ax-dropdown__item" role="menuitem" href="/cuenta">Mi cuenta</Link>
        <div className="ax-dropdown__divider" role="separator"></div>
        <button type="button" className="ax-dropdown__item ax-dropdown__item--danger" role="menuitem" onClick={() => logout()} style={{ width: '100%', textAlign: 'start', background: 'none', border: 'none', cursor: 'pointer' }}>Cerrar sesión</button>
      </Dropdown>

      {/* 11 · CUSTOMIZER TRIGGER */}
      <button
        type="button"
        className="ax-cog ax-icon-btn"
        data-ax-toggle="customizer"
        onClick={onCustomizer}
        aria-haspopup="dialog"
        aria-controls="ax-customizer"
        aria-label="Open theme customizer"
      >
        {ICON.cog}
      </button>

      {/* ===== OVERFLOW (mobile / tablet shed) — always LAST in the run ===== */}
      {/* The trigger only exists while a band is actually shedding something;
          the ROWS are always in the tree and shell.css §18 reveals each one at
          the same breakpoint that hides its bar copy, so every control keeps
          exactly one reachable copy. Do not filter the rows in JS. */}
      {shed.length > 0 && (
        <Dropdown
          className="ax-overflow"
          panelClassName="ax-dropdown ax-overflow__menu"
          panelId="ax-overflow-menu"
          trigger={({ open, triggerProps }) => (
            <button type="button" className="ax-icon-btn ax-overflow__trigger" aria-label="More" {...triggerProps} aria-expanded={open}>
              {ICON.dots}
            </button>
          )}
        >
          {({ close }) => (
            <>
              {/* FULLSCREEN (shed < lg) */}
              <button
                type="button"
                className="ax-dropdown__item"
                role="menuitem"
                data-ax-shed="fullscreen"
                onClick={() => {
                  toggleFullscreen();
                  close();
                }}
              >
                {ICON.fullscreenLead}
                <span>{full ? 'Exit fullscreen' : 'Fullscreen'}</span>
              </button>

              {/* CUSTOMIZER (shed < md) */}
              <button
                type="button"
                className="ax-dropdown__item"
                role="menuitem"
                data-ax-shed="customizer"
                onClick={() => {
                  close();
                  onCustomizer();
                }}
              >
                {ICON.cogLead}
                <span>Customize theme</span>
              </button>
            </>
          )}
        </Dropdown>
      )}
    </>
  );
}

export default HeaderUtils;
