'use client';
/*
 * FPTecnologi-HUB · Dashboard — Sidebar (manifest-driven nav tree).
 *
 * Renders the reference .ax-sidebar DOM contract from nav-manifest.json:
 * brand → role="tree" nav with section headers, L1 parent groups
 * (collapsible) and child leaves. The active leaf (matched against the router
 * path) gets `ax-nav__item--active is-active aria-current="page"`, its ancestor
 * group opens (`is-open`, panel un-hidden), and the parent button gets
 * `ax-nav__item--trail` — exactly as core/nav.js does in the HTML edition.
 */
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useAuth } from '../../context/AuthContext';
import { useFuentesMenu } from '../../hooks/useFuentesMenu';
import type { Fuente } from '../../lib/leads/datos';
import {
  manifest,
  sections,
  groupsInSection,
  slugFromPath,
  hrefForSlug,
  visibleForRole,
  type NavNode,
} from '../../lib/manifest';
import { Icon } from '../ui/Icon';

function Badge({ badge }: { badge: NavNode['badge'] }) {
  if (!badge) return null;
  if (badge.type === 'count')
    return <span className="ax-nav__badge ax-nav__badge--count">{badge.value}</span>;
  if (badge.type === 'Hot') return <span className="ax-nav__badge ax-nav__badge--hot">Hot</span>;
  if (badge.type === 'New') return <span className="ax-nav__badge ax-nav__badge--new">New</span>;
  return null;
}

const CARET = (
  <svg
    className="ax-nav__caret ax-icon--directional"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={24}
    height={24}
    aria-hidden="true"
  >
    <path d="M9 6l6 6l-6 6" />
  </svg>
);

interface LeafProps {
  node: NavNode;
  level: number;
  activeSlug: string;
  roleName: string | null;
}

function Leaf({ node, level, activeSlug, roleName }: LeafProps) {
  const resolved = manifest.resolve(node)!;
  const isActive = resolved.slug === activeSlug;
  const hidden = !visibleForRole(node, roleName);
  const cls = ['ax-nav__item'];
  if (level > 1) cls.push('ax-nav__item--child');
  if (isActive) cls.push('ax-nav__item--active', 'is-active');
  if (hidden) cls.push('is-hidden');
  return (
    <Link
      className={cls.join(' ')}
      role="treeitem"
      aria-level={level}
      aria-current={isActive ? 'page' : undefined}
      href={hrefForSlug(resolved.slug)}
      tabIndex={isActive ? 0 : -1}
    >
      <span className="ax-nav__bar" aria-hidden="true"></span>
      <Icon name={node.icon} className="ax-nav__icon" />
      <span className="ax-nav__label">{node.title}</span>
      <Badge badge={node.badge} />
    </Link>
  );
}

/* Hijo simple "Todas las X" (nivel 2, sin submenú) para grp.landings/grp.offline. */
function TodasFuentesLeaf({ base, label, level, activeSlug }: { base: string; label: string; level: number; activeSlug: string }) {
  const isActive = activeSlug === base;
  const cls = ['ax-nav__item', 'ax-nav__item--child'];
  if (isActive) cls.push('ax-nav__item--active', 'is-active');
  return (
    <Link className={cls.join(' ')} role="treeitem" aria-level={level} aria-current={isActive ? 'page' : undefined} href={`/${base}`}>
      <span className="ax-nav__bar" aria-hidden="true"></span>
      <span className="ax-nav__label">{label}</span>
    </Link>
  );
}

/* Submenú por fuente (nivel 2). Landings: Gestionar (editor visual) / Configuración
   (datos y conexión) / Registros. Apps offline: Gestionar / Registros. */
function FuenteSubgrupo({ f, base, level, activeSlug }: { f: Fuente; base: string; level: number; activeSlug: string }) {
  const items = [
    { slug: `${base}/${f.slug}`, label: 'Gestionar' },
    ...(base === 'landings' ? [{ slug: `${base}/${f.slug}/configuracion`, label: 'Configuración' }] : []),
    { slug: `${base}/${f.slug}/registros`, label: 'Registros' },
  ];
  const containsActive = items.some((i) => i.slug === activeSlug);
  const [open, setOpen] = useState(containsActive);
  const isOpen = open || containsActive;
  const parentCls = ['ax-nav__item', 'ax-nav__item--parent', 'ax-nav__item--child'];
  if (containsActive) parentCls.push('ax-nav__item--trail');
  return (
    <div className={`ax-nav__group${isOpen ? ' is-open' : ''}`} data-ax-collapse>
      <button type="button" className={parentCls.join(' ')} role="treeitem" aria-level={level} aria-expanded={isOpen} onClick={() => setOpen((o) => !o)}>
        <span className="ax-nav__label">{f.nombre}</span>
        {f.estado === 'cerrada' && <span className="ax-badge ax-badge--neutral ax-badge--sm" style={{ marginInlineStart: 6 }}>cerrada</span>}
        {CARET}
      </button>
      <div className="ax-nav__children" role="group" data-ax-collapse-panel hidden={!isOpen}>
        {items.map((i) => (
          <Link
            key={i.slug}
            className={`ax-nav__item ax-nav__item--child${activeSlug === i.slug ? ' ax-nav__item--active is-active' : ''}`}
            role="treeitem"
            aria-level={level + 1}
            aria-current={activeSlug === i.slug ? 'page' : undefined}
            href={`/${i.slug}`}
          >
            <span className="ax-nav__bar" aria-hidden="true"></span>
            <span className="ax-nav__label">{i.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* Hijos dinámicos de grp.landings/grp.offline: fuentes de la tabla `fuentes`
   (Task 13). Solo se monta para esos dos nodos, así useFuentesMenu no se
   llama en el resto del árbol. */
function FuentesInyectadas({ tipo, level, activeSlug }: { tipo: 'landing' | 'offline'; level: number; activeSlug: string }) {
  const fuentes = useFuentesMenu(tipo);
  const base = tipo === 'landing' ? 'landings' : 'offline';
  const allLabel = tipo === 'landing' ? 'Todas las landings' : 'Todas las apps offline';
  return (
    <>
      <TodasFuentesLeaf base={base} label={allLabel} level={level} activeSlug={activeSlug} />
      {fuentes.map((f) => <FuenteSubgrupo key={f.id} f={f} base={base} level={level} activeSlug={activeSlug} />)}
    </>
  );
}

interface GroupProps {
  node: NavNode;
  level: number;
  activeSlug: string;
  roleName: string | null;
}

function Group({ node, level, activeSlug, roleName }: GroupProps) {
  const children = manifest.childrenOf(node.id).filter((c) => c.inMenu && visibleForRole(c, roleName));
  const containsActive = useMemo(
    () => subtreeContainsSlug(node, activeSlug),
    [node, activeSlug],
  );
  const activeChildIcon = useMemo(
    () => (level === 1 ? activeDescendantIcon(node, activeSlug) : null),
    [node, activeSlug, level],
  );
  const [open, setOpen] = useState(containsActive || level === 1 && node.section === 'MAIN');
  const isOpen = open || containsActive;

  const parentCls = ['ax-nav__item', 'ax-nav__item--parent'];
  if (level > 1) parentCls.push('ax-nav__item--child');
  if (containsActive) parentCls.push('ax-nav__item--trail');

  return (
    <div
      className={`ax-nav__group${isOpen ? ' is-open' : ''}`}
      data-ax-collapse
    >
      <button
        type="button"
        className={parentCls.join(' ')}
        role="treeitem"
        aria-level={level}
        aria-expanded={isOpen}
        data-ax-group={node.id}
        onClick={() => setOpen((o) => !o)}
        tabIndex={containsActive ? 0 : -1}
      >
        {level === 1 && <Icon name={node.icon} className="ax-nav__icon ax-nav__icon--group" />}
        {level === 1 && activeChildIcon && (
          <Icon name={activeChildIcon} className="ax-nav__icon ax-nav__icon--active-child" />
        )}
        <span className="ax-nav__label">{node.title}</span>
        <Badge badge={node.badge} />
        {CARET}
      </button>
      <div
        className="ax-nav__children"
        role="group"
        data-ax-collapse-panel
        hidden={!isOpen}
      >
        {children.map((child) =>
          manifest.childrenOf(child.id).filter((c) => c.inMenu && visibleForRole(c, roleName)).length > 0 ? (
            <Group
              key={child.id}
              node={child}
              level={level + 1}
              activeSlug={activeSlug}
              roleName={roleName}
            />
          ) : (
            <Leaf
              key={child.id}
              node={child}
              level={level + 1}
              activeSlug={activeSlug}
              roleName={roleName}
            />
          ),
        )}
        {node.id === 'grp.landings' && <FuentesInyectadas tipo="landing" level={level + 1} activeSlug={activeSlug} />}
        {node.id === 'grp.offline' && <FuentesInyectadas tipo="offline" level={level + 1} activeSlug={activeSlug} />}
      </div>
    </div>
  );
}

export function Sidebar({ drawerOpen = false, onNavToggle }: { drawerOpen?: boolean; onNavToggle: () => void }) {
  const activeSlug = slugFromPath(usePathname() || '/');
  const rootRef = useRef<HTMLElement>(null);
  const { perfil } = useAuth();
  const roleName = perfil?.rol ?? null;
  useFocusTrap(rootRef, drawerOpen);

  return (
    <aside className="ax-sidebar" role="navigation" aria-label="Primary" ref={rootRef}>
      {/* ===== BRAND ===== */}
      <div className="ax-sidebar__brand">
        <Link className="ax-sidebar__logo" href="/" aria-label="FPTecnologi home">
          {/* Colapsado muestra solo el rombo (ax-sidebar__logo-icon) — el
              lockup completo no entra en el riel de 76px. Las dos imágenes
              conviven en el DOM y el CSS de colapso decide cuál se ve. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ax-sidebar__logo-full" src="/logo-fptecnologi.svg" alt="FPTecnologi" width={150} style={{ height: 'auto', maxWidth: '100%' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ax-sidebar__logo-icon" src="/logo-fptecnologi-icon.svg" alt="FPTecnologi" width={32} height={32} />
        </Link>
        <button type="button" className="ax-nav-toggle ax-icon-btn" onClick={onNavToggle} aria-label="Toggle menu">
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" /></svg>
        </button>
      </div>

      {/* ===== NAV TREE ===== */}
      <nav className="ax-sidebar__nav" role="tree" aria-label="Main menu">
        {sections().map((section) => {
          const groups = groupsInSection(section).filter((g) => g.inMenu && visibleForRole(g, roleName));
          if (groups.length === 0) return null;
          return (
            <div key={section}>
              <p className="ax-sidebar__section" role="presentation">
                {sectionLabel(section)}
              </p>
              {groups.map((g) =>
                // Nivel 1 sin hijos (Dashboard, Exportación, Usuarios) = enlace directo;
                // antes se dibujaba como grupo y el clic solo abría un submenú vacío.
                // Landings/Apps offline siempre son grupo: sus hijos se inyectan desde `fuentes`.
                manifest.childrenOf(g.id).some((c) => c.inMenu && visibleForRole(c, roleName))
                || g.id === 'grp.landings' || g.id === 'grp.offline' ? (
                  <Group key={g.id} node={g} level={1} activeSlug={activeSlug} roleName={roleName} />
                ) : (
                  <Leaf key={g.id} node={g} level={1} activeSlug={activeSlug} roleName={roleName} />
                ),
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/* ── helpers ── */
function sectionLabel(s: string): string {
  // Manifest sections are upper-case; reference renders them title-ish.
  const map: Record<string, string> = {
    PRINCIPAL: 'Principal',
    FUENTES: 'Fuentes',
    ADMINISTRACIÓN: 'Administración',
    GENERAL: 'General',
    MAIN: 'Cuenta',
    APPLICATIONS: 'Applications',
    MODULES: 'Modules',
    PAGES: 'Pages',
    'UI & FORMS': 'UI & Forms',
    DOCS: 'Docs',
  };
  return map[s] || s;
}

function subtreeContainsSlug(node: NavNode, slug: string): boolean {
  const kids = manifest.childrenOf(node.id);
  return kids.some((c) => {
    const r = manifest.resolve(c)!;
    if (r.slug === slug) return true;
    return subtreeContainsSlug(c, slug);
  });
}

/* Icon of whichever descendant leaf/subgroup is currently active — used to
   swap the collapsed rail's group icon for the active submenu's own icon
   (§7b / auto-collapse CSS), since the child panel itself is hidden at 76px. */
function activeDescendantIcon(node: NavNode, slug: string): string | null {
  const kids = manifest.childrenOf(node.id);
  for (const c of kids) {
    const r = manifest.resolve(c)!;
    if (r.slug === slug) return c.icon;
    const nested = activeDescendantIcon(c, slug);
    if (nested) return nested;
  }
  return null;
}

export default Sidebar;
