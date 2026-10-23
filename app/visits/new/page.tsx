'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import {
  Search,
  UserRound,
  TestTube,
  AlertCircle,
  Pill,
  Save,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';

type Status = 'back_to_class' | 'referred' | 'picked_up';

const statusOptions: { key: Status; label: string }[] = [
  { key: 'back_to_class', label: 'Kembali ke Kelas' },
  { key: 'referred', label: 'Dirujuk ke Faskes/RS' },
  { key: 'picked_up', label: 'Dijemput Orang Tua' },
];

export default function VisitFormPage() {
  const supabase = createClient();
  const [student, setStudent] = useState<any | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [treatment, setTreatment] = useState('');
  const [finalStatus, setFinalStatus] = useState<Status>('back_to_class');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }
      setSearching(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .or(`full_name.ilike.%${query}%,nis.ilike.%${query}%`)
        .limit(10);
      setResults(error ? [] : data ?? []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selectStudent = (s: any) => {
    setStudent(s);
    setQuery(s.full_name);
    setResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      setError('Pilih siswa terlebih dahulu.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError('Sesi berakhir. Silakan login ulang.');
      return;
    }

    await supabase.from('profiles').upsert(
      { id: user.id, full_name: user.email, role: 'staff' },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    const { data: visit, error } = await supabase
      .from('visits')
      .insert({
        student_id: student.id,
        staff_id: user.id,
        chief_complaint: chiefComplaint,
        temperature: temperature ? parseFloat(temperature) : null,
        blood_pressure: bloodPressure || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        treatment,
        final_status: finalStatus,
        notes,
      })
      .select('id')
      .single();

    if (error || !visit) {
      setSubmitting(false);
      setError(error?.message ?? 'Gagal menyimpan kunjungan.');
      return;
    }

    const meds = treatment.split(',').map((m) => m.trim()).filter(Boolean);
    for (const m of meds) {
      const { data: medsList } = await supabase.from('medicines').select('id,stock').ilike('name', `%${m}%`).limit(1);
      const med = medsList?.[0];
      if (med && (med.stock ?? 0) > 0) {
        await supabase.from('medicines').update({ stock: (med.stock ?? 0) - 1 }).eq('id', med.id);
        await supabase.from('medicine_logs').insert({
          medicine_id: med.id,
          type: 'out',
          qty: 1,
          reference_id: visit.id,
          notes: `Diberikan pada kunjungan siswa ${student.full_name}`,
        });
      }
    }

    setSubmitting(false);
    setStudent(null);
    setQuery('');
    setResults([]);
    setChiefComplaint('');
    setTemperature('');
    setBloodPressure('');
    setWeight('');
    setHeight('');
    setTreatment('');
    setFinalStatus('back_to_class');
    setNotes('');
    alert('Kunjungan berhasil dicatat dan stok obat terupdate.');
  };

  return (
    <AppShell
      title="Catat Kunjungan"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Kunjungan', href: '/visits' }, { label: 'Catat' }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Search */}
        <div className="card">
          <div className="card__head">
            <h2 className="card__title"><Search className="ico" />Cari Siswa</h2>
          </div>
          <div className="search w-full">
            <Search className="ico" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nama atau NIS…"
              aria-label="Cari siswa"
            />
          </div>
          <div style={{ marginTop: 12 }}>
            {searching && <div className="muted text-xs mb-2">Mencari…</div>}
            {results.length === 0 && query && !searching && (
              <div className="empty" style={{ padding: '18px 8px' }}>
                <UserRound className="ico" />
                <div className="empty__text">Tidak ditemukan</div>
              </div>
            )}
            <div className="rows">
              {results.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectStudent(s)}
                  className="row w-full text-left"
                >
                  <span className={`av av--sm ${['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose'][i % 5]}`}>
                    {s.full_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="grow">
                    <b>{s.full_name}</b>
                    <small>{s.nis} · {s.class}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="card">
          <div className="card__head">
            <h2 className="card__title"><UserRound className="ico" />Data Siswa</h2>
          </div>
          {student ? (
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="av av--xl av--sky">{student.full_name.charAt(0).toUpperCase()}</span>
                <div className="min-w-0">
                  <div className="font-semibold" style={{ fontSize: 'var(--fs-lg)' }}>{student.full_name}</div>
                  <div className="muted text-xs">NIS {student.nis} · Kelas {student.class}</div>
                </div>
              </div>
              <div className="grid gap-2">
                {student.blood_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <TestTube className="ico muted" />
                    <span className="muted">Gol. darah</span>
                    <span className="tag tag--sky">{student.blood_type}</span>
                  </div>
                )}
                {student.allergies ? (
                  <div className="note note--bad" style={{ marginTop: 2 }}>
                    <AlertCircle className="ico" />
                    <div><b>Alergi:</b> {student.allergies}</div>
                  </div>
                ) : null}
                {student.chronic_diseases ? (
                  <div className="note note--warn">
                    <Pill className="ico" />
                    <div><b>Penyakit bawaan:</b> {student.chronic_diseases}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="empty">
              <UserRound className="ico" />
              <div className="empty__title">Belum ada siswa dipilih</div>
              <div className="empty__text">Cari dan pilih siswa di panel sebelah.</div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="card">
          <div className="card__head">
            <h2 className="card__title"><Stethoscope className="ico" />Pemeriksaan & Tindakan</h2>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && (
              <div className="note note--bad">
                <AlertCircle className="ico" />
                <div>{error}</div>
              </div>
            )}

            <div className="field field--wide">
              <label className="field__label">Keluhan Utama</label>
              <input
                className="input"
                style={{ borderRadius: 12 }}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Demam, pilek, luka ringan…"
              />
            </div>

            <div className="sheet__grid">
              <div className="field">
                <label className="field__label">Suhu (°C)</label>
                <input
                  className="input"
                  style={{ borderRadius: 12 }}
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="36.5"
                />
              </div>
              <div className="field">
                <label className="field__label">Tekanan Darah</label>
                <input
                  className="input"
                  style={{ borderRadius: 12 }}
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  placeholder="120/80"
                />
              </div>
              <div className="field">
                <label className="field__label">Berat (kg)</label>
                <input
                  className="input"
                  style={{ borderRadius: 12 }}
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label">Tinggi (cm)</label>
                <input
                  className="input"
                  style={{ borderRadius: 12 }}
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
            </div>

            <div className="field field--wide">
              <label className="field__label">Tindakan / Obat</label>
              <input
                className="input"
                style={{ borderRadius: 12 }}
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="Paracetamol, istirahat 30 menit…"
              />
              <span className="field__hint">Nama obat yang disebut otomatis memotong stok.</span>
            </div>

            <div className="field field--wide">
              <label className="field__label">Status Akhir</label>
              <div className="chips">
                {statusOptions.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className="chip"
                    aria-pressed={finalStatus === s.key}
                    onClick={() => setFinalStatus(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field field--wide">
              <label className="field__label">Catatan Tambahan</label>
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan…"
              />
            </div>

            <button type="submit" disabled={submitting || !student} className="btn btn--primary w-full">
              <Save className="ico" />
              {submitting ? 'Menyimpan…' : student ? 'Simpan Kunjungan' : 'Pilih siswa terlebih dahulu'}
            </button>
          </form>
        </div>
      </div>

      <div className="note" style={{ marginTop: 16 }}>
        <ClipboardList className="ico" />
        <div>Catatan: stok obat dipotong otomatis setelah kunjungan berhasil disimpan.</div>
      </div>
    </AppShell>
  );
}
