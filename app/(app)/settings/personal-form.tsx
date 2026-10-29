'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { UserRound, Save, Undo2 } from 'lucide-react';
import { updateOwnProfile } from '@/app/(app)/settings/actions';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      <Save className="ico" />
      {pending ? 'Menyimpan…' : 'Simpan akun'}
    </button>
  );
}

export function PersonalForm({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: string;
}) {
  const [name, setName] = useState(fullName);

  return (
    <form
      action={updateOwnProfile}
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
        <span className="badge badge--plain">{role}</span>
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

        <div className="field">
          <label className="field__label" htmlFor="personal-role">
            Peran
          </label>
          <input id="personal-role" value={role} readOnly disabled />
          <span className="field__hint">Perubahan peran hanya oleh admin Qrion.</span>
        </div>
      </div>

      <div className="set-foot">
        <button type="reset" className="btn btn--ghost">
          <Undo2 className="ico" />
          Kembalikan
        </button>
        <SaveButton />
      </div>
    </form>
  );
}
