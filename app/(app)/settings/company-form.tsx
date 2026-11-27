'use client';

import { useState, type FormEvent } from 'react';
import { FileText, HeartPulse, Save, Undo2 } from 'lucide-react';
import { updateCompanyProfile } from '@/app/(app)/settings/actions';
import { useConfirm } from '@/components/ui/confirm-dialog';

type SchoolForm = {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
};

export function CompanyForm({
  school,
  email,
}: {
  school: SchoolForm;
  email: string;
}) {
  const [name, setName] = useState(school.name);
  const [slug, setSlug] = useState(school.slug ?? '');
  const [emailValue, setEmailValue] = useState(email);
  const [address, setAddress] = useState(school.address ?? '');
  const [phone, setPhone] = useState(school.phone ?? '');
  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const ok = await confirm({
      title: 'Simpan profil sekolah?',
      message: `Perubahan profil ${school.name} akan disimpan.`,
      detail: 'Email login yang diubah langsung aktif pada login berikutnya.',
      confirmLabel: 'Ya, simpan profil',
    });
    if (!ok) return;

    setSaving(true);
    await updateCompanyProfile(formData);
  }

  return (
    <div className="set-grid">
      <form
        onSubmit={submitProfile}
        className="card set-form"
        onReset={() => {
          setName(school.name);
          setSlug(school.slug ?? '');
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
              placeholder="Contoh: SMA Negeri 1 Bandung"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="company-slug">
              Slug sekolah
            </label>
            <input
              id="company-slug"
              name="slug"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, '-')
                    .replace(/-{2,}/g, '-')
                )
              }
              minLength={3}
              maxLength={60}
              placeholder="sman-1-bandung"
            />
            <span className="field__hint">
              Penanda unik sekolah: huruf kecil, angka, dan tanda hubung. Kosongkan untuk dibuat otomatis dari
              nama sekolah.
            </span>
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

        <div className="set-foot">
          <button type="reset" className="btn btn--ghost">
            <Undo2 className="ico" />
            Kembalikan
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            <Save className="ico" />
            {saving ? 'Menyimpan…' : 'Simpan profil'}
          </button>
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
            <span>{slug || 'sekolah'}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
