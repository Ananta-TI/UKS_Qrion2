'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { Search, ClipboardList, Plus, Stethoscope, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { visitStatusLabel, visitStatusLabels } from '@/lib/visit-status';

type VisitRow = {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  chief_complaint: string | null;
  temperature: number | null;
  blood_pressure: string | null;
  weight: number | null;
  height: number | null;
  treatment: string | null;
  final_status: string | null;
  notes: string | null;
  students?: { full_name: string | null; nis: string | null; class: string | null } | null;
};

type SchoolInfo = {
  name: string | null;
  address: string | null;
  phone: string | null;
};

const statusMap: Record<string, { label: string; cls: string }> = {
  back_to_class: { label: visitStatusLabels.back_to_class, cls: 'badge badge--good' },
  referred: { label: visitStatusLabels.referred, cls: 'badge badge--bad' },
  picked_up: { label: visitStatusLabels.picked_up, cls: 'badge badge--warn' },
};

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function shortTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/** Modal cetak dirender di body agar tidak terkurung ancestor yang punya transform. */
function PrintPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

export default function VisitsPage() {
  const supabase = createClient();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [printVisit, setPrintVisit] = useState<VisitRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.from('schools').select('name,address,phone').limit(1).maybeSingle();
      if (!cancelled && data) setSchool(data as SchoolInfo);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();

    // Daftar awal dibatasi 100 kunjungan terbaru. Saat mencari, pencarian
    // dijalankan ke server agar menjangkau seluruh riwayat, bukan hanya 100 baris.
    const timer = setTimeout(async () => {
      setLoading(true);
      let rows: VisitRow[] = [];

      if (!term) {
        const { data } = await supabase
          .from('visits')
          .select('*, students(*)')
          .order('check_in_at', { ascending: false })
          .limit(100);
        rows = (data ?? []) as unknown as VisitRow[];
      } else {
        const { data: matches } = await supabase
          .from('students')
          .select('id')
          .or(`full_name.ilike.%${term}%,nis.ilike.%${term}%`)
          .limit(200);
        const ids = (matches ?? []).map((s) => s.id);

        if (ids.length) {
          const { data } = await supabase
            .from('visits')
            .select('*, students(*)')
            .in('student_id', ids)
            .order('check_in_at', { ascending: false })
            .limit(100);
          rows = (data ?? []) as unknown as VisitRow[];
        }
      }

      if (cancelled) return;
      setVisits(rows);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!printVisit) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPrintVisit(null);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [printVisit]);

  const filtered = visits;

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
                  <th className="r">Cetak</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">
                        <ClipboardList className="ico" />
                        <div className="empty__title">Belum ada kunjungan</div>
                        <div className="empty__text">Kunjungan yang dicatat akan tampil di sini.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((v, i) => {
                    const st = statusMap[v.final_status ?? ''] ?? { label: '-', cls: 'badge badge--plain' };
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
                        <td className="r">
                          <button
                            type="button"
                            className="ibtn"
                            onClick={() => setPrintVisit(v)}
                            aria-label={`Cetak surat untuk ${v.students?.full_name ?? 'kunjungan'}`}
                            title="Cetak surat izin pulang"
                          >
                            <Printer className="ico" strokeWidth={1.7} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!query.trim() && visits.length > 0 && (
        <div className="note" style={{ marginTop: 16 }}>
          <Stethoscope className="ico" />
          <div>Menampilkan 100 kunjungan terbaru. Ketik nama atau NIS untuk mencari di seluruh riwayat.</div>
        </div>
      )}

      {printVisit && (
        <PrintPortal>
          <div className="overlay print-overlay" onClick={() => setPrintVisit(null)}>
            <div
              className="sheet print-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Surat izin pulang"
            >
              <div className="print-sheet__noprint print-sheet__bar">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPrintVisit(null)}>
                  <X className="ico" /> Tutup
                </button>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()}>
                  <Printer className="ico" /> Cetak
                </button>
              </div>

              <div className="print-sheet__doc">
                <div className="print-sheet__masthead">
                  <div className="print-sheet__school">{school?.name ?? 'Unit Kesehatan Sekolah'}</div>
                  <div className="print-sheet__schoolsub">
                    {[school?.address, school?.phone].filter(Boolean).join(' · ') || 'Unit Kesehatan Sekolah'}
                  </div>
                </div>

                <div className="print-sheet__kind">Surat Izin Pulang</div>
                <div className="print-sheet__kindline" />

                <p className="print-sheet__lead">
                  Yang bertanda tangan di bawah ini, petugas Unit Kesehatan Sekolah (UKS), menerangkan bahwa siswa
                  berikut telah mendapatkan pemeriksaan dan penanganan:
                </p>

                <table className="print-sheet__fields">
                  <tbody>
                    <tr>
                      <th>Nama</th>
                      <td>{printVisit.students?.full_name ?? '-'}</td>
                    </tr>
                    <tr>
                      <th>NIS</th>
                      <td>{printVisit.students?.nis ?? '-'}</td>
                    </tr>
                    <tr>
                      <th>Kelas</th>
                      <td>{printVisit.students?.class ?? '-'}</td>
                    </tr>
                    <tr>
                      <th>Waktu datang</th>
                      <td>
                        {longDate(printVisit.check_in_at)} · {shortTime(printVisit.check_in_at)}
                      </td>
                    </tr>
                    <tr>
                      <th>Keluhan</th>
                      <td>{printVisit.chief_complaint || '-'}</td>
                    </tr>
                    <tr>
                      <th>Tindakan</th>
                      <td>{printVisit.treatment || '-'}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="print-sheet__lead">
                  Berdasarkan hasil pemeriksaan, siswa tersebut diizinkan pulang untuk beristirahat dan/atau
                  melanjutkan penanganan di rumah, dengan status akhir{' '}
                  <b>{visitStatusLabel(printVisit.final_status)}</b>.
                </p>

                <div className="print-sheet__sign">
                  <div>
                    <div className="print-sheet__signdate">
                      {longDate(printVisit.check_out_at ?? printVisit.check_in_at)}
                    </div>
                    <div className="print-sheet__signrole">Petugas UKS</div>
                    <div className="print-sheet__signname">(&hellip;&hellip;&hellip;&hellip;&hellip;&hellip;&hellip;&hellip;)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PrintPortal>
      )}
    </AppShell>
  );
}
