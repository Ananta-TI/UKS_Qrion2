'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Package,
  BarChart3,
  Search,
  Plus,
  SunMoon,
  LogOut,
  Bell,
  HeartPulse,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';

export type Crumb = { label: string; href?: string };

const tabs = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Siswa', icon: Users },
  { href: '/visits', label: 'Kunjungan', icon: Stethoscope },
  { href: '/inventory', label: 'Inventaris', icon: Package },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/visits') return pathname === '/visits' || pathname.startsWith('/visits/');
  return pathname === href || pathname.startsWith(href + '/');
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('uks:theme', next);
  } catch {}
}

export function AppShell({
  title,
  crumbs,
  actions,
  children,
}: {
  title: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const trail: Crumb[] = crumbs ?? [{ label: 'UKS', href: '/' }, { label: title }];

  return (
    <>
      <div className="mesh" aria-hidden="true">
        <i className="mesh__a" />
        <i className="mesh__b" />
        <i className="mesh__c" />
      </div>

      <div className="app">
        <header className="top">
          <Link className="brand" href="/" aria-label="UKS — Dashboard">
            <span className="brand__mark" aria-hidden="true">
              <HeartPulse />
            </span>
            <span className="brand__text">
              <b>UKS</b>
              <small>Sehat Sekolah</small>
            </span>
          </Link>

          <nav className="ttabs" aria-label="Navigasi utama">
            <div className="ttabs__track">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = isActive(pathname, t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={active ? 'ttab is-active' : 'ttab'}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="ico" strokeWidth={1.7} />
                    <span>{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="top__tools">
            <button type="button" className="ibtn ibtn--glass" aria-label="Notifikasi">
              <Bell className="ico" strokeWidth={1.7} />
            </button>
            <button type="button" className="me" aria-label="Menu akun">
              <span className="av av--md av--sky">AD</span>
            </button>
          </div>
        </header>

        <nav className="dock" aria-label="Aksi cepat">
          <Link href="/students" className="dock__btn" aria-label="Cari siswa">
            <Search className="ico" strokeWidth={1.7} />
            <span className="dock__tip">Cari siswa</span>
          </Link>
          <Link href="/visits/new" className="dock__btn" aria-label="Catat kunjungan">
            <Plus className="ico" strokeWidth={1.7} />
            <span className="dock__tip">Catat kunjungan</span>
          </Link>
          <button type="button" className="dock__btn" onClick={toggleTheme} aria-label="Ganti tema">
            <SunMoon className="ico" strokeWidth={1.7} />
            <span className="dock__tip">Tema</span>
          </button>
          <span className="dock__sep" aria-hidden="true" />
          <Link href="/reports" className="dock__btn" aria-label="Laporan">
            <LifeBuoy className="ico" strokeWidth={1.7} />
            <span className="dock__tip">Bantuan</span>
          </Link>
          <Link href="/auth/signout" className="dock__btn" aria-label="Keluar">
            <LogOut className="ico" strokeWidth={1.7} />
            <span className="dock__tip">Keluar</span>
          </Link>
        </nav>

        <div className="phead">
          <div className="phead__lead">
            <nav className="crumbs" aria-label="Breadcrumb">
              {trail.map((c, i) => {
                const last = i === trail.length - 1;
                return (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {c.href && !last ? (
                      <Link href={c.href}>{c.label}</Link>
                    ) : (
                      <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                    )}
                    {!last && <ChevronRight className="ico" style={{ width: 14, height: 14, opacity: 0.6 }} />}
                  </span>
                );
              })}
            </nav>
            <h1 className="top__title">{title}</h1>
          </div>
          {actions ? <div className="phead__actions">{actions}</div> : null}
        </div>

        <main className="main">{children}</main>
      </div>
    </>
  );
}
