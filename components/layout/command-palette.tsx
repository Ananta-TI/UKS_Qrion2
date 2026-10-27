'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Plus,
  Package,
  BarChart3,
  Search,
  ChevronRight,
  UserRound,
  LifeBuoy,
  Settings,
} from 'lucide-react';

const pages = [
  { label: 'Dashboard', sub: 'Ringkasan aktivitas UKS', href: '/', icon: LayoutDashboard },
  { label: 'Siswa', sub: 'Cari data siswa berdasarkan nama atau NIS', href: '/students', icon: Users },
  { label: 'Kunjungan', sub: 'Rekam medis kunjungan', href: '/visits', icon: Stethoscope },
  { label: 'Catat Kunjungan', sub: 'Form pemeriksaan & tindakan', href: '/visits/new', icon: Plus },
  { label: 'Inventaris', sub: 'Stok obat & kedaluwarsa', href: '/inventory', icon: Package },
  { label: 'Laporan', sub: 'Statistik & export PDF/Excel', href: '/reports', icon: BarChart3 },
  { label: 'Pengaturan', sub: 'Profil sekolah, pengguna, dan data', href: '/settings', icon: Settings },
  { label: 'Pusat Bantuan', sub: 'Panduan, FAQ, dan kontak admin', href: '/support', icon: LifeBuoy },
];

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const q = query.trim();
  const studentResults = q.length >= 2 ? students : [];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('students')
        .select('id, full_name, nis, class')
        .or(`full_name.ilike.%${q}%,nis.ilike.%${q}%`)
        .limit(5);
      if (!cancelled) {
        setStudents(data ?? []);
        setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const items = [
    ...pages
      .filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()) || p.sub.toLowerCase().includes(q.toLowerCase()))
      .map((p) => ({ key: 'page:' + p.href, group: 'Halaman', label: p.label, sub: p.sub, icon: p.icon, href: p.href })),
    ...studentResults.map((s) => ({
      key: 'student:' + s.id,
      group: 'Siswa',
      label: s.full_name,
      sub: `NIS ${s.nis}${s.class ? ' · Kelas ' + s.class : ''}`,
      icon: UserRound,
      href: `/visits/new?student=${s.id}`,
    })),
  ];

  const activeIndex = items.length ? Math.min(active, items.length - 1) : -1;

  const select = (href: string) => {
    onClose();
    router.push(href);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) select(items[activeIndex].href);
    }
  };

  return (
    <motion.div
      className="cmdk"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
    >
      <motion.div
        className="cmdk__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian"
        initial={{ opacity: 0, y: -10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.985 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmdk__search">
          <Search className="ico" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setActive(0);
              if (v.trim().length < 2) setStudents([]);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Cari siswa, halaman…"
            aria-label="Cari siswa atau halaman"
          />
          <span className="cmdk__esc">esc</span>
        </div>

        <div className="cmdk__list">
          {items.length === 0 ? (
            <div className="cmdk__empty">{loading ? 'Mencari…' : `Tidak ada hasil untuk “${q}”`}</div>
          ) : (
            items.map((item, i) => {
              const Icon = item.icon;
              const showGroup = i === 0 || items[i - 1].group !== item.group;
              return (
                <div key={item.key}>
                  {showGroup && <div className="cmdk__group">{item.group}</div>}
                  <button
                    type="button"
                    className="cmdk__item"
                    data-active={i === activeIndex}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(item.href)}
                  >
                    <span className="cmdk__ico">
                      <Icon className="ico" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0">
                      <b>{item.label}</b>
                      <small>{item.sub}</small>
                    </span>
                    <ChevronRight className="ico cmdk__chev" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
