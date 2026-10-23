'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { FileText, Download, Search, BarChart3, RefreshCw, ClipboardList } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ranges = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'week', label: 'Minggu' },
  { key: 'month', label: 'Bulan' },
  { key: 'year', label: 'Tahun' },
] as const;

type Range = (typeof ranges)[number]['key'];

const statusMap: Record<string, { label: string; cls: string; color: string }> = {
  back_to_class: { label: 'Kembali ke Kelas', cls: 'badge badge--good', color: 'var(--good)' },
  referred: { label: 'Dirujuk ke Faskes/RS', cls: 'badge badge--bad', color: 'var(--bad)' },
  picked_up: { label: 'Dijemput Orang Tua', cls: 'badge badge--warn', color: 'var(--warn)' },
};

const barTones = ['var(--iris)', 'var(--sky)', 'var(--teal)', 'var(--amber)', 'var(--coral)'];

export default function ReportsPage() {
  const supabase = createClient();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('today');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    let q = supabase.from('visits').select('*, students(*)').order('check_in_at', { ascending: false });
    const now = new Date();
    if (range === 'today') {
      q = q.gte('check_in_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());
    } else if (range === 'week') {
      q = q.gte('check_in_at', new Date(now.setDate(now.getDate() - 7)).toISOString());
    } else if (range === 'month') {
      q = q.gte('check_in_at', new Date(now.setMonth(now.getMonth() - 1)).toISOString());
    } else if (range === 'year') {
      q = q.gte('check_in_at', new Date(now.setFullYear(now.getFullYear() - 1)).toISOString());
    }
    const { data } = await q;
    setVisits(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, query]);

  const filtered = visits.filter(
    (v) =>
      !query ||
      v.students?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      v.students?.nis?.includes(query)
  );

  const complaintCounts: Record<string, number> = {};
  filtered.forEach((v) => {
    const c = v.chief_complaint || 'Lainnya';
    complaintCounts[c] = (complaintCounts[c] || 0) + 1;
  });
  const topComplaints = Object.entries(complaintCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxComplaint = topComplaints[0]?.[1] ?? 1;

  const statusCounts: Record<string, number> = {};
  filtered.forEach((v) => {
    const s = v.final_status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Laporan Kunjungan UKS', 14, 22);
    doc.setFontSize(11);
    doc.text(`Periode: ${range} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 32);
    const rows = filtered.map((v) => [
      new Date(v.check_in_at).toLocaleString('id-ID'),
      v.students?.full_name || '-',
      v.students?.nis || '-',
      v.students?.class || '-',
      v.chief_complaint || '-',
      v.final_status || '-',
    ]);
    (doc as any).autoTable({
      startY: 40,
      head: [['Waktu', 'Siswa', 'NIS', 'Kelas', 'Keluhan', 'Status']],
      body: rows,
    });
    doc.save(`laporan-uks-${range}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportExcel() {
    const csv = [
      ['Waktu', 'Siswa', 'NIS', 'Kelas', 'Keluhan', 'Suhu', 'TD', 'Berat', 'Tinggi', 'Tindakan', 'Status Akhir', 'Catatan'],
      ...filtered.map((v) => [
        new Date(v.check_in_at).toLocaleString('id-ID'),
        v.students?.full_name || '-',
        v.students?.nis || '-',
        v.students?.class || '-',
        v.chief_complaint || '-',
        v.temperature ?? '-',
        v.blood_pressure ?? '-',
        v.weight ?? '-',
        v.height ?? '-',
        v.treatment ?? '-',
        v.final_status ?? '-',
        v.notes ?? '-',
      ]),
    ]
      .map((r) => r.join('\t'))
      .join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-uks-${range}.xls`;
    a.click();
  }

  return (
    <AppShell
      title="Laporan & Statistik"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Laporan' }]}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={exportExcel}>
            <Download className="ico" /> Excel
          </button>
          <button type="button" className="btn btn--primary" onClick={exportPDF}>
            <FileText className="ico" /> PDF
          </button>
        </>
      }
    >
      <section className="kpis">
        <div className="stat stat--dark">
          <div className="stat__label"><span className="stat__ico"><ClipboardList className="ico" /></span>Total Kunjungan</div>
          <div className="stat__value">{filtered.length}</div>
        </div>
        <div className="stat stat--accent">
          <div className="stat__label"><span className="stat__ico"><BarChart3 className="ico" /></span>Kembali Kelas</div>
          <div className="stat__value">{statusCounts['back_to_class'] || 0}</div>
        </div>
        <div className="stat">
          <div className="stat__label"><span className="stat__ico"><FileText className="ico" /></span>Dirujuk</div>
          <div className="stat__value">{statusCounts['referred'] || 0}</div>
        </div>
        <div className="stat">
          <div className="stat__label"><span className="stat__ico"><FileText className="ico" /></span>Dijemput Orang Tua</div>
          <div className="stat__value">{statusCounts['picked_up'] || 0}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <div className="card" style={{ height: '100%' }}>
            <div className="card__head">
              <h2 className="card__title"><BarChart3 className="ico" />Keluhan Terbanyak</h2>
              <div className="card__tools">
                <div className="chips">
                  {ranges.map((r) => (
                    <button key={r.key} type="button" className="chip" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {topComplaints.length === 0 ? (
              <div className="empty">
                <BarChart3 className="ico" />
                <div className="empty__title">Belum ada data</div>
                <div className="empty__text">Tidak ada kunjungan pada periode ini.</div>
              </div>
            ) : (
              <div className="bars">
                {topComplaints.map(([complaint, count], i) => (
                  <div key={complaint} className="bars__col">
                    <div className="bars__track">
                      <span
                        className="bars__bar"
                        style={{ height: `${Math.max((count / maxComplaint) * 100, 8)}%`, background: barTones[i % barTones.length] }}
                        title={`${complaint}: ${count}`}
                      />
                    </div>
                    <span className="bars__lab" title={complaint}>
                      {complaint.length > 10 ? complaint.slice(0, 9) + '…' : complaint}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 content-start">
          <div className="card">
            <div className="card__head">
              <h2 className="card__title"><FileText className="ico" />Status Akhir</h2>
            </div>
            {Object.keys(statusCounts).length === 0 ? (
              <div className="empty" style={{ padding: '20px 8px' }}><div className="empty__text">Belum ada data.</div></div>
            ) : (
              <div className="grid gap-3">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const info = statusMap[status] ?? { label: status.replace('_', ' '), color: 'var(--faint)' };
                  const pct = filtered.length ? Math.round((count / filtered.length) * 100) : 0;
                  return (
                    <div key={status} className="grid gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="dot" style={{ background: info.color }} />
                          {info.label}
                        </span>
                        <span className="font-semibold">{count} <span className="muted">· {pct}%</span></span>
                      </div>
                      <span className="meter">
                        <span className="meter__fill" style={{ width: `${pct}%`, background: info.color }} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card__head">
              <h2 className="card__title"><Search className="ico" />Filter</h2>
            </div>
            <div className="grid gap-3">
              <div className="search w-full">
                <Search className="ico" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama siswa atau NIS…" aria-label="Cari" />
              </div>
              <button type="button" className="btn btn--ghost w-full" onClick={load}>
                <RefreshCw className="ico" /> Segarkan data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title"><ClipboardList className="ico" />Tabel Kunjungan</h2>
          <span className="spill spill--iris"><i />{filtered.length} baris</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Keluhan</th>
                <th>Tindakan</th>
                <th className="r">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty"><div className="empty__title">Memuat…</div></div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <ClipboardList className="ico" />
                      <div className="empty__title">Tidak ada data</div>
                      <div className="empty__text">Tidak ada kunjungan pada periode ini.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const st = statusMap[v.final_status] ?? { label: '-', cls: 'badge badge--plain' };
                  return (
                    <tr key={v.id}>
                      <td className="muted whitespace-nowrap">
                        {new Date(v.check_in_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td><b>{v.students?.full_name ?? '-'}</b><div className="muted text-xs">{v.students?.nis}</div></td>
                      <td className="muted">{v.students?.class ?? '-'}</td>
                      <td className="muted" style={{ maxWidth: 220 }}>{v.chief_complaint ?? '-'}</td>
                      <td className="muted" style={{ maxWidth: 220 }}>{v.treatment ?? '-'}</td>
                      <td className="r"><span className={st.cls}>{st.label}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
