import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Pill,
  Plus,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { getAuthUser, getSessionProfile } from '@/lib/auth';
import { fetchAllRows } from '@/lib/supabase/paginate';
import { visitStatusLabels } from '@/lib/visit-status';
import { DAY_MS, expiryState, isExpiryWarning, isLowStock } from '@/lib/stock';

type VisitRow = {
  id: string;
  student_id: string;
  check_in_at: string;
  final_status: string | null;
  chief_complaint: string | null;
  students?: {
    full_name: string | null;
    nis: string | null;
    class: string | null;
  } | null;
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

const statusMap: Record<string, { label: string; cls: string }> = {
  back_to_class: { label: visitStatusLabels.back_to_class, cls: 'badge badge--good' },
  referred: { label: visitStatusLabels.referred, cls: 'badge badge--bad' },
  picked_up: { label: visitStatusLabels.picked_up, cls: 'badge badge--warn' },
};

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];

const periods = [
  { key: '7', label: '7 hari', days: 7 },
  { key: '30', label: '30 hari', days: 30 },
  { key: '90', label: '3 bulan', days: 90 },
  { key: '365', label: '1 tahun', days: 365 },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function greeting(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function deltaText(delta: number) {
  if (delta === 0) return 'tetap';
  return `${delta > 0 ? 'naik' : 'turun'} ${Math.abs(delta)}%`;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

/** Titik grafik tren: harian untuk periode pendek, bulanan untuk 1 tahun. */
function buildTrendPoints(
  periodDays: number,
  periodStart: Date,
  now: Date,
  visits: VisitRow[]
): { date: number; label: string; total: number }[] {
  if (periodDays >= 365) {
    const buckets: { date: Date; label: string; total: number }[] = [];
    const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    while (cursor <= end) {
      buckets.push({
        date: new Date(cursor),
        label: cursor.toLocaleDateString('id-ID', { month: 'short' }),
        total: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const index = new Map(
      buckets.map((bucket, i) => [`${bucket.date.getFullYear()}-${bucket.date.getMonth()}`, i])
    );
    visits.forEach((visit) => {
      const date = new Date(visit.check_in_at);
      // Bucket pertama bisa dimulai sebelum periode terpilih; jangan hitung
      // kunjungan di luar rentang agar total grafik sama dengan ringkasan.
      if (date.getTime() < periodStart.getTime()) return;
      const at = index.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (at !== undefined) buckets[at].total += 1;
    });

    return buckets.map((bucket) => ({
      date: bucket.date.getTime(),
      label: bucket.label,
      total: bucket.total,
    }));
  }

  const start = startOfDay(periodStart);
  const buckets = Array.from({ length: periodDays }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    return {
      date,
      label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      total: 0,
    };
  });

  const index = new Map(buckets.map((bucket, i) => [dayKey(bucket.date), i]));
  visits.forEach((visit) => {
    const at = index.get(dayKey(new Date(visit.check_in_at)));
    if (at !== undefined) buckets[at].total += 1;
  });

  return buckets.map((bucket) => ({
    date: bucket.date.getTime(),
    label: bucket.label,
    total: bucket.total,
  }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { user, supabase } = await getAuthUser();
  if (!user) redirect('/auth/signin');

  const params = await searchParams;
  const period = periods.find((item) => item.key === (params.period ?? '')) ?? periods[1];

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const periodStart = new Date(todayStart);
  periodStart.setDate(periodStart.getDate() - (period.days - 1));
  // Periode sebelumnya dipakai untuk membandingkan tren pada kartu grafik.
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - period.days);

  const lookback = new Date(
    Math.min(yearStart.getTime(), previousPeriodStart.getTime())
  );

  // Mulai query data lebih dulu, lalu ambil profil paralel dengan query tersebut.
  const dataPromise = Promise.all([
    fetchAllRows<VisitRow>((from, to) =>
      supabase
        .from('visits')
        .select(
          'id,student_id,check_in_at,final_status,chief_complaint,students(full_name,nis,class)'
        )
        .gte('check_in_at', lookback.toISOString())
        .order('check_in_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    ),
    supabase
      .from('medicines')
      .select('id,name,category,unit,stock,min_stock,expiry_date,location')
      .order('name', { ascending: true }),
  ]);

  const { profile } = await getSessionProfile();
  const [visitsRes, medicinesRes] = await dataPromise;

  const visits = (visitsRes.data ?? []) as unknown as VisitRow[];
  const medicines = (medicinesRes.data ?? []) as MedicineRow[];

  const inRange = (visit: VisitRow, from: Date, to?: Date) => {
    const time = new Date(visit.check_in_at).getTime();
    return time >= from.getTime() && (to ? time < to.getTime() : true);
  };

  const todayVisits = visits.filter((visit) => inRange(visit, todayStart, tomorrowStart));
  const yesterdayVisits = visits.filter((visit) => inRange(visit, yesterdayStart, todayStart));
  const todayCount = todayVisits.length;
  const yesterdayCount = yesterdayVisits.length;
  const dayDelta =
    yesterdayCount > 0
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : todayCount > 0
        ? 100
        : 0;

  const monthTotal = visits.filter((visit) => inRange(visit, monthStart, nextMonthStart)).length;
  const previousMonthTotal = visits.filter((visit) =>
    inRange(visit, previousMonthStart, monthStart)
  ).length;
  const monthGrowth =
    previousMonthTotal > 0
      ? Math.round(((monthTotal - previousMonthTotal) / previousMonthTotal) * 100)
      : null;

  const yearVisits = visits.filter((visit) => inRange(visit, yearStart));
  const yearTotal = yearVisits.length;
  const referredYear = yearVisits.filter((visit) => visit.final_status === 'referred').length;
  const returnedYear = yearVisits.filter((visit) => visit.final_status === 'back_to_class').length;
  const referredStudentsYear = new Set(
    yearVisits
      .filter((visit) => visit.final_status === 'referred')
      .map((visit) => visit.student_id)
  ).size;
  const returnedStudentsYear = new Set(
    yearVisits
      .filter((visit) => visit.final_status === 'back_to_class')
      .map((visit) => visit.student_id)
  ).size;
  const referralRate = percent(referredYear, yearTotal);
  const returnRate = percent(returnedYear, yearTotal);
  const referredToday = todayVisits.filter((visit) => visit.final_status === 'referred').length;

  const periodVisits = visits.filter((visit) => inRange(visit, periodStart));
  const previousPeriodTotal = visits.filter((visit) =>
    inRange(visit, previousPeriodStart, periodStart)
  ).length;
  const periodDelta =
    previousPeriodTotal > 0
      ? Math.round(((periodVisits.length - previousPeriodTotal) / previousPeriodTotal) * 100)
      : periodVisits.length > 0
        ? 100
        : 0;

  const trendPoints = buildTrendPoints(period.days, periodStart, now, visits);

  const lowStockAll = medicines.filter((medicine) =>
    isLowStock(medicine.stock, medicine.min_stock)
  );
  const lowStock = [...lowStockAll]
    .sort((a, b) => (a.stock ?? 0) - (a.min_stock ?? 5) - ((b.stock ?? 0) - (b.min_stock ?? 5)))
    .slice(0, 3);

  const expiringAll = medicines
    .filter((medicine) => isExpiryWarning(medicine.expiry_date, now.getTime()))
    .sort(
      (a, b) =>
        new Date(a.expiry_date ?? 0).getTime() - new Date(b.expiry_date ?? 0).getTime()
    );
  const expiringList = expiringAll.slice(0, 3);

  const attentionCount = new Set([
    ...lowStockAll.map((medicine) => medicine.id),
    ...expiringAll.map((medicine) => medicine.id),
  ]).size;

  const complaintMap = new Map<string, { label: string; count: number }>();
  periodVisits.forEach((visit) => {
    const text = visit.chief_complaint?.trim();
    if (!text) return;
    const key = text.toLowerCase();
    const item = complaintMap.get(key) ?? { label: text, count: 0 };
    item.count += 1;
    complaintMap.set(key, item);
  });
  const topComplaints = [...complaintMap.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
  const maxComplaint = Math.max(1, ...topComplaints.map((item) => item.count));

  const recentVisits = visits.slice(0, 5);

  const firstName = (profile?.full_name ?? user.email ?? 'Petugas UKS').trim().split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <AppShell title="Dashboard" crumbs={[{ label: 'UKS', href: '/' }, { label: 'Dashboard' }]}>
      <div className="dash">
        <div className="dash-greet">
          <div>
            <h2 className="dash-greet__title">
              {greeting(now.getHours())}, {firstName}.
            </h2>
            <p className="dash-greet__sub">
              {dateLabel} · <b>{todayCount} kunjungan</b> hari ini
              {referredToday > 0 ? (
                <>
                  {' '}
                  · <b>{referredToday} dirujuk</b>
                </>
              ) : null}
              {lowStockAll.length > 0 ? (
                <>
                  {' '}
                  · <b>{lowStockAll.length} obat</b> perlu ditambah stok
                </>
              ) : null}
              {expiringAll.length > 0 ? (
                <>
                  {' '}
                  · <b>{expiringAll.length} obat</b> mendekati kedaluwarsa
                </>
              ) : null}
            </p>
          </div>
          <div className="dash-greet__actions">
            <Link href="/visits/new" prefetch={false} className="btn btn--primary btn--sm">
              <Plus className="ico" /> Catat kunjungan
            </Link>
            <Link href="/reports" prefetch={false} className="btn btn--ghost btn--sm">
              <TrendingUp className="ico" /> Lihat laporan
            </Link>
          </div>
        </div>

        <section className="dash__kpis" aria-label="Ringkasan kunjungan">
          <article className="kpi">
            <span className="kpi__ico kpi__ico--green">
              <Stethoscope className="ico" />
            </span>
            <span className="kpi__label">Hari ini</span>
            <div className="kpi__value">
              <CountUp value={todayCount} />
              <small>kunjungan</small>
            </div>
            <span
              className={`kpi__foot ${dayDelta < 0 ? 'is-down' : dayDelta > 0 ? 'is-up' : ''}`}
            >
              {dayDelta !== 0 &&
                (dayDelta < 0 ? (
                  <ArrowDownRight className="ico" />
                ) : (
                  <ArrowUpRight className="ico" />
                ))}
              {dayDelta === 0 ? 'tetap dibanding kemarin' : `${deltaText(dayDelta)} dibanding kemarin`}
            </span>
          </article>

          <article className="kpi">
            <span className="kpi__ico kpi__ico--blue">
              <CalendarDays className="ico" />
            </span>
            <span className="kpi__label">Bulan ini</span>
            <div className="kpi__value">
              <CountUp value={monthTotal} />
              <small>kunjungan</small>
            </div>
            <span
              className={`kpi__foot ${
                monthGrowth === null ? '' : monthGrowth < 0 ? 'is-down' : monthGrowth > 0 ? 'is-up' : ''
              }`}
            >
              {monthGrowth === null ? (
                'bulan berjalan'
              ) : (
                <>
                  {monthGrowth !== 0 &&
                    (monthGrowth < 0 ? (
                      <ArrowDownRight className="ico" />
                    ) : (
                      <ArrowUpRight className="ico" />
                    ))}
                  {monthGrowth === 0
                    ? 'tetap dari bulan lalu'
                    : `${deltaText(monthGrowth)} dari bulan lalu`}
                </>
              )}
            </span>
          </article>

          <article className="kpi">
            <span className="kpi__ico kpi__ico--red">
              <AlertTriangle className="ico" />
            </span>
            <span className="kpi__label">Dirujuk tahun ini</span>
            <div className="kpi__value">
              <CountUp value={referredStudentsYear} />
              <small>siswa</small>
            </div>
            <span className="kpi__foot">
              {referralRate}% dari {yearTotal} kunjungan
            </span>
          </article>

          <article className="kpi">
            <span className="kpi__ico kpi__ico--blue">
              <BedDouble className="ico" />
            </span>
            <span className="kpi__label">Istirahat di UKS</span>
            <div className="kpi__value">
              <CountUp value={returnedStudentsYear} />
              <small>siswa</small>
            </div>
            <span className="kpi__foot">
              {returnRate}% dari {yearTotal} kunjungan
            </span>
          </article>
        </section>

        <div className="dash__split dash__split--main">
          <TrendChart
            points={trendPoints}
            periodKey={period.key}
            periodLabel={period.label}
            total={periodVisits.length}
            delta={periodDelta}
          />

          <section className="card attention">
            <header className="attention__head">
              <h2>Perlu perhatian</h2>
              {attentionCount > 0 && (
                <span className="badge badge--bad">
                  <AlertTriangle className="ico" style={{ width: 12, height: 12 }} />
                  {attentionCount} obat
                </span>
              )}
            </header>

            {lowStockAll.length === 0 && expiringAll.length === 0 ? (
              <div className="attention__safe">
                <span className="attention__safeIco">
                  <CheckCircle2 className="ico" />
                </span>
                <div>
                  <b>Semua aman</b>
                  <small>Stok dan masa berlaku obat dalam kondisi baik.</small>
                </div>
              </div>
            ) : (
              <>
                <div className="attention__group">
                  <p className="attention__label">Stok menipis</p>
                  {lowStock.length === 0 ? (
                    <p className="attention__empty">Semua stok di atas batas minimum.</p>
                  ) : (
                    lowStock.map((medicine) => {
                      const min = medicine.min_stock ?? 5;
                      const stock = medicine.stock ?? 0;
                      const unit = medicine.unit ?? 'pcs';
                      return (
                        <div className="attention__row" key={medicine.id}>
                          <span className="attention__ico attention__ico--low">
                            <Pill className="ico" />
                          </span>
                          <div className="attention__main">
                            <b>{medicine.name}</b>
                            <small>
                              min {min} {unit}
                            </small>
                          </div>
                          <span className="badge badge--warn attention__badge">
                            Sisa {stock} {unit}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="attention__group">
                  <p className="attention__label">Mendekati kedaluwarsa</p>
                  {expiringList.length === 0 ? (
                    <p className="attention__empty">
                      Tidak ada obat yang mendekati kedaluwarsa.
                    </p>
                  ) : (
                    expiringList.map((medicine) => {
                      const state = expiryState(medicine.expiry_date, now.getTime());
                      const expiry = medicine.expiry_date
                        ? new Date(medicine.expiry_date)
                        : null;
                      const dateText = expiry
                        ? expiry.toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—';
                      const daysLeft = expiry
                        ? Math.max(
                            1,
                            Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS)
                          )
                        : 0;
                      return (
                        <div className="attention__row" key={medicine.id}>
                          <span className="attention__ico attention__ico--exp">
                            <AlertTriangle className="ico" />
                          </span>
                          <div className="attention__main">
                            <b>{medicine.name}</b>
                            <small>{dateText}</small>
                          </div>
                          <span
                            className={`badge attention__badge ${
                              state === 'expired' ? 'badge--bad' : 'badge--warn'
                            }`}
                          >
                            {state === 'expired' ? 'Kedaluwarsa' : `${daysLeft} hari lagi`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            <div className="attention__foot">
              <Link
                href="/inventory"
                prefetch={false}
                className="btn btn--ghost btn--sm attention__link"
              >
                Kelola inventaris <ChevronRight className="ico" />
              </Link>
            </div>
          </section>
        </div>

        <div className="dash__split dash__split--lists">
          <section className="card recent">
            <header className="card__head">
              <h2 className="card__title">Kunjungan terkini</h2>
              <Link href="/visits" prefetch={false} className="card__link dash-link">
                Lihat semua <ChevronRight className="ico" />
              </Link>
            </header>

            {recentVisits.length === 0 ? (
              <div className="empty">
                <ClipboardList className="ico" />
                <div className="empty__title">Belum ada kunjungan</div>
                <div className="empty__text">Kunjungan yang dicatat akan muncul di sini.</div>
                <Link href="/visits/new" prefetch={false} className="btn btn--primary btn--sm">
                  <Plus className="ico" /> Catat kunjungan
                </Link>
              </div>
            ) : (
              <div className="recent__table">
                <div className="recent__head" aria-hidden="true">
                  <span>Siswa</span>
                  <span>Keluhan</span>
                  <span>Waktu</span>
                  <span>Status</span>
                </div>
                {recentVisits.map((visit, index) => {
                  const status = statusMap[visit.final_status ?? ''] ?? {
                    label: 'Belum diisi',
                    cls: 'badge badge--plain',
                  };
                  const when = new Date(visit.check_in_at);
                  const dateText = when.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  });
                  const timeText = when.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const name = visit.students?.full_name ?? 'Siswa';
                  return (
                    <div className="recent__row" key={visit.id}>
                      <div className="recent__student">
                        <span className={`av av--sm ${tones[index % tones.length]}`}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                        <div className="recent__studentText">
                          <b>{name}</b>
                          <small>Kelas {visit.students?.class ?? '-'}</small>
                        </div>
                      </div>
                      <span className="recent__complaint">
                        {visit.chief_complaint?.trim() || '—'}
                      </span>
                      <span className="recent__time">
                        {dateText}, {timeText}
                      </span>
                      <span className={status.cls}>{status.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card complaints">
            <header className="card__head">
              <h2 className="card__title">Keluhan terbanyak</h2>
              <span className="badge badge--plain">{period.label}</span>
            </header>

            {topComplaints.length === 0 ? (
              <div className="empty">
                <ClipboardList className="ico" />
                <div className="empty__title">Belum ada keluhan</div>
                <div className="empty__text">
                  Keluhan yang dicatat pada {period.label} terakhir akan dirangkum di sini.
                </div>
              </div>
            ) : (
              <div className="complaints__list">
                {topComplaints.map((item, index) => (
                  <div className="complaints__row" key={item.key}>
                    <span className="complaints__rank">{index + 1}</span>
                    <b>{item.label}</b>
                    <span className="complaints__count">{item.count}</span>
                    <span className="complaints__bar">
                      <i style={{ width: `${(item.count / maxComplaint) * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
