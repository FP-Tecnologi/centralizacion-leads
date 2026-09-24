'use client';
/*
 * FPTecnologi-HUB · Dashboard — full-screen APP BAR (1:1 with partials/app-bar.html).
 *
 * The only chrome the 13 standalone app routes (apps/**) get: brand (which
 * doubles as the way out, back to the dashboard), an app switcher, the ⌘K
 * search trigger, then the SHARED right-hand utility cluster (<HeaderUtils>) —
 * exactly the same controls the dashboard <Header> renders.
 *
 * Carries .ax-appbar (NOT .ax-header) on purpose: base.css moves .ax-header
 * around for six shell styles / nav modes / header positions and those
 * attributes persist on <html> from localStorage, so an app page would inherit
 * a floating, sidebar-offset bar. schemes.css widens its selectors to
 * :is(.ax-header, .ax-appbar) so the chosen header SCHEME still applies to both.
 *
 * The current app row is resolved from the ROUTER (usePathname → manifest slug),
 * not by poking the DOM the way the Alpine reference does; the resulting markup
 * is identical — `is-active` + aria-current="page" — which is what
 * appshell.css styles.
 */
import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeaderUtils } from './HeaderUtils';
import { useClickOutside } from '../../hooks/useClickOutside';
import { slugFromPath, hrefForSlug } from '../../lib/manifest';
import { titleForSlug } from '../../lib/pageMetadata';

/* ── Iconos de la barra: salir, caret del switcher y lupa de búsqueda ── */

const ICON_EXIT = (
  <svg className="ax-icon ax-appbar__exit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M9 6l-6 6l6 6" /><path d="M21 12h-18" /></svg>
);
const ICON_CARET = (
  <svg className="ax-icon ax-appswitch__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>
);
const ICON_SEARCH = (
  <svg className="ax-icon ax-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
);

/* Switcher rows — SVG path data copied verbatim from partials/app-bar.html. */
function appIcon(children: ReactNode) {
  return (
    <svg className="ax-icon ax-appswitch__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true">{children}</svg>
  );
}

interface AppRow {
  slug: string;
  label: string;
  icon: ReactNode;
  count?: string;
}

const APPS: AppRow[] = [
  { slug: 'apps/email', label: 'Email', count: '6', icon: appIcon(<><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" /><path d="M3 7l9 6l9 -6" /></>) },
  { slug: 'apps/chat', label: 'Chat', count: '4', icon: appIcon(<path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1" />) },
  { slug: 'apps/calendar', label: 'Calendar', icon: appIcon(<><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M11 15h1" /><path d="M12 15v3" /></>) },
  { slug: 'apps/kanban', label: 'Kanban Board', icon: appIcon(<><path d="M4 4l6 0" /><path d="M14 4l6 0" /><path d="M4 10a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -8" /><path d="M14 10a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -2" /></>) },
  { slug: 'apps/todo', label: 'To-Do', icon: appIcon(<><path d="M9 11l3 3l8 -8" /><path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9" /></>) },
  { slug: 'apps/tasks', label: 'Task List View', icon: appIcon(<><path d="M11 6l9 0" /><path d="M11 12l9 0" /><path d="M11 18l9 0" /><path d="M4 6l1 1l2 -2" /><path d="M4 12l1 1l2 -2" /><path d="M4 18l1 1l2 -2" /></>) },
  { slug: 'apps/file-manager', label: 'File Manager', icon: appIcon(<path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />) },
  { slug: 'apps/gallery', label: 'Gallery', icon: appIcon(<><path d="M15 8h.01" /><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12" /><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5" /><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3" /></>) },
  { slug: 'apps/contacts', label: 'Contacts', icon: appIcon(<><path d="M20 6v12a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2" /><path d="M10 16h6" /><path d="M11 11a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M4 8h3" /><path d="M4 12h3" /><path d="M4 16h3" /></>) },
  { slug: 'apps/notes', label: 'Notes', icon: appIcon(<><path d="M5 5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -14" /><path d="M9 7l6 0" /><path d="M9 11l6 0" /><path d="M9 15l4 0" /></>) },
  { slug: 'apps/media-player', label: 'Media Player', icon: appIcon(<path d="M7 4v16l13 -8z" />) },
];

const MAIL_APPS: AppRow[] = [
  { slug: 'apps/email-compose', label: 'Compose', icon: appIcon(<><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></>) },
  { slug: 'apps/email-settings', label: 'Email Settings', icon: appIcon(<><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /></>) },
];

/** Dashboard root — the same "/" route the sidebar brand links to. */
const DASHBOARD_ROOT = '/';

export function AppBar({
  onCommand,
  onCustomizer,
}: {
  onCommand: () => void;
  onCustomizer: () => void;
}) {
  const slug = slugFromPath(usePathname() || '/');
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useClickOutside(wrap, open, () => setOpen(false));

  /* Trigger label = the manifest title for this route — the same lookup the
     <title>/breadcrumb use, so acronym casing can never drift. */
  const title = titleForSlug(slug) ?? '';

  const row = (a: AppRow) => {
    const active = a.slug === slug;
    return (
      <Link
        key={a.slug}
        className={`ax-appswitch__item${active ? ' is-active' : ''}`}
        role="menuitem"
        data-ax-app={a.slug}
        href={hrefForSlug(a.slug)}
        aria-current={active ? 'page' : undefined}
        onClick={() => setOpen(false)}
      >
        {a.icon}
        <span className="ax-appswitch__label">{a.label}</span>
        {a.count && <span className="ax-badge ax-badge--accent ax-badge--count">{a.count}</span>}
      </Link>
    );
  };

  return (
    <header className="ax-appbar" role="banner">
      {/* 1 · BRAND — the way out of the app, back to the dashboard */}
      <Link className="ax-appbar__brand" href={DASHBOARD_ROOT} aria-label="Exit to dashboard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-fptecnologi.svg" alt="FPTecnologi" width={130} style={{ height: 'auto', maxWidth: '100%' }} />
        {ICON_EXIT}
      </Link>

      <span className="ax-appbar__divider" aria-hidden="true"></span>

      {/* 2 · APP SWITCHER — current app name + jump to any other app */}
      <div className="ax-appswitch" ref={wrap}>
        <button
          type="button"
          className="ax-appswitch__trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="ax-appswitch-menu"
        >
          <span className="ax-appswitch__name">{title}</span>
          {ICON_CARET}
        </button>

        {open && (
          <div id="ax-appswitch-menu" className="ax-dropdown ax-appswitch__menu" role="menu">
            <p className="ax-dropdown__head">Switch app</p>

            {APPS.map(row)}

            <div className="ax-dropdown__divider" role="separator"></div>
            <p className="ax-dropdown__head">Mail</p>

            {MAIL_APPS.map(row)}

            <Link className="ax-dropdown__foot" href={DASHBOARD_ROOT} onClick={() => setOpen(false)}>Back to dashboard</Link>
          </div>
        )}
      </div>

      {/* 3 · COMMAND SEARCH (⌘K trigger) — same control as the regular header */}
      <button
        type="button"
        className="ax-search ax-search--app"
        onClick={onCommand}
        aria-haspopup="dialog"
        aria-controls="ax-command"
        aria-label="Search or jump to"
      >
        {ICON_SEARCH}
        <span className="ax-search__placeholder">Search or jump to…</span>
        <kbd className="ax-search__keycap">⌘K</kbd>
      </button>

      <span className="ax-header__spacer"></span>

      {/* ===== RIGHT UTILITY CLUSTER — shared with <Header> (items 4–11) ===== */}
      <HeaderUtils onCustomizer={onCustomizer} />
    </header>
  );
}

export default AppBar;
