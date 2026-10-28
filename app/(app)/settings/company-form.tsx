'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2, FileText, HeartPulse, Lock, Save, Undo2 } from 'lucide-react';
import { updateCompanyProfile } from '@/app/(app)/settings/actions';

type SchoolForm = {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      <Save className="ico" />
      {pending ? 'Menyimpan…' : 'Simpan profil'}
    </button>
  );
}

export function CompanyForm({
  school,
  email,
  canEdit,
  ok,
  error,
}: {
  school: SchoolForm;
  email: string;
  canEdit: boolean;
  ok?: string;
  error?: string;
}) {
  const [name, setName] = useState(school.name);
  const [emailValue, setEmailValue] = useState(email);
  const [address, setAddress] = useState(school.address ?? '');
  const [phone, setPhone] = useState(school.phone ?? '');

  return (
    <div className="set-grid">
      <form
        action={updateCompanyProfile}
        className="card set-form"
        onReset={() => {
          setName(school.name);
          setEmailValue(email);
          setAddress(school.address ?? '');
          setPhone(school.phone ?? '');
        }}
      >
        <div className="card__head">
          <div className="card__title">
            <HeartPulse className="ico" />
            <span>
              Profil sekolah
              <span className="card__sub">Identitas yang tampil di seluruh aplikasi UKS.</span>
            </span>
          </div>
        </div>

        {ok && (
          <div className="note note--ok">
            <CheckCircle2 className="ico" />
            <span>{ok}</span>
          </div>
        )}
        {error && (
          <div className="note note--bad">
            <AlertCircle className="ico" />
            <span>{error}</span>
          </div>
        )}

        <div className="set-fields">
          <div className="field field--wide">
            <label className="field__label" htmlFor="company-name">
              Nama sekolah
            </label>
            <input
              id="company-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={120}
              required
              disabled={!canEdit}
              placeholder="Contoh: SMA Negeri 1 Bandung"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="company-slug">
              Slug sekolah
            </label>
            <input id="company-slug" value={school.slug ?? '—'} readOnly disabled />
            <span className="field__hint">Dibuat otomatis oleh admin Qrion.</span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="company-email">
              Email login
            </label>
            <input
              id="company-email"
              name="email"
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              required
              disabled={!canEdit}
              placeholder="admin@sekolah.sch.id"
            />
            <span className="field__hint">
              Dipakai untuk masuk ke aplikasi. Perubahan langsung aktif — gunakan email baru pada login berikutnya.
            </span>
          </div>

          <div className="field field--wide">
            <label className="field__label" htmlFor="company-address">
              Alamat
            </label>
            <textarea
              id="company-address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={240}
              rows={3}
              disabled={!canEdit}
              placeholder="Jalan, nomor, kota"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="company-phone">
              Telepon
            </label>
            <input
              id="company-phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              disabled={!canEdit}
              placeholder="(022) 1234567"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="company-status">
              Status
            </label>
            <input id="company-status" value={school.is_active ? 'Aktif' : 'Nonaktif'} readOnly disabled />
            <span className="field__hint">Perubahan status hanya oleh admin Qrion.</span>
          </div>
        </div>

        {!canEdit && (
          <div className="note">
            <Lock className="ico" />
            <span>Hanya admin sekolah yang dapat mengubah profil ini.</span>
          </div>
        )}

        <div className="set-foot">
          <button type="reset" className="btn btn--ghost" disabled={!canEdit}>
            <Undo2 className="ico" />
            Kembalikan
          </button>
          {canEdit && <SaveButton />}
        </div>
      </form>

      <aside className="card set-preview">
        <div className="card__head">
          <div className="card__title">
            <FileText className="ico" />
            <span>
              Pratinjau profil
              <span className="card__sub">Tampilan profil sekolah Anda.</span>
            </span>
          </div>
          <span className="spill spill--iris">
            <i />
            Langsung
          </span>
        </div>

        <div className="set-doc">
          <div className="set-doc__top">
            <span className="set-doc__mark">
              <HeartPulse className="ico" />
            </span>
            <div>
              <b>{name || 'Nama sekolah'}</b>
              <small>Profil UKS sekolah</small>
            </div>
            <span className="set-doc__tag">UKS</span>
          </div>

          <div className="set-doc__meta">
            <div>
              <small>Alamat</small>
              <b>{address || 'Belum diisi'}</b>
            </div>
            <div>
              <small>Telepon</small>
              <b>{phone || 'Belum diisi'}</b>
            </div>
          </div>

          <div className="set-doc__lines" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>

          <div className="set-doc__foot">
            <span>PROFIL UKS</span>
            <span>{school.slug ?? 'sekolah'}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
