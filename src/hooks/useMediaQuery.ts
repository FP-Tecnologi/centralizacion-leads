/*
 * FPTecnologi-HUB · Dashboard — media-query hook.
 *
 * The idiomatic replacement for the reference's resize-bound width watchers
 * (`_bindBands()` in js/alpine/index.js, `sidebar.isMobile()` in
 * js/core/sidebar.js). `matchMedia` fires only when the band actually flips, so
 * there is nothing to debounce and no per-pixel resize churn.
 *
 * Copied verbatim from the React edition (it has no router / UI imports), with
 * one App-Router-specific change: the initial state is `false` rather than a
 * `window.matchMedia` read, because this hook runs during SSR where `window`
 * does not exist. The mount effect measures immediately, so the first client
 * pass matches the server render and there is no hydration mismatch.
 */
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(query);
    } catch {
      return;
    }
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    /* Safari < 14 */
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [query]);

  return matches;
}

export default useMediaQuery;
