'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGroup, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
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
import type { ChartConfig } from '@/components/evilcharts/charts/echarts-area-chart';
import { useChartColors } from '@/components/charts/use-chart-colors';
import { fetchAllRows } from '@/lib/supabase/paginate';
import { visitStatusLabel, visitStatusLabels } from '@/lib/visit-status';
import { exportReportsExcel } from '@/lib/reports/export-excel';
import { useToast } from '@/components/ui/toast';

// ECharts dan jsPDF tidak ikut bundle awal halaman Laporan.
const ReportAreaChart = dynamic(() => import('@/components/charts/report-area-chart'), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: 260, width: '100%' }} />,
});

const MedicineMoveChart = dynamic(() => import('@/components/charts/medicine-move-chart'), {
  ssr: false,
  loading: () => <div className="skel" style={{ height: 260, width: '100%' }} />,
});

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
  const accent = useChartColors();

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

  const chartConfig: ChartConfig = {
    value: {
      label: 'Jumlah',
      colors: {
        light: [accent.primary, accent.secondary],
        dark: [accent.primary, accent.secondary],
      },
    },
  };

  return (
    <div key={chartKey} className="relative w-full" style={{ minHeight: 240, height: 260 }}>
      <ReportAreaChart
        key={chartKey}
        data={chartData}
        config={chartConfig}
        xDataKey="label"
        className="h-full w-full"
        curveType="monotone"
        chartOptions={{
          grid: {
            left: 36,
            right: 18,
            top: 20,
            bottom: 26,
          },
          yAxis: {
            type: 'value',
            min: 0,
            splitNumber: 3,
          },
        }}
      />
    </div>
  );
}

function BarsChart({ data }: { data: GroupDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const signature = data.map((d) => `${d.key}:${d.value}`).join('|');

  return (
    <div key={signature} className="rpt__bars">
      {data.map((d, i) => (
        <div key={d.key} className="rpt__brow" title={`${d.label}: ${d.value}`}>
          <span className="rpt__blabel">{d.label}</span>
          <span className="rpt__btrack">
            <span
              className="rpt__bfill"
              style={{
                width: `${Math.max((d.value / max) * 100, 1)}%`,
                animationDelay: `${i * 55}ms`,
              }}
            />
          </span>
          <span className="rpt__bval">
            <CountUp value={d.value} />
            <small>
              <CountUp value={total ? (d.value / total) * 100 : 0} decimals={0} suffix="%" />
            </small>
          </span>
        </div>
      ))}
    </div>
  );
}

function Gauge({ pct }: { pct: number }) {
  const r = 64;
  const cx = 90;
  const cy = 92;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="rpt__gaugewrap">
      <svg viewBox="0 0 180 112" className="rpt__gauge" role="img" aria-label={`${pct}% kembali ke kelas`}>
        <path d={d} fill="none" stroke="var(--well)" strokeWidth="14" strokeLinecap="round" />
        <motion.path
          key={pct}
          d={d}
          fill="none"
          stroke="var(--chart)"
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(pct, 100) / 100 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="rpt__gaugeoverlay" aria-hidden="true">
        <CountUp className="rpt__gaugeval" value={pct} suffix="%" />
        <span>kembali ke kelas</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<MedicineLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>(defaultRange.key);
  const [query, setQuery] = useState('');
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

  const medMoveConfig: ChartConfig = {
    masuk: { label: 'Masuk' },
    keluar: { label: 'Keluar' },
  };

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
      <div className="rpt__bar">
        <LayoutGroup id="rpt-tabs">
          <div className="rpt__tabs" role="tablist" aria-label="Mode laporan">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'overview'}
              className={tab === 'overview' ? 'rpt__tab is-active' : 'rpt__tab'}
              onClick={() => setTab('overview')}
            >
              {tab === 'overview' && (
                <motion.span
                  layoutId="rpt-tab-pill"
                  className="rpt__pill"
                  transition={pillSpring}
                  initial={false}
                />
              )}
              <span className="rpt__z">Ringkasan</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'builder'}
              className={tab === 'builder' ? 'rpt__tab is-active' : 'rpt__tab'}
              onClick={() => setTab('builder')}
            >
              {tab === 'builder' && (
                <motion.span
                  layoutId="rpt-tab-pill"
                  className="rpt__pill"
                  transition={pillSpring}
                  initial={false}
                />
              )}
              <span className="rpt__z">Pembuat Laporan</span>
            </button>
          </div>
        </LayoutGroup>

        <LayoutGroup id="rpt-range">
          <div className="chips rpt__ranges">
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
      </div>

      {loading ? (
        <div className="card">
          <div className="empty">
            <BarChart3 className="ico" />
            <div className="empty__title">Memuat laporan…</div>
          </div>
        </div>
      ) : tab === 'overview' ? (
        <>
          <section className="rpt__kpis">
            <div className="rpt__kpi rpt__kpi--dark">
              <div className="rpt__kpi-label">
                <ClipboardList className="ico" /> Total kunjungan
              </div>
              <div className="rpt__kpi-value"><CountUp value={total} /></div>
              <div className="rpt__kpi-foot">{rangeInfo.label} terakhir</div>
            </div>

            <div className="rpt__kpi rpt__kpi--accent">
              <div className="rpt__kpi-label">
                <Users className="ico" /> Siswa dilayani
              </div>
              <div className="rpt__kpi-value"><CountUp value={uniqueStudents} /></div>
              <div className="rpt__kpi-foot">siswa berbeda</div>
            </div>

            <div className="rpt__kpi">
              <div className="rpt__kpi-label">
                <Ambulance className="ico" /> Dirujuk
              </div>
              <div className="rpt__kpi-value"><CountUp value={referred} /></div>
              <div className="rpt__kpi-foot">
                <CountUp value={referralRate} suffix="%" /> dari <CountUp value={total} /> kunjungan · butuh penanganan lanjut
              </div>
            </div>

            <div className="rpt__kpi">
              <div className="rpt__kpi-label">
                <CheckCircle2 className="ico" /> Kembali ke kelas
              </div>
              <div className="rpt__kpi-value"><CountUp value={returnRate} suffix="%" /></div>
              <div className="rpt__kpi-foot"><CountUp value={returned} /> dari <CountUp value={total} /> kunjungan</div>
            </div>
          </section>

          <div className="rpt__grid rpt__grid--main">
            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <BarChart3 className="ico" /> {trendTitle}
                </h2>
                <span className="rpt__datepill">{rangeInfo.label}</span>
              </div>
              <AreaChart data={trend} />
            </div>

            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <CheckCircle2 className="ico" /> Status Akhir
                </h2>
                <span className="spill spill--teal">
                  <i /> <CountUp value={total} /> kunjungan
                </span>
              </div>

              <Gauge pct={returnRate} />

              <div className="rpt__status">
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
                      <div key={status} className="rpt__statusrow">
                        <span className="rpt__statuslabel">
                          <span className="dot" style={{ background: info.color }} />
                          {info.label}
                        </span>
                        <span className="rpt__statusval">
                          <CountUp value={count} /> <small>· <CountUp value={pct} suffix="%" /></small>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="rpt__grid rpt__grid--split">
            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <Users className="ico" /> Kunjungan per Kelas
                </h2>
              </div>
              {byClass.length === 0 ? (
                <div className="empty">
                  <div className="empty__text">Belum ada data kelas pada periode ini.</div>
                </div>
              ) : (
                <BarsChart data={byClass} />
              )}
            </div>

            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <Stethoscope className="ico" /> Keluhan Terbanyak
                </h2>
                <span className="spill spill--iris">
                  <i /> <CountUp value={complaints.length} /> teratas
                </span>
              </div>

              {complaints.length === 0 ? (
                <div className="empty">
                  <div className="empty__text">Belum ada data keluhan pada periode ini.</div>
                </div>
              ) : (
                <div className="rpt__lead">
                  {complaints.map((c, i) => (
                    <div key={c.key} className="rpt__lrow">
                      <span className="rpt__lrank">{i + 1}</span>
                      <span className="rpt__ltext">
                        <b>{c.label}</b>
                        <small><CountUp value={c.value} /> kunjungan</small>
                      </span>
                      <span className="rpt__lbar">
                        <span
                          className="rpt__lfill"
                          style={{
                            width: `${(c.value / maxComplaint) * 100}%`,
                            animationDelay: `${i * 55}ms`,
                          }}
                        />
                      </span>
                      <span className="rpt__lval"><CountUp value={c.value} /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rpt__grid rpt__grid--split">
            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <Pill className="ico" /> Pergerakan Stok Obat
                </h2>
                <div className="card__tools">
                  <span className="spill spill--teal">
                    <i /> <CountUp value={medInTotal} /> masuk
                  </span>
                  <span className="spill spill--rose">
                    <i /> <CountUp value={medOutTotal} /> keluar
                  </span>
                </div>
              </div>
              {medInTotal + medOutTotal === 0 ? (
                <div className="empty">
                  <div className="empty__text">Belum ada pergerakan stok obat pada periode ini.</div>
                </div>
              ) : (
                <MedicineMoveChart data={medMovement} config={medMoveConfig} />
              )}
            </div>

            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <Pill className="ico" /> Obat Paling Sering Diberikan
                </h2>
                <span className="spill spill--iris">
                  <i /> <CountUp value={medRanking.length} /> teratas
                </span>
              </div>

              {medRanking.length === 0 ? (
                <div className="empty">
                  <div className="empty__text">Belum ada obat yang diberikan pada periode ini.</div>
                </div>
              ) : (
                <div className="rpt__lead">
                  {medRanking.map((m, i) => (
                    <div key={`${m.name}-${i}`} className="rpt__lrow">
                      <span className="rpt__lrank">{i + 1}</span>
                      <span className="rpt__ltext">
                        <b>{m.name}</b>
                        <small>
                          masuk {m.masuk} · keluar {m.keluar}
                        </small>
                      </span>
                      <span className="rpt__lbar">
                        <span
                          className="rpt__lfill"
                          style={{ width: `${(m.keluar / medMaxOut) * 100}%`, animationDelay: `${i * 55}ms` }}
                        />
                      </span>
                      <span className="rpt__lval"><CountUp value={m.keluar} /></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <h2 className="card__title">
                <Users className="ico" /> Siswa Paling Sering Berkunjung
              </h2>
              <div className="card__tools">
                <div className="search" style={{ height: 34, minWidth: 220 }}>
                  <Users className="ico" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari nama atau NIS…"
                    aria-label="Cari siswa dalam laporan"
                  />
                </div>
                <span className="spill spill--iris">
                  <i /> <CountUp value={topStudents.length} /> siswa
                </span>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Siswa</th>
                    <th>Kelas</th>
                    <th className="r">Kunjungan</th>
                    <th>Relatif</th>
                    <th className="r">Porsi</th>
                  </tr>
                </thead>
                <tbody key={topSignature}>
                  {topStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">
                          <Users className="ico" />
                          <div className="empty__title">Belum ada data</div>
                          <div className="empty__text">
                            {query ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Tidak ada kunjungan pada periode ini.'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    topStudents.map((s, i) => {
                      const share = total ? (s.count / total) * 100 : 0;
                      return (
                        <tr key={s.id}>
                          <td className="muted">{i + 1}</td>
                          <td>
                            <b>{s.name}</b>
                            <div className="muted text-xs">NIS {s.nis}</div>
                          </td>
                          <td className="muted">{s.klass}</td>
                          <td className="r"><CountUp value={s.count} /></td>
                          <td style={{ minWidth: 180 }}>
                            <span className="rpt__strack">
                              <span
                                className="rpt__sfill"
                                style={{
                                  width: `${(s.count / maxStudentVisits) * 100}%`,
                                  animationDelay: `${i * 40}ms`,
                                }}
                              />
                            </span>
                          </td>
                          <td className="r muted"><CountUp value={share} decimals={1} suffix="%" /></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rpt__builder">
          <aside className="rpt__panel">
            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <BarChart3 className="ico" /> Buat Laporan
                </h2>
              </div>

              <div className="rpt__plabel">Metrik</div>
              <div className="rpt__metrics">
                {metrics.map((m) => {
                  const Icon = m.icon;
                  const active = metric === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      className={active ? 'rpt__metric is-active' : 'rpt__metric'}
                      aria-pressed={active}
                      onClick={() => chooseMetric(m.key)}
                    >
                      <span className="rpt__mico">
                        <Icon className="ico" strokeWidth={1.7} />
                      </span>
                      <span className="rpt__mtext">
                        <b>{m.label}</b>
                        <small>{m.desc}</small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rpt__plabel">Kelompokkan</div>
              <LayoutGroup id="rpt-group">
                <div className="rpt__seg">
                  {groupOptions.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      className={groupBy === g.key ? 'is-active' : ''}
                      aria-pressed={groupBy === g.key}
                      onClick={() => chooseGroup(g.key)}
                    >
                      {groupBy === g.key && (
                        <motion.span
                          layoutId="rpt-group-pill"
                          className="rpt__segpill"
                          transition={pillSpring}
                          initial={false}
                        />
                      )}
                      <span className="rpt__z">{g.label}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>

              <div className="rpt__plabel">Grafik</div>
              <LayoutGroup id="rpt-chart">
                <div className="rpt__seg">
                  <button
                    type="button"
                    className={chart === 'area' ? 'is-active' : ''}
                    aria-pressed={chart === 'area'}
                    disabled={areaDisabled}
                    title={areaDisabled ? 'Area tidak cocok untuk data ini. Gunakan Batang.' : undefined}
                    onClick={() => setChart('area')}
                  >
                    {chart === 'area' && !areaDisabled && (
                      <motion.span
                        layoutId="rpt-chart-pill"
                        className="rpt__segpill"
                        transition={pillSpring}
                        initial={false}
                      />
                    )}
                    <span className="rpt__z">Area</span>
                  </button>
                  <button
                    type="button"
                    className={chart === 'bars' ? 'is-active' : ''}
                    aria-pressed={chart === 'bars'}
                    onClick={() => setChart('bars')}
                  >
                    {chart === 'bars' && (
                      <motion.span
                        layoutId="rpt-chart-pill"
                        className="rpt__segpill"
                        transition={pillSpring}
                        initial={false}
                      />
                    )}
                    <span className="rpt__z">Batang</span>
                  </button>
                </div>
              </LayoutGroup>
              {areaDisabled && (
                <div className="rpt__tiny">
                  Area dinonaktifkan untuk {groupBy === 'medicine' ? 'data per obat' : 'keluhan'} — otomatis memakai
                  Batang.
                </div>
              )}

              <div className="rpt__pactions">
                <button type="button" className="btn btn--primary btn--sm" onClick={saveReport}>
                  <Star className="ico" /> Simpan
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={exportBuilderCSV}>
                  <Download className="ico" /> CSV
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <Star className="ico" /> Laporan Tersimpan
                </h2>
                <div className="card__tools">
                  <span
                    className="spill spill--iris"
                    title={
                      savedSource === 'server'
                        ? 'Tersimpan di server — bisa dilihat staf lain sekolah ini.'
                        : 'Tabel saved_reports belum ada — laporan hanya tersimpan di peramban ini.'
                    }
                  >
                    <i /> {savedSource === 'server' ? 'Server' : 'Lokal'}
                  </span>
                  <span className="badge badge--plain"><CountUp value={saved.length} /></span>
                </div>
              </div>

              {saved.length === 0 ? (
                <div className="empty" style={{ padding: '18px 6px' }}>
                  <div className="empty__text">Belum ada laporan tersimpan. Atur metrik lalu klik Simpan.</div>
                </div>
              ) : (
                <div className="rpt__saved">
                  {saved.map((s) => {
                    const info = metrics.find((m) => m.key === s.metric) ?? metrics[0];
                    return (
                      <div key={s.id} className="rpt__sitem">
                        <button type="button" className="rpt__sload" onClick={() => applyReport(s)}>
                          <span className="rpt__mico">
                            <info.icon className="ico" strokeWidth={1.7} />
                          </span>
                          <span className="rpt__mtext">
                            <b>{s.name}</b>
                            <small>
                              {info.label} · {groupOptions.find((g) => g.key === s.groupBy)?.label} ·{' '}
                              {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="ibtn"
                          onClick={() => deleteReport(s.id)}
                          aria-label={`Hapus ${s.name}`}
                          title="Hapus laporan"
                          style={{ color: 'var(--bad)', width: 30, height: 30 }}
                        >
                          <Trash2 className="ico" strokeWidth={1.7} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <div className="rpt__canvas">
            <div className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <BarChart3 className="ico" /> {metricInfo.label} per {groupInfo.label}
                </h2>
                <span className="rpt__datepill">
                  <CalendarDays className="ico" /> {rangeInfo.label}
                </span>
              </div>

              <div className="rpt__mini">
                <div>
                  <small>Total</small>
                  <b><CountUp value={builderTotal} /></b>
                </div>
                <div>
                  <small>Tertinggi</small>
                  <b><CountUp value={highest?.value ?? 0} /></b>
                  <span>{highest?.label ?? '-'}</span>
                </div>
                <div>
                  <small>Terendah</small>
                  <b><CountUp value={lowest?.value ?? 0} /></b>
                  <span>{lowest?.label ?? '-'}</span>
                </div>
              </div>

              {builderGroups.length === 0 ? (
                <div className="empty">
                  <BarChart3 className="ico" />
                  <div className="empty__title">Belum ada data</div>
                  <div className="empty__text">
                    {isMedicineMetric
                      ? 'Tidak ada pergerakan obat pada periode ini.'
                      : 'Tidak ada kunjungan pada periode ini.'}
                  </div>
                </div>
              ) : chart === 'area' ? (
                <AreaChart data={builderGroups} />
              ) : (
                <BarsChart data={builderGroups} />
              )}

              {builderGroups.length > 0 && (
                <div className="table-wrap" style={{ marginTop: 18 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{groupInfo.label}</th>
                        <th className="r">{metricInfo.label}</th>
                        <th>Relatif</th>
                        <th className="r">Porsi</th>
                      </tr>
                    </thead>
                    <tbody key={builderSignature}>
                      {builderGroups.map((g, i) => (
                        <tr key={g.key}>
                          <td className="muted">{i + 1}</td>
                          <td>
                            <b>{g.label}</b>
                          </td>
                          <td className="r"><CountUp value={g.value} /></td>
                          <td style={{ minWidth: 200 }}>
                            <span className="rpt__strack">
                              <span
                                className="rpt__sfill"
                                style={{
                                  width: `${(g.value / builderMax) * 100}%`,
                                  animationDelay: `${i * 40}ms`,
                                }}
                              />
                            </span>
                          </td>
                          <td className="r muted">
                            <CountUp
                              value={builderTotal ? (g.value / builderTotal) * 100 : 0}
                              decimals={1}
                              suffix="%"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rpt__hint">
                <ArrowUpRight className="ico" />
                <span>
                  Data mengikuti periode <b>{rangeInfo.label}</b>. Atur metrik dan pengelompokan di panel kiri.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
