'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { Pager } from '@/components/ui/pager';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  Search,
  ClipboardList,
  Plus,
  Stethoscope,
  Printer,
  X,
  Pencil,
  Trash2,
  Save,
  Eye,
  Pill,
  AlertTriangle,
} from 'lucide-react';
import { visitStatusLabel, visitStatusLabels } from '@/lib/visit-status';

/** Jumlah kunjungan per halaman. */
const PAGE_SIZE = 25;

type Status = 'back_to_class' | 'referred' | 'picked_up';
type RangeKey = 'all' | 'today' | '7d' | '30d';

type VisitRow = {
  id: string;
  student_id: string;
  check_in_at: string;
  check_out_at: string | null;
  chief_complaint: string | null;
  temperature: number | null;
  blood_pressure: string | null;
  weight: number | null;
  height: number | null;
  treatment: string | null;
  final_status: string | null;
  notes: string | null;
  students?: { full_name: string | null; nis: string | null; class: string | null } | null;
};

type VisitMedicine = {
  id: string;
  qty: number;
  created_at: string | null;
  notes: string | null;
  medicines?: { name: string | null; unit: string | null } | null;
};

type SchoolInfo = {
  name: string | null;
  address: string | null;
  phone: string | null;
};

type EditForm = {
  chief_complaint: string;
  temperature: string;
  blood_pressure: string;
  weight: string;
  height: string;
  treatment: string;
  final_status: Status;
  notes: string;
};

const statusMap: Record<string, { label: string; cls: string }> = {
  back_to_class: { label: visitStatusLabels.back_to_class, cls: 'badge badge--good' },
  referred: { label: visitStatusLabels.referred, cls: 'badge badge--bad' },
  picked_up: { label: visitStatusLabels.picked_up, cls: 'badge badge--warn' },
};

const statusOptions: { key: Status; label: string }[] = [
  { key: 'back_to_class', label: visitStatusLabels.back_to_class },
  { key: 'referred', label: visitStatusLabels.referred },
  { key: 'picked_up', label: visitStatusLabels.picked_up },
];

const ranges: { key: RangeKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'today', label: 'Hari ini' },
  { key: '7d', label: '7 hari' },
  { key: '30d', label: '30 hari' },
];

const tones = ['av--sky', 'av--teal', 'av--coral', 'av--amber', 'av--rose', 'av--plum', 'av--iris'];

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function shortTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function numberOrNull(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rangeStart(key: RangeKey) {
  if (key === 'all') return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (key === '7d') start.setDate(start.getDate() - 6);
  if (key === '30d') start.setDate(start.getDate() - 29);
  return start;
}

/** Modal dirender di body agar tidak terkurung ancestor yang punya transform. */
function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

export default function VisitsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [school, setSchool] = useState<SchoolInfo | null>(null);

  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');
  const [rangeFilter, setRangeFilter] = useState<RangeKey>('all');
  const [classes, setClasses] = useState<string[]>([]);

  const [detail, setDetail] = useState<VisitRow | null>(null);
  const [detailMeds, setDetailMeds] = useState<VisitMedicine[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editing, setEditing] = useState<VisitRow | null>(null);
  const [form, setForm] = useState<EditForm>({
    chief_complaint: '',
    temperature: '',
    blood_pressure: '',
    weight: '',
    height: '',
    treatment: '',
    final_status: 'back_to_class',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<VisitRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const [printVisit, setPrintVisit] = useState<VisitRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.from('schools').select('name,address,phone').limit(1).maybeSingle();
      if (!cancelled && data) setSchool(data as SchoolInfo);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('students')
        .select('class')
        .not('class', 'is', null)
        .limit(1000);
      const unique = [...new Set((data ?? []).map((row) => (row.class ?? '').trim()).filter(Boolean))];
      setClasses(unique.sort((a, b) => a.localeCompare(b, 'id', { numeric: true })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const since = rangeStart(rangeFilter);

    const timer = setTimeout(async () => {
      setLoading(true);
      let rows: VisitRow[] = [];
      let count = 0;

      // Nama/NIS dan kelas diresolusi dulu ke id siswa, lalu daftar kunjungan
      // dipaginasi server dengan filter yang sama.
      let studentIds: string[] | null = null;
      if (term || classFilter) {
        let lookup = supabase.from('students').select('id');
        if (term) lookup = lookup.or(`full_name.ilike.%${term}%,nis.ilike.%${term}%`);
        if (classFilter) lookup = lookup.eq('class', classFilter);

        const { data: matches } = await lookup.limit(500);
        studentIds = (matches ?? []).map((row) => row.id);

        if (!studentIds.length) {
          if (cancelled) return;
          setVisits([]);
          setTotal(0);
          setLoading(false);
          return;
        }
      }

      let request = supabase
        .from('visits')
        .select('*, students(*)', { count: 'exact' })
        .order('check_in_at', { ascending: false })
        .range(from, to);

      if (studentIds) request = request.in('student_id', studentIds);
      if (statusFilter) request = request.eq('final_status', statusFilter);
      if (since) request = request.gte('check_in_at', since.toISOString());

      const { data, count: totalRows } = await request;
      rows = (data ?? []) as unknown as VisitRow[];
      count = totalRows ?? 0;

      if (cancelled) return;
      setVisits(rows);
      setTotal(count);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, statusFilter, rangeFilter, classFilter, reloadKey]);

  // Obat yang diberikan pada kunjungan yang sedang dibuka.
  useEffect(() => {
    if (!detail) return;
    let cancelled = false;

    (async () => {
      setDetailLoading(true);
      const { data } = await supabase
        .from('medicine_logs')
        .select('id,qty,notes,created_at,medicines(name,unit)')
        .eq('reference_id', detail.id)
        .eq('type', 'out')
        .order('created_at', { ascending: true });

      if (cancelled) return;
      setDetailMeds((data ?? []) as unknown as VisitMedicine[]);
      setDetailLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  const modalOpen = Boolean(detail || editing || deleting || printVisit);

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDetail(null);
      setEditing(null);
      setDeleting(null);
      setPrintVisit(null);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [modalOpen]);

  function openEdit(visit: VisitRow) {
    setDetail(null);
    setEditing(visit);
    setForm({
      chief_complaint: visit.chief_complaint ?? '',
      temperature: visit.temperature === null ? '' : String(visit.temperature),
      blood_pressure: visit.blood_pressure ?? '',
      weight: visit.weight === null ? '' : String(visit.weight),
      height: visit.height === null ? '' : String(visit.height),
      treatment: visit.treatment ?? '',
      final_status: (visit.final_status as Status | null) ?? 'back_to_class',
      notes: visit.notes ?? '',
    });
  }

  async function saveEdit() {
    if (!editing) return;

    const ok = await confirm({
      title: 'Simpan perubahan kunjungan?',
      message: `Perubahan rekam medis ${editing.students?.full_name ?? 'siswa'} akan disimpan.`,
      confirmLabel: 'Ya, simpan perubahan',
    });
    if (!ok) return;

    setSaving(true);

    const payload = {
      chief_complaint: form.chief_complaint.trim() || null,
      temperature: numberOrNull(form.temperature),
      blood_pressure: form.blood_pressure.trim() || null,
      weight: numberOrNull(form.weight),
      height: numberOrNull(form.height),
      treatment: form.treatment.trim() || null,
      final_status: form.final_status,
      notes: form.notes.trim() || null,
    };

    const { error } = await supabase.from('visits').update(payload).eq('id', editing.id);
    setSaving(false);

    if (error) {
      toast.error(`Gagal menyimpan perubahan: ${error.message}`, 'Kunjungan Gagal Diperbarui');
      return;
    }

    await logClientActivity({
      action: 'update',
      entity: 'visit',
      entityId: editing.id,
      summary: `Memperbarui kunjungan ${editing.students?.full_name ?? 'siswa'}`,
      metadata: {
        before: {
          chief_complaint: editing.chief_complaint,
          temperature: editing.temperature,
          blood_pressure: editing.blood_pressure,
          weight: editing.weight,
          height: editing.height,
          treatment: editing.treatment,
          final_status: editing.final_status,
          notes: editing.notes,
        },
        after: payload,
      },
    });

    toast.success('Perubahan kunjungan tersimpan.', 'Kunjungan Diperbarui');
    setEditing(null);
    setReloadKey((key) => key + 1);
  }

  async function removeVisit() {
    if (!deleting) return;
    setRemoving(true);

    const { error } = await supabase.from('visits').delete().eq('id', deleting.id);
    setRemoving(false);

    if (error) {
      toast.error(`Gagal menghapus kunjungan: ${error.message}`, 'Kunjungan Gagal Dihapus');
      return;
    }

    // Simpan salinan lengkap di log agar data yang dihapus masih bisa ditelusuri.
    await logClientActivity({
      action: 'delete',
      entity: 'visit',
      entityId: deleting.id,
      summary: `Menghapus kunjungan ${deleting.students?.full_name ?? 'siswa'}`,
      metadata: {
        snapshot: {
          check_in_at: deleting.check_in_at,
          check_out_at: deleting.check_out_at,
          chief_complaint: deleting.chief_complaint,
          temperature: deleting.temperature,
          blood_pressure: deleting.blood_pressure,
          weight: deleting.weight,
          height: deleting.height,
          treatment: deleting.treatment,
          final_status: deleting.final_status,
          notes: deleting.notes,
          student: deleting.students ?? null,
        },
      },
    });

    toast.success('Kunjungan dihapus dan tercatat di log aktivitas.', 'Kunjungan Dihapus');
    setDeleting(null);
    setDetail(null);
    setReloadKey((key) => key + 1);
  }

  const filtered = Boolean(query.trim() || classFilter || statusFilter || rangeFilter !== 'all');

  return (
    <AppShell
      title="Rekam Medis"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Kunjungan' }]}
      actions={
        <Link href="/visits/new" prefetch={false} className="btn btn--primary">
          <Plus className="ico" /> Catat Kunjungan
        </Link>
      }
    >
      <div className="card">
        <div className="toolbar">
          <div className="search" style={{ maxWidth: 320, flex: 1 }}>
            <Search className="ico" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Cari nama siswa atau NIS…"
              aria-label="Cari kunjungan"
            />
          </div>

          <select
            className="input"
            style={{ width: 'auto', minWidth: 132, height: 38, fontSize: 'var(--fs-sm)' }}
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Filter kelas"
          >
            <option value="">Semua kelas</option>
            {classes.map((klass) => (
              <option key={klass} value={klass}>
                Kelas {klass}
              </option>
            ))}
          </select>

          <select
            className="input"
            style={{ width: 'auto', minWidth: 150, height: 38, fontSize: 'var(--fs-sm)' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as '' | Status);
              setPage(0);
            }}
            aria-label="Filter status akhir"
          >
            <option value="">Semua status</option>
            {statusOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <span className="toolbar__spacer" />
          <span className="spill spill--iris">
            <i />
            <CountUp value={total} /> kunjungan
          </span>
        </div>

        <div className="toolbar" style={{ marginBottom: 12 }}>
          <div className="chips" role="group" aria-label="Filter periode">
            {ranges.map((range) => (
              <button
                key={range.key}
                type="button"
                className="chip chip--accent"
                aria-pressed={rangeFilter === range.key}
                onClick={() => {
                  setRangeFilter(range.key);
                  setPage(0);
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
          <span className="toolbar__spacer" />
          {filtered && (
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => {
                setQuery('');
                setClassFilter('');
                setStatusFilter('');
                setRangeFilter('all');
                setPage(0);
              }}
            >
              <X className="ico" /> Reset filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty">
            <ClipboardList className="ico" />
            <div className="empty__title">Memuat rekam medis…</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Siswa</th>
                  <th>Kelas</th>
                  <th>Keluhan</th>
                  <th>Vitals</th>
                  <th>Tindakan</th>
                  <th className="r">Status</th>
                  <th className="r">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">
                        <ClipboardList className="ico" />
                        <div className="empty__title">Tidak ada kunjungan</div>
                        <div className="empty__text">
                          {filtered
                            ? 'Tidak ada kunjungan yang cocok dengan filter ini.'
                            : 'Kunjungan yang dicatat akan tampil di sini.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visits.map((v, i) => {
                    const st = statusMap[v.final_status ?? ''] ?? { label: '-', cls: 'badge badge--plain' };
                    const vitals = [
                      v.temperature ? `${v.temperature}°C` : null,
                      v.blood_pressure || null,
                      v.weight ? `${v.weight} kg` : null,
                      v.height ? `${v.height} cm` : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <tr key={v.id}>
                        <td className="muted whitespace-nowrap">
                          {new Date(v.check_in_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td>
                          <div className="cell-person">
                            <span className={`av av--sm ${tones[i % tones.length]}`}>
                              {(v.students?.full_name ?? '?').charAt(0)}
                            </span>
                            <div>
                              <Link
                                href={v.student_id ? `/visits/${v.student_id}` : '#'}
                                prefetch={false}
                                className="slist__name"
                                style={{ textDecoration: 'none', color: 'inherit' }}
                                title="Lihat detail siswa"
                              >
                                <b>{v.students?.full_name ?? '-'}</b>
                              </Link>
                              <small>{v.students?.nis}</small>
                            </div>
                          </div>
                        </td>
                        <td className="muted">{v.students?.class ?? '-'}</td>
                        <td className="muted" style={{ maxWidth: 200 }}>{v.chief_complaint ?? '-'}</td>
                        <td className="muted text-xs">{vitals || '-'}</td>
                        <td className="muted" style={{ maxWidth: 200 }}>{v.treatment ?? '-'}</td>
                        <td className="r"><span className={st.cls}>{st.label}</span></td>
                        <td className="r">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="ibtn"
                              onClick={() => setDetail(v)}
                              aria-label={`Detail kunjungan ${v.students?.full_name ?? ''}`}
                              title="Lihat detail"
                            >
                              <Eye className="ico" strokeWidth={1.7} />
                            </button>
                            <button
                              type="button"
                              className="ibtn"
                              onClick={() => openEdit(v)}
                              aria-label={`Edit kunjungan ${v.students?.full_name ?? ''}`}
                              title="Edit kunjungan"
                            >
                              <Pencil className="ico" strokeWidth={1.7} />
                            </button>
                            <button
                              type="button"
                              className="ibtn"
                              onClick={() => setPrintVisit(v)}
                              aria-label={`Cetak surat untuk ${v.students?.full_name ?? 'kunjungan'}`}
                              title="Cetak surat izin pulang"
                            >
                              <Printer className="ico" strokeWidth={1.7} />
                            </button>
                            <button
                              type="button"
                              className="ibtn"
                              onClick={() => {
                                setDetail(null);
                                setDeleting(v);
                              }}
                              aria-label={`Hapus kunjungan ${v.students?.full_name ?? ''}`}
                              title="Hapus kunjungan"
                              style={{ color: 'var(--bad)' }}
                            >
                              <Trash2 className="ico" strokeWidth={1.7} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} unit="kunjungan" />

      {!filtered && total > 0 && (
        <div className="note" style={{ marginTop: 16 }}>
          <Stethoscope className="ico" />
          <div>
            Seluruh riwayat kunjungan ditampilkan per halaman. Gunakan pencarian, kelas, status, atau periode
            untuk mempersempit hasil.
          </div>
        </div>
      )}

      {/* Detail kunjungan */}
      {detail && (
        <Portal>
          <div className="overlay" onClick={() => setDetail(null)}>
            <div
              className="sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Detail kunjungan"
            >
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">{detail.students?.full_name ?? 'Detail kunjungan'}</div>
                  <div className="sheet__sub">
                    {detail.students?.nis ? `NIS ${detail.students.nis}` : 'Rekam medis UKS'}
                    {detail.students?.class ? ` · Kelas ${detail.students.class}` : ''}
                  </div>
                </div>
                <button type="button" className="ibtn" onClick={() => setDetail(null)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>

              <div className="sheet__body">
                <div className="detail-grid">
                  <div>
                    <span className="detail-grid__label">Waktu datang</span>
                    <b>{new Date(detail.check_in_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</b>
                  </div>
                  <div>
                    <span className="detail-grid__label">Waktu keluar</span>
                    <b>
                      {detail.check_out_at
                        ? new Date(detail.check_out_at).toLocaleString('id-ID', { timeStyle: 'short' })
                        : '—'}
                    </b>
                  </div>
                  <div>
                    <span className="detail-grid__label">Suhu</span>
                    <b>{detail.temperature === null ? '—' : `${detail.temperature} °C`}</b>
                  </div>
                  <div>
                    <span className="detail-grid__label">Tekanan darah</span>
                    <b>{detail.blood_pressure || '—'}</b>
                  </div>
                  <div>
                    <span className="detail-grid__label">Berat</span>
                    <b>{detail.weight === null ? '—' : `${detail.weight} kg`}</b>
                  </div>
                  <div>
                    <span className="detail-grid__label">Tinggi</span>
                    <b>{detail.height === null ? '—' : `${detail.height} cm`}</b>
                  </div>
                </div>

                <div className="detail-block">
                  <span className="detail-grid__label">Keluhan utama</span>
                  <p>{detail.chief_complaint || '—'}</p>
                </div>

                <div className="detail-block">
                  <span className="detail-grid__label">Tindakan</span>
                  <p>{detail.treatment || '—'}</p>
                </div>

                <div className="detail-block">
                  <span className="detail-grid__label">Obat diberikan</span>
                  {detailLoading ? (
                    <p className="muted">Memuat obat…</p>
                  ) : detailMeds.length === 0 ? (
                    <p className="muted">Tidak ada obat yang dicatat.</p>
                  ) : (
                    <ul className="detail-list">
                      {detailMeds.map((med) => (
                        <li key={med.id}>
                          <Pill className="ico" />
                          <b>{med.medicines?.name ?? 'Obat'}</b>
                          <span className="muted">
                            {med.qty} {med.medicines?.unit ?? ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {detail.notes && (
                  <div className="detail-block">
                    <span className="detail-grid__label">Catatan</span>
                    <p>{detail.notes}</p>
                  </div>
                )}

                <div className="detail-block">
                  <span className="detail-grid__label">Status akhir</span>
                  <span className={(statusMap[detail.final_status ?? ''] ?? { cls: 'badge badge--plain' }).cls}>
                    {visitStatusLabel(detail.final_status)}
                  </span>
                </div>
              </div>

              <div className="sheet__foot" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--bad)' }}
                  onClick={() => {
                    setDetail(null);
                    setDeleting(detail);
                  }}
                >
                  <Trash2 className="ico" /> Hapus
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPrintVisit(detail)}>
                    <Printer className="ico" /> Cetak
                  </button>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => openEdit(detail)}>
                    <Pencil className="ico" /> Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit kunjungan */}
      {editing && (
        <Portal>
          <div className="overlay" onClick={() => setEditing(null)}>
            <form
              className="sheet"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                void saveEdit();
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Edit kunjungan"
            >
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">Edit Kunjungan</div>
                  <div className="sheet__sub">
                    {editing.students?.full_name ?? 'Siswa'}
                    {editing.students?.class ? ` · Kelas ${editing.students.class}` : ''}
                  </div>
                </div>
                <button type="button" className="ibtn" onClick={() => setEditing(null)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>

              <div className="sheet__body">
                <div className="field field--wide">
                  <label className="field__label">Keluhan utama</label>
                  <input
                    className="input"
                    value={form.chief_complaint}
                    onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
                    placeholder="Demam, pilek, luka ringan…"
                  />
                </div>

                <div className="sheet__grid">
                  <div className="field">
                    <label className="field__label">Suhu (°C)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      value={form.temperature}
                      onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label">Tekanan darah</label>
                    <input
                      className="input"
                      value={form.blood_pressure}
                      onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })}
                      placeholder="120/80"
                    />
                  </div>
                  <div className="field">
                    <label className="field__label">Berat (kg)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label">Tinggi (cm)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: e.target.value })}
                    />
                  </div>
                </div>

                <div className="field field--wide">
                  <label className="field__label">Tindakan</label>
                  <input
                    className="input"
                    value={form.treatment}
                    onChange={(e) => setForm({ ...form, treatment: e.target.value })}
                    placeholder="Kompres, istirahat, rujuk…"
                  />
                </div>

                <div className="field field--wide">
                  <label className="field__label">Status akhir</label>
                  <div className="chips">
                    {statusOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className="chip"
                        aria-pressed={form.final_status === option.key}
                        onClick={() => setForm({ ...form, final_status: option.key })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field field--wide">
                  <label className="field__label">Catatan tambahan</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Catatan tambahan…"
                  />
                </div>

                <div className="note">
                  <AlertTriangle className="ico" />
                  <div>Perubahan ini tercatat di log aktivitas beserta nilai sebelum dan sesudahnya.</div>
                </div>
              </div>

              <div className="sheet__foot">
                <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  <Save className="ico" /> {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {/* Hapus kunjungan */}
      {deleting && (
        <Portal>
          <div className="overlay" onClick={() => setDeleting(null)}>
            <div
              className="sheet"
              style={{ maxWidth: 460 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label="Hapus kunjungan"
            >
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">Hapus kunjungan?</div>
                  <div className="sheet__sub">Tindakan ini tidak bisa dibatalkan.</div>
                </div>
                <button type="button" className="ibtn" onClick={() => setDeleting(null)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>

              <div className="sheet__body">
                <div className="note note--bad">
                  <AlertTriangle className="ico" />
                  <div>
                    Kunjungan <b>{deleting.students?.full_name ?? 'siswa'}</b> pada{' '}
                    <b>{new Date(deleting.check_in_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</b>{' '}
                    akan dihapus permanen. Salinan datanya tetap disimpan di log aktivitas.
                  </div>
                </div>
                <div className="note">
                  <Pill className="ico" />
                  <div>
                    Stok obat yang sudah diberikan tidak dikembalikan otomatis. Gunakan <b>Koreksi stok</b> di
                    Inventaris bila obat perlu dikembalikan.
                  </div>
                </div>
              </div>

              <div className="sheet__foot">
                <button type="button" className="btn btn--ghost" onClick={() => setDeleting(null)}>
                  Batal
                </button>
                <button type="button" className="btn btn--danger" onClick={removeVisit} disabled={removing}>
                  <Trash2 className="ico" /> {removing ? 'Menghapus…' : 'Hapus permanen'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Surat izin pulang */}
      {printVisit && (
        <Portal>
          <div className="overlay print-overlay" onClick={() => setPrintVisit(null)}>
            <div
              className="sheet print-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Surat izin pulang"
            >
              <div className="print-sheet__noprint print-sheet__bar">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPrintVisit(null)}>
                  <X className="ico" /> Tutup
                </button>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => window.print()}>
                  <Printer className="ico" /> Cetak
                </button>
              </div>

              <div className="print-sheet__doc">
                <div className="print-sheet__masthead">
                  <div className="print-sheet__school">{school?.name ?? 'Unit Kesehatan Sekolah'}</div>
                  <div className="print-sheet__schoolsub">
                    {[school?.address, school?.phone].filter(Boolean).join(' · ') || 'Unit Kesehatan Sekolah'}
                  </div>
                </div>

                <div className="print-sheet__kind">Surat Izin Pulang</div>
                <div className="print-sheet__kindline" />

                <p className="print-sheet__lead">
                  Yang bertanda tangan di bawah ini, petugas Unit Kesehatan Sekolah (UKS), menerangkan bahwa siswa
                  berikut telah mendapatkan pemeriksaan dan penanganan:
                </p>

                <table className="print-sheet__fields">
                  <tbody>
                    <tr>
                      <th>Nama</th>
                      <td>{printVisit.students?.full_name ?? '-'}</td>
                    </tr>
                    <tr>
                      <th>NIS</th>
                      <td>{printVisit.students?.nis ?? '-'}</td>
                    </tr>
                    <tr>
                      <th>Kelas</th>
                      <td>{printVisit.students?.class ?? '-'}</td>
                    </tr>
                    <tr>
                      <th>Waktu datang</th>
                      <td>
                        {longDate(printVisit.check_in_at)} · {shortTime(printVisit.check_in_at)}
                      </td>
                    </tr>
                    <tr>
                      <th>Keluhan</th>
                      <td>{printVisit.chief_complaint || '-'}</td>
                    </tr>
                    <tr>
                      <th>Tindakan</th>
                      <td>{printVisit.treatment || '-'}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="print-sheet__lead">
                  Berdasarkan hasil pemeriksaan, siswa tersebut diizinkan pulang untuk beristirahat dan/atau
                  melanjutkan penanganan di rumah, dengan status akhir{' '}
                  <b>{visitStatusLabel(printVisit.final_status)}</b>.
                </p>

                <div className="print-sheet__sign">
                  <div>
                    <div className="print-sheet__signdate">
                      {longDate(printVisit.check_out_at ?? printVisit.check_in_at)}
                    </div>
                    <div className="print-sheet__signrole">Petugas UKS</div>
                    <div className="print-sheet__signname">(&hellip;&hellip;&hellip;&hellip;&hellip;&hellip;&hellip;&hellip;)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </AppShell>
  );
}
