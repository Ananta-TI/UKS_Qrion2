'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { AppShell } from '@/components/layout/app-shell';
import { visitStatusLabels } from '@/lib/visit-status';
import type { DispenseResult, MedicineBatchRow, MedicineRow, StudentRow } from '@/lib/database.types';
import { ageFromBirthDate } from '@/lib/utils';
import {
  Search,
  UserRound,
  TestTube,
  AlertCircle,
  Pill,
  Save,
  Stethoscope,
  ClipboardList,
  X,
  Plus,
  Minus,
  History,
} from 'lucide-react';

type Status = 'back_to_class' | 'referred' | 'picked_up';

/** Saran keluhan dari riwayat: teks + berapa kali pernah dipakai. */
type ComplaintSuggestion = { text: string; count: number };

const statusOptions: { key: Status; label: string }[] = [
  { key: 'back_to_class', label: visitStatusLabels.back_to_class },
  { key: 'referred', label: visitStatusLabels.referred },
  { key: 'picked_up', label: visitStatusLabels.picked_up },
];

export default function VisitFormPage() {
  return (
    <Suspense
      fallback={
        <div className="empty">
          <div className="empty__title">Memuat form…</div>
        </div>
      }
    >
      <VisitForm />
    </Suspense>
  );
}

function VisitForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentRow[]>([]);
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

  // Obat yang diberikan pada kunjungan ini, dipilih dari inventaris.
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [batches, setBatches] = useState<MedicineBatchRow[]>([]);
  const [medQuery, setMedQuery] = useState('');
  const [selectedMeds, setSelectedMeds] = useState<
    {
      id: string;
      name: string;
      unit: string | null;
      dosage: string | null;
      qty: number;
      stock: number;
    }[]
  >([]);

  // Saran keluhan utama: diambil dari riwayat kunjungan sekolah ini,
  // diurutkan dari yang paling sering dipakai. RLS membatasi ke sekolah sendiri.
  const [complaintSuggestions, setComplaintSuggestions] = useState<ComplaintSuggestion[]>([]);
  const [complaintOpen, setComplaintOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('visits')
        .select('chief_complaint')
        .not('chief_complaint', 'is', null)
        .order('check_in_at', { ascending: false, nullsFirst: false })
        .limit(1000);
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const text = (row.chief_complaint ?? '').trim();
        if (!text) continue;
        counts.set(text, (counts.get(text) ?? 0) + 1);
      }
      const ranked = [...counts.entries()]
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
      setComplaintSuggestions(ranked);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complaintQuery = chiefComplaint.trim().toLowerCase();
  const complaintResults = complaintQuery
    ? complaintSuggestions
        .filter(
          (s) =>
            s.text.toLowerCase().includes(complaintQuery) &&
            s.text.toLowerCase() !== complaintQuery
        )
        .slice(0, 6)
    : [];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('medicines')
        .select('*')
        .order('name', { ascending: true });
      setMedicines(data ?? []);
    })();

    // Batch dipakai untuk menampilkan sisa per kedaluwarsa (FIFO) sebelum
    // obat diberikan, supaya petugas UKS tahu mana yang harus dipakai dulu.
    (async () => {
      const { data } = await supabase
        .from('medicine_batches')
        .select('*')
        .gt('qty', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false });
      setBatches((data ?? []) as MedicineBatchRow[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Ringkasan batch terdekat kedaluwarsa untuk satu obat. */
  function fifoOf(id: string) {
    const list = batches.filter((b) => b.medicine_id === id && (b.qty ?? 0) > 0);
    if (list.length === 0) return null;
    const first = list[0];
    return {
      qty: first.qty ?? 0,
      expiry: first.expiry_date
        ? new Date(first.expiry_date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      more: list.length - 1,
    };
  }

  const medResults = medQuery.trim()
    ? medicines
        .filter((m) => {
          const t = medQuery.trim().toLowerCase();
          return m.name?.toLowerCase().includes(t) || (m.category ?? '').toLowerCase().includes(t);
        })
        .slice(0, 6)
    : [];

  function addMed(m: MedicineRow) {
    if ((m.stock ?? 0) <= 0) {
      toast.error(`Stok ${m.name} habis. Tambah stok dulu di halaman Inventaris.`, 'Stok Habis');
      return;
    }
    setSelectedMeds((prev) => {
      const existing = prev.find((p) => p.id === m.id);
      if (existing) {
        return prev.map((p) => (p.id === m.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, {
        id: m.id,
        name: m.name,
        unit: m.unit ?? null,
        dosage: m.dosage ?? null,
        qty: 1,
        stock: m.stock ?? 0,
      }];
    });
    setMedQuery('');
  }

  function changeQty(id: string, qty: number) {
    setSelectedMeds((prev) => prev.map((p) => (p.id === id ? { ...p, qty } : p)));
  }

  function removeMed(id: string) {
    setSelectedMeds((prev) => prev.filter((p) => p.id !== id));
  }

  useEffect(() => {
    const id = searchParams.get('student');
    const card = searchParams.get('card')?.trim();
    if (!id && !card) return;
    (async () => {
      if (id) {
        const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
        if (data) {
          setStudent(data);
          setQuery(data.full_name);
        }
        return;
      }

      // Buka form dari kode kartu (mis. tautan langsung atau scan tanpa
      // melewati listener global). Kolom card_code berasal dari migrasi 012.
      if (!card) return;
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('card_code', card)
        .maybeSingle();

      if (error) {
        const msg =
          error.code === '42703' || /card_code/i.test(error.message)
            ? 'Fitur kartu belum aktif. Jalankan migrasi 012_student_card_code.sql di Supabase.'
            : `Gagal membaca kartu: ${error.message}`;
        toast.error(msg, 'Kartu Belum Aktif');
        return;
      }

      if (!data) {
        toast.error(`Kode ${card} belum terdaftar di data siswa.`, 'Kartu Tidak Dikenal');
        return;
      }

      setStudent(data);
      setQuery(data.full_name);
      toast.success(`Kartu dikenali: ${data.full_name}`, 'Kartu Siswa');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const selectStudent = (s: StudentRow) => {
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

    const ok = await confirm({
      title: 'Simpan kunjungan?',
      message: `Kunjungan ${student.full_name} akan dicatat.${
        chiefComplaint.trim() ? ` Keluhan: ${chiefComplaint.trim()}.` : ''
      }`,
      detail:
        selectedMeds.length > 0
          ? `${selectedMeds.length} obat akan diberikan dan stoknya dikurangi otomatis.`
          : undefined,
      confirmLabel: 'Ya, simpan kunjungan',
    });
    if (!ok) return;

    setError(null);
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      const msg = 'Sesi berakhir. Silakan login ulang.';
      setError(msg);
      toast.error(msg, 'Sesi Berakhir');
      return;
    }

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
      const msg = error?.message ?? 'Gagal menyimpan kunjungan.';
      setError(msg);
      toast.error(msg, 'Kunjungan Gagal Disimpan');
      return;
    }

    const dispensed: string[] = [];
    const skipped: string[] = [];

    // Jalur utama: RPC atomik di database (mengunci baris obat).
    let handled = false;
    if (selectedMeds.length > 0) {
      const items = selectedMeds.map((m) => ({ id: m.id, qty: m.qty, name: m.name }));
      const { data: rpcData, error: rpcError } = await supabase.rpc('dispense_medicines', {
        p_visit_id: visit.id,
        p_items: items,
        p_note: `Diberikan pada kunjungan siswa ${student.full_name}`,
      });

      if (!rpcError && rpcData) {
        const result = rpcData as unknown as DispenseResult;
        for (const d of result.dispensed ?? []) dispensed.push(`${d.name} ×${d.qty}`);
        for (const s of result.skipped ?? []) {
          if (s.reason === 'insufficient') skipped.push(`${s.name} (hanya ${s.given ?? 0} tersedia)`);
          else if (s.reason === 'empty') skipped.push(`${s.name} (stok habis)`);
          else if (s.reason === 'not_found') skipped.push(`${s.name} (tidak ditemukan)`);
          else skipped.push(s.name);
        }
        handled = true;
      }
    }

    // Fallback bila migrasi RPC belum dijalankan: compare-and-set lama.
    if (!handled) {
      for (const item of selectedMeds) {
        // Baca stok terkini supaya pengurangan akurat walau ada perubahan bersamaan.
        const { data: fresh } = await supabase
          .from('medicines')
          .select('id,stock,name')
          .eq('id', item.id)
          .maybeSingle();

        const available = fresh?.stock ?? 0;
        if (!fresh || available <= 0) {
          skipped.push(`${item.name} (stok habis)`);
          continue;
        }

        const take = Math.min(item.qty, available);
        // Compare-and-set: hanya terapkan bila stok masih sama dengan yang dibaca.
        const { data: updated } = await supabase
          .from('medicines')
          .update({ stock: available - take })
          .eq('id', fresh.id)
          .eq('stock', available)
          .select('id')
          .maybeSingle();

        if (!updated) {
          skipped.push(`${item.name} (stok berubah, coba lagi)`);
          continue;
        }

        await supabase.from('medicine_logs').insert({
          medicine_id: fresh.id,
          type: 'out',
          qty: take,
          reference_id: visit.id,
          notes: `Diberikan pada kunjungan siswa ${student.full_name}`,
        });
        dispensed.push(`${fresh.name} ×${take}`);
      }
    }

    await logClientActivity({
      action: 'create',
      entity: 'visit',
      entityId: visit.id,
      summary: `Mencatat kunjungan ${student.full_name}${chiefComplaint ? ` — ${chiefComplaint}` : ''}`,
      metadata: { final_status: finalStatus, treatment: treatment || null, student_id: student.id },
    });

    if (dispensed.length > 0) {
      await logClientActivity({
        action: 'stock_out',
        entity: 'medicine',
        summary: `Memotong stok obat: ${dispensed.join(', ')}`,
        metadata: { visit_id: visit.id, medicines: dispensed },
      });
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
    setSelectedMeds([]);
    setMedQuery('');

    if (skipped.length > 0) {
      toast.error(`Stok tidak cukup untuk: ${skipped.join(', ')}.`, 'Sebagian Obat Dilewati');
    }
    toast.success(
      dispensed.length > 0
        ? `Kunjungan dicatat. Stok dipotong: ${dispensed.join(', ')}.`
        : 'Kunjungan berhasil dicatat.',
      'Kunjungan Tersimpan'
    );
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
          <span className="field__hint">
            Scan kartu siswa di halaman mana pun untuk membuka form ini otomatis.
          </span>
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
                  {(student.gender || student.birth_date) && (
                    <div className="muted text-xs" style={{ marginTop: 2 }}>
                      {student.gender === 'L'
                        ? 'Laki-laki'
                        : student.gender === 'P'
                          ? 'Perempuan'
                          : ''}
                      {student.gender && student.birth_date ? ' · ' : ''}
                      {student.birth_date
                        ? `${
                            ageFromBirthDate(student.birth_date) !== null
                              ? `${ageFromBirthDate(student.birth_date)} tahun`
                              : ''
                          }`
                        : ''}
                    </div>
                  )}
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
              <div className="combo">
                <input
                  className="input"
                  style={{ borderRadius: 12 }}
                  value={chiefComplaint}
                  onChange={(e) => {
                    setChiefComplaint(e.target.value);
                    setComplaintOpen(true);
                  }}
                  onFocus={() => setComplaintOpen(true)}
                  onBlur={() => setTimeout(() => setComplaintOpen(false), 120)}
                  placeholder="Demam, pilek, luka ringan…"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={complaintOpen && complaintResults.length > 0}
                  aria-controls="complaint-suggestions"
                  aria-autocomplete="list"
                />

                {complaintOpen && complaintResults.length > 0 && (
                  <div className="combo__menu" id="complaint-suggestions" role="listbox">
                    {complaintResults.map((s) => (
                      <button
                        key={s.text}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="combo__opt"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setChiefComplaint(s.text);
                          setComplaintOpen(false);
                        }}
                      >
                        <History className="ico muted" />
                        <span className="grow">{s.text}</span>
                        <span className="combo__count">{s.count}×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {complaintOpen && complaintResults.length > 0 && (
                <span className="field__hint">Dari keluhan yang pernah dicatat di sekolah ini.</span>
              )}
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
              <label className="field__label">Tindakan</label>
              <input
                className="input"
                style={{ borderRadius: 12 }}
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="Kompres, istirahat 30 menit, rujuk…"
              />
              <span className="field__hint">Catatan tindakan selain pemberian obat.</span>
            </div>

            <div className="field field--wide">
              <label className="field__label">Obat Diberikan</label>
              <div className="medpick">
                <div className="medpick__search">
                  <Search className="ico" />
                  <input
                    value={medQuery}
                    onChange={(e) => setMedQuery(e.target.value)}
                    placeholder="Cari obat dari inventaris…"
                    aria-label="Cari obat"
                  />
                </div>

                <div className="medpick__body">
                  {medQuery.trim() &&
                    (medResults.length === 0 ? (
                      <div className="medpick__empty">Obat tidak ditemukan di inventaris.</div>
                    ) : (
                      <div className="medpick__list">
                        {medResults.map((m) => {
                          const fifo = fifoOf(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => addMed(m)}
                              className="medpick__opt"
                            >
                              <span className="av av--sm av--teal">
                                <Pill className="ico" />
                              </span>
                              <div className="grow">
                                <b>{m.name}</b>
                                <div className="medmeta">
                                  <span className="medmeta__line">
                                    {m.category || 'Tanpa kategori'} · stok <b>{m.stock ?? 0}</b>{' '}
                                    {m.unit ?? ''}
                                  </span>
                                  {m.dosage && (
                                    <span className="medmeta__line">Dosis: {m.dosage}</span>
                                  )}
                                  <span className="medmeta__line">
                                    {fifo
                                      ? `Batch terdekat: ${fifo.qty} ${m.unit ?? ''}${
                                          fifo.expiry ? ` s.d. ${fifo.expiry}` : ''
                                        }${fifo.more > 0 ? ` · +${fifo.more} batch` : ''}`
                                      : 'Belum ada batch tercatat'}
                                  </span>
                                </div>
                              </div>
                              <Plus className="ico muted" />
                            </button>
                          );
                        })}
                      </div>
                    ))}

                  {selectedMeds.length > 0 && (
                    <>
                      <div className="medpick__selhead">Obat dipilih</div>
                      <div className="medpick__sel">
                        {selectedMeds.map((s) => {
                          const fifo = fifoOf(s.id);
                          return (
                            <div key={s.id} className="medpick__selrow">
                              <span className="av av--sm av--amber">
                                <Pill className="ico" />
                              </span>
                              <div className="grow">
                                <b>{s.name}</b>
                                <div className="medmeta">
                                  <span className="medmeta__line">
                                    Stok tersedia <b>{s.stock}</b> {s.unit ?? ''}
                                  </span>
                                  {s.dosage && (
                                    <span className="medmeta__line">Dosis: {s.dosage}</span>
                                  )}
                                  {fifo && (
                                    <span className="medmeta__line">
                                      Pakai dulu {fifo.qty} {s.unit ?? ''}
                                      {fifo.expiry ? ` (exp ${fifo.expiry})` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="medpick__qty">
                                <button
                                  type="button"
                                  className="ibtn"
                                  onClick={() => changeQty(s.id, Math.max(1, s.qty - 1))}
                                  aria-label={`Kurangi ${s.name}`}
                                >
                                  <Minus className="ico" />
                                </button>
                                <b>{s.qty}</b>
                                <button
                                  type="button"
                                  className="ibtn"
                                  onClick={() => changeQty(s.id, Math.min(s.stock || s.qty, s.qty + 1))}
                                  aria-label={`Tambah ${s.name}`}
                                >
                                  <Plus className="ico" />
                                </button>
                                <button
                                  type="button"
                                  className="ibtn"
                                  onClick={() => removeMed(s.id)}
                                  aria-label={`Hapus ${s.name}`}
                                  style={{ color: 'var(--bad)' }}
                                >
                                  <X className="ico" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="medpick__hint">
                    Stok obat berkurang otomatis sesuai jumlah yang dipilih.
                  </div>
                </div>
              </div>
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
        <div>Catatan: obat yang dipilih pada panel Obat Diberikan akan memotong stok otomatis setelah kunjungan disimpan.</div>
      </div>
    </AppShell>
  );
}
