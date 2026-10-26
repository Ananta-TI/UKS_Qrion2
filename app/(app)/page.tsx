import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  HeartPulse,
  Package,
  Pill,
  Plus,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { Sparkline } from '@/components/dashboard/spark';
import { YearChart } from '@/components/dashboard/year-chart';
import { getAuthUser, getSessionProfile } from '@/lib/auth';

type VisitRow = {
  id: string;
  student_id: string;
  check_in_at: string;
  final_status: string | null;
  chief_complaint: string | null;
  treatment: string | null;
  students?: { full_name: string | null; nis: string | null; class: string | null } | null;
};

type MedicineRow = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  stock: number | null;
  min_stock: number | null;
  expiry_date: string | null;
  location: string | null;
};

type ActivityRow = {
  id: string;
  actor_name: string | null;
  action: string;
  entity: string;
  summary: string;
  created_at: string;
};

const statusMap: Record<string, { label: string; cls: string; dot: string }> = {
  back_to_class: { label: 'Kembali ke kelas', cls: 'badge badge--good', dot: 'var(--good)' },
  referred: { label: 'Dirujuk', cls: 'badge badge--bad', dot: 'var(--bad)' },
  picked_up: { label: 'Orang tua', cls: 'badge badge--warn', dot: 'var(--warn)' },
};

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function initials(value: string | null | undefined) {
  const parts = (value ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'UK';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function greeting(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function badgeFor(action: string) {
  if (action === 'delete') return 'Hapus';
  if (action === 'create') return 'Tambah';
  if (action === 'restock' || action === 'stock_out') return 'Stok';
  if (action === 'login' || action === 'logout') return 'Sesi';
  if (action === 'export') return 'Ekspor';
  return 'Ubah';
}

export default async function DashboardPage() {
  const { user, supabase } = await getAuthUser();
  if (!user) redirect('/auth/signin');

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const since30 = new Date(todayStart);
  since30.setDate(since30.getDate() - 29);
  const lookback = new Date(Math.min(yearStart.getTime(), since30.getTime()));

  // Mulai query data lebih dulu, lalu ambil profil paralel dengan query tersebut.
  const dataPromise = Promise.all([
    supabase.from('students').select('id,class').limit(5000),
    supabase
      .from('visits')
      .select('id,student_id,check_in_at,final_status,chief_complaint,treatment,students(full_name,nis,class)')
      .gte('check_in_at', todayStart.toISOString())
      .lt('check_in_at', tomorrowStart.toISOString())
      .order('check_in_at', { ascending: false }),
    supabase
      .from('visits')
      .select('id,student_id,check_in_at,final_status,students(class)')
      .gte('check_in_at', lookback.toISOString())
      .order('check_in_at', { ascending: false })
      .limit(5000),
    supabase
      .from('medicines')
      .select('id,name,category,unit,stock,min_stock,expiry_date,location')
      .order('name', { ascending: true }),    supabase.from('activity_logs')
      .select('id,actor_name,action,entity,summary,created_at')
      .order('created_at', { ascending: false })
      .limit(7),
  ]);

  const { profile } = await getSessionProfile();
  const [studentsRes, todayRes, visitsRes, medicinesRes, activityRes] = await dataPromise;

  const students = (studentsRes.data ?? []) as { id: string; class: string | null }[];
  const todayVisits = (todayRes.data ?? []) as unknown as VisitRow[];
  const visits = (visitsRes.data ?? []) as unknown as VisitRow[];
  const medicines = (medicinesRes.data ?? []) as MedicineRow[];
  const activity = (activityRes.data ?? []) as ActivityRow[];
  const activityReady = !activityRes.error;

  const totalStudents = students.length;
  const classCount = new Set(students.map((student) => student.class).filter(Boolean)).size;

  const monthly = Array.from({ length: 12 }, (_, month) => ({
    label: new Date(now.getFullYear(), month, 1).toLocaleDateString('id-ID', { month: 'short' }),
    total: 0,
    referred: 0,
    returned: 0,
  }));

  visits.forEach((visit) => {
    const date = new Date(visit.check_in_at);
    if (date.getFullYear() !== now.getFullYear()) return;
    const bucket = monthly[date.getMonth()];
    bucket.total += 1;
    if (visit.final_status === 'referred') bucket.referred += 1;
    if (visit.final_status === 'back_to_class') bucket.returned += 1;
  });

  const yearTotal = monthly.reduce((sum, month) => sum + month.total, 0);
  const returnedYear = monthly.reduce((sum, month) => sum + month.returned, 0);
  const monthTotal = monthly[now.getMonth()].total;
  const previousMonthTotal = now.getMonth() > 0 ? monthly[now.getMonth() - 1].total : null;
  const monthGrowth =
    previousMonthTotal && previousMonthTotal > 0
      ? Math.round(((monthTotal - previousMonthTotal) / previousMonthTotal) * 100)
      : null;

  const activeDaysYear = new Set(
    visits.filter((visit) => new Date(visit.check_in_at).getFullYear() === now.getFullYear()).map((visit) => {
      const date = new Date(visit.check_in_at);
      return dayKey(date);
    })
  ).size;
  const avgPerDay = activeDaysYear ? yearTotal / activeDaysYear : 0;
  const returnRate = yearTotal ? Math.round((returnedYear / yearTotal) * 100) : 0;

  const monthDaily = Array.from({ length: now.getDate() }, () => 0);
  visits.forEach((visit) => {
    const date = new Date(visit.check_in_at);
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      monthDaily[date.getDate() - 1] += 1;
    }
  });

  const last30Days = visits.filter((visit) => new Date(visit.check_in_at) >= since30);
  const uniqueStudents30 = new Set(last30Days.map((visit) => visit.student_id)).size;
  const daily14 = Array.from({ length: 14 }, () => 0);
  visits.forEach((visit) => {
    const date = startOfDay(new Date(visit.check_in_at));
    const offset = Math.round((todayStart.getTime() - date.getTime()) / 86400000);
    if (offset >= 0 && offset < 14) daily14[13 - offset] += 1;
  });

  const last7 = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayStart);
    date.setDate(date.getDate() - (6 - index));
    return {
      key: dayKey(date),
      label: date.toLocaleDateString('id-ID', { weekday: 'short' }),
      total: 0,
      referred: 0,
    };
  });
  const last7Map = new Map(last7.map((day) => [day.key, day]));
  visits.forEach((visit) => {
    const bucket = last7Map.get(dayKey(new Date(visit.check_in_at)));
    if (!bucket) return;
    bucket.total += 1;
    if (visit.final_status === 'referred') bucket.referred += 1;
  });

  const todayCount = todayVisits.length;
  const yesterdayCount = last7[5].total;
  const weekTotal = last7.reduce((sum, day) => sum + day.total, 0);
  const weekReferred = last7.reduce((sum, day) => sum + day.referred, 0);
  const dayDelta =
    yesterdayCount > 0
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : todayCount > 0
        ? 100
        : 0;
  const maxDay = Math.max(1, ...last7.map((day) => day.total));

  const todayStatus = { back_to_class: 0, referred: 0, picked_up: 0, unknown: 0 };
  todayVisits.forEach((visit) => {
    const key = (visit.final_status ?? 'unknown') as keyof typeof todayStatus;
    if (key in todayStatus) todayStatus[key] += 1;
  });
  const referredToday = todayStatus.referred;
  const todayStatusTotal = Math.max(1, todayCount);

  const lowStockAll = medicines.filter((medicine) => (medicine.stock ?? 0) <= (medicine.min_stock ?? 5));
  const lowStock = [...lowStockAll]
    .sort((a, b) => (a.stock ?? 0) - (a.min_stock ?? 5) - ((b.stock ?? 0) - (b.min_stock ?? 5)))
    .slice(0, 5);
  const expiringSoon = medicines.filter((medicine) => {
    if (!medicine.expiry_date) return false;
    const diff = new Date(medicine.expiry_date).getTime() - now.getTime();
    return diff > 0 && diff <= 30 * 86400000;
  }).length;

  const funnel = [
    { label: 'Kembali ke kelas', desc: 'ditangani di UKS', count: 0 },
    { label: 'Dirujuk ke faskes', desc: 'butuh penanganan lanjut', count: 0 },
    { label: 'Dijemput orang tua', desc: 'pulang bersama wali', count: 0 },
  ];
  last30Days.forEach((visit) => {
    if (visit.final_status === 'back_to_class') funnel[0].count += 1;
    if (visit.final_status === 'referred') funnel[1].count += 1;
    if (visit.final_status === 'picked_up') funnel[2].count += 1;
  });
  const funnelTotal = last30Days.length;
  const funnelMax = Math.max(1, ...funnel.map((row) => row.count));
  const notReturned = funnelTotal - funnel[0].count;

  const classTotals = new Map<string, { visits: number; students: Set<string> }>();
  last30Days.forEach((visit) => {
    const klass = visit.students?.class?.trim() || 'Tanpa kelas';
    const current = classTotals.get(klass) ?? { visits: 0, students: new Set<string>() };
    current.visits += 1;
    current.students.add(visit.student_id);
    classTotals.set(klass, current);
  });
  const topClasses = [...classTotals.entries()]
    .map(([klass, value]) => ({ klass, visits: value.visits, students: value.students.size }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 4);
  const maxClassVisits = Math.max(1, ...topClasses.map((item) => item.visits));

  const timeline = [...todayVisits]
    .sort((a, b) => new Date(a.check_in_at).getTime() - new Date(b.check_in_at).getTime())
    .map((visit) => {
      const date = new Date(visit.check_in_at);
      const hours = date.getHours() + date.getMinutes() / 60;
      return {
        id: visit.id,
        position: Math.min(100, Math.max(0, ((hours - 7) / 10) * 100)),
        time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: visit.final_status,
      };
    });

  const recentVisits = todayVisits.slice(0, 5);
  const firstName = (profile?.full_name ?? user.email ?? 'Petugas UKS').trim().split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <AppShell
      title="Dashboard"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Dashboard' }]}
      actions={
        <div className="shift">
          <span className="shift__clock">
            <i />
            Hari ini
          </span>
          <span className="shift__txt">
            <b>{dateLabel}</b>
            <small>{weekTotal} kunjungan dalam 7 hari</small>
          </span>
        </div>
      }
    >
      <div className="dash">
        <div className="dash__heroRow">
          <section className="card dash-hero">
            <div className="dash-hero__top">
              <span className="dash-hero__eyebrow">{dateLabel}</span>
              <div className="dash-hero__actions">
                <Link href="/visits/new" prefetch={false} className="btn btn--primary btn--sm">
                  <Plus className="ico" /> Catat kunjungan
                </Link>
                <Link href="/reports" prefetch={false} className="btn btn--ghost btn--sm">
                  <TrendingUp className="ico" /> Lihat laporan
                </Link>
              </div>
            </div>

            <h1 className="dash-hero__title">
              {greeting(now.getHours())}, {firstName}.
            </h1>

            <p className="dash-hero__lead">
              <b>{todayCount} kunjungan</b> tercatat hari ini, <b>{referredToday} dirujuk</b>, dan{' '}
              <b>{lowStockAll.length} obat</b> perlu restock
              {expiringSoon > 0 ? (
                <>
                  . <b>{expiringSoon} obat</b> mendekati kedaluwarsa.
                </>
              ) : (
                '.'
              )}
            </p>

            {timeline.length > 0 ? (
              <div className="dash-hero__timeline">
                <div className="dash-hero__track">
                  <span className="dash-hero__rail" aria-hidden="true" />
                  {timeline.map((item) => (
                    <span
                      key={item.id}
                      className={`dash-hero__dot ${item.status ? `is-${item.status}` : ''}`}
                      style={{ left: `${item.position}%` }}
                      title={`Kunjungan ${item.time}`}
                    />
                  ))}
                  <span
                    className="dash-hero__bubble"
                    style={{ left: `${Math.min(92, Math.max(8, timeline[timeline.length - 1].position))}%` }}
                  >
                    <Clock className="ico" />
                    {timeline[timeline.length - 1].time}
                  </span>
                </div>
                <div className="dash-hero__hours" aria-hidden="true">
                  <span>07</span>
                  <span>09</span>
                  <span>11</span>
                  <span>13</span>
                  <span>15</span>
                  <span>17</span>
                </div>
              </div>
            ) : (
              <div className="dash-hero__empty">
                <HeartPulse className="ico" />
                <span>Belum ada kunjungan hari ini. Catat kunjungan pertama untuk memulai.</span>
              </div>
            )}

            <div className="dash-hero__foot">
              <span>
                <Users className="ico" /> {totalStudents} siswa · {classCount} kelas
              </span>
              <span>
                <CalendarDays className="ico" /> {weekTotal} kunjungan minggu ini
              </span>
            </div>
          </section>

          <section className="card dash-today">
            <div className="card__head">
              <div className="card__title">
                <HeartPulse className="ico" />
                <span>
                  Kunjungan hari ini
                  <span className="card__sub">Dibanding 7 hari terakhir.</span>
                </span>
              </div>
              <Link href="/visits" prefetch={false} className="card__link dash-link">
                Semua <ChevronRight className="ico" />
              </Link>
            </div>

            <div className="dash-today__value">
              <CountUp value={todayCount} />
              <span>kunjungan</span>
            </div>

            <div className="dash-today__delta">
              <span className={dayDelta >= 0 ? 'dash-delta is-up' : 'dash-delta is-down'}>
                {dayDelta >= 0 ? <ArrowUpRight className="ico" /> : <ArrowDownRight className="ico" />}
                {dayDelta > 0 ? '+' : ''}
                {dayDelta}%
              </span>
              <small>dibanding kemarin</small>
            </div>

            <div className="dash-bars" aria-hidden="true">
              {last7.map((day) => (
                <div className="dash-bars__col" key={day.key}>
                  <span className="dash-bars__track">
                    <span
                      className="dash-bars__bar"
                      style={{ height: `${Math.max(5, (day.total / maxDay) * 100)}%` }}
                    >
                      {day.referred > 0 && (
                        <i
                          style={{
                            height: `${Math.round((day.referred / Math.max(1, day.total)) * 100)}%`,
                          }}
                        />
                      )}
                    </span>
                  </span>
                  <span className="dash-bars__lab">{day.label}</span>
                </div>
              ))}
            </div>

            <div className="dash-today__foot">
              <div className="legend">
                <span>
                  <i style={{ background: 'var(--chart)' }} /> Kunjungan
                </span>
                <span>
                  <i style={{ background: 'var(--chart-2)' }} /> Rujukan
                </span>
              </div>
              <small>{weekReferred} rujukan minggu ini</small>
            </div>
          </section>
        </div>

        <section className="dash__kpis" aria-label="Ringkasan bulan ini">
          <div className="dash-kpi dash-kpi--dark">
            <div className="dash-kpi__label">
              <span className="dash-kpi__ico">
                <ClipboardList className="ico" />
              </span>
              Kunjungan bulan ini
            </div>
            <div className="dash-kpi__row">
              <div className="dash-kpi__value">
                <CountUp value={monthTotal} />
              </div>
              <Sparkline values={monthDaily} tone="on-ink" />
            </div>
            <div className="dash-kpi__foot">
              {monthGrowth === null ? `${monthly[now.getMonth()].label} berjalan` : `${monthGrowth > 0 ? '+' : ''}${monthGrowth}% dari bulan lalu`}
            </div>
          </div>

          <div className="dash-kpi dash-kpi--accent">
            <div className="dash-kpi__label">
              <span className="dash-kpi__ico">
                <Users className="ico" />
              </span>
              Siswa dilayani
            </div>
            <div className="dash-kpi__row">
              <div className="dash-kpi__value">
                <CountUp value={uniqueStudents30} />
              </div>
              <Sparkline values={daily14} tone="on-accent" />
            </div>
            <div className="dash-kpi__foot">30 hari terakhir · {last30Days.length} kunjungan</div>
          </div>

          <div className="dash-kpi">
            <div className="dash-kpi__label">
              <span className="dash-kpi__ico">
                <TrendingUp className="ico" />
              </span>
              Rata-rata per hari
            </div>
            <div className="dash-kpi__row">
              <div className="dash-kpi__value">
                <CountUp value={avgPerDay} decimals={1} />
              </div>
              <Sparkline values={monthly.map((month) => month.total)} />
            </div>
            <div className="dash-kpi__foot">{activeDaysYear} hari aktif sepanjang tahun</div>
          </div>

          <div className="dash-kpi">
            <div className="dash-kpi__label">
              <span className="dash-kpi__ico">
                <CheckCircle2 className="ico" />
              </span>
              Kembali ke kelas
            </div>
            <div className="dash-kpi__row">
              <div className="dash-kpi__value">
                <CountUp value={returnRate} suffix="%" />
              </div>
              <Sparkline
                values={monthly.map((month) =>
                  month.total ? Math.round((month.returned / month.total) * 100) : 0
                )}
              />
            </div>
            <div className="dash-kpi__foot">
              {returnedYear} dari {yearTotal} kunjungan tahun ini
            </div>
          </div>
        </section>

        <div className="dash__split dash__split--main">
          <YearChart points={monthly} />

          <section className="card dash-funnel">
            <div className="card__head">
              <div className="card__title">
                <CheckCircle2 className="ico" />
                <span>
                  Status akhir
                  <span className="card__sub">Hasil penanganan 30 hari terakhir.</span>
                </span>
              </div>
              <span className="spill spill--iris">
                <i />
                {funnelTotal} kunjungan
              </span>
            </div>

            <div className="dash-funnel__rows">
              {funnel.map((row, index) => {
                const percent = funnelTotal ? Math.round((row.count / funnelTotal) * 100) : 0;
                return (
                  <div className="dash-funnel__row" key={row.label}>
                    <div className="dash-funnel__meta">
                      <b>{row.label}</b>
                      <small>{row.desc}</small>
                    </div>
                    <span className="dash-funnel__bar">
                      <i
                        style={{
                          width: `${Math.max(row.count ? 4 : 0, (row.count / funnelMax) * 100)}%`,
                          opacity: 1 - index * 0.2,
                        }}
                      />
                    </span>
                    <span className="dash-funnel__val">
                      {row.count}
                      <small>{percent}%</small>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="dash-funnel__note">
              <AlertTriangle className="ico" />
              <span>
                {funnelTotal
                  ? `${notReturned} kunjungan membutuhkan tindak lanjut di luar UKS.`
                  : 'Belum ada kunjungan pada 30 hari terakhir.'}
              </span>
            </div>
          </section>
        </div>

        <div className="dash__split dash__split--lists">
          <section className="card dash-visits">
            <div className="card__head">
              <div className="card__title">
                <Stethoscope className="ico" />
                <span>
                  Kunjungan terkini
                  <span className="card__sub">Siswa yang ditangani UKS hari ini.</span>
                </span>
              </div>
              <Link href="/visits" prefetch={false} className="card__link dash-link">
                Semua <ChevronRight className="ico" />
              </Link>
            </div>

            {recentVisits.length === 0 ? (
              <div className="empty">
                <ClipboardList className="ico" />
                <div className="empty__title">Belum ada kunjungan hari ini</div>
                <div className="empty__text">Kunjungan yang dicatat akan muncul di sini.</div>
                <Link href="/visits/new" prefetch={false} className="btn btn--primary btn--sm">
                  <Plus className="ico" /> Catat kunjungan
                </Link>
              </div>
            ) : (
              <div className="dash-visitlist">
                {recentVisits.map((visit, index) => {
                  const status = statusMap[visit.final_status ?? ''] ?? {
                    label: 'Belum diisi',
                    cls: 'badge badge--plain',
                  };
                  return (
                    <div className="dash-visit" key={visit.id}>
                      <span className="dash-visit__time">
                        {new Date(visit.check_in_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className={`av av--sm ${tones[index % tones.length]}`}>
                        {(visit.students?.full_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="dash-visit__main">
                        <b>{visit.students?.full_name ?? 'Siswa'}</b>
                        <small>
                          {visit.students?.class ?? '-'} · {visit.chief_complaint || 'Tanpa keluhan'}
                        </small>
                      </div>
                      <span className={status.cls}>{status.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card dash-low">
            <div className="card__head">
              <div className="card__title">
                <Pill className="ico" />
                <span>
                  Stok menipis
                  <span className="card__sub">Obat di bawah stok minimum.</span>
                </span>
              </div>
              <Link href="/inventory" prefetch={false} className="card__link dash-link">
                Restock <ChevronRight className="ico" />
              </Link>
            </div>

            {lowStock.length === 0 ? (
              <div className="empty">
                <Package className="ico" />
                <div className="empty__title">Stok aman</div>
                <div className="empty__text">Semua obat berada di atas batas minimum.</div>
              </div>
            ) : (
              <div className="dash-low__list">
                {lowStock.map((medicine) => {
                  const min = medicine.min_stock ?? 5;
                  const stock = medicine.stock ?? 0;
                  const percent = Math.min(100, Math.round((stock / Math.max(1, min)) * 100));
                  return (
                    <div className="dash-low__row" key={medicine.id}>
                      <div className="dash-low__main">
                        <b>{medicine.name}</b>
                        <small>
                          {medicine.category ?? 'Tanpa kategori'} · min {min} {medicine.unit ?? 'pcs'}
                        </small>
                      </div>
                      <span className="dash-low__meter">
                        <i style={{ width: `${Math.max(5, percent)}%` }} />
                      </span>
                      <span className="dash-low__val">{stock}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="dash-low__foot">
              <span>
                <Clock className="ico" /> {expiringSoon} obat mendekati kedaluwarsa
              </span>
              <span>{medicines.length} jenis obat</span>
            </div>
          </section>
        </div>

        <div className="dash__split dash__split--bottom">
          <section className="card dash-feed">
            <div className="card__head">
              <div className="card__title">
                <Activity className="ico" />
                <span>
                  Aktivitas
                  <span className="card__sub">Jejak perubahan terbaru di sekolah Anda.</span>
                </span>
              </div>
              <span className="spill spill--teal">
                <i />
                Live
              </span>
            </div>

            {activity.length === 0 ? (
              <div className="empty">
                <Activity className="ico" />
                <div className="empty__title">Belum ada aktivitas</div>
                <div className="empty__text">
                  {activityReady
                    ? 'Setiap perubahan data dan login akan tercatat di sini.'
                    : 'Tabel log aktivitas belum dibuat. Jalankan database/activity_logs.sql di Supabase.'}
                </div>
              </div>
            ) : (
              <div className="dash-feed__list">
                {activity.map((item) => (
                  <div className="dash-feed__item" key={item.id}>
                    <span className="av av--sm av--sky">{initials(item.actor_name)}</span>
                    <div className="dash-feed__main">
                      <p>
                        <b>{item.actor_name ?? 'Sistem'}</b> {item.summary}
                      </p>
                      <small>
                        {timeAgo(item.created_at)} · {badgeFor(item.action)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card dash-status">
            <div className="card__head">
              <div className="card__title">
                <Users className="ico" />
                <span>
                  Status hari ini
                  <span className="card__sub">Sebaran hasil penanganan.</span>
                </span>
              </div>
              <Link href="/visits" prefetch={false} className="card__link dash-link">
                Semua <ChevronRight className="ico" />
              </Link>
            </div>

            <div className="dash-status__big">
              <CountUp value={todayCount} />
              <small>kunjungan</small>
            </div>

            <div className="dash-status__bar" aria-hidden="true">
              {todayCount === 0 ? (
                <i className="dash-status__zero" />
              ) : (
                (['back_to_class', 'referred', 'picked_up'] as const).map((key) => {
                  const value = todayStatus[key];
                  if (!value) return null;
                  return (
                    <i
                      key={key}
                      style={{
                        width: `${(value / todayStatusTotal) * 100}%`,
                        background:
                          key === 'back_to_class'
                            ? 'var(--chart)'
                            : key === 'referred'
                              ? 'color-mix(in srgb, var(--chart) 58%, var(--surface))'
                              : 'color-mix(in srgb, var(--chart) 30%, var(--surface))',
                      }}
                    />
                  );
                })
              )}
            </div>

            <div className="dash-status__legend">
              {(['back_to_class', 'referred', 'picked_up'] as const).map((key) => (
                <div key={key}>
                  <span className={`dot ${key === 'back_to_class' ? 'dot--good' : key === 'referred' ? 'dot--bad' : 'dot--warn'}`} />
                  <span>{statusMap[key].label}</span>
                  <b>{todayStatus[key]}</b>
                </div>
              ))}
            </div>

            <div className="dash-status__foot">
              <span>{todayStatus.unknown} belum diisi</span>
              <span>{todayCount ? Math.round((todayStatus.back_to_class / todayCount) * 100) : 0}% kembali ke kelas</span>
            </div>
          </section>

          <section className="card dash-rank">
            <div className="card__head">
              <div className="card__title">
                <Users className="ico" />
                <span>
                  Kelas paling sering
                  <span className="card__sub">30 hari terakhir.</span>
                </span>
              </div>
            </div>

            {topClasses.length === 0 ? (
              <div className="empty">
                <Users className="ico" />
                <div className="empty__title">Belum ada kunjungan</div>
                <div className="empty__text">Kunjungan 30 hari terakhir akan dirangkum per kelas di sini.</div>
              </div>
            ) : (
              <div className="dash-rank__list">
                {topClasses.map((item, index) => (
                  <div className="dash-rank__row" key={item.klass}>
                    <span className="dash-rank__rank">{index + 1}</span>
                    <div className="dash-rank__main">
                      <b>{item.klass}</b>
                      <small>{item.students} siswa datang</small>
                      <span className="dash-rank__bar">
                        <i style={{ width: `${(item.visits / maxClassVisits) * 100}%` }} />
                      </span>
                    </div>
                    <span className="dash-rank__val">{item.visits}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="dash-rank__foot">
              <span>{classCount} kelas terdaftar</span>
              <span>{last30Days.length} kunjungan 30 hari</span>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
