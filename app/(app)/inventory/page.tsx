'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { Pager } from '@/components/ui/pager';
import { useToast } from '@/components/ui/toast';
import { downloadCsv, parseCsv } from '@/lib/csv';
import { fetchAllRows } from '@/lib/supabase/paginate';
import { expiryState, isExpiryWarning, isLowStock, isMissingTable } from '@/lib/stock';
import type {
  AdjustStockResult,
  MedicineBatchRow,
  MedicineLogRow,
  MedicineRow,
  MedicineUnit,
  RestockResult,
} from '@/lib/database.types';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  X,
  Save,
  TrendingUp,
  Pencil,
  Trash2,
  Upload,
  Download,
  History,
  SlidersHorizontal,
  Pill,
  Loader2,
} from 'lucide-react';

type Filter = 'all' | 'low' | 'expiring';
type Sort = 'name' | 'expiry';

/** Jumlah obat per halaman. */
const PAGE_SIZE = 25;

const ADJUST_REASONS = [
  'Stok opname',
  'Obat rusak',
  'Kedaluwarsa dibuang',
  'Hilang',
  'Lainnya',
];

/** Kolom CSV impor/ekspor (urutan sekaligus jadi template). */
const CSV_HEADER = [
  'Nama',
  'Kategori',
  'Satuan',
  'Stok',
  'Stok Minimum',
  'Lokasi',
  'Kedaluwarsa',
  'Dosis',
];

/** Modal dirender di body agar tidak terkurung ancestor ber-overflow/transform. */
function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

/** Cocokkan header CSV tanpa peduli huruf besar/kecil dan spasi. */
function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

type ImportRow = {
  name: string;
  category: string;
  unit: MedicineUnit;
  stock: number;
  min_stock: number;
  location: string;
  expiry_date: string;
  dosage: string;
};

function toUnit(value: string): MedicineUnit {
  const unit = value.trim().toLowerCase();
  return unit === 'strip' || unit === 'botol' ? unit : 'pcs';
}

function toDate(value: string) {
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  return text;
}

function InventoryPageInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  // Migrasi 010 (kolom dosage) mungkin belum dijalankan; bila belum,
  // field dosis disembunyikan dari penyimpanan agar tidak error.
  const [hasDosage, setHasDosage] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [page, setPage] = useState(0);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedicineRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: 'pcs' as MedicineUnit,
    stock: '',
    min_stock: '5',
    location: '',
    expiry_date: '',
    dosage: '',
  });

  const [detail, setDetail] = useState<MedicineRow | null>(null);
  const [detailLogs, setDetailLogs] = useState<MedicineLogRow[]>([]);
  const [detailBatches, setDetailBatches] = useState<MedicineBatchRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [adjust, setAdjust] = useState<MedicineRow | null>(null);
  const [adjustForm, setAdjustForm] = useState({ stock: '0', reason: ADJUST_REASONS[0], note: '' });
  const [adjusting, setAdjusting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importSkipped, setImportSkipped] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function load() {
    // fetchAllRows: hindari batas ±1000 baris PostgREST yang memotong senyap.
    const { data } = await fetchAllRows<MedicineRow>((from, to) =>
      supabase
        .from('medicines')
        .select('*')
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );
    setMedicines(data);
    // Deteksi kolom dosage tanpa mengganggu daftar obat.
    const { error: dosageProbe } = await supabase
      .from('medicines')
      .select('dosage')
      .limit(1);
    setHasDosage(!dosageProbe);
    setNow(Date.now());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditing(null);
    setOpen(true);
    router.replace('/inventory', { scroll: false });
  }, [searchParams, router]);

  // Kunci scroll halaman selama salah satu modal terbuka.
  const modalOpen = Boolean(open || detail || adjust || importOpen);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setDetail(null);
      setAdjust(null);
      setImportOpen(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [modalOpen]);

  const lowOf = (m: MedicineRow) => isLowStock(m.stock, m.min_stock);
  const expiryWarningOf = (m: MedicineRow) => isExpiryWarning(m.expiry_date, now);

  const lowStock = medicines.filter(lowOf).length;
  const expiring = medicines.filter(expiryWarningOf).length;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = medicines.filter((m) => {
      const matchQ =
        !term ||
        m.name.toLowerCase().includes(term) ||
        (m.category ?? '').toLowerCase().includes(term) ||
        (m.dosage ?? '').toLowerCase().includes(term);
      const matchF =
        filter === 'all' ||
        (filter === 'low' && isLowStock(m.stock, m.min_stock)) ||
        (filter === 'expiring' && isExpiryWarning(m.expiry_date, now));
      return matchQ && matchF;
    });

    if (sort === 'expiry') {
      return [...rows].sort((a, b) => {
        const aTime = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime || a.name.localeCompare(b.name);
      });
    }

    return rows;
  }, [medicines, query, filter, sort, now]);

  // Paginasi di klien: seluruh obat sudah dimuat untuk hitungan KPI & filter.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Jaga halaman tetap valid saat data menyusut (mis. obat terakhir dihapus).
  const currentPage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  async function addStock(id: string, qty: number) {
    const m = medicines.find((x) => x.id === id);
    const name = m?.name ?? 'obat';

    // Jalur utama: RPC atomik (stok + log + batch dalam satu transaksi).
    const { data, error } = await supabase.rpc('restock_medicine', {
      p_medicine: id,
      p_qty: qty,
      p_note: 'Restok',
    });

    if (error) {
      // Fallback compare-and-set bila migrasi 008 belum dijalankan.
      const { data: fresh, error: readError } = await supabase
        .from('medicines')
        .select('id,stock')
        .eq('id', id)
        .maybeSingle();

      if (readError || !fresh) {
        toast.error(
          `Gagal menambah stok: ${readError?.message ?? 'obat tidak ditemukan'}`,
          'Stok Gagal Diperbarui'
        );
        return;
      }

      const before = fresh.stock ?? 0;
      const { data: updated } = await supabase
        .from('medicines')
        .update({ stock: before + qty })
        .eq('id', id)
        .eq('stock', before)
        .select('id')
        .maybeSingle();

      if (!updated) {
        toast.error('Stok berubah saat diproses. Coba lagi.', 'Stok Gagal Diperbarui');
        load();
        return;
      }

      const { error: logError } = await supabase
        .from('medicine_logs')
        .insert({ medicine_id: id, type: 'in', qty, notes: 'Restok' });
      if (logError && !isMissingTable(logError)) {
        toast.error('Stok bertambah, tetapi riwayat stok gagal dicatat.', 'Peringatan');
      }

      const { error: batchError } = await supabase
        .from('medicine_batches')
        .insert({ medicine_id: id, qty, expiry_date: m?.expiry_date ?? null, notes: 'Restok' });
      if (batchError && !isMissingTable(batchError)) {
        toast.error('Stok bertambah, tetapi batch penerimaan gagal dicatat.', 'Peringatan');
      }
    } else {
      const result = data as RestockResult | null;
      if (result && result.ok === false) {
        toast.error(
          result.error === 'forbidden'
            ? 'Anda tidak berwenang menambah stok obat ini.'
            : 'Gagal menambah stok obat.',
          'Stok Gagal Diperbarui'
        );
        return;
      }
    }

    await logClientActivity({
      action: 'restock',
      entity: 'medicine',
      entityId: id,
      summary: `Menambah stok ${name} sebanyak ${qty}`,
      metadata: { stock_before: m?.stock ?? 0, added: qty },
    });
    toast.success(`Stok ${name} berhasil ditambah ${qty}.`, 'Stok Diperbarui');
    load();
  }

  const emptyForm = {
    name: '',
    category: '',
    unit: 'pcs' as MedicineUnit,
    stock: '',
    min_stock: '5',
    location: '',
    expiry_date: '',
    dosage: '',
  };

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(m: MedicineRow) {
    setDetail(null);
    setEditing(m);
    setForm({
      name: m.name ?? '',
      category: m.category ?? '',
      unit: (m.unit ?? 'pcs') as MedicineUnit,
      stock: String(m.stock ?? 0),
      min_stock: String(m.min_stock ?? 5),
      location: m.location ?? '',
      expiry_date: m.expiry_date ?? '',
      dosage: m.dosage ?? '',
    });
    setOpen(true);
  }

  async function saveMedicine() {
    const name = form.name.trim();
    if (!name) {
      toast.error('Nama obat wajib diisi.', 'Obat Gagal Disimpan');
      return;
    }

    setSaving(true);

    const stock = parseInt(form.stock || '0', 10) || 0;
    const fields = {
      name,
      category: form.category.trim() || null,
      unit: form.unit,
      min_stock: parseInt(form.min_stock || '5', 10) || 0,
      location: form.location.trim() || null,
      expiry_date: form.expiry_date || null,
      ...(hasDosage ? { dosage: form.dosage.trim() || null } : {}),
    };

    if (editing) {
      // Stok tidak diubah lewat form edit; gunakan Koreksi stok agar tercatat.
      const { error } = await supabase.from('medicines').update(fields).eq('id', editing.id);
      setSaving(false);

      if (error) {
        toast.error(`Gagal menyimpan perubahan: ${error.message}`, 'Obat Gagal Disimpan');
        return;
      }

      await logClientActivity({
        action: 'update',
        entity: 'medicine',
        entityId: editing.id,
        summary: `Mengubah data obat ${name}`,
        metadata: { stock: editing.stock ?? 0, dosage: hasDosage ? form.dosage.trim() || null : null },
      });
      toast.success(`Obat ${name} berhasil diperbarui.`, 'Perubahan Disimpan');
    } else {
      const { data: created, error } = await supabase
        .from('medicines')
        .insert({ ...fields, stock })
        .select('id')
        .single();
      setSaving(false);

      if (error) {
        toast.error(`Gagal menambah obat: ${error.message}`, 'Obat Gagal Ditambahkan');
        return;
      }

      // Batch saldo awal agar pelacakan batch konsisten sejak awal.
      if (created && stock > 0) {
        const { error: batchError } = await supabase.from('medicine_batches').insert({
          medicine_id: (created as { id: string }).id,
          qty: stock,
          expiry_date: fields.expiry_date,
          notes: 'Stok awal',
        });
        if (batchError && !isMissingTable(batchError)) {
          toast.error('Obat ditambahkan, tetapi batch awal gagal dicatat.', 'Peringatan');
        }
      }

      await logClientActivity({
        action: 'create',
        entity: 'medicine',
        entityId: (created as { id: string } | null)?.id ?? null,
        summary: `Menambahkan obat ${name}`,
        metadata: { category: fields.category, stock },
      });
      toast.success(`Obat ${name} berhasil ditambahkan.`, 'Obat Ditambahkan');
    }

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  async function removeMedicine(m: MedicineRow) {
    const ok = window.confirm(
      `Hapus obat ${m.name}? Riwayat keluar/masuk stok obat ini juga akan terhapus dan tidak bisa dikembalikan.`
    );
    if (!ok) return;

    const { error } = await supabase.from('medicines').delete().eq('id', m.id);
    if (error) {
      toast.error(`Gagal menghapus ${m.name}: ${error.message}`, 'Obat Gagal Dihapus');
      return;
    }

    await logClientActivity({
      action: 'delete',
      entity: 'medicine',
      entityId: m.id,
      summary: `Menghapus obat ${m.name}`,
      metadata: { category: m.category ?? null, stock: m.stock ?? 0 },
    });
    toast.success(`${m.name} berhasil dihapus.`, 'Obat Dihapus');
    setDetail(null);
    load();
  }

  async function openDetail(m: MedicineRow) {
    setDetail(m);
    setDetailLogs([]);
    setDetailBatches([]);
    setDetailLoading(true);

    const [logs, batches] = await Promise.all([
      supabase
        .from('medicine_logs')
        .select('id,school_id,medicine_id,type,qty,reference_id,notes,created_at')
        .eq('medicine_id', m.id)
        .order('created_at', { ascending: false })
        .limit(25),
      supabase
        .from('medicine_batches')
        .select('*')
        .eq('medicine_id', m.id)
        .gt('qty', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false }),
    ]);

    setDetailLogs((logs.data ?? []) as MedicineLogRow[]);
    setDetailBatches((batches.data ?? []) as MedicineBatchRow[]);
    setDetailLoading(false);
  }

  function openAdjust(m: MedicineRow) {
    setDetail(null);
    setAdjust(m);
    setAdjustForm({ stock: String(m.stock ?? 0), reason: ADJUST_REASONS[0], note: '' });
  }

  const adjustTarget = parseInt(adjustForm.stock, 10);
  const adjustDelta =
    adjust && Number.isFinite(adjustTarget) ? adjustTarget - (adjust.stock ?? 0) : 0;

  async function saveAdjust() {
    if (!adjust) return;

    if (!Number.isFinite(adjustTarget) || adjustTarget < 0) {
      toast.error('Stok baru harus berupa angka 0 atau lebih.', 'Koreksi Gagal');
      return;
    }

    const reason = [adjustForm.reason, adjustForm.note.trim()].filter(Boolean).join(' — ');
    const before = adjust.stock ?? 0;

    setAdjusting(true);
    const { data, error } = await supabase.rpc('adjust_medicine_stock', {
      p_medicine: adjust.id,
      p_new_stock: adjustTarget,
      p_reason: reason,
    });
    let finalBefore = before;

    if (error) {
      // Fallback bila migrasi 010 belum dijalankan: update dengan pengaman
      // compare-and-set supaya stok tidak saling menimpa.
      const { data: fresh } = await supabase
        .from('medicines')
        .select('stock')
        .eq('id', adjust.id)
        .maybeSingle();

      finalBefore = fresh?.stock ?? before;
      const { data: updated, error: updateError } = await supabase
        .from('medicines')
        .update({ stock: adjustTarget })
        .eq('id', adjust.id)
        .eq('stock', finalBefore)
        .select('id')
        .maybeSingle();

      if (updateError || !updated) {
        setAdjusting(false);
        toast.error(
          updateError
            ? `Gagal mengoreksi stok: ${updateError.message}`
            : 'Stok berubah saat diproses. Coba lagi.',
          'Koreksi Gagal'
        );
        return;
      }

      const diff = adjustTarget - finalBefore;
      if (diff !== 0) {
        const { error: logError } = await supabase.from('medicine_logs').insert({
          medicine_id: adjust.id,
          type: diff > 0 ? 'in' : 'out',
          qty: Math.abs(diff),
          notes: `Koreksi stok: ${reason}`,
        });
        if (logError && !isMissingTable(logError)) {
          toast.error('Stok dikoreksi, tetapi riwayat stok gagal dicatat.', 'Peringatan');
        }
      }
    } else {
      const result = data as AdjustStockResult | null;
      if (result && result.ok === false) {
        setAdjusting(false);
        const message =
          result.error === 'forbidden'
            ? 'Anda tidak berwenang mengoreksi stok obat ini.'
            : result.error === 'missing_reason'
              ? 'Alasan koreksi wajib diisi.'
              : result.error === 'invalid_stock'
                ? 'Stok baru tidak valid.'
                : 'Gagal mengoreksi stok obat.';
        toast.error(message, 'Koreksi Gagal');
        return;
      }
      if (result?.before !== undefined) finalBefore = result.before;
    }

    setAdjusting(false);
    await logClientActivity({
      action: 'adjust',
      entity: 'medicine',
      entityId: adjust.id,
      summary: `Koreksi stok ${adjust.name}: ${finalBefore} → ${adjustTarget}`,
      metadata: { before: finalBefore, after: adjustTarget, reason },
    });
    toast.success(
      `Stok ${adjust.name} dikoreksi dari ${finalBefore} menjadi ${adjustTarget}.`,
      'Stok Dikoreksi'
    );
    setAdjust(null);
    load();
  }

  async function exportCsv() {
    setExporting(true);

    downloadCsv(`inventaris-${new Date().toISOString().slice(0, 10)}.csv`, [
      CSV_HEADER,
      ...medicines.map((m) => [
        m.name,
        m.category,
        m.unit,
        m.stock,
        m.min_stock,
        m.location,
        m.expiry_date,
        m.dosage,
      ]),
    ]);

    await logClientActivity({
      action: 'export',
      entity: 'medicine',
      summary: `Mengekspor ${medicines.length} data obat ke CSV`,
      metadata: { count: medicines.length },
    });

    setExporting(false);
    toast.success(`${medicines.length} data obat diekspor.`, 'Ekspor Selesai');
  }

  function downloadTemplate() {
    downloadCsv('template-impor-obat.csv', [
      CSV_HEADER,
      ['Paracetamol 500 mg', 'Analgesik', 'strip', '20', '5', 'Rak A1', '2027-01-31', '3 x 1 tablet'],
    ]);
  }

  async function handleFile(file: File | null) {
    setImportError(null);
    setImportRows([]);
    setImportSkipped(0);
    setImportName(file?.name ?? '');
    if (!file) return;

    try {
      const text = await file.text();
      const matrix = parseCsv(text);
      if (matrix.length < 2) {
        setImportError('Berkas kosong atau hanya berisi header.');
        return;
      }

      const header = matrix[0].map(normalizeHeader);
      const index = (names: string[]) => header.findIndex((h) => names.includes(h));

      const col = {
        name: index(['nama', 'name', 'nama obat']),
        category: index(['kategori', 'category']),
        unit: index(['satuan', 'unit']),
        stock: index(['stok', 'stock', 'jumlah']),
        min: index(['stok minimum', 'min_stock', 'min', 'stok min']),
        location: index(['lokasi', 'location', 'rak']),
        expiry: index(['kedaluwarsa', 'expiry', 'expiry_date', 'tanggal kedaluwarsa']),
        dosage: index(['dosis', 'dosage', 'aturan pakai']),
      };

      if (col.name < 0) {
        setImportError(
          'Kolom "Nama" tidak ditemukan. Unduh template untuk melihat format yang benar.'
        );
        return;
      }

      const existing = new Set(medicines.map((m) => m.name.trim().toLowerCase()));
      const seen = new Set<string>();
      const rows: ImportRow[] = [];
      let skipped = 0;

      for (const line of matrix.slice(1)) {
        const name = (line[col.name] ?? '').trim();
        if (!name) continue;

        const key = name.toLowerCase();
        if (existing.has(key) || seen.has(key)) {
          skipped += 1;
          continue;
        }
        seen.add(key);

        rows.push({
          name,
          category: (col.category >= 0 ? line[col.category] ?? '' : '').trim(),
          unit: toUnit(col.unit >= 0 ? line[col.unit] ?? '' : ''),
          stock: Math.max(0, parseInt(col.stock >= 0 ? line[col.stock] ?? '0' : '0', 10) || 0),
          min_stock: Math.max(0, parseInt(col.min >= 0 ? line[col.min] ?? '5' : '5', 10) || 0),
          location: (col.location >= 0 ? line[col.location] ?? '' : '').trim(),
          expiry_date: toDate(col.expiry >= 0 ? line[col.expiry] ?? '' : ''),
          dosage: (col.dosage >= 0 ? line[col.dosage] ?? '' : '').trim(),
        });
      }

      if (rows.length === 0) {
        setImportError(
          skipped > 0
            ? 'Semua obat pada berkas sudah ada di inventaris.'
            : 'Tidak ada baris obat yang bisa diimpor.'
        );
        setImportSkipped(skipped);
        return;
      }

      setImportRows(rows);
      setImportSkipped(skipped);
    } catch {
      setImportError('Berkas tidak bisa dibaca. Pastikan formatnya CSV.');
    }
  }

  async function runImport() {
    if (importRows.length === 0) return;
    setImporting(true);

    let created = 0;
    let failed = 0;

    for (const row of importRows) {
      const { data: inserted, error } = await supabase
        .from('medicines')
        .insert({
          name: row.name,
          category: row.category || null,
          unit: row.unit,
          stock: row.stock,
          min_stock: row.min_stock,
          location: row.location || null,
          expiry_date: row.expiry_date || null,
          ...(hasDosage ? { dosage: row.dosage || null } : {}),
        })
        .select('id')
        .single();

      if (error || !inserted) {
        failed += 1;
        continue;
      }

      created += 1;

      if (row.stock > 0) {
        const { error: batchError } = await supabase.from('medicine_batches').insert({
          medicine_id: (inserted as { id: string }).id,
          qty: row.stock,
          expiry_date: row.expiry_date || null,
          notes: 'Impor CSV',
        });
        if (batchError && !isMissingTable(batchError)) {
          console.warn('[inventaris] batch impor gagal dicatat:', batchError.message);
        }
      }
    }

    await logClientActivity({
      action: 'create',
      entity: 'medicine',
      summary: `Mengimpor ${created} obat dari CSV`,
      metadata: { created, skipped: importSkipped, failed },
    });

    setImporting(false);
    setImportOpen(false);
    setImportRows([]);
    setImportName('');
    setImportSkipped(0);
    load();

    toast.success(
      `${created} obat ditambahkan${importSkipped ? `, ${importSkipped} dilewati (sudah ada)` : ''}${
        failed ? `, ${failed} gagal` : ''
      }.`,
      'Impor Selesai'
    );
  }

  return (
    <AppShell
      title="Inventaris Obat"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Inventaris' }]}
      actions={
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          <Plus className="ico" /> Tambah Obat
        </button>
      }
    >
      <section className="inv-strip" aria-label="Ringkasan inventaris">
        <div className="inv-tile">
          <span className="inv-tile__ico" style={{ background: 'linear-gradient(160deg, #5BDBA4, #1F9A64)' }}>
            <Package className="ico" />
          </span>
          <div className="inv-tile__label">Jenis obat</div>
          <div className="inv-tile__value"><CountUp value={medicines.length} /></div>
          <div className="inv-tile__sub">terdaftar di UKS</div>
        </div>
        <div className="inv-tile">
          <span className="inv-tile__ico" style={{ background: 'linear-gradient(160deg, #FFC857, #E0902B)' }}>
            <AlertTriangle className="ico" />
          </span>
          <div className="inv-tile__label">Stok menipis</div>
          <div className="inv-tile__value"><CountUp value={lowStock} /></div>
          <div className="inv-tile__sub">perlu segera diisi ulang</div>
        </div>
        <div className="inv-tile">
          <span className="inv-tile__ico" style={{ background: 'linear-gradient(160deg, #FF7E93, #E5384F)' }}>
            <Clock className="ico" />
          </span>
          <div className="inv-tile__label">Kedaluwarsa ≤ 30 hari</div>
          <div className="inv-tile__value"><CountUp value={expiring} /></div>
          <div className="inv-tile__sub">periksa dan ganti</div>
        </div>
      </section>

      <div className="card inv-bar">
        <div className="search" style={{ flex: 1, minWidth: 200 }}>
          <Search className="ico" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Cari obat, kategori, atau lokasi…"
            aria-label="Cari obat"
          />
        </div>
        <div className="chips" aria-label="Filter stok">
          <button
            type="button"
            className="chip"
            aria-pressed={filter === 'all'}
            onClick={() => {
              setFilter('all');
              setPage(0);
            }}
          >
            Semua <b>{medicines.length}</b>
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={filter === 'low'}
            onClick={() => {
              setFilter('low');
              setPage(0);
            }}
          >
            Menipis <b>{lowStock}</b>
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={filter === 'expiring'}
            onClick={() => {
              setFilter('expiring');
              setPage(0);
            }}
          >
            Kedaluwarsa <b>{expiring}</b>
          </button>
        </div>
        <div className="chips" role="group" aria-label="Urutkan obat">
          <button
            type="button"
            className="chip"
            aria-pressed={sort === 'name'}
            onClick={() => setSort('name')}
          >
            Nama A–Z
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={sort === 'expiry'}
            onClick={() => setSort('expiry')}
          >
            <Clock className="ico" style={{ width: 14, height: 14 }} /> Kedaluwarsa terdekat
          </button>
        </div>
        <span className="toolbar__spacer" />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setImportOpen(true)}>
          <Upload className="ico" /> Impor CSV
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={exportCsv} disabled={exporting}>
          <Download className="ico" /> {exporting ? 'Menyiapkan…' : 'Ekspor CSV'}
        </button>
      </div>

      <div className="card inv-list">
        {loading ? (
          <div className="empty">
            <Package className="ico" />
            <div className="empty__title">Memuat inventaris…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <Package className="ico" />
            <div className="empty__title">Tidak ada obat</div>
            <div className="empty__text">Ubah filter atau tambahkan obat baru.</div>
          </div>
        ) : (
          <>
            <div className="inv-row inv-row--head" aria-hidden="true">
              <span />
              <span>Nama obat</span>
              <span>Stok</span>
              <span>Lokasi</span>
              <span>Kedaluwarsa</span>
              <span>Aksi</span>
            </div>
            {paged.map((m) => {
              const low = lowOf(m);
              const exp = expiryWarningOf(m);
              const pc = Math.max(4, Math.min(100, Math.round(((m.stock ?? 0) / Math.max(1, (m.min_stock ?? 5) * 3)) * 100)));
              return (
                <div className="inv-row" key={m.id}>
                  <span className="inv-row__ico">
                    <Pill className="ico" />
                  </span>
                  <div className="inv-row__name">
                    <button
                      type="button"
                      className="cellname"
                      onClick={() => openDetail(m)}
                      title="Lihat detail, batch, dan riwayat stok"
                    >
                      <b>{m.name}</b>
                      <small>{m.dosage || 'Dosis belum diisi'}</small>
                    </button>
                    <span className="muted text-xs">{m.category ?? '-'}</span>
                  </div>
                  <div className="inv-row__stock">
                    <div className="inv-row__stockval">
                      <b>{m.stock}</b> {m.unit}
                      {low && <span className="badge badge--bad" style={{ marginLeft: 6 }}>Menipis</span>}
                    </div>
                    <div className="meter">
                      <i
                        style={{
                          width: `${pc}%`,
                          background: low
                            ? 'linear-gradient(90deg, #FF7E93, #E5384F)'
                            : 'linear-gradient(90deg, #5BDBA4, #1F9A64)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="inv-row__loc">{m.location ?? '-'}</div>
                  <div className={`inv-row__exp${exp ? ' is-warn' : ''}`}>
                    {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('id-ID') : '—'}
                    {exp && (
                      <span>
                        {Math.ceil((new Date(m.expiry_date as string).getTime() - now) / (24 * 60 * 60 * 1000)) < 0
                          ? 'Sudah kedaluwarsa'
                          : `${Math.max(1, Math.ceil((new Date(m.expiry_date as string).getTime() - now) / (24 * 60 * 60 * 1000)))} hari lagi`}
                      </span>
                    )}
                  </div>
                  <div className="inv-row__actions">
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => addStock(m.id, 1)}>
                      <TrendingUp className="ico" /> +1
                    </button>
                    <button
                      type="button"
                      className="ibtn"
                      onClick={() => openAdjust(m)}
                      aria-label={`Koreksi stok ${m.name}`}
                      title="Koreksi stok"
                    >
                      <SlidersHorizontal className="ico" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      className="ibtn"
                      onClick={() => openEdit(m)}
                      aria-label={`Edit ${m.name}`}
                      title="Edit obat"
                    >
                      <Pencil className="ico" strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      className="ibtn"
                      onClick={() => removeMedicine(m)}
                      aria-label={`Hapus ${m.name}`}
                      title="Hapus obat"
                      style={{ color: 'var(--bad)' }}
                    >
                      <Trash2 className="ico" strokeWidth={1.7} />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <Pager page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} unit="obat" />

      {/* Detail obat: batch + riwayat stok */}
      {detail && (
        <ModalPortal>
          <div className="overlay" onClick={() => setDetail(null)}>
            <div
              className="sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Detail ${detail.name}`}
            >
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">{detail.name}</div>
                  <div className="sheet__sub">
                    {detail.category || 'Tanpa kategori'} · {detail.unit ?? 'pcs'}
                    {detail.location ? ` · ${detail.location}` : ''}
                  </div>
                </div>
                <button type="button" className="ibtn" onClick={() => setDetail(null)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>

              <div className="sheet__body">
                <div className="detail-grid">
                  <div>
                    <span className="detail-grid__label">Stok saat ini</span>
                    <b>{detail.stock ?? 0}</b>
                  </div>
                  <div>
                    <span className="detail-grid__label">Stok minimum</span>
                    <b>{detail.min_stock ?? 5}</b>
                  </div>
                  <div>
                    <span className="detail-grid__label">Kedaluwarsa</span>
                    <b>
                      {detail.expiry_date
                        ? new Date(detail.expiry_date).toLocaleDateString('id-ID')
                        : '—'}
                    </b>
                  </div>
                </div>

                <div className="detail-block">
                  <span className="detail-grid__label">Dosis / aturan pakai</span>
                  <p>{detail.dosage || 'Belum diisi.'}</p>
                </div>

                <div className="detail-block">
                  <span className="detail-grid__label">Sisa batch (FIFO)</span>
                  {detailLoading ? (
                    <p className="muted">Memuat batch…</p>
                  ) : detailBatches.length === 0 ? (
                    <p className="muted">Belum ada batch tercatat untuk obat ini.</p>
                  ) : (
                    <div className="stocklog">
                      {detailBatches.map((batch) => {
                        const state = expiryState(batch.expiry_date, now);
                        return (
                          <div className="stocklog__row" key={batch.id}>
                            <span
                              className={
                                state === 'expired' || state === 'expiring'
                                  ? 'stocklog__type is-out'
                                  : 'stocklog__type is-in'
                              }
                            >
                              {state === 'expired'
                                ? 'LEWAT'
                                : state === 'expiring'
                                  ? 'SEGERA'
                                  : 'BATCH'}
                            </span>
                            <span className="stocklog__notes">
                              {batch.expiry_date
                                ? `Kedaluwarsa ${new Date(batch.expiry_date).toLocaleDateString('id-ID')}`
                                : 'Tanpa tanggal kedaluwarsa'}
                              {batch.batch_no ? ` · ${batch.batch_no}` : ''}
                            </span>
                            <span className="stocklog__qty">
                              {batch.qty} {detail.unit ?? ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="detail-block">
                  <span className="detail-grid__label">Riwayat pergerakan stok</span>
                  {detailLoading ? (
                    <p className="muted">Memuat riwayat…</p>
                  ) : detailLogs.length === 0 ? (
                    <p className="muted">Belum ada riwayat stok.</p>
                  ) : (
                    <div className="stocklog" style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {detailLogs.map((log) => (
                        <div className="stocklog__row" key={log.id}>
                          <span className={`stocklog__type ${log.type === 'in' ? 'is-in' : 'is-out'}`}>
                            {log.type === 'in' ? 'MASUK' : 'KELUAR'}
                          </span>
                          <span className="stocklog__notes">
                            {log.notes || '—'}
                            <br />
                            <span className="stocklog__date">
                              {log.created_at
                                ? new Date(log.created_at).toLocaleString('id-ID', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })
                                : ''}
                            </span>
                          </span>
                          <span className="stocklog__qty">
                            {log.type === 'in' ? '+' : '−'}
                            {log.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sheet__foot" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => openAdjust(detail)}
                >
                  <SlidersHorizontal className="ico" /> Koreksi stok
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      void addStock(detail.id, 1);
                      setDetail(null);
                    }}
                  >
                    <TrendingUp className="ico" /> +1 Stok
                  </button>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => openEdit(detail)}>
                    <Pencil className="ico" /> Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Koreksi stok */}
      {adjust && (
        <ModalPortal>
          <div className="overlay" onClick={() => setAdjust(null)}>
            <form
              className="sheet"
              style={{ maxWidth: 480 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                void saveAdjust();
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Koreksi stok"
            >
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">Koreksi Stok</div>
                  <div className="sheet__sub">{adjust.name}</div>
                </div>
                <button type="button" className="ibtn" onClick={() => setAdjust(null)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>

              <div className="sheet__body">
                <div className="note">
                  <Pill className="ico" />
                  <div>
                    Pakai untuk stok opname, obat rusak, hilang, atau membuang obat kedaluwarsa. Setiap koreksi
                    tercatat di riwayat stok dan log aktivitas.
                  </div>
                </div>

                <div className="sheet__grid">
                  <div className="field">
                    <label className="field__label">Stok saat ini</label>
                    <input className="input" value={adjust.stock ?? 0} readOnly disabled />
                  </div>
                  <div className="field">
                    <label className="field__label">Stok baru</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={adjustForm.stock}
                      onChange={(e) => setAdjustForm({ ...adjustForm, stock: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="field field--wide">
                    <label className="field__label">Alasan</label>
                    <select
                      className="input"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    >
                      {ADJUST_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field field--wide">
                    <label className="field__label">Catatan (opsional)</label>
                    <input
                      className="input"
                      value={adjustForm.note}
                      onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                      placeholder="cth. 3 strip kedaluwarsa Januari dibuang"
                    />
                  </div>
                </div>

                <div className="note note--ok">
                  <SlidersHorizontal className="ico" />
                  <div>
                    {adjustDelta === 0
                      ? 'Stok tidak berubah.'
                      : adjustDelta > 0
                        ? `Stok akan bertambah ${adjustDelta} ${adjust.unit ?? ''}.`
                        : `Stok akan berkurang ${Math.abs(adjustDelta)} ${adjust.unit ?? ''}.`}
                  </div>
                </div>
              </div>

              <div className="sheet__foot">
                <button type="button" className="btn btn--ghost" onClick={() => setAdjust(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn--primary" disabled={adjusting}>
                  <Save className="ico" /> {adjusting ? 'Menyimpan…' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Tambah / edit obat */}
      {open && (
        <ModalPortal>
          <div className="overlay" onClick={() => setOpen(false)}>
            <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? 'Edit obat' : 'Tambah obat'}>
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">{editing ? 'Edit Obat' : 'Tambah Obat Baru'}</div>
                  <div className="sheet__sub">
                    {editing ? 'Ubah data obat. Stok diubah lewat Koreksi stok.' : 'Lengkapi data obat dan stok awal.'}
                  </div>
                </div>
                <button type="button" className="ibtn" onClick={() => setOpen(false)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>
              <div className="sheet__body">
                <div className="sheet__grid">
                  <div className="field">
                    <label className="field__label">Nama Obat</label>
                    <input className="input" style={{ borderRadius: 12 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paracetamol" />
                  </div>
                  <div className="field">
                    <label className="field__label">Kategori</label>
                    <input className="input" style={{ borderRadius: 12 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Analgesik" />
                  </div>
                  <div className="field">
                    <label className="field__label">Satuan</label>
                    <select className="input" style={{ borderRadius: 12 }} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as MedicineUnit })}>
                      <option value="strip">Strip</option>
                      <option value="botol">Botol</option>
                      <option value="pcs">Pcs</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field__label">{editing ? 'Stok saat ini' : 'Stok Awal'}</label>
                    <input
                      className="input"
                      style={{ borderRadius: 12 }}
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      disabled={Boolean(editing)}
                      title={editing ? 'Gunakan Koreksi stok untuk mengubah stok' : undefined}
                    />
                    {editing && <span className="field__hint">Ubah lewat tombol Koreksi stok.</span>}
                  </div>
                  <div className="field">
                    <label className="field__label">Stok Minimum</label>
                    <input className="input" style={{ borderRadius: 12 }} type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="field__label">Lokasi</label>
                    <input className="input" style={{ borderRadius: 12 }} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Rak A1" />
                  </div>
                  <div className="field">
                    <label className="field__label">Tanggal Kedaluwarsa</label>
                    <input className="input" style={{ borderRadius: 12 }} type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                  </div>
                  <div className="field field--wide">
                    <label className="field__label">Dosis / aturan pakai</label>
                    <input
                      className="input"
                      style={{ borderRadius: 12 }}
                      value={form.dosage}
                      onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                      placeholder="cth. 3 x 1 tablet setelah makan"
                      disabled={!hasDosage}
                    />
                    <span className="field__hint">
                      {hasDosage
                        ? 'Dicetak/ditampilkan saat obat diberikan.'
                        : 'Jalankan migrasi 010 untuk mengaktifkan kolom dosis.'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="sheet__foot">
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Batal</button>
                <button type="button" className="btn btn--primary" onClick={saveMedicine} disabled={!form.name || saving}>
                  <Save className="ico" /> {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Impor CSV */}
      {importOpen && (
        <ModalPortal>
          <div className="overlay" onClick={() => setImportOpen(false)}>
            <div
              className="sheet"
              style={{ maxWidth: 620 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Impor obat dari CSV"
            >
              <div className="sheet__head">
                <div>
                  <div className="sheet__title">Impor Obat dari CSV</div>
                  <div className="sheet__sub">Obat dengan nama yang sudah ada akan dilewati.</div>
                </div>
                <button type="button" className="ibtn" onClick={() => setImportOpen(false)} aria-label="Tutup">
                  <X className="ico" />
                </button>
              </div>

              <div className="sheet__body">
                <div className="importdrop">
                  <Upload className="ico" style={{ width: 22, height: 22, color: 'var(--primary-ink)' }} />
                  <b>Pilih berkas CSV</b>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="muted text-xs">
                    Kolom: Nama, Kategori, Satuan, Stok, Stok Minimum, Lokasi, Kedaluwarsa, Dosis
                  </span>
                  {importName && <span className="muted text-xs">Berkas: {importName}</span>}
                </div>

                {importError && (
                  <div className="note note--bad">
                    <AlertTriangle className="ico" />
                    <div>{importError}</div>
                  </div>
                )}

                {importRows.length > 0 && (
                  <>
                    <div className="note note--ok">
                      <Package className="ico" />
                      <div>
                        <b>{importRows.length} obat</b> siap diimpor
                        {importSkipped > 0 ? `, ${importSkipped} dilewati karena namanya sudah ada` : ''}.
                      </div>
                    </div>

                    <div className="table-wrap">
                      <table className="importpreview">
                        <thead>
                          <tr>
                            <th>Nama</th>
                            <th>Satuan</th>
                            <th>Stok</th>
                            <th>Kedaluwarsa</th>
                            <th>Dosis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importRows.slice(0, 5).map((row) => (
                            <tr key={row.name}>
                              <td>{row.name}</td>
                              <td>{row.unit}</td>
                              <td>{row.stock}</td>
                              <td>{row.expiry_date || '—'}</td>
                              <td>{row.dosage || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importRows.length > 5 && (
                      <span className="muted text-xs">+{importRows.length - 5} baris lainnya</span>
                    )}
                  </>
                )}
              </div>

              <div className="sheet__foot" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={downloadTemplate}>
                  <Download className="ico" /> Unduh template
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn--ghost" onClick={() => setImportOpen(false)}>
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={runImport}
                    disabled={importRows.length === 0 || importing}
                  >
                    {importing ? <Loader2 className="ico" /> : <Upload className="ico" />}
                    {importing ? 'Mengimpor…' : `Impor ${importRows.length || ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </AppShell>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryPageInner />
    </Suspense>
  );
}
