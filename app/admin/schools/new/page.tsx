import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createSchool } from '../../actions';
import { AlertCircle, ArrowLeft, Building2 } from 'lucide-react';

export default async function NewSchoolPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/');

  const params = await searchParams;

  return (
    <>
      <div className="adm__head">
        <div>
          <Link href="/admin" prefetch={false} className="adm__back">
            <ArrowLeft className="ico" /> Kembali ke daftar
          </Link>
          <h1>Tambah Sekolah</h1>
          <p>Buat sekolah baru sekaligus akun admin yang akan mengelolanya.</p>
        </div>
      </div>

      {params.error && (
        <div className="note note--bad" style={{ marginBottom: 16 }}>
          <AlertCircle className="ico" />
          <div>{params.error}</div>
        </div>
      )}

      <form action={createSchool} className="card" style={{ maxWidth: 760 }}>
        <div className="card__head">
          <h2 className="card__title">
            <Building2 className="ico" /> Profil Sekolah
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="field">
            <span className="field__label">Nama sekolah</span>
            <input name="name" required minLength={2} placeholder="cth. SMA Negeri 1 Bandung" />
          </label>

          <label className="field">
            <span className="field__label">Slug</span>
            <input name="slug" placeholder="otomatis dari nama" />
            <span className="field__hint">Huruf kecil, angka, dan tanda hubung.</span>
          </label>

          <label className="field">
            <span className="field__label">Alamat</span>
            <input name="address" placeholder="Jl. ..." />
          </label>

          <label className="field">
            <span className="field__label">Telepon</span>
            <input name="phone" placeholder="022-..." />
          </label>
        </div>

        <div className="card__head" style={{ marginTop: 22 }}>
          <h2 className="card__title">Akun Admin Sekolah</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="field">
            <span className="field__label">Email admin</span>
            <input name="email" type="email" required placeholder="admin@sekolah.sch.id" autoComplete="off" />
            <span className="field__hint">Dipakai untuk login ke aplikasi UKS.</span>
          </label>

          <label className="field">
            <span className="field__label">Password awal</span>
            <input name="password" type="text" required minLength={8} placeholder="minimal 8 karakter" autoComplete="new-password" />
            <span className="field__hint">Sampaikan ke pihak sekolah, minta segera diganti.</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <Link href="/admin" prefetch={false} className="btn btn--ghost">
            Batal
          </Link>
          <button type="submit" className="btn btn--primary">
            Buat Sekolah & Akun
          </button>
        </div>
      </form>
    </>
  );
}
