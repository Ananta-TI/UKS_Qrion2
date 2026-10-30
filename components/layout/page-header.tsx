'use client';

import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { NotificationsBell } from '@/components/layout/notifications-bell';

export type Crumb = { label: string; href?: string };

export type HeaderSpec = {
  title: string;
  crumbs: Crumb[];
  actions?: ReactNode;
};

/* Layout effect yang tidak berjalan saat SSR (menghindari warning React). */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export const HeaderContext = createContext<((spec: HeaderSpec) => void) | null>(null);

/**
 * Dipanggil AppShell untuk mengisi header halaman.
 *
 * Header-nya sendiri dirender oleh layout (AppFrame), bukan oleh halaman.
 * Jadi saat berpindah halaman, elemen header tidak ter-mount ulang seperti
 * sidebar — hanya isinya yang diperbarui.
 */
export function useSetHeader(spec: HeaderSpec) {
  const setHeader = useContext(HeaderContext);
  useIsoLayoutEffect(() => {
    setHeader?.(spec);
  });
}

/**
 * Header halaman yang persisten: breadcrumb, judul, tombol aksi halaman, dan
 * lonceng notifikasi. Selama belum ada halaman yang mengisi (SSR / transisi),
 * yang tampil adalah kerangka agar tata letak tidak melompat.
 */
export function PageHeader({ spec }: { spec: HeaderSpec | null }) {
  return (
    <header className="phead">
      <div className="phead__lead">
        {spec ? (
          <>
            <nav className="crumbs" aria-label="Breadcrumb">
              {spec.crumbs.map((c, i) => {
                const last = i === spec.crumbs.length - 1;
                return (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {c.href && !last ? (
                      <Link href={c.href} prefetch={false}>{c.label}</Link>
                    ) : (
                      <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                    )}
                    {!last && <ChevronRight className="ico" style={{ width: 14, height: 14, opacity: 0.6 }} />}
                  </span>
                );
              })}
            </nav>
            <h1 className="top__title">{spec.title}</h1>
          </>
        ) : (
          <>
            <div className="skel skel--crumbs" />
            <div className="skel skel--title" />
          </>
        )}
      </div>

      {spec?.actions ? <div className="phead__actions">{spec.actions}</div> : null}

      <div className="phead__tools">
        <NotificationsBell />
      </div>
    </header>
  );
}
