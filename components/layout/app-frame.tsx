'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CommandPalette } from '@/components/layout/command-palette';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Package,
  BarChart3,
  SunMoon,
  LogOut,
  Bell,
  HeartPulse,
  Search,
  Plus,
  LifeBuoy,
} from 'lucide-react';

const pillSpring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const;

const tabs = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Siswa', icon: Users },
  { href: '/visits', label: 'Kunjungan', icon: Stethoscope },
  { href: '/inventory', label: 'Inventaris', icon: Package },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
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

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

          <LayoutGroup id="top-tabs">
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
                      {active && (
                        <motion.span
                          layoutId="tab-pill"
                          className="ttab__pill"
                          transition={pillSpring}
                          initial={false}
                        />
                      )}
                      <Icon className="ico" strokeWidth={1.7} />
                      <span>{t.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </LayoutGroup>

          <div className="top__tools">
            <button type="button" className="ibtn ibtn--glass" aria-label="Notifikasi">
              <Bell className="ico" strokeWidth={1.7} />
            </button>
            <button type="button" className="me" aria-label="Menu akun">
              <span className="av av--md av--sky">AD</span>
            </button>
          </div>
        </header>

        <LayoutGroup id="dock">
          <nav className="dock" aria-label="Aksi cepat">
            <button
              type="button"
              className="dock__btn"
              onClick={() => setPaletteOpen(true)}
              aria-label="Cari (Ctrl+K)"
            >
              <Search className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Cari · Ctrl K</span>
            </button>
            <Link
              href="/visits/new"
              className="dock__btn"
              aria-label="Catat kunjungan"
              aria-current={pathname === '/visits/new' ? 'page' : undefined}
            >
              {pathname === '/visits/new' && (
                <motion.span layoutId="dock-pill" className="dock__pill" transition={pillSpring} initial={false} />
              )}
              <Plus className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Catat kunjungan</span>
            </Link>
            <button type="button" className="dock__btn" onClick={toggleTheme} aria-label="Ganti tema">
              <SunMoon className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Tema</span>
            </button>
            <span className="dock__sep" aria-hidden="true" />
            <Link
              href="/reports"
              className="dock__btn"
              aria-label="Bantuan"
              aria-current={pathname.startsWith('/reports') ? 'page' : undefined}
            >
              {pathname.startsWith('/reports') && (
                <motion.span layoutId="dock-pill" className="dock__pill" transition={pillSpring} initial={false} />
              )}
              <LifeBuoy className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Bantuan</span>
            </Link>
            <Link href="/auth/signout" className="dock__btn" aria-label="Keluar">
              <LogOut className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Keluar</span>
            </Link>
          </nav>
        </LayoutGroup>

        <main className="main">{children}</main>
      </div>

      <AnimatePresence>
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
