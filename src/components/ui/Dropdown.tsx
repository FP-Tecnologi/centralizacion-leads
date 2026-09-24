'use client';
/*
 * FPTecnologi-HUB · Dashboard — Dropdown primitive (native re-implementation of Alpine axDropdown).
 *
 * Renders the reference DOM contract: a trigger button that toggles a panel,
 * with aria-haspopup/aria-expanded/aria-controls wired, close on outside-click
 * and Escape. The panel uses the shared .ax-dropdown classes so pixels match.
 * Presentational + portable: NO router imports.
 */
import { useId, useRef, useState, type ReactNode } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface DropdownProps {
  /** Class on the wrapper (e.g. "ax-lang", "ax-apps", "ax-notif"). */
  className?: string;
  /** Render the trigger. Receives state + handlers to spread onto a <button>. */
  trigger: (args: {
    open: boolean;
    toggle: () => void;
    triggerProps: {
      'aria-haspopup': 'menu' | 'dialog';
      'aria-expanded': boolean;
      'aria-controls': string;
      onClick: () => void;
    };
  }) => ReactNode;
  /**
   * Render the panel body (the .ax-dropdown content). Pass a function to get a
   * `close` handle — the overflow shed's rows dismiss the menu after acting, the
   * way the reference partial's `@click="…; close()"` does.
   */
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  /** Class on the panel element. */
  panelClassName?: string;
  /**
   * Explicit DOM id for the panel (and the trigger's aria-controls). Defaults to
   * a generated useId — pass one only where the reference markup names it
   * (e.g. "ax-overflow-menu").
   */
  panelId?: string;
  /** role of the panel: menu (default) or dialog. */
  panelRole?: 'menu' | 'dialog';
  panelAriaLabel?: string;
}

export function Dropdown({
  className,
  trigger,
  children,
  panelClassName,
  panelId: panelIdProp,
  panelRole = 'menu',
  panelAriaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const panelId = panelIdProp || autoId;
  useClickOutside(wrap, open, () => setOpen(false));

  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  return (
    <div className={className} ref={wrap}>
      {trigger({
        open,
        toggle,
        triggerProps: {
          'aria-haspopup': panelRole,
          'aria-expanded': open,
          'aria-controls': panelId,
          onClick: toggle,
        },
      })}
      {open && (
        <div
          id={panelId}
          className={panelClassName}
          role={panelRole}
          aria-label={panelAriaLabel}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
