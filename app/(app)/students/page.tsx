'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import {
  Search,
  AlertCircle,
  TestTube,
  Pill,
  UserRound,
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
} from 'lucide-react';

type StudentRow = {
  id: string;
  nis: string;
  full_name: string;
  class: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_diseases: string | null;
};

type FormState = {
  nis: string;
  full_name: string;
  class: string;
  blood_type: string;
  allergies: string;
  chronic_diseases: string;
};

const emptyForm: FormState = {
  nis: '',
  full_name: '',
  class: '',
  blood_type: '',
  allergies: '',
  chronic_diseases: '',
};

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];

function StudentsPageInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    openCreate();
    router.replace('/students', { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      let req = supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true })
        .limit(200);

      if (term) {
        req = req.or(`full_name.ilike.%${term}%,nis.ilike.%${term}%`);
      }

      const { data } = await req;
      if (!cancelled) {
        setStudents((data ?? []) as StudentRow[]);
        setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, reloadKey]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(s: StudentRow) {
    setEditing(s);
    setForm({
      nis: s.nis,
      full_name: s.full_name,
      class: s.class ?? '',
      blood_type: s.blood_type ?? '',
      allergies: s.allergies ?? '',
      chronic_diseases: s.chronic_diseases ?? '',
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

    setSaving(true);
    setFormError(null);

    const payload = {
      nis,
      full_name: fullName,
      class: form.class.trim() || null,
      blood_type: form.blood_type || null,
      allergies: form.allergies.trim(),
      chronic_diseases: form.chronic_diseases.trim(),
    };

    const isEdit = Boolean(editing);
    const { data: saved, error } = isEdit
      ? await supabase.from('students').update(payload).eq('id', editing!.id).select('id').single()
      : await supabase.from('students').insert(payload).select('id').single();

    setSaving(false);

    if (error) {
      const duplicate = error.message.includes('duplicate key') || error.message.includes('students_school_nis_key');
      setFormError(duplicate ? 'NIS sudah digunakan oleh siswa lain di sekolah ini.' : error.message);
      return;
    }

    await logClientActivity({
      action: isEdit ? 'update' : 'create',
      entity: 'student',
      entityId: (saved as { id: string } | null)?.id ?? editing?.id ?? null,
      summary: isEdit ? `Memperbarui data siswa ${fullName}` : `Menambahkan siswa ${fullName}`,
      metadata: { nis, class: payload.class },
    });

    setOpen(false);
    setNotice(isEdit ? `Data ${fullName} diperbarui.` : `Siswa ${fullName} ditambahkan.`);
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
      setNotice(`Gagal menghapus ${s.full_name}: ${error.message}`);
      return;
    }

    await logClientActivity({
      action: 'delete',
      entity: 'student',
      entityId: s.id,
      summary: `Menghapus siswa ${s.full_name}`,
      metadata: { nis: s.nis, class: s.class },
    });

    setNotice(`${s.full_name} dihapus.`);
    setReloadKey((k) => k + 1);
  }

  return (
    <AppShell
      title="Data Siswa"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Siswa' }]}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/visits/new" className="btn btn--ghost">
            <Stethoscope className="ico" /> Catat Kunjungan
          </Link>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            <Plus className="ico" /> Tambah Siswa
          </button>
        </div>
      }
    >
      <div className="toolbar">
        <div className="search w-full" style={{ maxWidth: 460, flex: 1 }}>
          <Search className="ico" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama atau NIS…"
            aria-label="Cari siswa"
          />
        </div>
        <span className="toolbar__spacer" />
        {loading ? (
          <span className="muted text-xs">Memuat…</span>
        ) : (
          <span className="spill spill--iris">
            <i /> <CountUp value={students.length} /> siswa
          </span>
        )}
      </div>

      {notice && (
        <div className="note note--ok" style={{ marginBottom: 16 }}>
          <AlertCircle className="ico" />
          <div>{notice}</div>
          <button
            type="button"
            className="help__clear"
            style={{ marginLeft: 'auto' }}
            onClick={() => setNotice(null)}
            aria-label="Tutup pemberitahuan"
          >
            <X className="ico" />
          </button>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="card">
          <div className="empty">
            <UserRound className="ico" />
            <div className="empty__title">{query ? 'Siswa tidak ditemukan' : 'Belum ada data siswa'}</div>
            <div className="empty__text">
              {query
                ? 'Periksa ejaan nama atau NIS, lalu coba lagi.'
                : 'Tambahkan siswa terlebih dahulu agar bisa dicari dan dicatat kunjungannya.'}
            </div>
            {!query && (
              <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
                <Plus className="ico" /> Tambah Siswa
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {students.map((s, i) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`av av--lg ${tones[i % tones.length]}`}>
                  {s.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold truncate" style={{ fontSize: 'var(--fs-lg)' }}>
                    {s.full_name}
                  </div>
                  <div className="muted text-xs">NIS {s.nis} · Kelas {s.class ?? '-'}</div>
                </div>
              </div>

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

            <Link href={`/visits/new?student=${s.id}`} className="btn btn--ghost btn--sm w-full mt-4">
              <Stethoscope className="ico" /> Catat Kunjungan
            </Link>
          </div>
        ))}
      </div>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? 'Edit siswa' : 'Tambah siswa'}>
            <div className="sheet__head">
              <div>
                <div className="sheet__title">{editing ? 'Edit Data Siswa' : 'Tambah Siswa'}</div>
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
              <button type="button" className="btn btn--primary" onClick={save} disabled={saving}>
                <Save className="ico" /> {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={null}>
      <StudentsPageInner />
    </Suspense>
  );
}
