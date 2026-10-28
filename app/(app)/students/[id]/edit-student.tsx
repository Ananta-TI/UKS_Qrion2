'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AlertCircle, Pencil, Save, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { useToast } from '@/components/ui/toast';

export type EditableStudent = {
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

/** Modal dirender di body agar tidak terkurung ancestor yang punya transform. */
function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

export function EditStudentButton({ student }: { student: EditableStudent }) {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    nis: student.nis,
    full_name: student.full_name,
    class: student.class ?? '',
    blood_type: student.blood_type ?? '',
    allergies: student.allergies ?? '',
    chronic_diseases: student.chronic_diseases ?? '',
  });

  function openModal() {
    setForm({
      nis: student.nis,
      full_name: student.full_name,
      class: student.class ?? '',
      blood_type: student.blood_type ?? '',
      allergies: student.allergies ?? '',
      chronic_diseases: student.chronic_diseases ?? '',
    });
    setFormError(null);
    setOpen(true);
  }

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

    const { data: saved, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', student.id)
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      const duplicate = error.message.includes('duplicate key') || error.message.includes('students_school_nis_key');
      const msg = duplicate ? 'NIS sudah digunakan oleh siswa lain di sekolah ini.' : error.message;
      setFormError(msg);
      toast.error(msg, 'Gagal Memperbarui Siswa');
      return;
    }

    await logClientActivity({
      action: 'update',
      entity: 'student',
      entityId: (saved as { id: string } | null)?.id ?? student.id,
      summary: `Memperbarui data siswa ${fullName}`,
      metadata: { nis, class: payload.class },
    });

    setOpen(false);
    toast.success(`Data ${fullName} berhasil diperbarui.`);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={openModal}>
        <Pencil className="ico" /> Edit
      </button>

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
                    <label className="field__label" htmlFor="detail-student-nis">NIS</label>
                    <input
                      id="detail-student-nis"
                      value={form.nis}
                      onChange={(e) => setForm({ ...form, nis: e.target.value })}
                      placeholder="2024001"
                      autoComplete="off"
                    />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="detail-student-name">Nama lengkap</label>
                    <input
                      id="detail-student-name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Nama siswa"
                    />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="detail-student-class">Kelas</label>
                    <input
                      id="detail-student-class"
                      value={form.class}
                      onChange={(e) => setForm({ ...form, class: e.target.value })}
                      placeholder="7A"
                    />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="detail-student-blood">Golongan darah</label>
                    <select
                      id="detail-student-blood"
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
                    <label className="field__label" htmlFor="detail-student-allergies">Alergi</label>
                    <input
                      id="detail-student-allergies"
                      value={form.allergies}
                      onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                      placeholder="cth. Udang, debu (kosongkan bila tidak ada)"
                    />
                  </div>

                  <div className="field field--wide">
                    <label className="field__label" htmlFor="detail-student-chronic">Riwayat penyakit</label>
                    <input
                      id="detail-student-chronic"
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
    </>
  );
}
