/*
 * FPTecnologi-HUB · Dashboard — runtime theme logic (the pure DOM+storage layer).
 *
 * The visual style is fixed (detached shell, Montserrat, azul-logo accent) —
 * there is no personalization UI anymore, so this module only owns what is
 * still user-controlled: light/dark mode and the collapsed sidebar rail.
 * Every mutation sets a data-ax-* attribute on <html>, persists/clears the
 * matching ax: localStorage key, and dispatches `ax:change` so listeners
 * (CustomizerContext) can re-sync.
 *
 * SSR note (the ONLY divergence from the React edition): `document` does not
 * exist while Next renders on the server, so the document-element reference is
 * resolved lazily through `D` (a no-op stub on the server). Every exported
 * mutator here is only ever called from client effects / event handlers after
 * hydration, so the stub is never actually exercised — it merely keeps the
 * module import-safe in the RSC/SSR pass.
 */

import * as store from './storage';

/* Lazy, SSR-safe handle to <html>. On the server `document` is undefined, so we
   hand back an inert stub whose attribute/style ops do nothing; in the browser
   it is the real documentElement. */
const SERVER_STUB = {
  getAttribute: () => null,
  setAttribute: () => {},
  removeAttribute: () => {},
  hasAttribute: () => false,
} as unknown as HTMLElement;
const D: HTMLElement =
  typeof document !== 'undefined' ? document.documentElement : SERVER_STUB;
const PREFIX = store.PREFIX;

export function emitChange(reason: string): void {
  document.dispatchEvent(new CustomEvent('ax:change', { detail: { reason } }));
}

/* ── system theme ── */
function systemDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}
export function resolveTheme(theme?: string): 'light' | 'dark' {
  const t = theme || store.get(PREFIX + 'theme') || 'system';
  return t === 'system' ? (systemDark() ? 'dark' : 'light') : (t as 'light' | 'dark');
}

/* ── theme / mode ── */
export function setMode(m: string): string {
  if (m === 'system') {
    store.set('ax:theme', 'system');
    D.setAttribute('data-ax-theme', resolveTheme('system'));
    listenSystem();
  } else {
    store.set('ax:theme', m);
    D.setAttribute('data-ax-theme', m);
  }
  emitChange('theme');
  document.dispatchEvent(new CustomEvent('ax-theme-change', { detail: { theme: m } }));
  return m;
}
/** Header quick-toggle: flip light↔dark only (never system). */
export function quickToggleTheme(): string {
  const cur = D.getAttribute('data-ax-theme') === 'dark' ? 'dark' : 'light';
  return setMode(cur === 'dark' ? 'light' : 'dark');
}

/* ── collapsed rail (header toggle) ── */
export function isCollapsed(): boolean {
  return D.hasAttribute('data-ax-collapsed');
}
export function toggleCollapsed(): boolean {
  const next = !isCollapsed();
  if (next) {
    D.setAttribute('data-ax-collapsed', '');
    store.set('ax:collapsed', '1');
  } else {
    D.removeAttribute('data-ax-collapsed');
    store.remove('ax:collapsed');
  }
  emitChange('collapsed');
  return next;
}

/** Read the current resolved value of theme/mode (the only registry left). */
export function currentValueOf(name: string): string {
  if (name === 'theme' || name === 'mode') return store.get('ax:theme') || 'system';
  return '';
}

/* ── live system listener (only mutates while pref === 'system') ── */
let _mql: MediaQueryList | null = null;
export function listenSystem(): void {
  if (_mql) return;
  try {
    _mql = window.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return;
  }
  const onChange = (e: MediaQueryListEvent) => {
    const pref = store.get(PREFIX + 'theme') || 'system';
    if (pref !== 'system') return;
    const resolved = e.matches ? 'dark' : 'light';
    D.setAttribute('data-ax-theme', resolved);
    emitChange('system-theme');
    document.dispatchEvent(new CustomEvent('ax-theme-change'));
  };
  if (_mql.addEventListener) _mql.addEventListener('change', onChange);
}
