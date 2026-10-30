'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Membaca media query di klien dengan aman untuk SSR.
 *
 * `serverDefault` dipakai saat render server & render pertama klien sehingga
 * tidak ada hydration mismatch; nilainya lalu disesuaikan setelah mount.
 */
export function useMediaQuery(query: string, serverDefault = true) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => serverDefault, [serverDefault]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
