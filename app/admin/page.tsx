import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CountUp } from '@/components/ui/count-up';
import { getSessionProfile } from '@/lib/auth';
import { impersonateSchool } from './actions';
import { ImpersonateButton } from '@/components/admin/impersonate-button';
import { Building2, Plus, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

type SchoolRow = {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  students?: { count: number }[] | null;
  visits?: { count: number }[] | null;
  medicines?: { count: number }[] | null;
};

const relCount = (rel: { count: number }[] | null | undefined) => rel?.[0]?.count ?? 0;

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== 'super_admin') redirect('/');

  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: schoolsData }, { data: accountsData }] = await Promise.all([
    supabase
      .from('schools')
      .select('id,name,slug,address,is_active,created_at,students(count),visits(count),medicines(count)')
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('email,school_id').eq('role', 'school_admin'),
  ]);

  const schools = (schoolsData ?? []) as unknown as SchoolRow[];
  const accountBySchool = new Map<string, string>();
  for (const a of accountsData ?? []) {
    if (a.school_id) accountBySchool.set(a.school_id, a.email ?? '-');
  }

  const totalStudents = schools.reduce((n, s) => n + relCount(s.students), 0);
  const totalVisits = schools.reduce((n, s) => n + relCount(s.visits), 0);
  const activeSchools = schools.filter((s) => s.is_active).length;

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Sekolah</h1>
          <p>Kelola sekolah, akun admin, dan akses masuk ke aplikasi UKS.</p>
        </div>
        <div className="adm__actions">
          <Link href="/admin/schools/new" prefetch={false} className="btn btn--primary">
            <Plus className="ico" /> Tambah Sekolah
          </Link>
        </div>
      </div>

      {params.ok && (
        <div className="note note--ok" style={{ marginBottom: 16 }}>
          <CheckCircle2 className="ico" />
          <div>{params.ok}</div>
        </div>
      )}
      {params.error && (
        <div className="note note--bad" style={{ marginBottom: 16 }}>
          <AlertCircle className="ico" />
          <div>{params.error}</div>
        </div>
      )}

      <section className="adm__stats">
        <div className="adm__stat">
          <small>Total Sekolah</small>
          <b><CountUp value={schools.length} /></b>
        </div>
        <div className="adm__stat">
          <small>Sekolah Aktif</small>
          <b><CountUp value={activeSchools} /></b>
        </div>
        <div className="adm__stat">
          <small>Total Siswa</small>
          <b><CountUp value={totalStudents} /></b>
        </div>
        <div className="adm__stat">
          <small>Total Kunjungan</small>
          <b><CountUp value={totalVisits} /></b>
        </div>
      </section>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">
            <Building2 className="ico" />
            Daftar Sekolah
          </h2>
          <span className="spill spill--iris">
            <i />
            <CountUp value={schools.length} /> sekolah
          </span>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Sekolah</th>
                <th>Akun Admin</th>
                <th className="r">Siswa</th>
                <th className="r">Kunjungan</th>
                <th className="r">Obat</th>
                <th>Status</th>
                <th className="r">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <Building2 className="ico" />
                      <div className="empty__title">Belum ada sekolah</div>
                      <div className="empty__text">Tambahkan sekolah pertama untuk mulai menggunakan aplikasi.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                schools.map((s) => {
                  const account = accountBySchool.get(s.id);

                  return (
                    <tr key={s.id}>
                      <td>
                        <b>{s.name}</b>
                        <div className="muted text-xs">{s.slug ?? '-'}</div>
                      </td>
                      <td className="muted">{account ?? '-'}</td>
                      <td className="r"><CountUp value={relCount(s.students)} /></td>
                      <td className="r"><CountUp value={relCount(s.visits)} /></td>
                      <td className="r"><CountUp value={relCount(s.medicines)} /></td>
                      <td>
                        <span className={s.is_active ? 'badge badge--good' : 'badge badge--plain'}>
                          {s.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="r">
                        <div className="inline-flex items-center gap-2">
                          <Link href={`/admin/schools/${s.id}`} prefetch={false} className="btn btn--ghost btn--xs">
                            Kelola
                          </Link>
                          {account ? (
                            <ImpersonateButton
                              schoolId={s.id}
                              schoolName={s.name}
                              accountEmail={account}
                              action={impersonateSchool}
                            />
                          ) : (
                            <Link href={`/admin/schools/${s.id}`} prefetch={false} className="btn btn--soft btn--xs">
                              <KeyRound className="ico" /> Atur akun
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
