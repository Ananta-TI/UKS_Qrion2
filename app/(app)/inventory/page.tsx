'use client';

import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { AppShell } from '@/components/layout/app-shell';
import { CountUp } from '@/components/ui/count-up';
import { useToast } from '@/components/ui/toast';
import { fetchAllRows } from '@/lib/supabase/paginate';
import {
  isExpiryWarning,
  isLowStock,
  isMissingTable,
} from '@/lib/stock';
import type {
  MedicineRow,
  MedicineUnit,
  RestockResult,
  StockOpnameResult,
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
  ClipboardCheck,
} from 'lucide-react';

type Filter = 'all' | 'low' | 'expiring';

/** Modal dirender di body agar tidak terkurung ancestor ber-overflow/transform. */
function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

function InventoryPageInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
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
  });

  // Stok opname: sesuaikan stok ke hasil hitung fisik.
  const [opnameFor, setOpnameFor] = useState<MedicineRow | null>(null);
  const [opnameQty, setOpnameQty] = useState('');
  const [opnameNote, setOpnameNote] = useState('');
  const [opnameSaving, setOpnameSaving] = useState(false);

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

  const lowOf = (m: MedicineRow) => isLowStock(m.stock, m.min_stock);
  const expiryWarningOf = (m: MedicineRow) => isExpiryWarning(m.expiry_date, now);

  const lowStock = medicines.filter(lowOf).length;
  const expiring = medicines.filter(expiryWarningOf).length;

  const filtered = medicines.filter((m) => {
    const matchQ =
      !query ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      (m.category ?? '').toLowerCase().includes(query.toLowerCase());
    const matchF =
      filter === 'all' ||
      (filter === 'low' && lowOf(m)) ||
      (filter === 'expiring' && expiryWarningOf(m));
    return matchQ && matchF;
  });

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

  function openOpname(m: MedicineRow) {
    setOpnameFor(m);
    setOpnameQty(String(m.stock ?? 0));
    setOpnameNote('');
  }

  async function saveOpname() {
    if (!opnameFor) return;

    const counted = parseInt(opnameQty, 10);
    if (Number.isNaN(counted) || counted < 0) {
      toast.error('Jumlah hasil hitung tidak valid.', 'Opname Gagal');
      return;
    }

    setOpnameSaving(true);
    const before = opnameFor.stock ?? 0;
    let diff = counted - before;

    // Jalur utama: RPC yang juga menyesuaikan batch secara FIFO.
    const { data, error } = await supabase.rpc('apply_stock_opname', {
      p_medicine: opnameFor.id,
      p_counted: counted,
      p_note: opnameNote.trim() || null,
    });

    if (error) {
      // Fallback bila RPC belum dimigrasi.
      const { error: updateError } = await supabase
        .from('medicines')
        .update({ stock: counted })
        .eq('id', opnameFor.id);

      if (updateError) {
        setOpnameSaving(false);
        toast.error(`Gagal menyimpan opname: ${updateError.message}`, 'Opname Gagal');
        return;
      }

      if (diff !== 0) {
        await supabase.from('medicine_logs').insert({
          medicine_id: opnameFor.id,
          type: diff > 0 ? 'in' : 'out',
          qty: Math.abs(diff),
          notes: opnameNote.trim() || 'Penyesuaian stok opname',
        });
      }
    } else {
      const result = data as unknown as StockOpnameResult;
      if (result && result.ok === false) {
        setOpnameSaving(false);
        toast.error('Opname ditolak server (data tidak ditemukan).', 'Opname Gagal');
        return;
      }
      diff = result?.diff ?? diff;
    }

    await logClientActivity({
      action: 'update',
      entity: 'medicine',
      entityId: opnameFor.id,
      summary: `Stok opname ${opnameFor.name}: ${before} → ${counted}`,
      metadata: { stock_before: before, stock_after: counted, diff },
    });

    setOpnameSaving(false);
    setOpnameFor(null);
    toast.success(
      diff === 0
        ? `Stok ${opnameFor.name} sudah sesuai hasil hitung.`
        : `Stok ${opnameFor.name} disesuaikan (${diff > 0 ? '+' : ''}${diff}).`,
      'Opname Selesai'
    );
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
  };

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(m: MedicineRow) {
    setEditing(m);
    setForm({
      name: m.name ?? '',
      category: m.category ?? '',
      unit: (m.unit ?? 'pcs') as MedicineUnit,
      stock: String(m.stock ?? 0),
      min_stock: String(m.min_stock ?? 5),
      location: m.location ?? '',
      expiry_date: m.expiry_date ?? '',
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
    };

    if (editing) {
      const before = editing.stock ?? 0;

      // Perubahan selain stok.
      const { error } = await supabase.from('medicines').update(fields).eq('id', editing.id);
      if (error) {
        setSaving(false);
        toast.error(`Gagal menyimpan perubahan: ${error.message}`, 'Obat Gagal Disimpan');
        return;
      }

      // Perubahan stok dirutekan lewat RPC opname agar batch + log ikut terjaga.
      if (stock !== before) {
        const { data, error: opError } = await supabase.rpc('apply_stock_opname', {
          p_medicine: editing.id,
          p_counted: stock,
          p_note: 'Penyesuaian via edit obat',
        });

        if (opError) {
          // Fallback bila RPC belum dimigrasi.
          const { error: updError } = await supabase
            .from('medicines')
            .update({ stock })
            .eq('id', editing.id);
          if (updError) {
            setSaving(false);
            toast.error(`Gagal menyesuaikan stok: ${updError.message}`, 'Obat Gagal Disimpan');
            return;
          }
          const diff = stock - before;
          if (diff !== 0) {
            const { error: logError } = await supabase.from('medicine_logs').insert({
              medicine_id: editing.id,
              type: diff > 0 ? 'in' : 'out',
              qty: Math.abs(diff),
              notes: 'Penyesuaian via edit obat',
            });
            if (logError && !isMissingTable(logError)) {
              toast.error('Stok disesuaikan, tetapi riwayat stok gagal dicatat.', 'Peringatan');
            }
          }
        } else {
          const result = data as StockOpnameResult | null;
          if (result && result.ok === false) {
            setSaving(false);
            toast.error('Stok ditolak server. Muat ulang lalu coba lagi.', 'Obat Gagal Disimpan');
            load();
            return;
          }
        }
      }

      setSaving(false);
      await logClientActivity({
        action: 'update',
        entity: 'medicine',
        entityId: editing.id,
        summary: `Mengubah data obat ${name}`,
        metadata: { stock_before: before, stock_after: stock },
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
    load();
  }

  const opnameCounted = parseInt(opnameQty, 10);
  const opnameDiff = opnameFor
    ? Number.isNaN(opnameCounted)
      ? 0
      : opnameCounted - (opnameFor.stock ?? 0)
    : 0;

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
      <section className="kpis">
        <div className="stat stat--dark">
          <div className="stat__label"><span className="stat__ico"><Package className="ico" /></span>Jenis Obat</div>
          <div className="stat__value"><CountUp value={medicines.length} /></div>
        </div>
        <div className="stat stat--accent">
          <div className="stat__label"><span className="stat__ico"><AlertTriangle className="ico" /></span>Stok Menipis</div>
          <div className="stat__value"><CountUp value={lowStock} /></div>
        </div>
        <div className="stat">
          <div className="stat__label"><span className="stat__ico"><Clock className="ico" /></span>Kedaluwarsa / ≤ 30 hari</div>
          <div className="stat__value"><CountUp value={expiring} /></div>
        </div>
      </section>

      <div className="card">
        <div className="toolbar">
          <div className="search" style={{ maxWidth: 340, flex: 1 }}>
            <Search className="ico" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari obat atau kategori…"
              aria-label="Cari obat"
            />
          </div>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              Semua <b>{medicines.length}</b>
            </button>
            <button type="button" className="chip" aria-pressed={filter === 'low'} onClick={() => setFilter('low')}>
              Menipis <b>{lowStock}</b>
            </button>
            <button type="button" className="chip" aria-pressed={filter === 'expiring'} onClick={() => setFilter('expiring')}>
              Kedaluwarsa <b>{expiring}</b>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty"><Package className="ico" /><div className="empty__title">Memuat inventaris…</div></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama Obat</th>
                  <th>Kategori</th>
                  <th className="r">Stok</th>
                  <th>Satuan</th>
                  <th>Lokasi</th>
                  <th>Kedaluwarsa</th>
                  <th className="r">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">
                        <Package className="ico" />
                        <div className="empty__title">Tidak ada obat</div>
                        <div className="empty__text">Ubah filter atau tambahkan obat baru.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const low = lowOf(m);
                    const exp = expiryWarningOf(m);
                    return (
                      <tr key={m.id}>
                        <td><b>{m.name}</b></td>
                        <td className="muted">{m.category ?? '-'}</td>
                        <td className="r">
                          <span className={low ? 'badge badge--bad' : 'badge badge--plain'}>{m.stock}</span>
                        </td>
                        <td className="muted">{m.unit}</td>
                        <td className="muted">{m.location ?? '-'}</td>
                        <td>
                          {m.expiry_date ? (
                            <span style={{ color: exp ? 'var(--bad)' : 'var(--muted)', fontWeight: exp ? 700 : 500 }}>
                              {new Date(m.expiry_date).toLocaleDateString('id-ID')}
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td className="r">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" className="btn btn--ghost btn--xs" onClick={() => addStock(m.id, 1)}>
                              <TrendingUp className="ico" /> +1 Stok
                            </button>
                            <button
                              type="button"
                              className="ibtn"
                              onClick={() => openOpname(m)}
                              aria-label={`Stok opname ${m.name}`}
                              title="Stok opname"
                            >
                              <ClipboardCheck className="ico" strokeWidth={1.7} />
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

      {open && (
        <ModalPortal>
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? 'Edit obat' : 'Tambah obat'}>
            <div className="sheet__head">
              <div>
                <div className="sheet__title">{editing ? 'Edit Obat' : 'Tambah Obat Baru'}</div>
                <div className="sheet__sub">
                  {editing ? 'Ubah data obat atau stok saat ini.' : 'Lengkapi data obat dan stok awal.'}
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
                  <label className="field__label">Stok Awal</label>
                  <input className="input" style={{ borderRadius: 12 }} type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field__label">Stok Minimum</label>
                  <input className="input" style={{ borderRadius: 12 }} type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field__label">Lokasi</label>
                  <input className="input" style={{ borderRadius: 12 }} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Rak A1" />
                </div>
                <div className="field field--wide">
                  <label className="field__label">Tanggal Kedaluwarsa</label>
                  <input className="input" style={{ borderRadius: 12 }} type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
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

      {opnameFor && (
        <ModalPortal>
        <div className="overlay" onClick={() => setOpnameFor(null)}>
          <div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Stok opname"
          >
            <div className="sheet__head">
              <div>
                <div className="sheet__title">Stok Opname</div>
                <div className="sheet__sub">Sesuaikan stok {opnameFor.name} dengan hasil hitung fisik.</div>
              </div>
              <button type="button" className="ibtn" onClick={() => setOpnameFor(null)} aria-label="Tutup">
                <X className="ico" />
              </button>
            </div>
            <div className="sheet__body">
              <div className="note">
                <ClipboardCheck className="ico" />
                <div>
                  Stok tercatat: <b>{opnameFor.stock ?? 0} {opnameFor.unit ?? ''}</b>. Masukkan jumlah hasil hitung.
                </div>
              </div>

              <div className="sheet__grid">
                <div className="field">
                  <label className="field__label">Hasil hitung</label>
                  <input
                    className="input"
                    style={{ borderRadius: 12 }}
                    type="number"
                    min={0}
                    value={opnameQty}
                    onChange={(e) => setOpnameQty(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Selisih</label>
                  <div
                    className="input"
                    style={{ borderRadius: 12, display: 'flex', alignItems: 'center' }}
                  >
                    <b style={{ color: opnameDiff === 0 ? 'var(--muted)' : opnameDiff > 0 ? 'var(--good)' : 'var(--bad)' }}>
                      {opnameDiff === 0 ? 'Sesuai' : `${opnameDiff > 0 ? '+' : ''}${opnameDiff}`}
                    </b>
                  </div>
                </div>
              </div>

              <div className="field field--wide">
                <label className="field__label">Catatan</label>
                <input
                  className="input"
                  style={{ borderRadius: 12 }}
                  value={opnameNote}
                  onChange={(e) => setOpnameNote(e.target.value)}
                  placeholder="cth. hasil hitung akhir bulan"
                />
              </div>
            </div>
            <div className="sheet__foot">
              <button type="button" className="btn btn--ghost" onClick={() => setOpnameFor(null)}>Batal</button>
              <button type="button" className="btn btn--primary" onClick={saveOpname} disabled={opnameSaving}>
                <Save className="ico" /> {opnameSaving ? 'Menyimpan…' : 'Simpan Opname'}
              </button>
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
