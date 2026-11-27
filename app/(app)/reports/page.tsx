'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGroup, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { Sparkline } from '@/components/dashboard/spark';
import {
  AlertCircle,
  Ambulance,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Pill,
  Star,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import { fetchAllRows } from '@/lib/supabase/paginate';
import { visitStatusLabel, visitStatusLabels } from '@/lib/visit-status';
import { exportReportsExcel } from '@/lib/reports/export-excel';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

// Grafik Bklit dimuat terpisah agar tidak memperbesar bundle awal halaman Laporan.
const ReportAreaChart = dynamic(() => import('@/components/charts/report-area-chart'), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: 260, width: '100%' }} />,
});

const MedicineMoveChart = dynamic(() => import('@/components/charts/medicine-move-chart'), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: 260, width: '100%' }} />,
});

const ReportBarsChart = dynamic(() => import('@/components/charts/report-bars-chart'), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: 230, width: '100%' }} />,
});

const BklitGauge = dynamic(
  () => import('@/components/charts/gauge').then((module) => module.Gauge),
  {
    ssr: false,
    loading: () => <div className="skel" style={{ height: 170, width: '100%' }} />,
  }
);

const pillSpring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const;

const ranges = [
  { key: '7d', label: '7 hari', days: 7 },
  { key: '30d', label: '30 hari', days: 30 },
  { key: '3m', label: '3 bulan', days: 90 },
  { key: '6m', label: '6 bulan', days: 180 },
  { key: '12m', label: '12 bulan', days: 365 },
  { key: 'all', label: 'Semua', days: 0 },
] as const;

const defaultRange = ranges.find((r) => r.key === '6m') ?? ranges[0];

type RangeKey = (typeof ranges)[number]['key'];
type Metric = 'visits' | 'students' | 'returned' | 'referred' | 'picked' | 'med_out' | 'med_in';
type GroupBy = 'month' | 'class' | 'complaint' | 'status' | 'medicine';
type ChartKind = 'area' | 'bars';
type Tab = 'overview' | 'builder';

const metrics: { key: Metric; label: string; desc: string; icon: typeof ClipboardList }[] = [
  { key: 'visits', label: 'Kunjungan', desc: 'Jumlah kunjungan UKS', icon: ClipboardList },
  { key: 'students', label: 'Siswa berkunjung', desc: 'Siswa berbeda yang datang', icon: Users },
  { key: 'returned', label: 'Kembali ke kelas', desc: 'Siswa yang langsung belajar lagi', icon: CheckCircle2 },
  { key: 'referred', label: 'Rujukan', desc: 'Dirujuk ke faskes / RS', icon: AlertCircle },
  { key: 'picked', label: 'Dijemput', desc: 'Dijemput orang tua', icon: Stethoscope },
  { key: 'med_out', label: 'Obat keluar', desc: 'Jumlah obat yang diberikan', icon: Pill },
  { key: 'med_in', label: 'Obat masuk', desc: 'Jumlah obat yang direstok', icon: Pill },
];

const groupOptions: { key: GroupBy; label: string }[] = [
  { key: 'month', label: 'Bulan' },
  { key: 'class', label: 'Kelas' },
  { key: 'complaint', label: 'Keluhan' },
  { key: 'status', label: 'Status' },
  { key: 'medicine', label: 'Obat' },
];

const statusMap: Record<string, { label: string; cls: string; color: string }> = {
  back_to_class: { label: visitStatusLabels.back_to_class, cls: 'badge badge--good', color: 'var(--good)' },
  referred: { label: visitStatusLabels.referred, cls: 'badge badge--bad', color: 'var(--bad)' },
  picked_up: { label: visitStatusLabels.picked_up, cls: 'badge badge--warn', color: 'var(--warn)' },
};

type VisitRow = {
  id: string;
  student_id: string | null;
  check_in_at: string;
  chief_complaint: string | null;
  temperature: number | null;
  blood_pressure: string | null;
  weight: number | null;
  height: number | null;
  treatment: string | null;
  final_status: string | null;
  notes: string | null;
  students?: { id: string; full_name: string | null; nis: string | null; class: string | null } | null;
};

type GroupDatum = { key: string; label: string; value: number };

type MedicineRow = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  stock: number | null;
  min_stock: number | null;
  location: string | null;
  expiry_date: string | null;
};

type MedicineLogRow = {
  id: string;
  medicine_id: string;
  type: string;
  qty: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
};

type SavedReport = {
  id: string;
  name: string;
  metric: Metric;
  groupBy: GroupBy;
  chart: ChartKind;
  range: RangeKey;
  createdAt: string;
  createdByName?: string | null;
};

type SavedReportRow = {
  id: string;
  name: string;
  metric: string;
  group_by: string;
  chart: string;
  range_key: string;
  created_at: string;
  created_by_name: string | null;
};

function mapSavedReport(row: SavedReportRow): SavedReport {
  return {
    id: row.id,
    name: row.name,
    metric: (metrics.some((m) => m.key === row.metric) ? row.metric : 'visits') as Metric,
    groupBy: (groupOptions.some((g) => g.key === row.group_by) ? row.group_by : 'month') as GroupBy,
    chart: row.chart === 'bars' ? 'bars' : 'area',
    range: (ranges.some((r) => r.key === row.range_key) ? row.range_key : '6m') as RangeKey,
    createdAt: row.created_at,
    createdByName: row.created_by_name,
  };
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function exportDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function exportTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function exportStatus(status: string | null) {
  return visitStatusLabel(status);
}

/** Ringkasan status obat untuk keperluan ekspor. */
function medicineStatus(m: MedicineRow) {
  const stock = m.stock ?? 0;
  const min = m.min_stock ?? 5;
  const expiry = m.expiry_date ? new Date(m.expiry_date).getTime() : null;
  const expired = expiry !== null && expiry <= Date.now();
  const soon = expiry !== null && !expired && expiry - Date.now() <= 30 * 24 * 60 * 60 * 1000;

  const parts: string[] = [];
  if (expired) parts.push('Kedaluwarsa');
  else if (soon) parts.push('≤ 30 hari');
  if (stock <= min) parts.push('Stok menipis');
  return parts.length ? parts.join(' · ') : 'Aman';
}

/** Tren 7 hari selalu menampilkan tujuh titik, termasuk hari tanpa kunjungan. */
function buildDailyTrend(visits: VisitRow[], days: number): GroupDatum[] {
  const buckets = new Map<string, GroupDatum>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = dayKey(date.toISOString());
    buckets.set(key, {
      key,
      label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      value: 0,
    });
  }

  for (const visit of visits) {
    const bucket = buckets.get(dayKey(visit.check_in_at));
    if (bucket) bucket.value += 1;
  }

  return [...buckets.values()];
}

type KpiBucket = {
  total: number;
  students: Set<string>;
  referred: number;
  returned: number;
};

function createKpiBucket(): KpiBucket {
  return { total: 0, students: new Set<string>(), referred: 0, returned: 0 };
}

/**
 * Deret kecil untuk sparkline KPI laporan. Harian untuk 7/30 hari, bulanan
 * untuk periode lebih panjang supaya bentuk tren tetap terbaca.
 */
function buildKpiTrend(visits: VisitRow[], range: RangeKey, days: number) {
  const daily = range === '7d' || range === '30d';
  const buckets = new Map<string, KpiBucket>();

  if (daily) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      buckets.set(dayKey(date.toISOString()), createKpiBucket());
    }
  } else if (days > 0) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date();
    while (cursor <= end) {
      buckets.set(monthKey(cursor.toISOString()), createKpiBucket());
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  for (const visit of visits) {
    const key = daily ? dayKey(visit.check_in_at) : monthKey(visit.check_in_at);
    const bucket = buckets.get(key) ?? createKpiBucket();
    bucket.total += 1;
    if (visit.student_id) bucket.students.add(visit.student_id);
    if (visit.final_status === 'referred') bucket.referred += 1;
    if (visit.final_status === 'back_to_class') bucket.returned += 1;
    buckets.set(key, bucket);
  }

  const rows = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, bucket]) => bucket);

  return {
    total: rows.map((bucket) => bucket.total),
    students: rows.map((bucket) => bucket.students.size),
    referred: rows.map((bucket) => bucket.referred),
    returnRate: rows.map((bucket) =>
      bucket.total ? Math.round((bucket.returned / bucket.total) * 100) : 0
    ),
  };
}

function buildGroups(visits: VisitRow[], groupBy: GroupBy, metric: Metric): GroupDatum[] {
  const buckets = new Map<string, { label: string; count: number; students: Set<string> }>();

  for (const v of visits) {
    const matches =
      metric === 'visits' || metric === 'students'
        ? true
        : (metric === 'returned' && v.final_status === 'back_to_class') ||
          (metric === 'referred' && v.final_status === 'referred') ||
          (metric === 'picked' && v.final_status === 'picked_up');

    if (!matches) continue;

    let key = '';
    let label = '';

    if (groupBy === 'month') {
      const d = new Date(v.check_in_at);
      key = monthKey(v.check_in_at);
      label = d.toLocaleDateString('id-ID', { month: 'short' });
    } else if (groupBy === 'class') {
      label = v.students?.class || 'Tanpa kelas';
      key = label;
    } else if (groupBy === 'complaint') {
      label = v.chief_complaint || 'Lainnya';
      key = label;
    } else {
      label = visitStatusLabel(v.final_status);
      key = label;
    }

    const bucket = buckets.get(key) ?? { label, count: 0, students: new Set<string>() };
    bucket.count += 1;
    if (v.student_id) bucket.students.add(v.student_id);
    buckets.set(key, bucket);
  }

  const rows = [...buckets.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    value: metric === 'students' ? b.students.size : b.count,
  }));

  return groupBy === 'month'
    ? rows.sort((a, b) => a.key.localeCompare(b.key))
    : rows.sort((a, b) => b.value - a.value);
}

function AreaChart({ data }: { data: GroupDatum[] }) {
  if (data.length < 2) {
    return (
      <div className="empty" style={{ padding: '32px 8px' }}>
        <BarChart3 className="ico" />
        <div className="empty__text">Data belum cukup untuk menggambar tren. Pilih periode yang lebih panjang.</div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value,
  }));

  const chartKey = data.map((d) => `${d.key}:${d.value}`).join('|');

  return (
    <div key={chartKey} className="relative w-full" style={{ minHeight: 240, height: 260 }}>
      <ReportAreaChart
        key={chartKey}
        data={chartData}
        xDataKey="label"
        className="h-full w-full"
      />
    </div>
  );
}

function BarsChart({ data }: { data: GroupDatum[] }) {
  return <ReportBarsChart data={data} />;
}

function Gauge({ pct }: { pct: number }) {
  return (
    <BklitGauge
      value={pct}
      centerValue={pct}
      suffix="%"
      defaultLabel="kembali ke kelas"
      totalNotches={40}
      activeFill="var(--iris)"
      inactiveFill="var(--well)"
      inactiveFillOpacity={0.7}
      minWidth={0}
      className="rpt__gaugewrap"
    />
  );
}

export default function ReportsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<MedicineLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>(defaultRange.key);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [ck, setCk] = useState([true, true, true, true]);
  const [lan, setLan] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const [metric, setMetric] = useState<Metric>('visits');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [chart, setChart] = useState<ChartKind>('area');
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [savedSource, setSavedSource] = useState<'server' | 'local'>('server');

  // Laporan tersimpan dibaca dari server agar bisa dibagi antar-staf.
  // Bila tabel `saved_reports` belum dibuat, otomatis jatuh ke localStorage.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('id,name,metric,group_by,chart,range_key,created_at,created_by_name')
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        try {
          const raw = localStorage.getItem('uks:saved-reports');
          if (raw) setSaved(JSON.parse(raw) as SavedReport[]);
        } catch {}
        setSavedSource('local');
        return;
      }

      setSaved(((data ?? []) as SavedReportRow[]).map(mapSavedReport));
      setSavedSource('server');
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const selected = ranges.find((r) => r.key === range) ?? defaultRange;

    const since = new Date();
    if (selected.days > 0) {
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (selected.days - 1));
    }

    const [visitsRes, medicinesRes, logsRes] = await Promise.all([
      fetchAllRows<VisitRow>((from, to) => {
        let q = supabase
          .from('visits')
          .select('*, students(*)')
          .order('check_in_at', { ascending: false })
          .order('id', { ascending: false });

        if (selected.days > 0) q = q.gte('check_in_at', since.toISOString());

        return q.range(from, to);
      }),
      fetchAllRows<MedicineRow>((from, to) =>
        supabase.from('medicines').select('*').order('name').order('id').range(from, to)
      ),
      fetchAllRows<MedicineLogRow>((from, to) => {
        let q = supabase
          .from('medicine_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });

        if (selected.days > 0) q = q.gte('created_at', since.toISOString());

        return q.range(from, to);
      }),
    ]);

    setVisits(visitsRes.data);
    setMedicines(medicinesRes.data);
    setMedicineLogs(logsRes.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const rangeInfo = ranges.find((r) => r.key === range) ?? defaultRange;

  const filtered = visits.filter((v) => {
    if (!query) return true;
    const term = query.toLowerCase();
    return Boolean(
      v.students?.full_name?.toLowerCase().includes(term) || v.students?.nis?.toLowerCase().includes(term)
    );
  });

  const statusCounts: Record<string, number> = {};
  filtered.forEach((v) => {
    const s = v.final_status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const total = filtered.length;
  const uniqueStudents = new Set(filtered.map((v) => v.student_id)).size;
  const returned = statusCounts['back_to_class'] ?? 0;
  const returnRate = total ? Math.round((returned / total) * 100) : 0;
  const referred = statusCounts['referred'] ?? 0;
  const referralRate = total ? Math.round((referred / total) * 100) : 0;
  const kpiTrend = buildKpiTrend(filtered, range, rangeInfo.days);

  const monthly = buildGroups(filtered, 'month', 'visits');
  const trend = range === '7d' ? buildDailyTrend(filtered, 7) : monthly;
  const trendTitle = range === '7d' ? 'Kunjungan per Hari' : 'Kunjungan per Bulan';
  const byClass = buildGroups(filtered, 'class', 'visits').slice(0, 8);
  const complaints = buildGroups(filtered, 'complaint', 'visits').slice(0, 6);
  const maxComplaint = Math.max(1, ...complaints.map((c) => c.value));

  const studentMap = new Map<string, { id: string; name: string; nis: string; klass: string; count: number }>();
  filtered.forEach((v) => {
    if (!v.student_id) return;
    const cur =
      studentMap.get(v.student_id) ?? {
        id: v.student_id,
        name: v.students?.full_name ?? '-',
        nis: v.students?.nis ?? '-',
        klass: v.students?.class ?? '-',
        count: 0,
      };
    cur.count += 1;
    studentMap.set(v.student_id, cur);
  });
  const topStudents = [...studentMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  const maxStudentVisits = Math.max(1, ...topStudents.map((s) => s.count));
  const topSignature = topStudents.map((s) => `${s.id}:${s.count}`).join('|');

  const medicineById = new Map(medicines.map((m) => [m.id, m]));

  // Pergerakan stok obat pada periode terpilih: harian untuk 7 hari, sisanya bulanan.
  const medMovement = (() => {
    const buckets = new Map<string, { key: string; label: string; masuk: number; keluar: number }>();

    if (range === '7d') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = dayKey(d.toISOString());
        buckets.set(key, {
          key,
          label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          masuk: 0,
          keluar: 0,
        });
      }
    }

    for (const log of medicineLogs) {
      const key = range === '7d' ? dayKey(log.created_at) : monthKey(log.created_at);
      let bucket = buckets.get(key);
      if (!bucket) {
        const d = new Date(log.created_at);
        bucket = {
          key,
          label:
            range === '7d'
              ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
              : d.toLocaleDateString('id-ID', { month: 'short' }),
          masuk: 0,
          keluar: 0,
        };
        buckets.set(key, bucket);
      }
      if (log.type === 'in') bucket.masuk += log.qty || 0;
      else bucket.keluar += log.qty || 0;
    }

    const rows = [...buckets.values()];
    return range === '7d' ? rows : rows.sort((a, b) => a.key.localeCompare(b.key));
  })();

  const medInTotal = medicineLogs.reduce((sum, l) => (l.type === 'in' ? sum + (l.qty || 0) : sum), 0);
  const medOutTotal = medicineLogs.reduce((sum, l) => (l.type === 'out' ? sum + (l.qty || 0) : sum), 0);

  // Obat paling sering diberikan (total keluar) pada periode ini.
  const medRanking = (() => {
    const map = new Map<string, { name: string; masuk: number; keluar: number }>();
    for (const log of medicineLogs) {
      const name = medicineById.get(log.medicine_id)?.name ?? 'Obat dihapus';
      const cur = map.get(log.medicine_id) ?? { name, masuk: 0, keluar: 0 };
      if (log.type === 'out') cur.keluar += log.qty || 0;
      else cur.masuk += log.qty || 0;
      map.set(log.medicine_id, cur);
    }
    return [...map.values()]
      .filter((r) => r.keluar > 0)
      .sort((a, b) => b.keluar - a.keluar)
      .slice(0, 8);
  })();
  const medMaxOut = Math.max(1, ...medRanking.map((r) => r.keluar));

  const metricInfo = metrics.find((m) => m.key === metric) ?? metrics[0];
  const groupInfo = groupOptions.find((g) => g.key === groupBy) ?? groupOptions[0];
  const isMedicineMetric = metric === 'med_out' || metric === 'med_in';

  // Kelompokkan pergerakan obat (pemakaian/restok) per bulan atau per obat.
  function buildMedicineGroups(group: GroupBy, met: Metric): GroupDatum[] {
    const type = met === 'med_out' ? 'out' : 'in';
    const buckets = new Map<string, { label: string; count: number }>();

    for (const log of medicineLogs) {
      if (log.type !== type) continue;

      let key: string;
      let label: string;

      if (group === 'month') {
        key = monthKey(log.created_at);
        label = new Date(log.created_at).toLocaleDateString('id-ID', { month: 'short' });
      } else {
        const name = medicineById.get(log.medicine_id)?.name ?? 'Obat dihapus';
        key = name;
        label = name;
      }

      const bucket = buckets.get(key) ?? { label, count: 0 };
      bucket.count += log.qty || 0;
      buckets.set(key, bucket);
    }

    const rows = [...buckets.entries()].map(([key, b]) => ({ key, label: b.label, value: b.count }));
    return group === 'month'
      ? rows.sort((a, b) => a.key.localeCompare(b.key))
      : rows.sort((a, b) => b.value - a.value);
  }

  const builderGroups = isMedicineMetric
    ? buildMedicineGroups(groupBy, metric)
    : buildGroups(filtered, groupBy, metric);
  const areaDisabled = groupBy === 'complaint' || groupBy === 'medicine';
  const builderSignature = builderGroups.map((g) => `${g.key}:${g.value}`).join('|');
  const builderTotal = builderGroups.reduce((sum, g) => sum + g.value, 0);
  const builderMax = Math.max(1, ...builderGroups.map((g) => g.value));
  const highest = builderGroups.reduce<GroupDatum | null>(
    (best, g) => (!best || g.value > best.value ? g : best),
    null
  );
  const lowest = builderGroups.reduce<GroupDatum | null>(
    (best, g) => (!best || g.value < best.value ? g : best),
    null
  );

  function persistLocal(next: SavedReport[]) {
    setSaved(next);
    try {
      localStorage.setItem('uks:saved-reports', JSON.stringify(next));
    } catch {}
  }

  async function saveReport() {
    const fallback = `${metricInfo.label} per ${groupInfo.label}`;
    const name = window.prompt('Nama laporan:', fallback)?.trim();
    if (!name) return;

    const ok = await confirm({
      title: 'Simpan laporan?',
      message: `Laporan "${name}" akan disimpan.`,
      confirmLabel: 'Ya, simpan laporan',
    });
    if (!ok) return;

    const optimistic: SavedReport = {
      id: crypto.randomUUID(),
      name,
      metric,
      groupBy,
      chart,
      range,
      createdAt: new Date().toISOString(),
    };

    if (savedSource === 'server') {
      let createdByName: string | null = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name,email')
            .eq('id', user.id)
            .maybeSingle();
          createdByName = p?.full_name ?? p?.email ?? null;
        }
      } catch {}

      const { data, error } = await supabase
        .from('saved_reports')
        .insert({ name, metric, group_by: groupBy, chart, range_key: range, created_by_name: createdByName })
        .select('id,created_at')
        .single();

      if (!error && data) {
        setSaved(
          [{ ...optimistic, id: data.id, createdAt: data.created_at, createdByName }, ...saved].slice(0, 50)
        );
        toast.success(`Laporan "${name}" tersimpan di server.`, 'Laporan Disimpan');
        return;
      }

      toast.error(
        `Gagal menyimpan ke server, disimpan lokal: ${error?.message ?? 'tidak diketahui'}`,
        'Disimpan Lokal'
      );
      persistLocal([optimistic, ...saved].slice(0, 12));
      return;
    }

    persistLocal([optimistic, ...saved].slice(0, 12));
  }

  function applyReport(item: SavedReport) {
    setMetric(item.metric);
    setGroupBy(item.groupBy);
    setChart(item.groupBy === 'complaint' || item.groupBy === 'medicine' ? 'bars' : item.chart);
    setRange(item.range);
  }

  function chooseMetric(next: Metric) {
    const nextIsMed = next === 'med_out' || next === 'med_in';
    setMetric(next);
    if (nextIsMed && groupBy !== 'month' && groupBy !== 'medicine') setGroupBy('medicine');
    if (!nextIsMed && groupBy === 'medicine') setGroupBy('month');
  }

  function chooseGroup(next: GroupBy) {
    if (next === 'medicine') {
      if (metric !== 'med_out' && metric !== 'med_in') setMetric('med_out');
    } else if (metric === 'med_out' || metric === 'med_in') {
      setMetric('visits');
    }
    setGroupBy(next);
    if (next === 'complaint' || next === 'medicine') setChart('bars');
  }

  async function deleteReport(id: string) {
    const item = saved.find((r) => r.id === id);
    const ok = await confirm({
      title: 'Hapus laporan tersimpan?',
      message: `Laporan "${item?.name ?? 'ini'}" akan dihapus.`,
      confirmLabel: 'Ya, hapus laporan',
      tone: 'danger',
    });
    if (!ok) return;

    if (savedSource === 'server') {
      const { error } = await supabase.from('saved_reports').delete().eq('id', id);
      if (!error) {
        setSaved(saved.filter((r) => r.id !== id));
        return;
      }
    }
    persistLocal(saved.filter((r) => r.id !== id));
  }

  function exportBuilderCSV() {
    const rows = [
      ['Kelompok', metricInfo.label, 'Persentase'],
      ...builderGroups.map((g) => [
        g.label,
        String(g.value),
        `${((g.value / (builderTotal || 1)) * 100).toFixed(1)}%`,
      ]),
    ];
    const csv =
      '\uFEFF' +
      rows
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${metric}-${groupBy}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    // Unduh library PDF hanya saat tombol diklik.
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Laporan Kunjungan UKS', 14, 22);
    doc.setFontSize(11);
    doc.text(`Periode: ${rangeInfo.label} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 32);

    const rows = filtered.map((v) => [
      exportDate(v.check_in_at),
      exportTime(v.check_in_at),
      v.students?.full_name || '-',
      v.students?.nis || '-',
      v.students?.class || '-',
      v.chief_complaint || '-',
      exportStatus(v.final_status),
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['Tanggal', 'Jam', 'Siswa', 'NIS', 'Kelas', 'Keluhan', 'Status']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 56, 104] },
    });

    // Halaman baru khusus data obat: inventaris + riwayat keluar/masuk stok.
    const visitById = new Map(visits.map((v) => [v.id, v]));

    doc.addPage();
    doc.setFontSize(16);
    doc.text('Data Obat UKS', 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${rangeInfo.label} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);

    doc.setFontSize(12);
    doc.text('Inventaris Obat', 14, 38);
    (doc as any).autoTable({
      startY: 42,
      head: [['Nama Obat', 'Kategori', 'Satuan', 'Stok', 'Min', 'Lokasi', 'Kedaluwarsa', 'Status']],
      body: medicines.length
        ? medicines.map((m) => [
            m.name,
            m.category || '-',
            m.unit || '-',
            String(m.stock ?? 0),
            String(m.min_stock ?? 5),
            m.location || '-',
            m.expiry_date ? exportDate(m.expiry_date) : '-',
            medicineStatus(m),
          ])
        : [['Belum ada data obat', '', '', '', '', '', '', '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 56, 104] },
    });

    let usageY = ((doc as any).lastAutoTable?.finalY ?? 42) + 14;
    if (usageY > 250) {
      doc.addPage();
      usageY = 20;
    }
    doc.setFontSize(12);
    doc.text('Riwayat Stok Obat', 14, usageY);

    (doc as any).autoTable({
      startY: usageY + 4,
      head: [['Tanggal', 'Jam', 'Obat', 'Tipe', 'Jumlah', 'Siswa', 'Catatan']],
      body: medicineLogs.length
        ? medicineLogs.map((log) => {
            const med = medicines.find((m) => m.id === log.medicine_id);
            const visit = log.reference_id ? visitById.get(log.reference_id) : null;
            return [
              exportDate(log.created_at),
              exportTime(log.created_at),
              med?.name ?? '-',
              log.type === 'out' ? 'Keluar' : 'Masuk',
              log.type === 'out' ? `-${log.qty}` : `+${log.qty}`,
              visit?.students?.full_name ?? '-',
              log.notes || '-',
            ];
          })
        : [['Belum ada riwayat stok', '', '', '', '', '', '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 56, 104] },
    });

    doc.save(`laporan-uks-${range}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  async function exportExcel() {
    // Library Excel diunduh hanya saat tombol diklik.
    try {
      await exportReportsExcel({
        visits: filtered,
        medicines,
        medicineLogs,
        rangeKey: range,
      });
    } catch (error) {
      toast.error(`Gagal mengekspor Excel: ${(error as Error).message}`, 'Ekspor Gagal');
    }
  }

  return (
  <AppShell
    title="Laporan"
    crumbs={[{ label: 'UKS', href: '/' }, { label: 'Laporan' }]}
    actions={
      <>
        <button type="button" className="btn btn--ghost" onClick={exportExcel}>
          <Download className="ico" /> Excel
        </button>
        <button type="button" className="btn btn--primary" onClick={exportPDF}>
          <FileText className="ico" /> PDF
        </button>
      </>
    }
  >
    <div className="rpt__layout">
      <aside className="rpt__control">
        <div className="card">
          <div className="card__head">
            <h2 className="card__title">
              <BarChart3 className="ico" /> Atur laporan
            </h2>
          </div>

          <div className="rpt__plabel">Periode</div>
          <LayoutGroup id="rpt-range">
            <div className="chips rpt__ranges" style={{ flexWrap: 'wrap' }}>
              {ranges.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className="chip rpt__range"
                  aria-pressed={range === r.key}
                  onClick={() => setRange(r.key)}
                >
                  {range === r.key && (
                    <motion.span
                      layoutId="rpt-range-pill"
                      className="rpt__chippill"
                      transition={pillSpring}
                      initial={false}
                    />
                  )}
                  <span className="rpt__z">{r.label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          <div className="rpt__plabel" style={{ marginTop: 14 }}>Isi laporan</div>
          <div className="glist">
            {[
              ['Ringkasan kunjungan', 'Angka utama, tren, status akhir, keluhan'],
              ['Rincian kunjungan', 'Waktu, siswa, keluhan, status'],
              ['Pemakaian obat & stok', 'Obat paling sering diberikan, stok menipis'],
              ['Siswa paling sering berkunjung', 'Peringkat siswa'],
            ].map((r, i) => (
              <button
                key={i}
                type="button"
                className="gi"
                role="switch"
                aria-checked={ck[i]}
                onClick={() => {
                  const next = [...ck];
                  next[i] = !next[i];
                  setCk(next);
                }}
              >
                <div className="gt">
                  <b>{r[0]}</b>
                  <span>{r[1]}</span>
                </div>
                <span className="sw2" style={{ marginLeft: 'auto' }} />
              </button>
            ))}
            <button
              type="button"
              className="gi"
              role="switch"
              aria-checked={lan}
              onClick={() => setLan(!lan)}
            >
              <div className="gt">
                <b>Samarkan nama siswa</b>
                <span>Tampilkan inisial, untuk laporan yang dibagikan keluar</span>
              </div>
              <span className="sw2" style={{ marginLeft: 'auto' }} />
            </button>
          </div>

          <div className="rpt__pactions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--primary btn--sm" onClick={exportExcel}>
              <Download className="ico" /> Unduh Excel
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={exportPDF}>
              <FileText className="ico" /> Unduh PDF
            </button>
          </div>
        </div>

      </aside>

      <div className="rpt__preview">
        <article className="rpt__sheet" aria-label="Pratinjau laporan">
          <div className="rpt__shh">
            <div>
              <div className="rpt__shk">Pratinjau laporan</div>
              <h2>Laporan Kunjungan UKS</h2>
              <div className="rpt__shs">UKS</div>
            </div>
            <div className="rpt__shm">
              <span>Periode</span>
              <b>{rangeInfo.label}</b>
              <span>Total</span>
              <b>{total} kunjungan</b>
            </div>
          </div>

          {ck[0] && (
            <section className="rpt__rs">
              <h3>Ringkasan kunjungan</h3>
              <div className="rpt__rk">
                <div>
                  <span>Total kunjungan</span>
                  <b><CountUp value={total} /></b>
                  <small>{rangeInfo.label} terakhir</small>
                </div>
                <div>
                  <span>Siswa dilayani</span>
                  <b><CountUp value={uniqueStudents} /></b>
                  <small>siswa berbeda</small>
                </div>
                <div>
                  <span>Dirujuk</span>
                  <b><CountUp value={referred} /></b>
                  <small>{referralRate}% dari seluruh kunjungan</small>
                </div>
                <div>
                  <span>Kembali ke kelas</span>
                  <b>{returnRate}%</b>
                  <small>{returned} kunjungan</small>
                </div>
              </div>

              <div className="rpt__rg2">
                <div>
                  <h4>Status akhir</h4>
                  {Object.entries(statusCounts).length === 0 ? (
                    <div className="empty" style={{ padding: '12px 4px' }}>
                      <div className="empty__text">Belum ada data status.</div>
                    </div>
                  ) : (
                    Object.entries(statusCounts).map(([status, count]) => {
                      const info = statusMap[status] ?? {
                        label: visitStatusLabel(status === 'unknown' ? null : status),
                        color: 'var(--faint)',
                      };
                      const pct = total ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={status} className="rpt__rb">
                          <div className="rpt__rbt">
                            <span><i style={{ background: info.color }} />{info.label}</span>
                            <b>{count} · {pct}%</b>
                          </div>
                          <div className="meter">
                            <i style={{ width: `${pct}%`, background: info.color }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div>
                  <h4>Keluhan terbanyak</h4>
                  {complaints.length === 0 ? (
                    <p className="rpt__empty">Tidak ada data.</p>
                  ) : (
                    complaints.map((c) => (
                      <div key={c.key} className="rpt__rb">
                        <div className="rpt__rbt">
                          <span style={{ textTransform: 'capitalize' }}>{c.label}</span>
                          <b>{c.value}</b>
                        </div>
                        <div className="meter">
                          <i style={{ width: `${(c.value / maxComplaint) * 100}%`, background: 'linear-gradient(90deg, #5BDBA4, #1F9A64)' }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <h4 style={{ marginTop: 20 }}>Tren kunjungan</h4>
              {trend.length > 1 ? (
                <ReportAreaChart data={trend} />
              ) : (
                <p className="rpt__empty">Periode terlalu pendek untuk menampilkan tren.</p>
              )}

              <h4 style={{ marginTop: 20 }}>Kunjungan per kelas</h4>
              {byClass.length === 0 ? (
                <p className="rpt__empty">Tidak ada data kelas pada periode ini.</p>
              ) : (
                <BarsChart data={byClass} />
              )}
            </section>
          )}

          {ck[1] && (
            <section className="rpt__rs">
              <h3>Rincian kunjungan</h3>
              {total === 0 ? (
                <p className="rpt__empty">Tidak ada kunjungan pada periode ini.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Siswa</th>
                        <th>Kelas</th>
                        <th>Keluhan</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 8).map((v) => (
                        <tr key={v.id}>
                          <td className="muted whitespace-nowrap">
                            {new Date(v.check_in_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </td>
                          <td><b>{lan ? v.students?.full_name?.split(' ').map((w) => w[0] + '.').join(' ') : v.students?.full_name ?? '-'}</b></td>
                          <td className="muted">{v.students?.class ?? '-'}</td>
                          <td className="muted" style={{ textTransform: 'capitalize' }}>{v.chief_complaint ?? '-'}</td>
                          <td>
                            <span className={statusMap[v.final_status ?? '']?.cls ?? 'badge badge--plain'}>
                              {visitStatusLabel(v.final_status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {total > 8 && <p className="rpt__note">dan {total - 8} kunjungan lainnya (lengkap di berkas unduhan)</p>}
            </section>
          )}

          {ck[2] && (
            <section className="rpt__rs">
              <h3>Pemakaian obat &amp; stok</h3>
              <div className="rpt__rg2">
                <div>
                  <h4>Obat paling sering diberikan</h4>
                  {medRanking.length === 0 ? (
                    <p className="rpt__empty">Tidak ada obat yang diberikan pada periode ini.</p>
                  ) : (
                    medRanking.map((m, i) => (
                      <div key={`${m.name}-${i}`} className="rpt__rb">
                        <div className="rpt__rbt">
                          <span>{m.name}</span>
                          <b>{m.keluar}×</b>
                        </div>
                        <div className="meter">
                          <i style={{ width: `${(m.keluar / medMaxOut) * 100}%`, background: 'linear-gradient(90deg, #5BDBA4, #1F9A64)' }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <h4>Stok menipis ({medicines.filter((m) => (m.stock ?? 0) <= (m.min_stock ?? 5)).length})</h4>
                  {medicines.filter((m) => (m.stock ?? 0) <= (m.min_stock ?? 5)).length === 0 ? (
                    <p className="rpt__empty">Semua stok aman.</p>
                  ) : (
                    medicines.filter((m) => (m.stock ?? 0) <= (m.min_stock ?? 5)).slice(0, 6).map((m) => (
                      <div key={m.id} className="rpt__rbt" style={{ padding: '6px 0' }}>
                        <span>{m.name}</span>
                        <b style={{ color: 'var(--bad)' }}>
                          {m.stock} {m.unit} <small style={{ color: 'var(--muted)', fontWeight: 600 }}>/ min {m.min_stock ?? 5}</small>
                        </b>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {ck[3] && (
            <section className="rpt__rs">
              <h3>Siswa paling sering berkunjung</h3>
              {topStudents.length === 0 ? (
                <p className="rpt__empty">Tidak ada data.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Siswa</th>
                        <th>Kelas</th>
                        <th className="r">Kunjungan</th>
                        <th className="r">Porsi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topStudents.map((s, i) => {
                        const share = total ? (s.count / total) * 100 : 0;
                        return (
                          <tr key={s.id}>
                            <td className="muted">{i + 1}</td>
                            <td>
                              <b>{lan ? s.name.split(' ').map((w) => w[0] + '.').join(' ') : s.name}</b>
                              <div className="muted text-xs">NIS {s.nis}</div>
                            </td>
                            <td className="muted">{s.klass}</td>
                            <td className="r"><CountUp value={s.count} /></td>
                            <td className="r muted"><CountUp value={share} decimals={1} suffix="%" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {!ck.some(Boolean) && (
            <div className="empty">
              <div className="empty__text">Pilih minimal satu isi laporan di panel kiri.</div>
            </div>
          )}
        </article>
      </div>
    </div>
  </AppShell>
);

}
