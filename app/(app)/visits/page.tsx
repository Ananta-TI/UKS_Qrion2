'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { Search, ClipboardList, Plus, Stethoscope } from 'lucide-react';
import Link from 'next/link';

const statusMap: Record<string, { label: string; cls: string }> = {
  back_to_class: { label: 'Kelas', cls: 'badge badge--good' },
  referred: { label: 'Rujukan', cls: 'badge badge--bad' },
  picked_up: { label: 'Orang Tua', cls: 'badge badge--warn' },
};

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];

export default function VisitsPage() {
  const supabase = createClient();
  const [visits, setVisits] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('visits')
        .select('*, students(*)')
        .order('check_in_at', { ascending: false })
        .limit(100);
      setVisits(data ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = visits.filter(
    (v) =>
      !query ||
      v.students?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      v.students?.nis?.includes(query)
  );

  return (
    <AppShell
      title="Rekam Medis"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Kunjungan' }]}
      actions={
        <Link href="/visits/new" prefetch={false} className="btn btn--primary">
          <Plus className="ico" /> Catat Kunjungan
        </Link>
      }
    >
      <div className="card">
        <div className="toolbar">
          <div className="search" style={{ maxWidth: 360, flex: 1 }}>
            <Search className="ico" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama siswa atau NIS…"
              aria-label="Cari kunjungan"
            />
          </div>
          <span className="toolbar__spacer" />
          <span className="spill spill--iris"><i /><CountUp value={filtered.length} /> kunjungan</span>
        </div>

        {loading ? (
          <div className="empty">
            <ClipboardList className="ico" />
            <div className="empty__title">Memuat rekam medis…</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Siswa</th>
                  <th>Kelas</th>
                  <th>Keluhan</th>
                  <th>Vitals</th>
                  <th>Tindakan</th>
                  <th className="r">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">
                        <ClipboardList className="ico" />
                        <div className="empty__title">Belum ada kunjungan</div>
                        <div className="empty__text">Kunjungan yang dicatat akan tampil di sini.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((v, i) => {
                    const st = statusMap[v.final_status] ?? { label: '-', cls: 'badge badge--plain' };
                    const vitals = [
                      v.temperature ? `${v.temperature}°C` : null,
                      v.blood_pressure || null,
                      v.weight ? `${v.weight} kg` : null,
                      v.height ? `${v.height} cm` : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <tr key={v.id}>
                        <td className="muted whitespace-nowrap">
                          {new Date(v.check_in_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td>
                          <div className="cell-person">
                            <span className={`av av--sm ${tones[i % tones.length]}`}>
                              {(v.students?.full_name ?? '?').charAt(0)}
                            </span>
                            <div>
                              <b>{v.students?.full_name ?? '-'}</b>
                              <small>{v.students?.nis}</small>
                            </div>
                          </div>
                        </td>
                        <td className="muted">{v.students?.class ?? '-'}</td>
                        <td className="muted" style={{ maxWidth: 200 }}>{v.chief_complaint ?? '-'}</td>
                        <td className="muted text-xs">{vitals || '-'}</td>
                        <td className="muted" style={{ maxWidth: 200 }}>{v.treatment ?? '-'}</td>
                        <td className="r"><span className={st.cls}>{st.label}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="note" style={{ marginTop: 16 }}>
          <Stethoscope className="ico" />
          <div>Menampilkan maksimum 100 kunjungan terbaru. Gunakan pencarian untuk mempersempit hasil.</div>
        </div>
      )}
    </AppShell>
  );
}
