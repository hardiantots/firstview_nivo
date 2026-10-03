'use client';

import { useSyncExternalStore } from 'react';

export const COMPACT_LAYOUT_QUERY = '(max-width: 1024px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COMPACT_LAYOUT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Start with the compact layout during hydration, then follow the actual viewport. */
export function useCompactLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT_LAYOUT_QUERY).matches,
    () => true,
  );
}
