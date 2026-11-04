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
  { id: 'akun', label: 'Akun & Akses', desc: 'Login, password, akses', icon: ShieldCheck },
  { id: 'sekolah', label: 'Keamanan data', desc: 'Isolasi data sekolah', icon: Building2 },
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
    a: 'Buka halaman Kunjungan lalu klik Catat Kunjungan, atau dari kartu siswa di halaman Siswa klik Catat Kunjungan. Pilih siswa, isi keluhan, suhu, tekanan darah, berat/tinggi, tindakan, dan status akhir, kemudian simpan. Untuk obat, gunakan panel Obat Diberikan: cari obat dari inventaris, atur jumlahnya, dan stok akan berkurang otomatis.',
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
    q: 'Bagaimana mengelola data obat?',
    a: 'Di halaman Inventaris: klik Tambah Obat untuk item baru, ikon pensil untuk mengubah data, dan ikon tempat sampah untuk menghapus. Gunakan tombol +1 Stok untuk menambah stok dengan cepat. Stok pada atau di bawah batas minimum ditandai merah, begitu juga obat yang sudah kedaluwarsa atau akan kedaluwarsa dalam 30 hari.',
    keywords: 'stok restok obat expired kadaluarsa minimum',
    popular: true,
    links: [{ label: 'Buka inventaris', href: '/inventory' }],
  },
  {
    id: 'export',
    category: 'laporan',
    q: 'Bagaimana mengunduh laporan?',
    a: 'Buka halaman Laporan, pilih rentang tanggal yang diinginkan, lalu klik PDF atau Excel. Halaman Ringkasan juga menampilkan grafik pergerakan stok obat (masuk dan keluar). PDF memuat halaman khusus data obat, sedangkan Excel memuat lembar terpisah untuk kunjungan, inventaris obat, dan riwayat stok obat.',
    keywords: 'unduh pdf excel download rekap',
    popular: true,
    links: [{ label: 'Buka laporan', href: '/reports' }],
  },
  {
    id: 'status-akhir',
    category: 'kunjungan',
    q: 'Apa arti status akhir kunjungan?',
    a: 'Kembali ke kelas berarti siswa sudah bisa melanjutkan pembelajaran. Dijemput orang tua berarti siswa dipulangkan. Dirujuk ke faskes/RS berarti siswa perlu penanganan lanjutan di fasilitas kesehatan.',
    keywords: 'back to class referred picked up rujukan pulang',
  },
  {
    id: 'lupa-password',
    category: 'akun',
    q: 'Lupa password atau butuh akun baru?',
    a: 'Hubungi admin sekolah Anda. Admin sekolah dapat menghubungi tim Qrion untuk reset password atau pembuatan akun baru.',
    keywords: 'reset login akun akses',
  },
  {
    id: 'kelola-siswa',
    category: 'siswa',
    q: 'Bagaimana mengubah atau menghapus data siswa?',
    a: 'Buka halaman Siswa, lalu gunakan ikon pensil untuk mengubah data dan ikon tempat sampah untuk menghapus. Menghapus siswa juga menghapus seluruh riwayat kunjungannya, jadi pastikan data sudah benar.',
    keywords: 'edit ubah hapus crud murid',
    links: [{ label: 'Kelola data siswa', href: '/students' }],
  },
  {
    id: 'ekspor-csv',
    category: 'siswa',
    q: 'Bagaimana mengekspor data siswa?',
    a: 'Di halaman Siswa klik Ekspor CSV untuk mengunduh seluruh data siswa sebagai berkas CSV. Berkas ini berisi kolom NIS, Nama, Kelas, Golongan Darah, Alergi, dan Riwayat Penyakit.',
    keywords: 'csv ekspor unduh unduh data siswa excel',
    links: [{ label: 'Buka data siswa', href: '/students' }],
  },
  {
    id: 'detail-siswa',
    category: 'siswa',
    q: 'Di mana melihat riwayat lengkap seorang siswa?',
    a: 'Klik nama siswa di halaman Siswa untuk membuka halaman detail. Di sana tampil profil (termasuk alergi dan riwayat penyakit), seluruh riwayat kunjungan, serta riwayat obat yang pernah diberikan beserta kunjungannya.',
    keywords: 'detail profil riwayat obat alergi kunjungan',
  },
  {
    id: 'cetak-surat',
    category: 'kunjungan',
    q: 'Bagaimana mencetak surat izin pulang?',
    a: 'Di halaman Kunjungan, klik ikon printer pada baris kunjungan. Jendela pratinjau akan menampilkan surat izin pulang berisi identitas siswa, keluhan, tindakan, dan status akhir. Klik Cetak lalu pilih printer atau simpan sebagai PDF.',
    keywords: 'print cetak surat izin pulang pdf pulang',
    links: [{ label: 'Buka kunjungan', href: '/visits' }],
  },
  {
    id: 'notifikasi-stok',
    category: 'inventaris',
    q: 'Apa arti ikon lonceng di pojok aplikasi?',
    a: 'Ikon lonceng menampilkan peringatan stok obat yang menipis atau sudah/mendekati kedaluwarsa (≤ 30 hari). Klik lonceng untuk melihat daftar, lalu klik salah satu untuk langsung membuka inventaris.',
    keywords: 'notifikasi lonceng peringatan stok menipis kedaluwarsa',
    links: [{ label: 'Buka inventaris', href: '/inventory' }],
  },
  {
    id: 'log-aktivitas',
    category: 'sekolah',
    q: 'Bagaimana melihat riwayat aktivitas staf?',
    a: 'Buka halaman Aktivitas untuk melihat log perubahan data, stok, ekspor, dan sesi login. Log hanya menampilkan aktivitas sekolah Anda, tidak dapat diubah, dan bisa disaring per jenis aksi serta dicari.',
    keywords: 'log audit aktivitas riwayat siapa mengubah',
    links: [{ label: 'Buka log aktivitas', href: '/activity' }],
  },
  {
    id: 'isolasi-data',
    category: 'sekolah',
    q: 'Apakah data sekolah lain bisa terlihat?',
    a: 'Tidak. Setiap akun terikat pada satu sekolah, dan aturan keamanan database hanya menampilkan data milik sekolah tersebut. Data sekolah lain tidak dapat diakses dari akun mana pun.',
    keywords: 'privasi rls keamanan tenant',
  },
  {
    id: 'tambah-akun',
    category: 'sekolah',
    q: 'Bagaimana menambah akun staf baru?',
    a: 'Akun dibuat oleh tim Qrion atas permintaan admin sekolah. Setiap akun baru otomatis terikat ke sekolah Anda dan hanya dapat melihat data sekolah tersebut. Untuk mengajukan akun baru, hubungi admin sekolah Anda.',
    keywords: 'akun baru staf pengguna tambah undang',
  },
];

const popularQueries = ['catat kunjungan', 'cari siswa', 'stok obat', 'unduh laporan'];

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
                          <Link key={l.href} href={l.href} prefetch={false} className="btn btn--ghost btn--xs">
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
