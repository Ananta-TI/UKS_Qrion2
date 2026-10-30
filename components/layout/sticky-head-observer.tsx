'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Header halaman (`.phead`) sekarang sticky. Elemen sticky lain di dalam
 * konten (rail pengaturan, panel filter laporan, kartu ringkasan) harus
 * berhenti tepat di bawah header, bukan menembusnya.
 *
 * Tinggi header berbeda antar breakpoint (judul membungkus di layar kecil),
 * jadi nilainya diukur langsung dan dipublikasikan sebagai CSS variable
 * `--phead-h` di elemen root. Semua offset sticky memakai variable itu.
 */
export function StickyHeadObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const head = document.querySelector<HTMLElement>('.phead');
    if (!head) {
      root.style.setProperty('--phead-h', '0px');
      return;
    }

    const apply = () => {
      root.style.setProperty('--phead-h', `${Math.round(head.getBoundingClientRect().height)}px`);
    };

    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(head);
    window.addEventListener('resize', apply);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [pathname]);

  return null;
}
