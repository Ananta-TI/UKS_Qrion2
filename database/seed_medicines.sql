-- ============================================================
-- Seed katalog obat UKS — lengkap & idempotent
--
-- Data ini terikat ke SEBUAH SEKOLAH (school_id), bukan ke akun.
-- Semua akun (profiles) yang school_id-nya sama akan ikut melihatnya;
-- super admin melihat semua sekolah.
--
-- Sekolah tujuan ditentukan di blok `target` (lihat penanda GANTI EMAIL).
-- Default: sekolah milik akun UKS Anda, yaitu anantafirdaus14@gmail.com.
--
-- Cara pakai di Supabase SQL Editor:
--   1. (Opsional) ganti email di blok `target` bila akunnya berbeda.
--   2. Jalankan seluruh skrip.
--   3. Bagian batch butuh migrasi 002; kalau belum ada, otomatis dilewati.
--
-- Kolom `unit` hanya boleh: 'strip' | 'botol' | 'pcs'.
-- ============================================================

-- 1) Daftar obat. Inkonsistensi sengaja dibuat sedikit (stok vs min_stock)
--    agar badge "menipis" dan peringatan kedaluwarsa ikut terlihat.
with catalog(name, category, unit, stock, min_stock, location, expires_in_days) as (
  values
    -- Rak A — obat oral (tablet / kapsul / strip)
    ('Paracetamol 500 mg',              'Analgesik / Antipiretik',   'strip', 30, 10, 'Rak A1', 540),
    ('Ibuprofen 400 mg',                'Analgesik / Antiinflamasi', 'strip', 15,  5, 'Rak A1', 480),
    ('CTM (Chlorpheniramine)',          'Antihistamin',              'strip', 20,  6, 'Rak A2', 420),
    ('Cetirizine 10 mg',                'Antihistamin',              'strip', 10,  4, 'Rak A2', 300),
    ('Antasida DOEN',                   'Antasida / Gangguan Lambung','strip',20,  8, 'Rak A3', 365),
    ('Dimenhydrinate (Antimo)',         'Antiemetik',                'strip', 10,  4, 'Rak A3', 330),
    ('Attapulgite (New Diatabs)',       'Antidiare',                 'strip', 10,  4, 'Rak A3', 300),
    ('Vitamin C',                       'Suplemen / Vitamin',        'strip', 15,  5, 'Rak A4', 450),
    ('Vitamin B Complex',               'Suplemen / Vitamin',        'strip', 10,  4, 'Rak A4', 400),
    ('Multivitamin Anak (Sakaton)',     'Suplemen / Vitamin',        'strip', 10,  4, 'Rak A4', 365),
    ('Zinc 20 mg',                      'Suplemen / Vitamin',        'strip',  8,  3, 'Rak A4', 365),
    ('Tolak Angin',                     'Herbal',                    'pcs',   24, 10, 'Rak A5', 500),

    -- Rak B — obat cair & sediaan topikal
    ('Paracetamol Sirup 60 ml',         'Antipiretik',               'botol', 10,  3, 'Rak B1', 365),
    ('OBH Combi Batuk Flu',             'Batuk & Flu',               'botol', 10,  3, 'Rak B1', 300),
    ('Vicks Vaporub 10 g',              'Batuk & Flu',               'botol',  8,  3, 'Rak B1', 540),
    ('Minyak Kayu Putih',               'Tradisional',               'botol', 12,  4, 'Rak B2', 600),
    ('Minyak Telon 60 ml',              'Tradisional',               'botol',  8,  3, 'Rak B2', 600),
    ('Balsem Geliga',                   'Tradisional / Nyeri Otot',  'botol',  6,  2, 'Rak B2', 540),
    ('Povidone Iodine 10%',             'Antiseptik',                'botol',  6,  2, 'Rak B3', 480),
    ('Betadine Solution',               'Antiseptik',                'botol',  6,  2, 'Rak B3', 480),
    ('Alkohol 70% 100 ml',              'Antiseptik',                'botol',  8,  3, 'Rak B3', 540),
    ('Rivanol 100 ml',                  'Antiseptik',                'botol',  4,  2, 'Rak B3', 420),
    ('Caladine Lotion 60 ml',           'Gangguan Kulit / Antigatal','botol',  6,  2, 'Rak B4', 400),
    ('Salep Antibiotik Kulit',          'Perawatan Kulit',           'pcs',    6,  2, 'Rak B4', 360),
    ('Insto Tetes Mata',                'Gangguan Mata',             'botol',  5,  2, 'Rak B4', 365),
    ('Salep Mata',                      'Gangguan Mata',             'pcs',    4,  2, 'Rak B4', 240),

    -- Rak C — perawatan luka & rehidrasi
    ('Kasa Steril',                     'Perawatan Luka',            'pcs',   50, 20, 'Rak C1', 720),
    ('Kasa Gulung 4 m',                 'Perawatan Luka',            'pcs',   20,  8, 'Rak C1', 720),
    ('Plester Luka',                    'Perawatan Luka',            'pcs',   60, 20, 'Rak C1', 720),
    ('Plester Rol (Hypafix)',           'Perawatan Luka',            'pcs',   12,  4, 'Rak C1', 720),
    ('Perban Elastis 4 inci',           'Perawatan Luka',            'pcs',   10,  3, 'Rak C2', 720),
    ('Kapas 50 g',                      'Perawatan Luka',            'pcs',   24,  8, 'Rak C2', 720),
    ('Oralit',                          'Rehidrasi',                 'pcs',   30, 12, 'Rak C3', 540),

    -- Rak D — APD & alat kesehatan (alat tidak punya tanggal kedaluwarsa)
    ('Sarung Tangan Medis',             'APD',                       'pcs',  100, 30, 'Rak D1', 900),
    ('Masker Medis',                    'APD',                       'pcs',  120, 40, 'Rak D1', 900),
    ('Celemek / Apron',                 'APD',                       'pcs',    5,  2, 'Rak D1', 1095),
    ('Termometer Digital',              'Alat Kesehatan',            'pcs',    3,  1, 'Rak D2', null),
    ('Tensimeter Digital',              'Alat Kesehatan',            'pcs',    2,  1, 'Rak D2', null),
    ('Stetoskop',                       'Alat Kesehatan',            'pcs',    2,  1, 'Rak D2', null),
    ('Gunting Perban',                  'Alat Kesehatan',            'pcs',    2,  1, 'Rak D2', null),
    ('Pinset Anatomis',                 'Alat Kesehatan',            'pcs',    2,  1, 'Rak D2', null)
),
-- Sekolah tujuan.
--   GANTI EMAIL DI BAWAH sesuai akun UKS yang Anda pakai.
--   Bila email tidak ditemukan, otomatis jatuh ke sekolah pertama.
-- Ingin sekolah tertentu? -> where id = 'uuid-sekolah-anda'
-- Ingin semua sekolah?     -> select id from public.schools
target as (
  select coalesce(
    (select p.school_id from public.profiles p
      where p.email = 'anantafirdaus14@gmail.com' limit 1),
    (select id from public.schools order by created_at limit 1)
  ) as id
)
insert into public.medicines (school_id, name, category, unit, stock, min_stock, location, expiry_date)
select
  target.id,
  c.name,
  c.category,
  c.unit,
  c.stock,
  c.min_stock,
  c.location,
  case when c.expires_in_days is null then null else current_date + c.expires_in_days end
from target
cross join catalog c
where target.id is not null
  and not exists (
    select 1
    from public.medicines m
    where m.school_id = target.id
      and m.name = c.name
  );

-- 2) Batch saldo awal untuk obat yang belum punya batch (butuh migrasi 002).
--    Dilewati otomatis bila tabel medicine_batches belum ada.
do $$
begin
  if to_regclass('public.medicine_batches') is not null then
    insert into public.medicine_batches (school_id, medicine_id, qty, expiry_date, notes)
    select m.school_id, m.id, m.stock, m.expiry_date, 'Stok awal (seed katalog)'
    from public.medicines m
    where m.stock > 0
      and not exists (
        select 1 from public.medicine_batches b where b.medicine_id = m.id
      );
  end if;
end $$;
