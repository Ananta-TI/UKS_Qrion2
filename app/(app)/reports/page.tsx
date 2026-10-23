'use client';

import { useEffect, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Star,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { EChartsAreaChart, type ChartConfig } from '@/components/evilcharts/charts/echarts-area-chart';

const pillSpring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const;

const ranges = [
  { key: '30d', label: '30 hari', days: 30 },
  { key: '3m', label: '3 bulan', days: 90 },
  { key: '6m', label: '6 bulan', days: 180 },
  { key: '12m', label: '12 bulan', days: 365 },
  { key: 'all', label: 'Semua', days: 0 },
] as const;

type RangeKey = (typeof ranges)[number]['key'];
type Metric = 'visits' | 'students' | 'returned' | 'referred' | 'picked';
type GroupBy = 'month' | 'class' | 'complaint' | 'status';
type ChartKind = 'area' | 'bars';
type Tab = 'overview' | 'builder';

const metrics: { key: Metric; label: string; desc: string; icon: typeof ClipboardList }[] = [
  { key: 'visits', label: 'Kunjungan', desc: 'Jumlah kunjungan UKS', icon: ClipboardList },
  { key: 'students', label: 'Siswa unik', desc: 'Siswa berbeda yang datang', icon: Users },
  { key: 'returned', label: 'Kembali ke kelas', desc: 'Siswa yang langsung belajar lagi', icon: CheckCircle2 },
  { key: 'referred', label: 'Rujukan', desc: 'Dirujuk ke faskes / RS', icon: AlertCircle },
  { key: 'picked', label: 'Dijemput', desc: 'Dijemput orang tua', icon: Stethoscope },
];

const groupOptions: { key: GroupBy; label: string }[] = [
  { key: 'month', label: 'Bulan' },
  { key: 'class', label: 'Kelas' },
  { key: 'complaint', label: 'Keluhan' },
  { key: 'status', label: 'Status' },
];

const statusMap: Record<string, { label: string; cls: string; color: string }> = {
  back_to_class: { label: 'Kembali ke Kelas', cls: 'badge badge--good', color: 'var(--good)' },
  referred: { label: 'Dirujuk ke Faskes/RS', cls: 'badge badge--bad', color: 'var(--bad)' },
  picked_up: { label: 'Dijemput Orang Tua', cls: 'badge badge--warn', color: 'var(--warn)' },
};

type VisitRow = {
  id: string;
  student_id: string | null;
  check_in_at: string;
  chief_complaint: string | null;
  treatment: string | null;
  final_status: string | null;
  students?: { id: string; full_name: string | null; nis: string | null; class: string | null } | null;
};

type GroupDatum = { key: string; label: string; value: number };

type SavedReport = {
  id: string;
  name: string;
  metric: Metric;
  groupBy: GroupBy;
  chart: ChartKind;
  range: RangeKey;
  createdAt: string;
};

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
      label = statusMap[v.final_status ?? '']?.label ?? 'Belum diisi';
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

function AreaChart({ data }: { data: GroupDatum[]; id?: string }) {
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
        light: ['#10b981', '#0ea5e9', '#8b5cf6'],
        dark: ['#34d399', '#38bdf8', '#a78bfa'],
      },
    },
  };

  return (
    <div key={chartKey} className="relative w-full" style={{ minHeight: 240, height: 260 }}>
      <EChartsAreaChart
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
      >
        <EChartsAreaChart.Tooltip variant="frosted-glass" />
        <EChartsAreaChart.Area
          dataKey="value"
          variant="gradient"
          strokeVariant="solid"
          strokeWidth={2.5}
        />
      </EChartsAreaChart>
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
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('6m');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const [metric, setMetric] = useState<Metric>('visits');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [chart, setChart] = useState<ChartKind>('area');
  const [saved, setSaved] = useState<SavedReport[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('uks:saved-reports');
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSaved(JSON.parse(raw) as SavedReport[]);
      }
    } catch {}
  }, []);

  async function load() {
    setLoading(true);
    const selected = ranges.find((r) => r.key === range) ?? ranges[2];
    let q = supabase.from('visits').select('*, students(*)').order('check_in_at', { ascending: false });

    if (selected.days > 0) {
      const since = new Date(Date.now() - selected.days * 86400000);
      q = q.gte('check_in_at', since.toISOString());
    }

    const { data } = await q;
    setVisits((data ?? []) as VisitRow[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const rangeInfo = ranges.find((r) => r.key === range) ?? ranges[2];

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

  const activeDays = new Set(filtered.map((v) => v.check_in_at.slice(0, 10))).size;
  const avgPerDay = activeDays ? total / activeDays : 0;

  const monthly = buildGroups(filtered, 'month', 'visits');
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

  const metricInfo = metrics.find((m) => m.key === metric) ?? metrics[0];
  const groupInfo = groupOptions.find((g) => g.key === groupBy) ?? groupOptions[0];
  const builderGroups = buildGroups(visits, groupBy, metric);
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

  function persist(next: SavedReport[]) {
    setSaved(next);
    try {
      localStorage.setItem('uks:saved-reports', JSON.stringify(next));
    } catch {}
  }

  function saveReport() {
    const fallback = `${metricInfo.label} per ${groupInfo.label}`;
    const name = window.prompt('Nama laporan:', fallback)?.trim();
    if (!name) return;

    const item: SavedReport = {
      id: crypto.randomUUID(),
      name,
      metric,
      groupBy,
      chart,
      range,
      createdAt: new Date().toISOString(),
    };

    persist([item, ...saved].slice(0, 12));
  }

  function applyReport(item: SavedReport) {
    setMetric(item.metric);
    setGroupBy(item.groupBy);
    setChart(item.groupBy === 'complaint' ? 'bars' : item.chart);
    setRange(item.range);
  }

  function chooseGroup(next: GroupBy) {
    setGroupBy(next);
    if (next === 'complaint') setChart('bars');
  }

  function deleteReport(id: string) {
    persist(saved.filter((r) => r.id !== id));
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

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Laporan Kunjungan UKS', 14, 22);
    doc.setFontSize(11);
    doc.text(`Periode: ${rangeInfo.label} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 32);
    const rows = filtered.map((v) => [
      new Date(v.check_in_at).toLocaleString('id-ID'),
      v.students?.full_name || '-',
      v.students?.nis || '-',
      v.students?.class || '-',
      v.chief_complaint || '-',
      v.final_status || '-',
    ]);
    (doc as any).autoTable({
      startY: 40,
      head: [['Waktu', 'Siswa', 'NIS', 'Kelas', 'Keluhan', 'Status']],
      body: rows,
    });
    doc.save(`laporan-uks-${range}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportExcel() {
    const csv = [
      ['Waktu', 'Siswa', 'NIS', 'Kelas', 'Keluhan', 'Suhu', 'TD', 'Berat', 'Tinggi', 'Tindakan', 'Status Akhir', 'Catatan'],
      ...filtered.map((v: any) => [
        new Date(v.check_in_at).toLocaleString('id-ID'),
        v.students?.full_name || '-',
        v.students?.nis || '-',
        v.students?.class || '-',
        v.chief_complaint || '-',
        v.temperature ?? '-',
        v.blood_pressure ?? '-',
        v.weight ?? '-',
        v.height ?? '-',
        v.treatment ?? '-',
        v.final_status ?? '-',
        v.notes ?? '-',
      ]),
    ]
      .map((r) => r.join('\t'))
      .join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-uks-${range}.xls`;
    a.click();
    URL.revokeObjectURL(url);
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
              <span className="rpt__z">Overview</span>
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
              <span className="rpt__z">Report builder</span>
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
                <CalendarDays className="ico" /> Rata-rata / hari
              </div>
              <div className="rpt__kpi-value"><CountUp value={avgPerDay} decimals={1} /></div>
              <div className="rpt__kpi-foot"><CountUp value={activeDays} /> hari ada kunjungan</div>
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
                  <BarChart3 className="ico" /> Kunjungan per Bulan
                </h2>
                <span className="rpt__datepill">{rangeInfo.label}</span>
              </div>
              <AreaChart data={monthly} id="rpt-area-overview" />
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
                      label: status === 'unknown' ? 'Belum diisi' : status.replaceAll('_', ' '),
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
                    <th className="r">Share</th>
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
                  <BarChart3 className="ico" /> Build a Report
                </h2>
              </div>

              <div className="rpt__plabel">Metric</div>
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
                      onClick={() => setMetric(m.key)}
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

              <div className="rpt__plabel">Group by</div>
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

              <div className="rpt__plabel">Chart</div>
              <LayoutGroup id="rpt-chart">
                <div className="rpt__seg">
                  <button
                    type="button"
                    className={chart === 'area' ? 'is-active' : ''}
                    aria-pressed={chart === 'area'}
                    disabled={groupBy === 'complaint'}
                    title={groupBy === 'complaint' ? 'Area tidak cocok untuk data keluhan. Gunakan Bars.' : undefined}
                    onClick={() => setChart('area')}
                  >
                    {chart === 'area' && groupBy !== 'complaint' && (
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
                    <span className="rpt__z">Bars</span>
                  </button>
                </div>
              </LayoutGroup>
              {groupBy === 'complaint' && (
                <div className="rpt__tiny">Area dinonaktifkan untuk keluhan — otomatis memakai Bars.</div>
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
                <span className="badge badge--plain"><CountUp value={saved.length} /></span>
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
                  <div className="empty__text">Tidak ada kunjungan pada periode ini.</div>
                </div>
              ) : chart === 'area' ? (
                <AreaChart data={builderGroups} id="rpt-area-builder" />
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
                        <th className="r">Share</th>
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
