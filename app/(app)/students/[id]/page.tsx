import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Pill,
  Stethoscope,
  TestTube,
  UserRound,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { getAuthUser } from '@/lib/auth';
import { visitStatusLabel } from '@/lib/visit-status';
import { ageFromBirthDate, formatDateId } from '@/lib/utils';
import type { StudentGender } from '@/lib/database.types';
import { EditStudentButton } from './edit-student';

type StudentDetail = {
  id: string;
  nis: string;
  full_name: string;
  class: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_diseases: string | null;
  created_at: string | null;
  gender?: StudentGender | null;
  birth_date?: string | null;
};

function genderLabel(gender: StudentGender | null | undefined) {
  if (gender === 'L') return 'Laki-laki';
  if (gender === 'P') return 'Perempuan';
  return null;
}

type VisitDetail = {
  id: string;
  check_in_at: string;
  chief_complaint: string | null;
  treatment: string | null;
  final_status: string | null;
  temperature: number | null;
  blood_pressure: string | null;
  weight: number | null;
  height: number | null;
};

type MedicineLogDetail = {
  id: string;
  medicine_id: string;
  type: string;
  qty: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string | null;
  medicines?: { name: string | null; unit: string | null } | null;
};

const statusCls: Record<string, string> = {
  back_to_class: 'badge badge--good',
  referred: 'badge badge--bad',
  picked_up: 'badge badge--warn',
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await getAuthUser();
  if (!user) redirect('/auth/signin');

  const baseColumns =
    'id,nis,full_name,class,blood_type,allergies,chronic_diseases,created_at';

  // Coba ikut ambil kolom demografi; bila migrasi 011 belum dijalankan,
  // ulangi tanpa kolom tersebut supaya halaman tetap tampil.
  const full = await supabase
    .from('students')
    .select(`${baseColumns},gender,birth_date`)
    .eq('id', id)
    .maybeSingle();

  const student = full.error
    ? (
        await supabase
          .from('students')
          .select(baseColumns)
          .eq('id', id)
          .maybeSingle()
      ).data
    : full.data;

  if (!student) notFound();

  const { data: visitsData } = await supabase
    .from('visits')
    .select('id,check_in_at,chief_complaint,treatment,final_status,temperature,blood_pressure,weight,height')
    .eq('student_id', id)
    .order('check_in_at', { ascending: false })
    .limit(100);

  const visits = (visitsData ?? []) as unknown as VisitDetail[];
  const visitIds = visits.map((v) => v.id);

  // Riwayat obat diambil lewat medicine_logs.reference_id → visits.id.
  const { data: logsData } = visitIds.length
    ? await supabase
        .from('medicine_logs')
        .select('id,medicine_id,type,qty,reference_id,notes,created_at,medicines(name,unit)')
        .in('reference_id', visitIds)
        .order('created_at', { ascending: false })
        .limit(300)
    : { data: [] };

  const logs = (logsData ?? []) as unknown as MedicineLogDetail[];
  const studentDetail = student as unknown as StudentDetail;

  const lastVisit = visits[0]?.check_in_at ?? null;
  const totalGiven = logs
    .filter((l) => l.type === 'out')
    .reduce((sum, l) => sum + (l.qty || 0), 0);

  const visitWhen = new Map(visits.map((v) => [v.id, v.check_in_at]));
  const gender = genderLabel(studentDetail.gender);
  const birthLabel = formatDateId(studentDetail.birth_date);
  const age = ageFromBirthDate(studentDetail.birth_date);

  return (
    <AppShell
      title={studentDetail.full_name}
      crumbs={[
        { label: 'UKS', href: '/' },
        { label: 'Siswa', href: '/students' },
        { label: studentDetail.full_name },
      ]}
      actions={
        <>
          <EditStudentButton student={studentDetail} />
          <Link href={`/visits/new?student=${studentDetail.id}`} prefetch={false} className="btn btn--primary">
            <Stethoscope className="ico" /> Catat Kunjungan
          </Link>
        </>
      }
    >
      <div className="card" style={{ marginBottom: 'var(--gap)' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="av av--lg av--iris">{studentDetail.full_name.charAt(0).toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, letterSpacing: '-.02em' }}>
              {studentDetail.full_name}
            </h2>
            <div className="muted text-sm">
              NIS {studentDetail.nis} · Kelas {studentDetail.class ?? '-'}
              {gender ? ` · ${gender}` : ''}
              {studentDetail.blood_type ? ` · Gol. darah ${studentDetail.blood_type}` : ''}
            </div>
            {birthLabel && (
              <div className="muted text-xs" style={{ marginTop: 2 }}>
                Lahir {birthLabel}
                {age !== null ? ` · ${age} tahun` : ''}
              </div>
            )}
          </div>
          <span className="toolbar__spacer" />
          <Link href="/students" prefetch={false} className="btn btn--ghost btn--sm">
            <ArrowLeft className="ico" /> Daftar siswa
          </Link>
        </div>

        {(studentDetail.allergies || studentDetail.chronic_diseases) && (
          <div className="grid gap-2 mt-4">
            {studentDetail.allergies && (
              <div className="note note--bad">
                <AlertCircle className="ico" />
                <div>
                  <b>Alergi:</b> {studentDetail.allergies}
                </div>
              </div>
            )}
            {studentDetail.chronic_diseases && (
              <div className="note note--warn">
                <Pill className="ico" />
                <div>
                  <b>Riwayat penyakit:</b> {studentDetail.chronic_diseases}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <section className="kpis">
        <div className="stat">
          <div className="stat__label">
            <span className="stat__ico">
              <ClipboardList className="ico" />
            </span>
            Total kunjungan
          </div>
          <div className="stat__value">
            <CountUp value={visits.length} />
          </div>
          <div className="muted text-xs">Maksimal 100 terakhir ditampilkan</div>
        </div>
        <div className="stat">
          <div className="stat__label">
            <span className="stat__ico">
              <CalendarDays className="ico" />
            </span>
            Kunjungan terakhir
          </div>
          <div className="stat__value" style={{ fontSize: 'var(--fs-lg)' }}>
            {lastVisit
              ? new Date(lastVisit).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </div>
          <div className="muted text-xs">
            {lastVisit ? new Date(lastVisit).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Belum pernah'}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">
            <span className="stat__ico">
              <Pill className="ico" />
            </span>
            Obat diterima
          </div>
          <div className="stat__value">
            <CountUp value={totalGiven} />
          </div>
          <div className="muted text-xs">{logs.filter((l) => l.type === 'out').length} kali pemberian</div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card">
          <div className="card__head">
            <h2 className="card__title">
              <Stethoscope className="ico" /> Riwayat Kunjungan
            </h2>
            <span className="badge badge--plain">
              <CountUp value={visits.length} />
            </span>
          </div>

          {visits.length === 0 ? (
            <div className="empty">
              <ClipboardList className="ico" />
              <div className="empty__title">Belum ada kunjungan</div>
              <div className="empty__text">Kunjungan UKS siswa ini akan tampil di sini.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Keluhan</th>
                    <th>Tindakan</th>
                    <th className="r">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id}>
                      <td className="muted whitespace-nowrap">
                        {new Date(v.check_in_at).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="muted" style={{ maxWidth: 200 }}>
                        {v.chief_complaint ?? '-'}
                      </td>
                      <td className="muted" style={{ maxWidth: 200 }}>
                        {v.treatment ?? '-'}
                      </td>
                      <td className="r">
                        <span className={statusCls[v.final_status ?? ''] ?? 'badge badge--plain'}>
                          {visitStatusLabel(v.final_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card__head">
            <h2 className="card__title">
              <Pill className="ico" /> Riwayat Obat
            </h2>
            <span className="badge badge--plain">
              <CountUp value={logs.length} />
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="empty">
              <Pill className="ico" />
              <div className="empty__title">Belum ada obat</div>
              <div className="empty__text">Obat yang diberikan saat kunjungan akan tercatat di sini.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Obat</th>
                    <th className="r">Jumlah</th>
                    <th>Kunjungan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const ref = log.reference_id ? visitWhen.get(log.reference_id) : null;
                    const isOut = log.type === 'out';
                    return (
                      <tr key={log.id}>
                        <td className="muted whitespace-nowrap">
                          {log.created_at
                            ? new Date(log.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td>
                          <b>{log.medicines?.name ?? 'Obat dihapus'}</b>
                          <div className="muted text-xs">{log.notes || (isOut ? 'Diberikan' : 'Restok')}</div>
                        </td>
                        <td className="r">
                          <span className={isOut ? 'badge badge--warn' : 'badge badge--good'}>
                            {isOut ? '−' : '+'}
                            {log.qty} {log.medicines?.unit ?? ''}
                          </span>
                        </td>
                        <td className="muted text-xs whitespace-nowrap">
                          {ref
                            ? new Date(ref).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="note" style={{ marginTop: 'var(--gap)' }}>
        <UserRound className="ico" />
        <div>
          Data siswa ini otomatis dipakai saat mencatat kunjungan. Perbarui alergi dan riwayat penyakit agar
          penanganan selalu aman.
        </div>
      </div>
    </AppShell>
  );
}
