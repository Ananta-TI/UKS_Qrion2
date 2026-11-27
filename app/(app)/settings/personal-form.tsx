'use client';

import { useState, type FormEvent } from 'react';
import { UserRound, Save, Undo2 } from 'lucide-react';
import { updateOwnProfile } from '@/app/(app)/settings/actions';
import { useConfirm } from '@/components/ui/confirm-dialog';

export function PersonalForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const [name, setName] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const ok = await confirm({
      title: 'Simpan akun?',
      message: `Nama lengkap akan diperbarui menjadi ${name.trim() || fullName}.`,
      confirmLabel: 'Ya, simpan akun',
    });
    if (!ok) return;

    setSaving(true);
    await updateOwnProfile(formData);
  }

  return (
    <form
      onSubmit={submitAccount}
      className="card set-form"
      onReset={() => setName(fullName)}
    >
      <div className="card__head">
        <div className="card__title">
          <UserRound className="ico" />
          <span>
            Akun saya
            <span className="card__sub">Nama yang tampil di sidebar dan riwayat aktivitas.</span>
          </span>
        </div>
      </div>

      <div className="set-fields">
        <div className="field field--wide">
          <label className="field__label" htmlFor="personal-name">
            Nama lengkap
          </label>
          <input
            id="personal-name"
            name="full_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={120}
            required
            placeholder="Contoh: Siti Nurhaliza"
          />
          <span className="field__hint">Nama ini menandai Anda pada log aktivitas sekolah.</span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="personal-email">
            Email login
          </label>
          <input id="personal-email" value={email || '—'} readOnly disabled />
          <span className="field__hint">Ubah email lewat Profil sekolah di atas.</span>
        </div>
      </div>

      <div className="set-foot">
        <button type="reset" className="btn btn--ghost">
          <Undo2 className="ico" />
          Kembalikan
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <Save className="ico" />
          {saving ? 'Menyimpan…' : 'Simpan akun'}
        </button>
      </div>
    </form>
  );
}
