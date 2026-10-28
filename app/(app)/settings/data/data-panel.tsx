'use client';

import { useEffect, useState } from 'react';
import {
  Database,
  Download,
  FileJson,
  HardDrive,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { CountUp } from '@/components/ui/count-up';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { fetchAllRows } from '@/lib/supabase/paginate';

type Counts = {
  students: number | null;
  visits: number | null;
  medicines: number | null;
};

const emptyCounts: Counts = { students: null, visits: null, medicines: null };

export function DataPanel({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      const [students, visits, medicines] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('visits').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('medicines').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
      ]);

      if (!active) return;
      setCounts({
        students: students.count ?? null,
        visits: visits.count ?? null,
        medicines: medicines.count ?? null,
      });
    }

    load();
    return () => {
      active = false;
    };
  }, [schoolId]);

  async function exportJson() {
    setExporting(true);
    setMessage(null);
    const supabase = createClient();

    const [students, visits, medicines, logs] = await Promise.all([
      fetchAllRows((from, to) =>
        supabase.from('students').select('*').eq('school_id', schoolId).order('full_name').order('id').range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('visits')
          .select('*')
          .eq('school_id', schoolId)
          .order('check_in_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase.from('medicines').select('*').eq('school_id', schoolId).order('name').order('id').range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from('medicine_logs')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to)
      ),
    ]);

    if (students.error || visits.error || medicines.error || logs.error) {
      setMessage('Sebagian data gagal diambil. Coba lagi beberapa saat.');
      setExporting(false);
      return;
    }

    const payload = {
      exported_at: new Date().toISOString(),
      school: { id: schoolId, name: schoolName },
      students: students.data,
      visits: visits.data,
      medicines: medicines.data,
      medicine_logs: logs.data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `uks-${schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    await logClientActivity({
      action: 'export',
      entity: 'school',
      entityId: schoolId,
      summary: `Mengekspor seluruh data ${schoolName}`,
      metadata: {
        students: students.data?.length ?? 0,
        visits: visits.data?.length ?? 0,
        medicines: medicines.data?.length ?? 0,
      },
    });

    setMessage('Ekspor selesai. Berkas JSON tersimpan di perangkat Anda.');
    setExporting(false);
  }

  return (
    <div className="set-grid">
      <div className="set-stack">
        <section className="card">
          <div className="card__head">
            <div className="card__title">
              <Database className="ico" />
              <span>
                Data sekolah
                <span className="card__sub">Ringkasan isi database untuk {schoolName}.</span>
              </span>
            </div>
          </div>

          <div className="set-data-grid">
            <div className="set-data">
              <small>Siswa</small>
              <b>{counts.students === null ? '—' : <CountUp value={counts.students} />}</b>
            </div>
            <div className="set-data">
              <small>Kunjungan</small>
              <b>{counts.visits === null ? '—' : <CountUp value={counts.visits} />}</b>
            </div>
            <div className="set-data">
              <small>Jenis obat</small>
              <b>{counts.medicines === null ? '—' : <CountUp value={counts.medicines} />}</b>
            </div>
          </div>

          <div className="set-note">
            <FileJson className="ico" />
            <div>
              <b>Ekspor seluruh data</b>
              <p>
                Unduh siswa, kunjungan, dan inventaris dalam satu berkas JSON. Cocok untuk arsip atau migrasi ke
                sistem lain.
              </p>
            </div>
            <button type="button" className="btn btn--primary btn--sm" onClick={exportJson} disabled={exporting}>
              {exporting ? <Loader2 className="ico spin" /> : <Download className="ico" />}
              {exporting ? 'Menyiapkan…' : 'Unduh JSON'}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <div className="card__title">
              <HardDrive className="ico" />
              <span>
                Keamanan data
                <span className="card__sub">Data sekolah hanya dapat diakses oleh akun yang berwenang.</span>
              </span>
            </div>
          </div>

          <div className="note note--ok">
            <ShieldCheck className="ico" />
            <span>
              Data terikat ke sekolah Anda melalui aturan akses Supabase. Ekspor hanya memuat baris milik sekolah
              ini.
            </span>
          </div>
        </section>
      </div>

      <aside className="card set-live">
        <div className="card__head">
          <div className="card__title">
            <ShieldCheck className="ico" />
            <span>
              Penyimpanan aman
              <span className="card__sub">Kontrol data yang bisa Anda lakukan.</span>
            </span>
          </div>
        </div>

        <div className="set-facts">
          <div className="set-fact">
            <b>Ekspor kapan saja</b>
            <small>Berkas JSON berisi data mentah yang mudah dibaca.</small>
          </div>
          <div className="set-fact">
            <b>Tanpa hapus massal</b>
            <small>Penghapusan data sekolah dilakukan lewat admin Qrion.</small>
          </div>
          <div className="set-fact">
            <b>Terpisah per sekolah</b>
            <small>Setiap kueri dibatasi oleh <code>school_id</code>.</small>
          </div>
        </div>

        {message && <div className="note note--ok">{message}</div>}
      </aside>
    </div>
  );
}
