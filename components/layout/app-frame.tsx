'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CommandPalette } from '@/components/layout/command-palette';
import { SettingsRail } from '@/components/layout/settings-rail';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Package,
  BarChart3,
  Activity,
  LogOut,
  Search,
  Plus,
  LifeBuoy,
  Settings,
  Pill,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

const pillSpring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const;

const tabs = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Siswa', icon: Users },
  { href: '/visits', label: 'Kunjungan', icon: Stethoscope },
  { href: '/inventory', label: 'Inventaris', icon: Package },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/activity', label: 'Aktivitas', icon: Activity },
];

const utilityTabs = [
  { href: '/support', label: 'Bantuan', icon: LifeBuoy },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

const addItems = [
  { href: '/visits/new', label: 'Catat Kunjungan', desc: 'Rekam medis harian', icon: Stethoscope },
  { href: '/inventory?add=1', label: 'Tambah Obat', desc: 'Stok inventaris UKS', icon: Pill },
];

export type AppFrameUser = {
  name: string;
  role: string;
  school: string | null;
};

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function initialsOf(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
  return letters.toUpperCase() || 'UK';
}

export function AppFrame({ children, user }: { children: React.ReactNode; user: AppFrameUser }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDrawerOpen(false);
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddOpen(false);
    setDrawerOpen(false);
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

  useEffect(() => {
    if (!drawerOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 1099) setDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [drawerOpen]);

  function openPalette() {
    setDrawerOpen(false);
    setPaletteOpen(true);
  }

  return (
    <>
      <div className="mesh" aria-hidden="true">
        <i className="mesh__a" />
        <i className="mesh__b" />
        <i className="mesh__c" />
      </div>

      <header className="mobilebar">
        <button
          type="button"
          className="mobilebar__icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka menu"
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
        >
          <Menu className="ico" strokeWidth={1.8} />
        </button>
        <Link className="brand brand--logo mobilebar__brand" href="/" prefetch={false} aria-label="UKS — Dashboard">
          <Image
            src="/qrion-logo2.png"
            alt="Qrion"
            width={1081}
            height={347}
            className="brand__img"
          />
        </Link>
        <NotificationsBell />
        <button
          type="button"
          className="mobilebar__icon"
          onClick={openPalette}
          aria-label="Cari (Ctrl+K)"
        >
          <Search className="ico" strokeWidth={1.8} />
        </button>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="sidebar__scrim"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <aside
        id="app-sidebar"
        className={drawerOpen ? 'sidebar is-open' : 'sidebar'}
        aria-label="Navigasi aplikasi"
      >
        <div className="sidebar__inner">
          <div className="sidebar__head">
            <Link className="brand brand--logo" href="/" prefetch={false} aria-label="UKS — Dashboard">
              <Image
                src="/qrion-logo2.png"
                alt="Qrion"
                width={1081}
                height={347}
                preload
                className="brand__img"
              />
            </Link>
            <div className="flex items-center gap-2">
              <NotificationsBell />
              <button
                type="button"
                className="sidebar__close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
              >
                <X className="ico" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="sidebar__scroll">
            <button type="button" className="side-search" onClick={openPalette} aria-label="Cari (Ctrl+K)">
              <Search className="ico" strokeWidth={1.7} />
              <span>Cari apa saja</span>
              <kbd>Ctrl K</kbd>
            </button>

            <LayoutGroup id="app-nav">
              <nav className="sidenav" aria-label="Navigasi utama">
                <p className="sidenav__label">Menu</p>
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = isActive(pathname, t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      prefetch={false}
                      className="sidenav__item"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setDrawerOpen(false)}
                    >
                      {active && (
                        <motion.span
                          layoutId="app-nav-pill"
                          className="sidenav__pill"
                          transition={pillSpring}
                          initial={false}
                        />
                      )}
                      <span className="sidenav__ico">
                        <Icon className="ico" strokeWidth={1.7} />
                      </span>
                      <span className="sidenav__text">{t.label}</span>
                      {active && <span className="sidenav__dot" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </nav>

              <div className="sideadd" ref={addRef}>
                <button
                  type="button"
                  className={addOpen ? 'sideadd__toggle is-open' : 'sideadd__toggle'}
                  onClick={() => setAddOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={addOpen}
                >
                  <span className="sideadd__ico">
                    <Plus className="ico" strokeWidth={1.8} />
                  </span>
                  <span className="sideadd__text">
                    <b>Tambah data</b>
                    <small>Kunjungan atau obat</small>
                  </span>
                  <ChevronDown className="ico sideadd__chev" strokeWidth={1.8} />
                </button>

                <AnimatePresence initial={false}>
                  {addOpen && (
                    <motion.div
                      className="sideadd__menu"
                      role="menu"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <div className="sideadd__menuInner">
                        {addItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              prefetch={false}
                              role="menuitem"
                              className="sideadd__item"
                              onClick={() => {
                                setAddOpen(false);
                                setDrawerOpen(false);
                              }}
                            >
                              <span className="sideadd__itemIco">
                                <Icon className="ico" strokeWidth={1.7} />
                              </span>
                              <span className="sideadd__itemText">
                                <b>{item.label}</b>
                                <small>{item.desc}</small>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <nav className="sidenav sidenav--utility" aria-label="Bantuan dan pengaturan">
                <p className="sidenav__label">Lainnya</p>
                {utilityTabs.map((t) => {
                  const Icon = t.icon;
                  const active = isActive(pathname, t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      prefetch={false}
                      className="sidenav__item"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setDrawerOpen(false)}
                    >
                      {active && (
                        <motion.span
                          layoutId="app-nav-pill"
                          className="sidenav__pill"
                          transition={pillSpring}
                          initial={false}
                        />
                      )}
                      <span className="sidenav__ico">
                        <Icon className="ico" strokeWidth={1.7} />
                      </span>
                      <span className="sidenav__text">{t.label}</span>
                      {active && <span className="sidenav__dot" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </nav>
            </LayoutGroup>
          </div>

          <div className="sidebar__foot">
            <div className="sideuser">
              <span className="av av--md av--iris">{initialsOf(user.name)}</span>
              <span className="sideuser__text">
                <b title={user.name}>{user.name}</b>
                <small>{user.role}</small>
                {user.school && (
                  <span className="sideuser__school" title={user.school}>
                    {user.school}
                  </span>
                )}
              </span>
            </div>
            <form action="/auth/signout" method="post" className="sidebar__outform">
              <button type="submit" className="sidebar__out">
                <LogOut className="ico" strokeWidth={1.7} />
                <span>Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className={pathname.startsWith('/settings') ? 'app app--settings' : 'app'}>
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
