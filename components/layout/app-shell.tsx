'use client';

import type { ReactNode } from 'react';
import { type Crumb, useSetHeader } from '@/components/layout/page-header';

export type { Crumb };

/**
 * Menyediakan isi header (breadcrumb, judul, aksi) untuk header persisten yang
 * dirender layout. Halaman cukup merender kontennya sendiri di dalam `.view`.
 */
export function AppShell({
  title,
  crumbs,
  actions,
  children,
}: {
  title: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const trail: Crumb[] = crumbs ?? [{ label: 'UKS', href: '/' }, { label: title }];
  useSetHeader({ title, crumbs: trail, actions });

  return <div className="view page-enter">{children}</div>;
}
