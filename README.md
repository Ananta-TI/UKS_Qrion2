# UKS Sisfo - Sistem Informasi Kesehatan Sekolah (Internal Staf UKS)

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- Tailwind CSS
- Supabase (Auth, Database, Realtime)
- TypeScript
- jspdf / jspdf-autotable (Export PDF)
- lucide-react (Icons)

## Struktur Folder
```
uks-sisfo/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Tailwind + base styles
│   ├── page.tsx                # Dashboard (Sidebar + Header + statistik)
│   ├── auth/
│   │   ├── signin/page.tsx     # Login staf UKS (email/password)
│   │   └── signout/route.ts    # Logout
│   ├── students/page.tsx       # Pencarian cepat siswa + kartu data
│   ├── visits/
│   │   ├── page.tsx            # Riwayat rekam medis kunjungan
│   │   └── new/page.tsx        # Form catat kunjungan & rekam medis
│   ├── inventory/page.tsx      # Manajemen stok obat
│   └── reports/page.tsx        # Statistik & ekspor PDF/Excel
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         # Navigasi kiri + Header (Cadra style)
│   │   └── header.tsx          # (opsional) header terpisah
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── badge.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts           # Supabase server client (cookies)
│   │   └── client.ts           # Supabase browser client
│   └── utils.ts                # cn() helper
├── types/index.ts              # TypeScript types
├── proxy.ts                    # Session refresh + auth guard (Next 16)
├── database/
│   ├── schema.sql              # Skema database Supabase
│   └── seed.sql                # Data contoh siswa & obat
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── .env.example
```

## Instalasi
```bash
cd uks-sisfo
cp .env.example .env.local   # isi SUPABASE_SERVICE_ROLE_KEY jika perlu
npm install
npm run dev
```

## Database
Jalankan `database/schema.sql` lalu `database/seed.sql` di Supabase SQL Editor. RLS diaktifkan untuk tabel internal; hanya `authenticated` yang dapat akses (staf UKS).
Buat akun staf di **Supabase Dashboard → Authentication → Users → Add user** (email + password). Tidak ada halaman registrasi publik.

## Fitur Utama
1. **Dashboard** - Ringkasan total siswa, kunjungan hari ini, stok menipis, obat kedaluwarsa, dan tabel kunjungan terkini.
2. **Pencarian Cepat Siswa** - Cari berdasarkan Nama/NIS, tampilkan data dasar (kelas, golongan darah, alergi, penyakit bawaan).
3. **Catat Kunjungan** - Input keluhan, vitals (suhu, TD, berat, tinggi), tindakan/obat, status akhir. Stok obat otomatis terpotong saat obat disebut dalam tindakan.
4. **Inventaris Obat** - Data obat, satuan (strip/botol/pcs), lokasi, restok, peringatan stok menipis & kedaluwarsa 30 hari.
5. **Laporan** - Filter harian/mingguan/bulanan/tahunan, grafik keluhan terbanyak, status akhir, ekspor PDF & Excel.

## Catatan Keamanan
- Tidak ada login siswa/guru. Hanya staf UKS (auth.users) yang diizinkan via middleware + RLS.
- Untuk produksi, ganti `anon key` dengan service role key di sisi server untuk operasi sensitif, dan tambahkan email/password auth untuk staf.
