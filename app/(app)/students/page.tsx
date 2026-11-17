'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { useToast } from '@/components/ui/toast';
import { fetchAllRows } from '@/lib/supabase/paginate';
import { downloadCsv } from '@/lib/csv';
import { useViewMode, ViewToggle } from '@/components/ui/view-toggle';
import { useMediaQuery } from '@/lib/use-media-query';
import { ageFromBirthDate, formatDateId } from '@/lib/utils';
import type { StudentGender } from '@/lib/database.types';
import {
  Search,
  AlertCircle,
  TestTube,
  Pill,
  UserRound,
  Stethoscope,
  Pencil,
  Trash2,
  Save,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Chevron,
  VenusAndMars,
  BadgeCheck,
} from 'lucide-react';

type StudentRow = {
  id: string;
  nis: string;
  full_name: string;
  class: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_diseases: string | null;
  /** Ada bila migrasi 012 (kode kartu) sudah dijalankan. */
  card_code?: string | null;
  gender: StudentGender | null;
  birth_date: string | null;
};

type FormState = {
  nis: string;
  full_name: string;
  class: string;
  blood_type: string;
  allergies: string;
  chronic_diseases: string;
  gender: '' | StudentGender;
  birth_date: string;
};

/** Label jenis kelamin untuk tampilan. */
function genderLabel(gender: StudentGender | null) {
  if (gender === 'L') return 'Laki-laki';
  if (gender === 'P') return 'Perempuan';
  return null;
}

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];
const PAGE_SIZE = 25;

/** Modal dirender di body agar tidak terkurung ancestor yang punya transform. */
function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

export default function StudentsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  // Migrasi 011 (gender & tanggal lahir) dan 012 (kode kartu) mungkin belum
  // dijalankan; halaman tetap jalan tanpa kolom yang belum ada.
  const [demographics, setDemographics] = useState(true);
  const { view, setView } = useViewMode('students');
  // Di layar kecil selalu pakai mode kartu; toggle-nya disembunyikan.
  const isDesktop = useMediaQuery('(min-width: 761px)');
  const effectiveView = isDesktop ? view : 'grid';

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<FormState>({
    nis: '',
    full_name: '',
    class: '',
    blood_type: '',
    allergies: '',
    chronic_diseases: '',
    gender: '',
    birth_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    const base = 'id,nis,full_name,class,blood_type,allergies,chronic_diseases';

    // Coba kombinasi kolom dari yang paling lengkap. Kolom dari migrasi yang
    // belum dijalankan akan dilewati agar daftar siswa tetap tampil.
    const attempts = [
      { columns: `${base},card_code,gender,birth_date`, demographics: true },
      { columns: `${base},gender,birth_date`, demographics: true },
      { columns: `${base},card_code`, demographics: false },
      { columns: base, demographics: false },
    ];

    const timer = setTimeout(async () => {
      setLoading(true);

      const run = (columns: string) => {
        let req = supabase
          .from('students')
          .select(columns, { count: 'exact' })
          .order('full_name', { ascending: true })
          .order('id', { ascending: true })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (term) {
          req = req.or(`full_name.ilike.%${term}%,nis.ilike.%${term}%`);
        }
        return req;
      };

      let rows: unknown[] = [];
      let totalCount = 0;

      for (const attempt of attempts) {
        const result = await run(attempt.columns);
        if (result.error) continue;

        rows = result.data ?? [];
        totalCount = result.count ?? 0;
        if (!cancelled) setDemographics(attempt.demographics);
        break;
      }

      if (!cancelled) {
        setStudents(rows as unknown as StudentRow[]);
        setTotal(totalCount);
        setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, reloadKey]);

  function openEdit(s: StudentRow) {
    setEditing(s);
    setForm({
      nis: s.nis,
      full_name: s.full_name,
      class: s.class ?? '',
      blood_type: s.blood_type ?? '',
      allergies: s.allergies ?? '',
      chronic_diseases: s.chronic_diseases ?? '',
      gender: s.gender ?? '',
      birth_date: s.birth_date ?? '',
    });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    const nis = form.nis.trim();
    const fullName = form.full_name.trim();

    if (!nis || !fullName) {
      setFormError('NIS dan nama lengkap wajib diisi.');
      return;
    }

    if (!editing) return;

    setSaving(true);
    setFormError(null);

    const payload = {
      nis,
      full_name: fullName,
      class: form.class.trim() || null,
      blood_type: form.blood_type || null,
      allergies: form.allergies.trim(),
      chronic_diseases: form.chronic_diseases.trim(),
      ...(demographics
        ? { gender: form.gender || null, birth_date: form.birth_date || null }
        : {}),
    };

    const { data: saved, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', editing.id)
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      const duplicate =
        error.message.includes('duplicate key') || error.message.includes('students_school_nis_key');
      const msg = duplicate ? 'NIS sudah digunakan oleh siswa lain di sekolah ini.' : error.message;
      setFormError(msg);
      toast.error(msg, 'Gagal Memperbarui Siswa');
      return;
    }

    await logClientActivity({
      action: 'update',
      entity: 'student',
      entityId: (saved as { id: string } | null)?.id ?? editing.id,
      summary: `Memperbarui data siswa ${fullName}`,
      metadata: { nis, class: payload.class },
    });

    setOpen(false);
    toast.success(`Data ${fullName} berhasil diperbarui.`);
    setReloadKey((k) => k + 1);
  }

  async function remove(s: StudentRow) {
    const ok = window.confirm(
      `Hapus siswa ${s.full_name}? Seluruh riwayat kunjungan siswa ini juga akan terhapus dan tidak bisa dikembalikan.`
    );
    if (!ok) return;

    setDeletingId(s.id);
    const { error } = await supabase.from('students').delete().eq('id', s.id);
    setDeletingId(null);

    if (error) {
      toast.error(`Gagal menghapus ${s.full_name}: ${error.message}`);
      return;
    }

    await logClientActivity({
      action: 'delete',
      entity: 'student',
      entityId: s.id,
      summary: `Menghapus siswa ${s.full_name}`,
      metadata: { nis: s.nis, class: s.class },
    });

    toast.success(`${s.full_name} berhasil dihapus.`, 'Siswa Dihapus');
    setReloadKey((k) => k + 1);
  }

  async function exportCsv() {
    setExporting(true);
    const columns = demographics
      ? 'id,nis,full_name,class,gender,birth_date,blood_type,allergies,chronic_diseases'
      : 'id,nis,full_name,class,blood_type,allergies,chronic_diseases';
    const { data, error } = await fetchAllRows<StudentRow>((from, to) =>
      supabase
        .from('students')
        .select(columns)
        .order('full_name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );

    if (error) {
      setExporting(false);
      toast.error(`Gagal mengekspor: ${error.message}`, 'Ekspor Gagal');
      return;
    }

    downloadCsv(`data-siswa-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['NIS', 'Nama', 'Kelas', 'Jenis Kelamin', 'Tanggal Lahir', 'Golongan Darah', 'Alergi', 'Riwayat Penyakit'],
      ...data.map((s) => [
        s.nis,
        s.full_name,
        s.class,
        genderLabel(s.gender) ?? '',
        s.birth_date ?? '',
        s.blood_type,
        s.allergies,
        s.chronic_diseases,
      ]),
    ]);

    await logClientActivity({
      action: 'export',
      entity: 'student',
      summary: `Mengekspor ${data.length} data siswa ke CSV`,
      metadata: { count: data.length },
    });

    setExporting(false);
    toast.success(`${data.length} data siswa diekspor.`, 'Ekspor Selesai');
  }

  const rangeFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeTo = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <AppShell
      title="Data Siswa"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Siswa' }]}
      actions={
        <Link href="/visits/new" prefetch={false} className="btn btn--ghost">
          <Stethoscope className="ico" /> Catat Kunjungan
        </Link>
      }
    >
      <div className="toolbar">
        <div className="search w-full" style={{ maxWidth: 420, flex: 1 }}>
          <Search className="ico" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Ketik nama atau NIS…"
            aria-label="Cari siswa"
          />
        </div>
        <span className="toolbar__spacer" />
        {isDesktop && <ViewToggle value={view} onChange={setView} label="Mode tampilan data siswa" />}
        <button type="button" className="btn btn--ghost btn--sm" onClick={exportCsv} disabled={exporting}>
          <Download className="ico" /> {exporting ? 'Menyiapkan…' : 'Ekspor CSV'}
        </button>
        {loading ? (
          <span className="muted text-xs">Memuat…</span>
        ) : (
          <span className="spill spill--iris">
            <i /> <CountUp value={total} /> siswa
          </span>
        )}
      </div>

      {!loading && students.length === 0 && (
        <div className="card">
          <div className="empty">
            <UserRound className="ico" />
            <div className="empty__title">{query ? 'Siswa tidak ditemukan' : 'Belum ada data siswa'}</div>
            <div className="empty__text">
              {query
                ? 'Periksa ejaan nama atau NIS, lalu coba lagi.'
                : 'Belum ada data siswa. Minta tim Qrion mengimpor data siswa terlebih dahulu.'}
            </div>
          </div>
        </div>
      )}

      {effectiveView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((s, i) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/students/${s.id}`}
                  prefetch={false}
                  className="flex items-center gap-3 min-w-0"
                  title={`Lihat detail ${s.full_name}`}
                >
                  <span className={`av av--lg ${tones[i % tones.length]}`}>
                    {s.full_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate inline-flex items-center gap-1" style={{ fontSize: 'var(--fs-lg)' }}>
                      {s.full_name}
                      <Chevron className="ico muted" style={{ width: 15, height: 15 }} />
                    </div>
                    <div className="muted text-xs">NIS {s.nis} · Kelas {s.class ?? '-'}</div>
                    {s.card_code && (
                      <div style={{ marginTop: 5 }}>
                        <span className="badge badge--good">
                          <BadgeCheck className="ico" style={{ width: 12, height: 12 }} />
                          Kartu terverifikasi
                        </span>
                      </div>
                    )}
                    {(s.gender || s.birth_date) && (
                      <div className="muted text-xs" style={{ marginTop: 2 }}>
                        {s.gender ? genderLabel(s.gender) : ''}
                        {s.gender && s.birth_date ? ' · ' : ''}
                        {s.birth_date
                          ? `${formatDateId(s.birth_date)}${
                              ageFromBirthDate(s.birth_date) !== null
                                ? ` (${ageFromBirthDate(s.birth_date)} thn)`
                                : ''
                            }`
                          : ''}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-1 flex-none">
                  <button
                    type="button"
                    className="ibtn"
                    onClick={() => openEdit(s)}
                    aria-label={`Edit ${s.full_name}`}
                    title="Edit siswa"
                  >
                    <Pencil className="ico" strokeWidth={1.7} />
                  </button>
                  <button
                    type="button"
                    className="ibtn"
                    onClick={() => remove(s)}
                    disabled={deletingId === s.id}
                    aria-label={`Hapus ${s.full_name}`}
                    title="Hapus siswa"
                    style={{ color: 'var(--bad)' }}
                  >
                    <Trash2 className="ico" strokeWidth={1.7} />
                  </button>
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

              <div className="flex gap-2 mt-4">
                <Link href={`/visits/new?student=${s.id}`} prefetch={false} className="btn btn--ghost btn--sm grow">
                  <Stethoscope className="ico" /> Catat Kunjungan
                </Link>
                <Link href={`/students/${s.id}`} prefetch={false} className="btn btn--soft btn--sm">
                  Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="slist">
          {students.map((s, i) => (
            <div key={s.id} className="slist__row">
              <div className="slist__main">
                <span className={`av av--sm ${tones[i % tones.length]}`}>
                  {s.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <Link href={`/students/${s.id}`} prefetch={false} className="slist__name" title={`Lihat detail ${s.full_name}`}>
                    {s.full_name}
                    <Chevron className="ico muted" style={{ width: 14, height: 14, flex: 'none' }} />
                  </Link>
                  <div className="slist__meta">
                    <span>NIS {s.nis}</span>
                    <span>Kelas {s.class ?? '-'}</span>
                    {s.card_code && (
                      <span className="badge badge--good">
                        <BadgeCheck className="ico" style={{ width: 12, height: 12 }} />
                        Kartu terverifikasi
                      </span>
                    )}
                    {s.gender && (
                      <span className="tag tag--iris">
                        <VenusAndMars className="ico" style={{ width: 12, height: 12 }} />
                        {genderLabel(s.gender)}
                      </span>
                    )}
                    {s.birth_date && (
                      <span className="muted text-xs">
                        {formatDateId(s.birth_date)}
                        {ageFromBirthDate(s.birth_date) !== null
                          ? ` · ${ageFromBirthDate(s.birth_date)} thn`
                          : ''}
                      </span>
                    )}
                    {s.blood_type && <span className="tag tag--sky">{s.blood_type}</span>}
                    {s.allergies && (
                      <span className="slist__flag slist__flag--bad">
                        <AlertCircle className="ico" />
                        <span>Alergi: {s.allergies}</span>
                      </span>
                    )}
                    {s.chronic_diseases && (
                      <span className="slist__flag slist__flag--warn">
                        <Pill className="ico" />
                        <span>Riwayat: {s.chronic_diseases}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="slist__end">
                <Link
                  href={`/visits/new?student=${s.id}`}
                  prefetch={false}
                  className="btn btn--ghost btn--sm"
                  title="Catat kunjungan"
                >
                  <Stethoscope className="ico" /> Kunjungan
                </Link>
                <button
                  type="button"
                  className="ibtn"
                  onClick={() => openEdit(s)}
                  aria-label={`Edit ${s.full_name}`}
                  title="Edit siswa"
                >
                  <Pencil className="ico" strokeWidth={1.7} />
                </button>
                <button
                  type="button"
                  className="ibtn"
                  onClick={() => remove(s)}
                  disabled={deletingId === s.id}
                  aria-label={`Hapus ${s.full_name}`}
                  title="Hapus siswa"
                  style={{ color: 'var(--bad)' }}
                >
                  <Trash2 className="ico" strokeWidth={1.7} />
                </button>
              </div>
            </div>
          ))}
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

      {open && (
        <ModalPortal>
          <div className="overlay" onClick={() => setOpen(false)}>
            <form
              className="sheet"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Edit siswa"
            >
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">Edit Data Siswa</div>
                  <div className="sheet__sub">Data ini dipakai saat mencatat kunjungan UKS.</div>
                </div>
                <button type="button" className="ibtn" onClick={() => setOpen(false)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>

              <div className="sheet__body">
                {formError && (
                  <div className="note note--bad" style={{ marginBottom: 14 }}>
                    <AlertCircle className="ico" />
                    <div>{formError}</div>
                  </div>
                )}

                <div className="sheet__grid">
                  <div className="field">
                    <label className="field__label" htmlFor="student-nis">NIS</label>
                    <input
                      id="student-nis"
                      value={form.nis}
                      onChange={(e) => setForm({ ...form, nis: e.target.value })}
                      placeholder="2024001"
                      autoComplete="off"
                    />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="student-name">Nama lengkap</label>
                    <input
                      id="student-name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Nama siswa"
                    />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="student-class">Kelas</label>
                    <input
                      id="student-class"
                      value={form.class}
                      onChange={(e) => setForm({ ...form, class: e.target.value })}
                      placeholder="7A"
                    />
                  </div>

                  {demographics && (
                    <>
                      <div className="field">
                        <label className="field__label" htmlFor="student-gender">Jenis kelamin</label>
                        <select
                          id="student-gender"
                          value={form.gender}
                          onChange={(e) =>
                            setForm({ ...form, gender: e.target.value as '' | StudentGender })
                          }
                        >
                          <option value="">-</option>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="field__label" htmlFor="student-birth">Tanggal lahir</label>
                        <input
                          id="student-birth"
                          type="date"
                          value={form.birth_date}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="field">
                    <label className="field__label" htmlFor="student-blood">Golongan darah</label>
                    <select
                      id="student-blood"
                      value={form.blood_type}
                      onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
                    >
                      <option value="">-</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>

                  <div className="field field--wide">
                    <label className="field__label" htmlFor="student-allergies">Alergi</label>
                    <input
                      id="student-allergies"
                      value={form.allergies}
                      onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                      placeholder="cth. Udang, debu (kosongkan bila tidak ada)"
                    />
                  </div>

                  <div className="field field--wide">
                    <label className="field__label" htmlFor="student-chronic">Riwayat penyakit</label>
                    <input
                      id="student-chronic"
                      value={form.chronic_diseases}
                      onChange={(e) => setForm({ ...form, chronic_diseases: e.target.value })}
                      placeholder="cth. Asma (kosongkan bila tidak ada)"
                    />
                  </div>
                </div>
              </div>

              <div className="sheet__foot">
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  <Save className="ico" /> {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </AppShell>
  );
}
