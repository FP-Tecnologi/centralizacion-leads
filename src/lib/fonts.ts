/*
 * FPTecnologi-HUB — customizer FONT control: Google Fonts catalog search + on-demand load.
 *
 * The template ships one designed pairing (Inter body + Space Grotesk display,
 * requested statically in app/layout.tsx <head>). The customizer can swap the
 * whole UI face to ANY Google family without a default page load paying for it:
 *
 *   - loadCatalog() ........... lazy-import the 1,820-family snapshot
 *   - searchCatalog(q) ........ offline search over it (no API key, ever)
 *   - applyFont(...) .......... point <html> at a family + fetch exactly it
 *   - ensureSearchPreviews() .. one request so search hits self-specimen
 *
 * There is deliberately NO curated shortlist. A chosen family reaches the CSS as
 * `data-ax-font="custom"` plus an INLINE --ax-font-sans on <html> — exactly the
 * mechanism the custom accent colour already uses. 1,820 families cannot be
 * enumerated as static CSS, and inline outranks everything, so returning to the
 * default has to clear the inline property again (applyFont does).
 *
 * The blocking anti-flash script in app/layout.tsx carries a minimal copy of the
 * same logic so the persisted family is in flight before first paint rather than
 * after React hydrates.
 *
 * Direct TS port of src/js/core/fonts.js — framework-free (touches only
 * `document` and a dynamic import), so it stays byte-comparable to the reference.
 * Every exported mutator is only ever called from client effects / handlers, but
 * `document` is guarded so the module stays import-safe in the RSC/SSR pass.
 */

import type { FontRecord } from '../data/google-fonts';

const GF = 'https://fonts.googleapis.com/css2?';
const LINK_ID = 'ax-font-link';
const SEARCH_LINK_ID = 'ax-font-search-link';

/** The weight ramp the components actually use. */
export const UI_WEIGHTS = [400, 500, 600, 700];
/** Weight query for a family carrying the full ramp. */
export const UI_WEIGHT_QUERY = `:wght@${UI_WEIGHTS.join(';')}`;
/** What a chosen family falls back to while its webfont is still in flight. */
export const FALLBACK_STACK = 'ui-sans-serif, system-ui, sans-serif';

/** Registry value of the shipped pairing — no attribute, no extra request. */
export const DEFAULT_FONT = 'inter';
/** Family name behind that value (the root layout already requests it). */
export const DEFAULT_FAMILY = 'Inter';
/** Registry value meaning "a family picked from the catalog" (see header). */
export const CUSTOM_FONT = 'custom';

const urlName = (family: string): string => family.trim().replace(/\s+/g, '+');

/**
 * True for the shipped default. Picking Inter out of the search results has to
 * land back on the default path — the same face, minus a redundant <link> and a
 * pointless inline override.
 */
export function isDefaultFamily(family?: string | null): boolean {
  return String(family || '').trim().toLowerCase() === DEFAULT_FAMILY.toLowerCase();
}

/**
 * `:wght@…` fragment for the weights a family actually ships, narrowed to the
 * ramp the UI uses. A family carrying none of them (Buda, 300 only) asks for
 * everything it does have, so the request is never empty and never invalid.
 */
export function weightQuery(weights?: number[]): string {
  if (!Array.isArray(weights) || !weights.length) return UI_WEIGHT_QUERY;
  const have = UI_WEIGHTS.filter((w) => weights.includes(w));
  return `:wght@${(have.length ? have : weights).join(';')}`;
}

/** css2 href for one family (null for a blank family). */
export function hrefFor(family?: string | null, weightFrag?: string | null): string | null {
  if (!family) return null;
  const frag = weightFrag == null ? UI_WEIGHT_QUERY : weightFrag;
  return `${GF}family=${urlName(family)}${frag}&display=swap`;
}

/** Create / repoint / remove a <link> by id. `href === null` removes it. */
function ensureLink(id: string, href: string | null): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(id);
  if (!href) {
    if (existing) existing.remove();
    return;
  }
  if (existing) {
    if (existing.getAttribute('href') !== href) existing.setAttribute('href', href);
    return;
  }
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Put <html> on `family` — the non-attribute half of the job (the data-ax-font
 * attribute itself is written by the customizer registry / theme restore, like
 * every other control). Sets or clears the inline --ax-font-sans, and points
 * <link id="ax-font-link"> at exactly the family in use. The default drops both,
 * so Reset leaves no orphan request behind. Idempotent.
 */
export function applyFont(value: string, family?: string | null, weightFrag?: string | null): void {
  if (typeof document === 'undefined') return;
  const D = document.documentElement;
  if (value === CUSTOM_FONT && family && !isDefaultFamily(family)) {
    D.style.setProperty('--ax-font-sans', `"${family}", ${FALLBACK_STACK}`);
    ensureLink(LINK_ID, hrefFor(family, weightFrag));
    return;
  }
  // Default: the :root token owns the family, so a leftover inline property
  // (which outranks it) has to go — and the injected <link> with it, since
  // the root layout requests Inter statically.
  D.style.removeProperty('--ax-font-sans');
  ensureLink(LINK_ID, null);
}

/* ---------------- catalog (lazy) ---------------- */

let _catalog: FontRecord[] | null = null;
let _loading: Promise<FontRecord[]> | null = null;

/**
 * Fetch + parse the family snapshot, once. The bundler code-splits the dynamic
 * import, so this is the only thing that ever pulls those ~12 KB over the wire —
 * and only when someone actually opens the font search. Resolves to [] if the
 * chunk cannot be loaded (offline preview, blocked asset), which degrades the
 * search to "no results" instead of throwing inside a click handler.
 */
export function loadCatalog(): Promise<FontRecord[]> {
  if (_catalog) return Promise.resolve(_catalog);
  if (_loading) return _loading;
  _loading = import('../data/google-fonts')
    .then((m) => {
      // Normalise once, up front, rather than lazily during a search: these
      // records get handed to React state, and mutating them mid-render is a trap.
      m.CATALOG.forEach((f) => {
        f.n = norm(f.family);
      });
      _catalog = m.CATALOG;
      return _catalog;
    })
    .catch(() => {
      _catalog = [];
      return _catalog;
    });
  return _loading;
}

/** Synchronous peek — null until loadCatalog() has resolved. */
export function catalog(): FontRecord[] | null {
  return _catalog;
}

/** Catalog record for an exact family name (null when unknown/not loaded). */
export function catalogEntry(family?: string | null): FontRecord | null {
  if (!_catalog || !family) return null;
  const n = String(family).toLowerCase();
  return _catalog.find((f) => f.family.toLowerCase() === n) || null;
}

// "DM Sans" / "dm-sans" / "dmsans" all have to find the same family.
const norm = (s: string): string => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Offline search: families whose name STARTS with the query rank above ones
 * that merely contain it, each group alphabetical (the catalog already is).
 * Returns [] for a blank query.
 */
export function searchCatalog(query: string, limit = 24): FontRecord[] {
  const needle = norm(query);
  if (!needle || !_catalog) return [];
  const starts: FontRecord[] = [];
  const contains: FontRecord[] = [];
  for (const f of _catalog) {
    if (f.n && f.n.startsWith(needle)) starts.push(f);
    else if (f.n && f.n.includes(needle)) contains.push(f);
  }
  return starts.concat(contains).slice(0, limit);
}

/* ---------------- preview faces ---------------- */

/**
 * Repoint the search-preview <link> at the families currently on screen — one
 * request, weight 400 only, replaced on each new result set so an afternoon of
 * searching still costs one live stylesheet. The default family is skipped
 * (the root layout already has it).
 */
export function ensureSearchPreviews(families: string[]): void {
  const list = (families || [])
    .filter((f) => f && !isDefaultFamily(f))
    .slice(0, 24)
    .sort();
  if (!list.length) {
    ensureLink(SEARCH_LINK_ID, null);
    return;
  }
  const q = list.map((family) => `family=${urlName(family)}:wght@400`).join('&');
  ensureLink(SEARCH_LINK_ID, `${GF}${q}&display=swap`);
}

export default {
  DEFAULT_FONT,
  DEFAULT_FAMILY,
  CUSTOM_FONT,
  UI_WEIGHTS,
  UI_WEIGHT_QUERY,
  FALLBACK_STACK,
  isDefaultFamily,
  weightQuery,
  hrefFor,
  applyFont,
  loadCatalog,
  catalog,
  catalogEntry,
  searchCatalog,
  ensureSearchPreviews,
};
