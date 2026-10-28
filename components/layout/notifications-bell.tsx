'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AlertTriangle, Bell, CalendarClock, PackageX, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type MedicineRow = {
  id: string;
  name: string;
  unit: string | null;
  stock: number | null;
  min_stock: number | null;
  expiry_date: string | null;
};

type Alert = {
  id: string;
  name: string;
  kind: 'low' | 'expired' | 'expiring';
  text: string;
};

const DAY = 24 * 60 * 60 * 1000;

function buildAlerts(rows: MedicineRow[], now: number): Alert[] {
  const alerts: Alert[] = [];
  const soon = now + 30 * DAY;

  for (const m of rows) {
    const stock = m.stock ?? 0;
    const min = m.min_stock ?? 5;
    const unit = m.unit ?? '';

    if (stock <= min) {
      alerts.push({
        id: `low-${m.id}`,
        name: m.name,
        kind: 'low',
        text: stock <= 0 ? 'Stok habis' : `Stok menipis: ${stock} ${unit} (min ${min})`,
      });
    }

    if (m.expiry_date) {
      const expiry = new Date(m.expiry_date).getTime();
      if (expiry <= now) {
        alerts.push({ id: `exp-${m.id}`, name: m.name, kind: 'expired', text: 'Sudah kedaluwarsa' });
      } else if (expiry <= soon) {
        const days = Math.max(0, Math.ceil((expiry - now) / DAY));
        alerts.push({ id: `soon-${m.id}`, name: m.name, kind: 'expiring', text: `Kedaluwarsa dalam ${days} hari` });
      }
    }
  }

  const order = { expired: 0, low: 1, expiring: 2 } as const;
  return alerts.sort((a, b) => order[a.kind] - order[b.kind]);
}

function AlertIcon({ kind }: { kind: Alert['kind'] }) {
  if (kind === 'expired') return <CalendarClock className="ico" style={{ color: 'var(--bad)' }} />;
  if (kind === 'expiring') return <CalendarClock className="ico" style={{ color: 'var(--warn)' }} />;
  return <PackageX className="ico" style={{ color: 'var(--warn)' }} />;
}

type PanelPos = { top: number; left: number; width: number };

export function NotificationsBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('medicines')
        .select('id,name,unit,stock,min_stock,expiry_date')
        .order('name', { ascending: true })
        .limit(500);

      setAlerts(buildAlerts((data ?? []) as MedicineRow[], Date.now()));
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Dimuat sedikit tertunda agar tidak memicu render berantai saat mount.
    const first = setTimeout(() => void load(), 0);
    // Segarkan tiap 5 menit agar notifikasi tidak basi.
    const timer = setInterval(() => void load(), 5 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    // Panel dirender lewat portal (fixed) supaya tidak terpotong oleh
    // overflow sidebar. Posisinya dihitung dari tombol lonceng.
    function place() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const top = Math.min(rect.bottom + 8, window.innerHeight - 140);
      setPos({ top, left, width });
    }

    const start = setTimeout(() => {
      place();
      void load();
    }, 0);

    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);

    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(start);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = alerts.length;

  return (
    <div className={`notif ${className ?? ''}`}>
      <button
        ref={btnRef}
        type="button"
        className="notif__btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={count ? `${count} peringatan stok obat` : 'Tidak ada peringatan stok obat'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="ico" strokeWidth={1.8} />
        {count > 0 && <span className="notif__badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="notif__panel"
            role="dialog"
            aria-label="Peringatan stok obat"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="notif__head">
              <div>
                <b>Peringatan Stok</b>
                <div className="muted text-xs">Stok menipis & kedaluwarsa</div>
              </div>
              <button type="button" className="ibtn" onClick={() => setOpen(false)} aria-label="Tutup">
                <X className="ico" />
              </button>
            </div>

            <div className="notif__list">
              {loading ? (
                <div className="muted text-sm" style={{ padding: '18px 4px', textAlign: 'center' }}>
                  Memeriksa stok…
                </div>
              ) : alerts.length === 0 ? (
                <div className="notif__empty">
                  <AlertTriangle className="ico" />
                  <div>Semua stok aman dan belum ada obat mendekati kedaluwarsa.</div>
                </div>
              ) : (
                alerts.slice(0, 30).map((a) => (
                  <Link
                    key={a.id}
                    href="/inventory"
                    prefetch={false}
                    className="notif__item"
                    onClick={() => setOpen(false)}
                  >
                    <AlertIcon kind={a.kind} />
                    <span className="notif__text">
                      <b>{a.name}</b>
                      <small>{a.text}</small>
                    </span>
                  </Link>
                ))
              )}
            </div>

            {alerts.length > 0 && (
              <Link href="/inventory" prefetch={false} className="notif__foot" onClick={() => setOpen(false)}>
                Buka inventaris
              </Link>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
