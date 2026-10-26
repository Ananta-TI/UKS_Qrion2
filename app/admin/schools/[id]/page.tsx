import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';
import { updateSchool, resetPassword, deleteSchool, impersonateSchool, createSchoolAccount } from '../../actions';
import { ConfirmSubmit } from '@/components/admin/confirm-submit';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  LogIn,
  Trash2,
} from 'lucide-react';

export default async function SchoolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/');

  const supabase = await createClient();

  const { data: school } = await supabase.from('schools').select('*').eq('id', id).maybeSingle();
  if (!school) notFound();

  const [{ data: account }, { count: studentCount }, { count: visitCount }, { count: medicineCount }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id,email,full_name')
        .eq('school_id', id)
        .eq('role', 'school_admin')
        .limit(1)
        .maybeSingle(),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', id),
      supabase.from('visits').select('id', { count: 'exact', head: true }).eq('school_id', id),
      supabase.from('medicines').select('id', { count: 'exact', head: true }).eq('school_id', id),
    ]);

  return (
    <>
      <div className="adm__head">
        <div>
          <Link href="/admin" prefetch={false} className="adm__back">
            <ArrowLeft className="ico" /> Kembali ke daftar
          </Link>
          <h1>
            {school.name}{' '}
            <span className={school.is_active ? 'badge badge--good' : 'badge badge--plain'}>
              {school.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
          </h1>
          <p>{school.address || 'Alamat belum diisi'} · {school.phone || 'Telepon belum diisi'}</p>
        </div>
        <div className="adm__actions">
          {account && (
            <form action={impersonateSchool}>
              <input type="hidden" name="school_id" value={school.id} />
              <button type="submit" className="btn btn--primary">
                <LogIn className="ico" /> Login sebagai Sekolah
              </button>
            </form>
          )}
        </div>
      </div>

      {sp.ok && (
        <div className="note note--ok" style={{ marginBottom: 16 }}>
          <CheckCircle2 className="ico" />
          <div>{sp.ok}</div>
        </div>
      )}
      {sp.error && (
        <div className="note note--bad" style={{ marginBottom: 16 }}>
          <AlertCircle className="ico" />
          <div>{sp.error}</div>
        </div>
      )}

      <section className="adm__stats">
        <div className="adm__stat">
          <small>Siswa</small>
          <b>{studentCount ?? 0}</b>
        </div>
        <div className="adm__stat">
          <small>Kunjungan</small>
          <b>{visitCount ?? 0}</b>
        </div>
        <div className="adm__stat">
          <small>Obat</small>
          <b>{medicineCount ?? 0}</b>
        </div>
        <div className="adm__stat">
          <small>Dibuat</small>
          <b className="text-base">{new Date(school.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</b>
        </div>
      </section>

      <div className="adm__cols">
        <form action={updateSchool} className="card">
          <div className="card__head">
            <h2 className="card__title">
              <Building2 className="ico" /> Informasi Sekolah
            </h2>
          </div>

          <input type="hidden" name="id" value={school.id} />

          <div className="grid grid-cols-1 gap-4">
            <label className="field">
              <span className="field__label">Nama sekolah</span>
              <input name="name" defaultValue={school.name} required minLength={2} />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="field">
                <span className="field__label">Slug</span>
                <input name="slug" defaultValue={school.slug ?? ''} />
              </label>

              <label className="field">
                <span className="field__label">Telepon</span>
                <input name="phone" defaultValue={school.phone ?? ''} />
              </label>
            </div>

            <label className="field">
              <span className="field__label">Alamat</span>
              <input name="address" defaultValue={school.address ?? ''} />
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" name="is_active" defaultChecked={school.is_active} />
              <span>
                <b className="text-sm">Sekolah aktif</b>
                <span className="field__hint block">Akun sekolah dapat masuk ke aplikasi UKS.</span>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button type="submit" className="btn btn--primary">
              Simpan Perubahan
            </button>
          </div>
        </form>

        <div className="adm__side-col">
          <div className="card">
            <div className="card__head">
              <h2 className="card__title">
                <KeyRound className="ico" /> Akun Admin
              </h2>
            </div>

            <div className="adm__kv">
              <small>Email</small>
              <b>{account?.email ?? 'Belum ada akun'}</b>
            </div>

            {account ? (
              <form action={resetPassword} className="mt-4">
                <input type="hidden" name="school_id" value={school.id} />
                <label className="field">
                  <span className="field__label">Password baru</span>
                  <input name="password" type="text" required minLength={8} placeholder="minimal 8 karakter" autoComplete="new-password" />
                </label>
                <button type="submit" className="btn btn--soft btn--sm w-full mt-3">
                  Reset Password
                </button>
              </form>
            ) : (
              <form action={createSchoolAccount} className="mt-4">
                <input type="hidden" name="school_id" value={school.id} />
                <p className="field__hint" style={{ marginBottom: 12 }}>
                  Sekolah ini belum punya akun admin. Buat sekarang agar bisa login.
                </p>
                <div className="grid gap-3">
                  <label className="field">
                    <span className="field__label">Email admin</span>
                    <input name="email" type="email" required placeholder="admin@sekolah.sch.id" autoComplete="off" />
                  </label>
                  <label className="field">
                    <span className="field__label">Password awal</span>
                    <input name="password" type="text" required minLength={8} placeholder="minimal 8 karakter" autoComplete="new-password" />
                  </label>
                </div>
                <button type="submit" className="btn btn--soft btn--sm w-full mt-3">
                  Buat Akun Admin
                </button>
              </form>
            )}
          </div>

          <div className="card adm__danger">
            <div className="card__head">
              <h2 className="card__title">
                <Trash2 className="ico" /> Zona Berbahaya
              </h2>
            </div>
            <p className="field__hint">
              Menghapus sekolah akan menghapus seluruh siswa, kunjungan, obat, dan akun adminnya. Tindakan ini tidak bisa dibatalkan.
            </p>
            <form action={deleteSchool} className="mt-4">
              <input type="hidden" name="school_id" value={school.id} />
              <ConfirmSubmit
                className="btn btn--danger btn--sm w-full"
                message={`Hapus ${school.name} beserta seluruh datanya? Tindakan ini tidak bisa dibatalkan.`}
              >
                <Trash2 className="ico" /> Hapus Sekolah
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
