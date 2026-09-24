'use client';
/*
 * FPTecnologi-HUB · Dashboard — Command palette (⌘K).
 *
 * Native re-implementation of core/command-palette.js rendering the reference
 * shell from partials/command.html: backdrop → panel → query row (search icon +
 * input + "esc" keycap + close icon-button) → results listbox → key-hint footer.
 *
 * Mounted by <Layout> and <AppLayout> at the END of the tree, NEVER inside
 * .ax-header. The header's backdrop-filter makes it a containing block for
 * fixed descendants, which would pin this overlay inside the bar. The (bare)
 * group deliberately has no palette, matching the 23 standalone reference
 * pages that omit the partial.
 *
 * The dialog stays MOUNTED and toggles `hidden` + `aria-hidden` + `.is-open`,
 * exactly like the reference root — that is the contract shell.css §13 paints
 * (the panel's rise animation rides `.is-open`). Only the result rows are
 * conditional, so the server render is the empty listbox the partial ships.
 *
 * PARITY WITH THE MODULE (all of it deliberate):
 *  · group comes off the BRANCH ROOT's `section`, not the leaf — read off the
 *    leaf, all 190 pages fall into the catch-all "Pages" bucket;
 *  · scoring 100 / 70 / 40 / 20 with the fuzzy pass over the TITLE only — over
 *    title+keywords it degenerates and "email" surfaces "503 Service
 *    Unavailable" and "Breadcrumb";
 *  · max 8 rows per group, groups rendered in GROUP_ORDER;
 *  · focus is released and blurred BEFORE the root goes hidden/aria-hidden —
 *    hiding a subtree that still owns the focused element strands it, and
 *    Chrome refuses the aria-hidden outright;
 *  · recents persist under the ax:cmd-recent key.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { manifest, hrefForSlug } from '../../lib/manifest';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useCustomizer } from '../../context/CustomizerContext';
import * as store from '../../lib/storage';

const RECENT_KEY = 'ax:cmd-recent';
const RECENT_MAX = 5;

/* Manifest section → result group. Anything unmapped lands in "Pages", which is
   itself in GROUP_ORDER, so a new section can never drop rows silently. */
const GROUPS: Record<string, string> = {
  MAIN: 'Dashboards',
  APPLICATIONS: 'Apps',
  MODULES: 'Modules',
  'UI & FORMS': 'UI & Forms',
  PAGES: 'Pages',
  DOCS: 'Docs',
};
const GROUP_ORDER = ['Dashboards', 'Apps', 'Modules', 'UI & Forms', 'Pages', 'Docs', 'Actions'];

function groupFor(section: string | null | undefined): string {
  return (section && GROUPS[section]) || 'Pages';
}

interface Item {
  group: string;
  title: string;
  crumb: string;
  keywords: string;
  slug?: string;
  href?: string;
  external?: boolean;
  action?: 'toggle-theme';
}

interface ResultGroup {
  header: string;
  items: Item[];
}

function buildItems(): Item[] {
  const items: Item[] = [];
  // Pages (every in-menu leaf with a real slug)
  for (const node of manifest.nodes) {
    if (node.alias) continue;
    if (node.parent === null) continue; // skip bare section groups as page rows
    const trail = manifest.trail(node);
    const crumb = trail
      .slice(0, -1)
      .map((n) => n.title)
      .join(' / ');
    items.push({
      // Only the ROOT of each branch carries `section` in the manifest.
      group: groupFor(trail[0] && trail[0].section),
      title: node.title,
      slug: node.slug,
      href: hrefForSlug(node.slug),
      crumb: crumb || 'Home',
      keywords: (node.keywords || []).join(' '),
      external: !!node.external,
    });
  }
  // Actions
  items.push({ group: 'Actions', title: 'Toggle dark mode', action: 'toggle-theme', crumb: 'Theme', keywords: 'dark light theme mode' });
  return items;
}

function fuzzy(hay: string, q: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

function getRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(store.get(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
function pushRecent(slug: string): void {
  let list = getRecent().filter((s) => s !== slug);
  list.unshift(slug);
  list = list.slice(0, RECENT_MAX);
  store.set(RECENT_KEY, JSON.stringify(list));
}

/** The module's search(): recents + defaults when empty, scored buckets when not. */
function search(items: Item[], q: string, recent: string[]): ResultGroup[] {
  const query = (q || '').trim().toLowerCase();

  if (!query) {
    const out: ResultGroup[] = [];
    if (recent.length) {
      const rows = recent
        .map((slug) => items.find((i) => i.slug === slug))
        .filter((i): i is Item => !!i);
      if (rows.length) out.push({ header: 'Recent', items: rows });
    }
    // a small default set of top pages + actions when no query
    out.push({ header: 'Pages', items: items.filter((i) => i.group !== 'Actions').slice(0, 6) });
    out.push({ header: 'Actions', items: items.filter((i) => i.group === 'Actions') });
    return out.filter((g) => g.items.length > 0);
  }

  const scored: Array<{ it: Item; score: number }> = [];
  for (const it of items) {
    const hay = (it.title + ' ' + (it.keywords || '')).toLowerCase();
    const titleLc = it.title.toLowerCase();
    let score = -1;
    if (titleLc.startsWith(query)) score = 100;
    else if (titleLc.indexOf(query) !== -1) score = 70;
    else if (hay.indexOf(query) !== -1) score = 40;
    // Fuzzy against the TITLE only — see the header note.
    else if (fuzzy(titleLc, query)) score = 20;
    if (score >= 0) scored.push({ it, score });
  }
  scored.sort((a, b) => b.score - a.score || a.it.title.localeCompare(b.it.title));

  const buckets: Record<string, Item[]> = {};
  scored.forEach(({ it }) => {
    (buckets[it.group] = buckets[it.group] || []).push(it);
  });
  const out: ResultGroup[] = [];
  GROUP_ORDER.forEach((g) => {
    if (buckets[g] && buckets[g].length) out.push({ header: g, items: buckets[g].slice(0, 8) });
  });
  return out;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const c = useCustomizer();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const items = useMemo(buildItems, []);
  useFocusTrap(panelRef, open);

  const groups = useMemo(
    () => (open ? search(items, q, recent) : []),
    [open, items, q, recent],
  );
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  /* Hand focus back BEFORE the root goes hidden/aria-hidden. React applies the
     attribute in the commit that follows this handler, and the focus-trap's
     restore only runs in the effect cleanup AFTER that — so blur here or the
     hidden subtree keeps the focused element. */
  const close = useCallback(() => {
    const root = rootRef.current;
    const el = document.activeElement as HTMLElement | null;
    if (root && el && root.contains(el) && typeof el.blur === 'function') el.blur();
    onClose();
  }, [onClose]);

  // Open: reset the query, re-read persisted recents, focus the field, lock body scroll.
  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    setRecent(getRecent());
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => setActive(0), [q]);

  // Keep the highlighted row in view (the module's highlightActive()).
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-ax-index="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open, groups]);

  const go = (row: Item) => {
    if (row.action === 'toggle-theme') {
      c.toggleTheme();
      close();
      return;
    }
    if (row.slug) pushRecent(row.slug);
    close();
    if (row.href) {
      if (row.external) window.open(row.href, '_blank', 'noopener');
      else router.push(row.href);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    const n = flat.length;
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (n) setActive((a) => (a + 1 + n) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (n) setActive((a) => (a - 1 + n) % n);
        break;
      case 'Enter': {
        e.preventDefault();
        const row = flat[active];
        if (row) go(row);
        break;
      }
    }
  };

  // Flat selectable index of each group's first row (headers are not selectable).
  const offsets: number[] = [];
  groups.reduce((n, g) => {
    offsets.push(n);
    return n + g.items.length;
  }, 0);

  return (
    <div
      id="ax-command"
      className={`ax-command${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ax-command-title"
      aria-hidden={!open}
      hidden={!open}
      ref={rootRef}
      onKeyDown={onKey}
    >
      {/* Click-catch scrim, painted behind the panel. */}
      <button
        type="button"
        className="ax-command__backdrop"
        data-ax-command-backdrop=""
        aria-label="Close search"
        tabIndex={-1}
        onClick={close}
      />

      <div className="ax-command__panel" ref={panelRef}>
        <h2 id="ax-command-title" className="ax-visually-hidden">Search or jump to</h2>

        {/* ===== QUERY ROW ===== */}
        <div className="ax-command__input">
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
          <input
            ref={inputRef}
            type="text"
            data-ax-command-input=""
            placeholder="Search pages, apps and actions…"
            aria-label="Search pages, apps and actions"
            aria-controls="ax-command-results"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <kbd className="ax-command__keycap ax-command__keycap--esc">esc</kbd>
          <button
            type="button"
            className="ax-icon-btn ax-command__close"
            data-ax-command-close=""
            aria-label="Close search"
            onClick={close}
          >
            <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>

        {/* ===== RESULTS ===== */}
        <div
          id="ax-command-results"
          className="ax-command__results"
          data-ax-command-results=""
          role="listbox"
          aria-label="Search results"
          ref={listRef}
        >
          {open && flat.length === 0 && (
            <p className="ax-command__empty">
              No matches for “{q.trim()}” — try a page name or &quot;settings&quot;.
            </p>
          )}
          {open &&
            groups.map((g, gi) => (
              <Fragment key={g.header}>
                <p className="ax-command__group">{g.header}</p>
                {g.items.map((row, ri) => {
                  const i = offsets[gi] + ri;
                  return (
                    <button
                      key={`${g.header}:${row.slug || row.action}`}
                      type="button"
                      className={`ax-command__row${i === active ? ' is-active' : ''}`}
                      role="option"
                      aria-selected={i === active}
                      data-ax-index={i}
                      onClick={() => go(row)}
                      onMouseEnter={() => setActive(i)}
                    >
                      <span className="ax-command__row-title">{row.title}</span>
                      <span className="ax-command__crumb">{row.crumb || ''}</span>
                    </button>
                  );
                })}
              </Fragment>
            ))}
        </div>

        {/* ===== KEY HINTS (pointer/keyboard only — hidden on phones) ===== */}
        <div className="ax-command__foot" aria-hidden="true">
          <span className="ax-command__hint"><kbd className="ax-command__keycap">↑</kbd><kbd className="ax-command__keycap">↓</kbd>navigate</span>
          <span className="ax-command__hint"><kbd className="ax-command__keycap">↵</kbd>open</span>
          <span className="ax-command__hint"><kbd className="ax-command__keycap">esc</kbd>close</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
