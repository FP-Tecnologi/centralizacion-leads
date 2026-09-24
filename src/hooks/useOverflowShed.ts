/*
 * FPTecnologi-HUB · Dashboard — responsive header SHED signal (02-shell §4.12).
 *
 * The header utility cluster is eleven controls wide; below `lg` it no longer
 * fits the bar, so shell.css §18 hides the narrow-band controls (.ax-lang /
 * .ax-fullscreen / .ax-apps, then .ax-cart / .ax-cog) and reveals the matching
 * `[data-ax-shed="<key>"]` rows inside `.ax-overflow__menu`.
 *
 * CSS owns per-row visibility. This hook exists for ONE thing: deciding whether
 * the "More" trigger is rendered at all — the reference does the same via
 * `$store.ax.overflow` (js/alpine/index.js `_bindBands()`), whose length gates
 * the `.ax-overflow` wrapper's `x-show`. Never hide the individual rows here:
 * the two would drift and a control could end up with zero reachable copies.
 *
 * Bands — keep in lockstep with shell.css §18:
 *   < 992px (lg) … lang · fullscreen · apps
 *   < 768px (md) … + cart · customizer
 *
 * SSR: starts empty, so the server render (and React's first client pass) omit
 * the trigger — no hydration mismatch. The mount effect measures immediately.
 */
import { useEffect, useState } from 'react';

/** Matches the reference's debounce on the resize-bound width watcher. */
const DEBOUNCE_MS = 150;

function computeShed(): string[] {
  let w = 9999;
  try {
    w = window.innerWidth;
  } catch {
    /* noop */
  }
  const shed: string[] = [];
  if (w < 992) shed.push('lang', 'fullscreen', 'apps');
  if (w < 768) shed.push('cart', 'customizer');
  return shed;
}

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

export function useOverflowShed(): string[] {
  const [shed, setShed] = useState<string[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Keep the identity stable while the band does not change, so the header
    // does not re-render on every resize frame.
    const update = () => setShed((prev) => (same(prev, computeShed()) ? prev : computeShed()));
    update();
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return shed;
}

export default useOverflowShed;
