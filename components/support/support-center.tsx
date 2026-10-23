'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CountUp } from '@/components/ui/count-up';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  Keyboard,
  LifeBuoy,
  Mail,
  Package,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

type CategoryId = 'siswa' | 'kunjungan' | 'inventaris' | 'laporan' | 'akun' | 'sekolah';

const categories = [
  { id: 'siswa', label: 'Siswa', desc: 'Kelola & cari data siswa', icon: Users },
  { id: 'kunjungan', label: 'Kunjungan', desc: 'Pemeriksaan & tindakan', icon: Stethoscope },
  { id: 'inventaris', label: 'Inventaris', desc: 'Stok obat & kedaluwarsa', icon: Package },
  { id: 'laporan', label: 'Laporan', desc: 'Statistik & export', icon: BarChart3 },
  { id: 'akun', label: 'Akun & Akses', desc: 'Login, password, tema', icon: ShieldCheck },
  { id: 'sekolah', label: 'Multi-sekolah', desc: 'Isolasi data & super admin', icon: Building2 },
] satisfies { id: CategoryId; label: string; desc: string; icon: typeof Users }[];

type Faq = {
  id: string;
  category: CategoryId;
  q: string;
  a: string;
  keywords?: string;
  popular?: boolean;
  links?: { label: string; href: string }[];
};

const faqs: Faq[] = [
  {
    id: 'catat-kunjungan',
    category: 'kunjungan',
    q: 'Bagaimana cara mencatat kunjungan baru?',
    a: 'Buka halaman Kunjungan lalu klik Catat, atau tekan tombol + pada dock. Pilih siswa, isi keluhan, suhu, tekanan darah, berat/tinggi, tindakan, dan status akhir, kemudian simpan. Nama obat yang ditulis di tindakan akan mengurangi stok secara otomatis.',
    keywords: 'tambah baru form pemeriksaan',
    popular: true,
    links: [
      { label: 'Catat kunjungan', href: '/visits/new' },
      { label: 'Lihat kunjungan', href: '/visits' },
    ],
  },
  {
    id: 'cari-siswa',
    category: 'siswa',
    q: 'Bagaimana mencari siswa dengan cepat?',
    a: 'Gunakan halaman Siswa dan ketik nama atau NIS, atau tekan Ctrl/Cmd + K dari halaman mana pun. Ketik minimal 2 huruf, lalu pilih siswa untuk langsung membuka form kunjungan dengan data siswa terisi.',
    keywords: 'search command palette ctrl k nis',
    popular: true,
    links: [{ label: 'Buka data siswa', href: '/students' }],
  },
  {
    id: 'restock',
    category: 'inventaris',
    q: 'Bagaimana menambah atau merestock obat?',
    a: 'Di halaman Inventaris, klik Tambah Obat untuk menambah item baru. Untuk menambah stok, gunakan tombol +1 pada baris obat. Stok di bawah batas minimum ditandai merah, dan obat yang kedaluwarsa dalam 30 hari ditandai kuning.',
    keywords: 'stok restok obat expired kadaluarsa minimum',
    popular: true,
    links: [{ label: 'Buka inventaris', href: '/inventory' }],
  },
  {
    id: 'export',
    category: 'laporan',
    q: 'Bagaimana mengunduh laporan?',
    a: 'Buka halaman Laporan, pilih rentang tanggal yang diinginkan, lalu klik Export PDF atau Export Excel. Berkas akan langsung diunduh sesuai filter yang sedang aktif.',
    keywords: 'unduh pdf excel download rekap',
    popular: true,
    links: [{ label: 'Buka laporan', href: '/reports' }],
  },
  {
    id: 'status-akhir',
    category: 'kunjungan',
    q: 'Apa arti status akhir kunjungan?',
    a: 'Kembali ke Kelas berarti siswa sudah bisa melanjutkan pembelajaran. Dijemput Orang Tua berarti siswa dipulangkan. Dirujuk ke Faskes/RS berarti siswa perlu penanganan lanjutan di fasilitas kesehatan.',
    keywords: 'back to class referred picked up rujukan pulang',
  },
  {
    id: 'tema',
    category: 'akun',
    q: 'Bagaimana mengganti tema terang atau gelap?',
    a: 'Klik ikon Tema pada dock. Pilihan tema disimpan di browser perangkat ini, jadi tidak mengubah tampilan pengguna lain.',
    keywords: 'dark mode gelap terang tampilan',
  },
  {
    id: 'lupa-password',
    category: 'akun',
    q: 'Lupa password atau butuh akun baru?',
    a: 'Hubungi admin sekolah Anda. Admin sekolah dapat meminta reset password kepada tim Qrion, yang dapat memperbaruinya dari halaman detail sekolah di panel super admin.',
    keywords: 'reset login akun akses',
  },
  {
    id: 'tambah-siswa',
    category: 'siswa',
    q: 'Bagaimana menambah, mengubah, atau menghapus siswa?',
    a: 'Buka halaman Siswa lalu klik Tambah Siswa. Gunakan ikon pensil untuk mengubah data dan ikon tempat sampah untuk menghapus. Menghapus siswa juga menghapus seluruh riwayat kunjungannya, jadi pastikan data sudah benar.',
    keywords: 'tambah edit ubah hapus crud murid',
    links: [{ label: 'Kelola data siswa', href: '/students' }],
  },
  {
    id: 'isolasi-data',
    category: 'sekolah',
    q: 'Apakah data sekolah lain bisa terlihat?',
    a: 'Tidak. Setiap akun terikat pada satu sekolah, dan aturan keamanan database hanya menampilkan data milik sekolah tersebut. Hanya super admin Qrion yang dapat melihat data seluruh sekolah.',
    keywords: 'privasi rls keamanan tenant',
  },
  {
    id: 'login-sekolah',
    category: 'sekolah',
    q: 'Bagaimana super admin login sebagai sekolah?',
    a: 'Di panel super admin, klik Login pada baris sekolah. Sesi akan berganti menjadi akun sekolah tersebut. Untuk kembali ke panel super admin, klik Keluar lalu masuk lagi dengan akun Qrion.',
    keywords: 'impersonate impersonasi super admin',
  },
];

const popularQueries = ['catat kunjungan', 'cari siswa', 'stok obat', 'export laporan'];

const categoryLabel = (id: CategoryId) => categories.find((c) => c.id === id)?.label ?? '';

export function SupportCenter({
  firstName,
  schoolName,
  adminEmail,
}: {
  firstName: string;
  schoolName: string;
  adminEmail: string | null;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);

  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const activeCategory = categories.find((c) => c.id === category) ?? null;

  const filtered = faqs.filter((f) => {
    if (category && f.category !== category) return false;
    if (!terms.length) return true;
    const haystack = `${f.q} ${f.a} ${f.keywords ?? ''} ${categoryLabel(f.category)}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  const hasFilter = Boolean(q || category);

  function reset() {
    setQuery('');
    setCategory(null);
  }

  function pickCategory(id: CategoryId) {
    setCategory((prev) => (prev === id ? null : id));
  }

  function pickQuery(value: string) {
    setCategory(null);
    setQuery(value);
  }

  return (
    <>
      <section className="help__hero">
        <div className="card help__intro">
          <span className="spill spill--iris help__eyebrow">
            <i /> Pusat Bantuan UKS
          </span>
          <h2 className="help__title">Ada yang bisa kami bantu, {firstName}?</h2>
          <p className="muted help__lead">
            Panduan singkat seputar siswa, kunjungan, stok obat, laporan, dan akses akun.
          </p>

          <div className="search help__search">
            <Search className="ico" strokeWidth={1.7} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari panduan… (mis. catat kunjungan, stok obat)"
              aria-label="Cari panduan"
            />
            {query && (
              <button type="button" className="help__clear" onClick={() => setQuery('')} aria-label="Bersihkan pencarian">
                <X className="ico" strokeWidth={1.9} />
              </button>
            )}
          </div>

          <div className="chips help__chips">
            <span className="help__chips-label">Populer</span>
            {popularQueries.map((p) => (
              <button key={p} type="button" className="chip" onClick={() => pickQuery(p)}>
                {p}
              </button>
            ))}
          </div>

          <div className="help__metrics">
            <div>
              <b><CountUp value={filtered.length} /></b>
              <small>panduan cocok</small>
            </div>
            <div>
              <b><CountUp value={categories.length} /></b>
              <small>kategori</small>
            </div>
            <div>
              <b><CountUp value={faqs.length} /></b>
              <small>total panduan</small>
            </div>
          </div>
        </div>

        <aside className="card help__popular">
          <div className="card__head">
            <h2 className="card__title">
              <LifeBuoy className="ico" /> Panduan Populer
            </h2>
          </div>

          <div className="help__plist">
            {faqs
              .filter((f) => f.popular)
              .map((f) => (
                <button key={f.id} type="button" className="help__pitem" onClick={() => pickQuery(f.q)}>
                  <span className="help__pico">
                    <BookOpen className="ico" strokeWidth={1.7} />
                  </span>
                  <span className="help__ptext">
                    <b>{f.q}</b>
                    <small>{categoryLabel(f.category)}</small>
                  </span>
                  <ArrowUpRight className="ico help__parrow" strokeWidth={1.8} />
                </button>
              ))}
          </div>

          <div className="note" style={{ marginTop: 14 }}>
            <LifeBuoy className="ico" />
            <div>Klik salah satu panduan untuk langsung melihat jawabannya.</div>
          </div>
        </aside>
      </section>

      <section className="help__cats" aria-label="Kategori bantuan">
        {categories.map((c) => {
          const Icon = c.icon;
          const count = faqs.filter((f) => f.category === c.id).length;
          const active = category === c.id;

          return (
            <button
              key={c.id}
              type="button"
              className={active ? 'help__cat is-active' : 'help__cat'}
              aria-pressed={active}
              onClick={() => pickCategory(c.id)}
            >
              <span className="help__cat-ico">
                <Icon className="ico" strokeWidth={1.7} />
              </span>
              <b>{c.label}</b>
              <small>{c.desc}</small>
              <span className="help__cat-count">{count} panduan</span>
            </button>
          );
        })}
      </section>

      <div className="help__cols">
        <div className="card" id="faq">
          <div className="card__head">
            <h2 className="card__title">
              <BookOpen className="ico" /> Panduan & Pertanyaan Umum
            </h2>
            {hasFilter ? (
              <button type="button" className="btn btn--ghost btn--xs" onClick={reset}>
                <X className="ico" /> Reset
              </button>
            ) : (
              <span className="spill spill--iris">
                <i /> {faqs.length} panduan
              </span>
            )}
          </div>

          {activeCategory && (
            <div className="help__filterbar">
              Kategori: <b>{activeCategory.label}</b>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="empty">
              <Search className="ico" />
              <div className="empty__title">Tidak ada panduan yang cocok</div>
              <div className="empty__text">Coba kata kunci lain atau reset filter untuk melihat semua panduan.</div>
              <button type="button" className="btn btn--soft btn--sm" onClick={reset}>
                Reset pencarian
              </button>
            </div>
          ) : (
            <div className="faqs">
              {filtered.map((f) => (
                <details key={f.id} className="faq">
                  <summary>
                    <span>{f.q}</span>
                    <ChevronDown className="ico faq__chev" strokeWidth={1.8} />
                  </summary>
                  <div className="faq__body">
                    <p>{f.a}</p>
                    {f.links && (
                      <div className="faq__links">
                        {f.links.map((l) => (
                          <Link key={l.href} href={l.href} className="btn btn--ghost btn--xs">
                            {l.label}
                            <ArrowUpRight className="ico" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="help__side-col">
          <div className="card">
            <div className="card__head">
              <h2 className="card__title">
                <LifeBuoy className="ico" /> Butuh Bantuan Langsung?
              </h2>
            </div>

            <div className="help__kv">
              <small>Sekolah</small>
              <b>{schoolName}</b>
            </div>
            <div className="help__kv">
              <small>Admin sekolah</small>
              <b>{adminEmail ?? 'Belum diatur'}</b>
            </div>

            {adminEmail && (
              <a href={`mailto:${adminEmail}`} className="btn btn--primary btn--sm w-full mt-4">
                <Mail className="ico" /> Email Admin Sekolah
              </a>
            )}

            <ol className="help__steps">
              <li>
                <b>Akun & password</b>
                <span>Admin sekolah dapat meminta reset password kepada tim Qrion.</span>
              </li>
              <li>
                <b>Data & sekolah baru</b>
                <span>Hubungi tim Qrion yang mengelola aplikasi UKS ini.</span>
              </li>
              <li>
                <b>Masalah teknis</b>
                <span>Sertakan tangkapan layar dan waktu kejadian agar cepat ditelusuri.</span>
              </li>
            </ol>
          </div>

          <div className="card">
            <div className="card__head">
              <h2 className="card__title">
                <Keyboard className="ico" /> Pintasan Cepat
              </h2>
            </div>

            <div className="help__keys">
              <div>
                <span>Buka pencarian</span>
                <span className="help__kbd">
                  <kbd>Ctrl</kbd>
                  <kbd>K</kbd>
                </span>
              </div>
              <div>
                <span>Catat kunjungan</span>
                <kbd>+</kbd>
              </div>
              <div>
                <span>Tutup dialog</span>
                <kbd>Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
