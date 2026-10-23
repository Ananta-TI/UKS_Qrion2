'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import {
  Search,
  AlertCircle,
  TestTube,
  Pill,
  UserRound,
  Stethoscope,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];

export default function StudentsPage() {
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query) {
        setStudents([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('students')
        .select('*')
        .or(`full_name.ilike.%${query}%,nis.ilike.%${query}%`)
        .limit(24);
      setStudents(data ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <AppShell
      title="Cari Siswa"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Siswa' }]}
      actions={
        <Link href="/visits/new" className="btn btn--primary">
          <Plus className="ico" /> Catat Kunjungan
        </Link>
      }
    >
      <div className="toolbar">
        <div className="search w-full" style={{ maxWidth: 460, flex: 1 }}>
          <Search className="ico" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama atau NIS…"
            autoFocus
            aria-label="Cari siswa"
          />
        </div>
        <span className="toolbar__spacer" />
        {loading && <span className="muted text-xs">Mencari…</span>}
      </div>

      {!query && (
        <div className="card">
          <div className="empty">
            <Search className="ico" />
            <div className="empty__title">Mulai mencari siswa</div>
            <div className="empty__text">Ketik nama atau NIS untuk melihat data dasar, alergi, dan penyakit bawaan.</div>
          </div>
        </div>
      )}

      {query && !loading && students.length === 0 && (
        <div className="card">
          <div className="empty">
            <UserRound className="ico" />
            <div className="empty__title">Siswa tidak ditemukan</div>
            <div className="empty__text">Periksa ejaan nama atau NIS, lalu coba lagi.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {students.map((s, i) => (
          <div key={s.id} className="card">
            <div className="flex items-center gap-3">
              <span className={`av av--lg ${tones[i % tones.length]}`}>
                {s.full_name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="font-semibold truncate" style={{ fontSize: 'var(--fs-lg)' }}>{s.full_name}</div>
                <div className="muted text-xs">NIS {s.nis} · Kelas {s.class ?? '-'}</div>
              </div>
            </div>

            <div className="grid gap-2 mt-4">
              {s.blood_type && (
                <div className="flex items-center gap-2 text-sm">
                  <TestTube className="ico muted" />
                  <span className="muted">Gol. darah</span>
                  <span className="tag tag--sky">{s.blood_type}</span>
                </div>
              )}
              {s.allergies && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="ico" style={{ color: 'var(--bad)', marginTop: 1 }} />
                  <span style={{ color: 'var(--bad)' }}>Alergi: {s.allergies}</span>
                </div>
              )}
              {s.chronic_diseases && (
                <div className="flex items-start gap-2 text-sm">
                  <Pill className="ico" style={{ color: 'var(--warn)', marginTop: 1 }} />
                  <span style={{ color: 'var(--warn)' }}>Riwayat: {s.chronic_diseases}</span>
                </div>
              )}
            </div>

            <Link href="/visits/new" className="btn btn--ghost btn--sm w-full mt-4">
              <Stethoscope className="ico" /> Catat Kunjungan
            </Link>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
