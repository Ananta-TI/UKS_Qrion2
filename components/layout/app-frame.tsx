'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CommandPalette } from '@/components/layout/command-palette';
import { SettingsRail } from '@/components/layout/settings-rail';
import { savePreferences } from '@/app/(app)/settings/preferences-actions';
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
  Settings,
  UserRound,
  Pill,
} from 'lucide-react';

const pillSpring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const;

const tabs = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Siswa', icon: Users },
  { href: '/visits', label: 'Kunjungan', icon: Stethoscope },
  { href: '/inventory', label: 'Inventaris', icon: Package },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
];

const addItems = [
  { href: '/visits/new', label: 'Catat Kunjungan', desc: 'Rekam medis harian', icon: Stethoscope },
  { href: '/students?add=1', label: 'Tambah Siswa', desc: 'Daftarkan siswa baru', icon: UserRound },
  { href: '/inventory?add=1', label: 'Tambah Obat', desc: 'Stok inventaris UKS', icon: Pill },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  root.dataset.themePref = next;
  // Simpan ke akun yang sedang login, bukan ke browser bersama.
  void savePreferences({ theme: next });
}


export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!addOpen) return;

    const onPointer = (e: PointerEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddOpen(false);
    };

    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [addOpen]);

  return (
    <>
      <div className="mesh" aria-hidden="true">
        <i className="mesh__a" />
        <i className="mesh__b" />
        <i className="mesh__c" />
      </div>

      <div className={pathname.startsWith('/settings') ? 'app app--settings' : 'app'}>
        <header className="top">
          <Link className="brand" href="/" prefetch={false} aria-label="UKS — Dashboard">
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
                      prefetch={false}
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
            <div className="dock__add" ref={addRef}>
              <button
                type="button"
                className={addOpen ? 'dock__btn is-open' : 'dock__btn'}
                onClick={() => setAddOpen((v) => !v)}
                aria-label="Tambah data"
                aria-haspopup="menu"
                aria-expanded={addOpen}
              >
                <Plus className="ico" strokeWidth={1.7} />
                <span className="dock__tip">Tambah data</span>
              </button>

              <AnimatePresence>
                {addOpen && (
                  <motion.div
                    className="addmenu"
                    role="menu"
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <div className="addmenu__head">Tambah baru</div>
                    {addItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          role="menuitem"
                          className="addmenu__item"
                          onClick={() => setAddOpen(false)}
                        >
                          <span className="addmenu__ico">
                            <Icon className="ico" strokeWidth={1.7} />
                          </span>
                          <span className="addmenu__text">
                            <b>{item.label}</b>
                            <small>{item.desc}</small>
                          </span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" className="dock__btn" onClick={toggleTheme} aria-label="Ganti tema">
              <SunMoon className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Tema</span>
            </button>
            <span className="dock__sep" aria-hidden="true" />
            <Link
              href="/support"
              prefetch={false}
              className="dock__btn"
              aria-label="Bantuan"
              aria-current={pathname.startsWith('/support') ? 'page' : undefined}
            >
              {pathname.startsWith('/support') && (
                <motion.span layoutId="dock-pill" className="dock__pill" transition={pillSpring} initial={false} />
              )}
              <LifeBuoy className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Bantuan</span>
            </Link>
            <Link
              href="/settings"
              prefetch={false}
              className="dock__btn"
              aria-label="Pengaturan"
              aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
            >
              {pathname.startsWith('/settings') && (
                <motion.span layoutId="dock-pill" className="dock__pill" transition={pillSpring} initial={false} />
              )}
              <Settings className="ico" strokeWidth={1.7} />
              <span className="dock__tip">Pengaturan</span>
            </Link>
            <form action="/auth/signout" method="post" className="dock__form">
              <button type="submit" className="dock__btn" aria-label="Keluar">
                <LogOut className="ico" strokeWidth={1.7} />
                <span className="dock__tip">Keluar</span>
              </button>
            </form>
          </nav>
        </LayoutGroup>

        <main className="main">
          {pathname.startsWith('/settings') && <SettingsRail />}
          {children}
        </main>
      </div>

      <AnimatePresence>
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
