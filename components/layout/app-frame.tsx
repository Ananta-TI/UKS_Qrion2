'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CommandPalette } from '@/components/layout/command-palette';
import { CardScanner } from '@/components/layout/card-scanner';
import { SettingsRail } from '@/components/layout/settings-rail';
import { StickyHeadObserver } from '@/components/layout/sticky-head-observer';
import { HeaderContext, PageHeader, type HeaderSpec } from '@/components/layout/page-header';
import {
  LayoutDashboard,
  Stethoscope,
  Package,
  BarChart3,
  Activity,
  LogOut,
  Search,
  Settings,
  Menu,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const pillSpring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const;

const tabs = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  // { href: '/students', label: 'Siswa', icon: Users },
  { href: '/visits', label: 'Kunjungan', icon: Stethoscope },
  { href: '/inventory', label: 'Inventaris', icon: Package },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/activity', label: 'Aktivitas', icon: Activity },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerSpec, setHeaderSpec] = useState<HeaderSpec | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('uks-sidebar-collapsed');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'true') setSidebarCollapsed(true);
  }, []);

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
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

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
      <CardScanner />
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
        className={`sidebar${drawerOpen ? ' is-open' : ''}${sidebarCollapsed ? ' is-collapsed' : ''}`}
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
              <button
                type="button"
                className="sidebar__collapse"
                onClick={() =>
                  setSidebarCollapsed((v) => {
                    const next = !v;
                    window.localStorage.setItem('uks-sidebar-collapsed', String(next));
                    document.documentElement.classList.toggle('sidebar-collapsed', next);
                    return next;
                  })
                }
                aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                title={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="ico" strokeWidth={1.8} />
                ) : (
                  <PanelLeftClose className="ico" strokeWidth={1.8} />
                )}
              </button>
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
            </LayoutGroup>
          </div>

        </div>
      </aside>

      <header className={`topbar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
        <div className="topbar__school">
          <span className="topbar__logo">Q</span>
          <span className="topbar__schoolText">
            <b>{user.school ?? 'UKS Qrion'}</b>
            <small>Panam, Pekanbaru</small>
          </span>
        </div>
        <span className="topbar__sp" />
        <div className="topbar__actions">
          <Link href="/support" prefetch={false} className="topbar__tool topbar__tool--amber" title="Upgrade">
            <span className="topbar__toolIco">★</span>
            <span>Upgrade</span>
          </Link>
          <Link href="/support" prefetch={false} className="topbar__tool topbar__tool--violet" title="Panduan">
            <span className="topbar__toolIco">▤</span>
            <span>Panduan</span>
          </Link>
          <span className="topbar__switch">
            <span className="topbar__toolIco topbar__toolIco--green">⊞</span>
            <span>Switch Apps</span>
            <ChevronDown className="ico" style={{ width: 14, height: 14 }} />
          </span>
          <div className="topbar__userWrap">
            <button
              type="button"
              className="topbar__user"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className="topbar__avatar">{initialsOf(user.name).charAt(0)}</span>
              <span className="topbar__userText">
                <b>{user.name}</b>
                <small>{user.role}</small>
              </span>
              <ChevronDown className="ico" style={{ width: 14, height: 14 }} />
            </button>
            {userMenuOpen && (
              <div className="topbar__menu" role="menu">
                <div className="topbar__menuHead">
                  <b>{user.name}</b>
                  <small>{user.role}</small>
                </div>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="topbar__menuItem" role="menuitem">
                    <LogOut className="ico" strokeWidth={1.7} /> Keluar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <HeaderContext.Provider value={setHeaderSpec}>
        <div className={pathname.startsWith('/settings') ? 'app app--settings' : 'app'} data-collapsed={sidebarCollapsed ? 'true' : 'false'}>
          <StickyHeadObserver />
          <main className="main">
            <PageHeader spec={headerSpec} />
            {pathname.startsWith('/settings') && <SettingsRail />}
            {children}
          </main>
        </div>
      </HeaderContext.Provider>

      <AnimatePresence>
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
