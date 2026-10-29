'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { LayoutGroup, motion } from 'framer-motion';

export type ViewMode = 'grid' | 'list';

const spring = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.6 };

/**
 * Preferensi tampilan disimpan di localStorage dan dibaca lewat
 * useSyncExternalStore: server & render pertama klien memakai nilai default
 * sehingga tidak ada hydration mismatch, lalu nilai tersimpan langsung dipakai.
 */
function read(key: string, fallback: ViewMode): ViewMode {
  try {
    const saved = window.localStorage.getItem(`uks:view:${key}`);
    return saved === 'grid' || saved === 'list' ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function useViewMode(storageKey: string, initial: ViewMode = 'grid') {
  const subscribe = useCallback((onChange: () => void) => {
    const handler = (event: StorageEvent) => {
      if (event.key === `uks:view:${storageKey}`) onChange();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [storageKey]);

  const getSnapshot = useCallback(() => read(storageKey, initial), [storageKey, initial]);
  const getServerSnapshot = useCallback(() => initial, [initial]);

  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setView = useCallback(
    (next: ViewMode) => {
      try {
        window.localStorage.setItem(`uks:view:${storageKey}`, next);
      } catch {
        /* localStorage bisa diblokir (mode privat) — abaikan. */
      }
      window.dispatchEvent(new StorageEvent('storage', { key: `uks:view:${storageKey}` }));
    },
    [storageKey]
  );

  return { view, setView };
}

export function ViewToggle({
  value,
  onChange,
  label = 'Mode tampilan',
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  label?: string;
}) {
  return (
    <LayoutGroup id="view-toggle">
      <div className="seg" role="group" aria-label={label}>
        <button
          type="button"
          className={`seg__btn ${value === 'grid' ? 'is-active' : ''}`}
          aria-pressed={value === 'grid'}
          onClick={() => onChange('grid')}
          title="Tampilan kartu"
        >
          {value === 'grid' && (
            <motion.span layoutId="view-toggle-pill" className="seg__pill" transition={spring} initial={false} />
          )}
          <span className="seg__label">
            <LayoutGrid className="ico" />
            Kartu
          </span>
        </button>
        <button
          type="button"
          className={`seg__btn ${value === 'list' ? 'is-active' : ''}`}
          aria-pressed={value === 'list'}
          onClick={() => onChange('list')}
          title="Tampilan daftar"
        >
          {value === 'list' && (
            <motion.span layoutId="view-toggle-pill" className="seg__pill" transition={spring} initial={false} />
          )}
          <span className="seg__label">
            <Rows3 className="ico" />
            Daftar
          </span>
        </button>
      </div>
    </LayoutGroup>
  );
}
