'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';

type ActivityRow = {
  id: string;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
};

const PAGE_SIZE = 30;

const actionMeta: Record<string, { label: string; cls: string }> = {
  create: { label: 'Tambah', cls: 'badge badge--good' },
  update: { label: 'Ubah', cls: 'badge badge--plain' },
  delete: { label: 'Hapus', cls: 'badge badge--bad' },
  restock: { label: 'Restok', cls: 'badge badge--warn' },
  stock_out: { label: 'Stok keluar', cls: 'badge badge--warn' },
  adjust: { label: 'Koreksi stok', cls: 'badge badge--warn' },
  login: { label: 'Masuk', cls: 'badge badge--plain' },
  logout: { label: 'Keluar', cls: 'badge badge--plain' },
  export: { label: 'Ekspor', cls: 'badge badge--good' },
  impersonate: { label: 'Impersonasi', cls: 'badge badge--bad' },
};

const filters: { key: string; label: string; actions: string[] }[] = [
  { key: 'all', label: 'Semua', actions: [] },
  { key: 'create', label: 'Tambah', actions: ['create'] },
  { key: 'update', label: 'Ubah', actions: ['update'] },
  { key: 'delete', label: 'Hapus', actions: ['delete'] },
  { key: 'stock', label: 'Stok', actions: ['restock', 'stock_out', 'adjust'] },
  { key: 'session', label: 'Sesi', actions: ['login', 'logout'] },
  { key: 'export', label: 'Ekspor', actions: ['export'] },
];

const entityLabels: Record<string, string> = {
  student: 'Siswa',
  visit: 'Kunjungan',
  medicine: 'Obat',
  school: 'Sekolah',
  user: 'Pengguna',
  report: 'Laporan',
};

export default function ActivityPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    const active = filters.find((f) => f.key === filter) ?? filters[0];

    const timer = setTimeout(async () => {
      setLoading(true);

      let req = supabase
        .from('activity_logs')
        .select('id,actor_name,action,entity,entity_id,summary,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (active.actions.length) req = req.in('action', active.actions);
      if (term) req = req.or(`summary.ilike.%${term}%,actor_name.ilike.%${term}%`);

      const { data, count } = await req;
      if (!cancelled) {
        setRows((data ?? []) as ActivityRow[]);
        setTotal(count ?? 0);
        setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter, page, reloadKey]);

  const rangeFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeTo = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <AppShell
      title="Log Aktivitas"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Log Aktivitas' }]}
    >
      <div className="card">
        <div className="toolbar">
          <div className="search" style={{ maxWidth: 360, flex: 1 }}>
            <Search className="ico" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Cari ringkasan atau nama pelaku…"
              aria-label="Cari aktivitas"
            />
          </div>
          <span className="toolbar__spacer" />
          {loading ? (
            <span className="muted text-xs">Memuat…</span>
          ) : (
            <span className="spill spill--iris">
              <i /> <CountUp value={total} /> aktivitas
            </span>
          )}
        </div>

        <div className="chips" style={{ marginBottom: 14 }}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className="chip"
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(0);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty">
            <Activity className="ico" />
            <div className="empty__title">Memuat log aktivitas…</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pelaku</th>
                  <th>Aksi</th>
                  <th>Entitas</th>
                  <th>Ringkasan</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">
                        <Activity className="ico" />
                        <div className="empty__title">Belum ada aktivitas</div>
                        <div className="empty__text">
                          Aktivitas staf (tambah, ubah, hapus, stok, ekspor) akan tercatat di sini.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const meta = actionMeta[row.action] ?? { label: row.action, cls: 'badge badge--plain' };
                    return (
                      <tr key={row.id}>
                        <td className="muted whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          <div className="cell-person">
                            <span className="av av--sm av--teal">
                              {(row.actor_name ?? '?').charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <b>{row.actor_name ?? 'Sistem'}</b>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={meta.cls}>{meta.label}</span>
                        </td>
                        <td className="muted">{entityLabels[row.entity] ?? row.entity}</td>
                        <td className="muted" style={{ maxWidth: 380 }}>
                          {row.summary}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="toolbar" style={{ marginTop: 16, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="ico" /> Sebelumnya
            </button>
            <span className="muted text-xs">
              {rangeFrom}–{rangeTo} dari {total} · Hal {page + 1}/{totalPages}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Berikutnya <ChevronRight className="ico" />
            </button>
          </div>
        )}
      </div>

      <div className="note" style={{ marginTop: 16 }}>
        <Activity className="ico" />
        <div>
          Log hanya menampilkan aktivitas sekolah Anda dan tidak dapat diubah, sehingga cocok untuk audit
          internal.
        </div>
      </div>
    </AppShell>
  );
}
