'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppShell } from '@/components/layout/app-shell';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  X,
  Save,
  TrendingUp,
} from 'lucide-react';

type Filter = 'all' | 'low' | 'expiring';

export default function InventoryPage() {
  const supabase = createClient();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: 'pcs' as 'strip' | 'botol' | 'pcs',
    stock: '',
    min_stock: '5',
    location: '',
    expiry_date: '',
  });

  async function load() {
    const { data } = await supabase.from('medicines').select('*').order('name', { ascending: true });
    setMedicines(data ?? []);
    setNow(Date.now());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowOf = (m: any) => (m.stock ?? 0) <= (m.min_stock ?? 5);
  const expiringOf = (m: any) => {
    if (!m.expiry_date) return false;
    const diff = new Date(m.expiry_date).getTime() - now;
    return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  };

  const lowStock = medicines.filter(lowOf).length;
  const expiring = medicines.filter(expiringOf).length;

  const filtered = medicines.filter((m) => {
    const matchQ =
      !query ||
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      (m.category ?? '').toLowerCase().includes(query.toLowerCase());
    const matchF = filter === 'all' || (filter === 'low' && lowOf(m)) || (filter === 'expiring' && expiringOf(m));
    return matchQ && matchF;
  });

  async function addStock(id: string, qty: number) {
    const m = medicines.find((x) => x.id === id);
    await supabase.from('medicines').update({ stock: (m?.stock ?? 0) + qty }).eq('id', id);
    await supabase.from('medicine_logs').insert({ medicine_id: id, type: 'in', qty, notes: 'Restok' });
    load();
  }

  async function createMedicine() {
    if (!form.name) return;
    setSaving(true);
    await supabase.from('medicines').insert({
      name: form.name,
      category: form.category || null,
      unit: form.unit,
      stock: parseInt(form.stock || '0', 10),
      min_stock: parseInt(form.min_stock || '5', 10),
      location: form.location || null,
      expiry_date: form.expiry_date || null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: '', category: '', unit: 'pcs', stock: '', min_stock: '5', location: '', expiry_date: '' });
    load();
  }

  return (
    <AppShell
      title="Inventaris Obat"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Inventaris' }]}
      actions={
        <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
          <Plus className="ico" /> Tambah Obat
        </button>
      }
    >
      <section className="kpis">
        <div className="stat stat--dark">
          <div className="stat__label"><span className="stat__ico"><Package className="ico" /></span>Jenis Obat</div>
          <div className="stat__value">{medicines.length}</div>
        </div>
        <div className="stat stat--accent">
          <div className="stat__label"><span className="stat__ico"><AlertTriangle className="ico" /></span>Stok Menipis</div>
          <div className="stat__value">{lowStock}</div>
        </div>
        <div className="stat">
          <div className="stat__label"><span className="stat__ico"><Clock className="ico" /></span>Kedaluwarsa ≤ 30 hari</div>
          <div className="stat__value">{expiring}</div>
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
                    const exp = expiringOf(m);
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
                          <button type="button" className="btn btn--ghost btn--xs" onClick={() => addStock(m.id, 1)}>
                            <TrendingUp className="ico" /> +1 Stok
                          </button>
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
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Tambah obat">
            <div className="sheet__head">
              <div>
                <div className="sheet__title">Tambah Obat Baru</div>
                <div className="sheet__sub">Lengkapi data obat dan stok awal.</div>
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
                  <select className="input" style={{ borderRadius: 12 }} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as any })}>
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
              <button type="button" className="btn btn--primary" onClick={createMedicine} disabled={!form.name || saving}>
                <Save className="ico" /> {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
