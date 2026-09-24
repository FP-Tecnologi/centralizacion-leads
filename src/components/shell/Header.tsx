'use client';
/*
 * FPTecnologi-HUB · Dashboard — Header (dashboard top bar).
 *
 * Faithful re-expression of partials/header.html: sidebar toggle + ⌘K command
 * search, then the SHARED right-hand utility cluster (<HeaderUtils>) — language
 * menu, fullscreen, light/dark quick-toggle, app grid, cart, notifications,
 * profile, customizer trigger.
 *
 * The cluster lives in HeaderUtils.tsx because the full-screen <AppBar> renders
 * the identical controls; the reference extracted the same items into
 * partials/header-utils.html so the two chromes can never drift. Do NOT inline
 * those controls here again.
 */
import { HeaderUtils } from './HeaderUtils';
import { useCustomizer } from '../../context/CustomizerContext';

const ICON = {
  burger: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" /></svg>
  ),
  search: (
    <svg className="ax-icon ax-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
  ),
};

export function Header({
  onCommand,
  onCustomizer,
  onNavToggle,
}: {
  onCommand: () => void;
  onCustomizer: () => void;
  /** Burger handler — <Layout/> routes it to the mobile drawer or the rail
   *  collapse depending on the band, exactly like axHeader.toggleSidebar(). */
  onNavToggle: () => void;
}) {
  const c = useCustomizer();

  return (
    <header className="ax-header" role="banner">
      {/* 1 · SIDEBAR TOGGLE */}
      <button
        type="button"
        className="ax-nav-toggle ax-icon-btn"
        onClick={onNavToggle}
        aria-label="Toggle menu"
        aria-expanded={!c.collapsed}
      >
        {ICON.burger}
      </button>

      {/* 2 · COMMAND SEARCH (⌘K) */}
      <button
        type="button"
        className="ax-search"
        onClick={onCommand}
        aria-haspopup="dialog"
        aria-controls="ax-command"
        aria-label="Buscar o ir a"
      >
        {ICON.search}
        <span className="ax-search__placeholder">Buscar o ir a…</span>
        <kbd className="ax-search__keycap">⌘K</kbd>
      </button>

      <span className="ax-header__spacer"></span>

      {/* ===== RIGHT UTILITY CLUSTER — shared with <AppBar> (items 4–11) ===== */}
      <HeaderUtils onCustomizer={onCustomizer} />
    </header>
  );
}

export default Header;
