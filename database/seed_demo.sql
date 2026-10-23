-- ============================================================
-- SEED DEMO UKS — 60 siswa, 18 obat, 180 kunjungan (90 hari)
-- Jalankan di Supabase SQL Editor setelah punya minimal 1 user.
-- PERINGATAN: bagian "hapus data" di bawah mengosongkan tabel
--             visits & medicine_logs agar data demo tidak dobel.
-- ============================================================

-- 1) Sekolah default (wajib ada setelah migration_multi_tenant)
insert into public.schools (name, slug, address)
select 'Sekolah Demo', 'sekolah-demo', 'Alamat sekolah'
where not exists (select 1 from public.schools);

-- 2) Pastikan ada profil staf (FK visits.staff_id)
do $$
declare uid uuid;
begin
  select id into uid from public.profiles order by created_at limit 1;
  if uid is null then
    select id into uid from auth.users order by created_at limit 1;
    if uid is null then
      raise exception 'Belum ada user. Login/daftar lewat aplikasi dulu, lalu jalankan seed ini lagi.';
    end if;
    insert into public.profiles (id, full_name, role, school_id)
    values (uid, 'Petugas UKS', 'staff', (select id from public.schools order by created_at limit 1))
    on conflict (id) do nothing;
  end if;
end $$;

-- 3) Bersihkan data demo (hanya sekolah demo)
delete from public.medicine_logs
where school_id = (select id from public.schools order by created_at limit 1);
delete from public.visits
where school_id = (select id from public.schools order by created_at limit 1);
delete from public.students
where school_id = (select id from public.schools order by created_at limit 1);
delete from public.medicines
where school_id = (select id from public.schools order by created_at limit 1);

-- 4) Siswa (60)
insert into public.students (school_id, nis, full_name, class, blood_type, allergies, chronic_diseases)
select sc.id, v.*
from (select id from public.schools order by created_at limit 1) sc,
     (values
  ('2024001', 'Ahmad Fauzi', '7A', 'O', 'Udang, debu', 'Asma'),
  ('2024002', 'Bella Putri Anggraini', '7A', 'A', '', ''),
  ('2024003', 'Dimas Prasetyo', '7A', 'B', '', ''),
  ('2024004', 'Fahri Ramadhan', '7A', 'AB', 'Kacang tanah', ''),
  ('2024005', 'Intan Permata Sari', '7A', 'O', 'Debu', ''),
  ('2024006', 'Muhammad Rafi Alfarizi', '7A', 'A', '', ''),
  ('2024007', 'Nadia Salsabila', '7A', 'B', 'Penisilin', ''),
  ('2024008', 'Aditya Nugroho', '7B', 'O', '', ''),
  ('2024009', 'Citra Kirana Dewi', '7B', 'B', 'Seafood', ''),
  ('2024010', 'Eko Saputra', '7B', 'A', '', 'Asma'),
  ('2024011', 'Gita Ayu Lestari', '7B', 'AB', '', ''),
  ('2024012', 'Hendra Wijaya', '7B', 'O', 'Debu', ''),
  ('2024013', 'Kirana Maharani', '7B', 'A', 'Kacang tanah', ''),
  ('2024014', 'Lukman Hakim', '7B', 'B', '', ''),
  ('2024015', 'Maya Anggraini', '7C', 'O', '', 'Epilepsi'),
  ('2024016', 'Naufal Hidayat', '7C', 'A', '', ''),
  ('2024017', 'Octavia Ramadhani', '7C', 'B', '', ''),
  ('2024018', 'Putra Mahendra', '7C', 'AB', 'Udang', ''),
  ('2024019', 'Qonita Zahra', '7C', 'O', '', ''),
  ('2024020', 'Rangga Pratama', '7C', 'A', 'Debu', 'Asma'),
  ('2024021', 'Salsabila Putri', '8A', 'O', '', ''),
  ('2024022', 'Taufik Hidayat', '8A', 'A', '', ''),
  ('2024023', 'Umi Kalsum', '8A', 'B', 'Kacang tanah', ''),
  ('2024024', 'Vino Bastian', '8A', 'AB', '', ''),
  ('2024025', 'Wulan Sari', '8A', 'O', 'Debu', ''),
  ('2024026', 'Yakobus Simbolon', '8A', 'A', '', ''),
  ('2024027', 'Zahra Amelia', '8A', 'B', 'Penisilin', ''),
  ('2024028', 'Andre Kurniawan', '8B', 'O', '', ''),
  ('2024029', 'Bunga Citra Lestari', '8B', 'A', '', ''),
  ('2024030', 'Candra Wijaya', '8B', 'B', '', ''),
  ('2024031', 'Dinda Ayu Safitri', '8B', 'AB', 'Seafood', ''),
  ('2024032', 'Erlangga Putra', '8B', 'O', '', 'Asma'),
  ('2024033', 'Fitri Handayani', '8B', 'A', '', ''),
  ('2024034', 'Galih Prasetya', '8B', 'B', '', ''),
  ('2024035', 'Hana Nabila', '8C', 'O', 'Debu', ''),
  ('2024036', 'Irfan Maulana', '8C', 'A', '', ''),
  ('2024037', 'Jessica Tambunan', '8C', 'B', '', ''),
  ('2024038', 'Kevin Sanjaya', '8C', 'AB', '', ''),
  ('2024039', 'Laura Meisya', '8C', 'O', 'Kacang tanah', ''),
  ('2024040', 'Muhammad Iqbal Ramadhan', '8C', 'A', '', 'Epilepsi'),
  ('2024041', 'Nabila Syafira', '9A', 'O', '', ''),
  ('2024042', 'Oki Setiana', '9A', 'A', '', ''),
  ('2024043', 'Prasetya Adi', '9A', 'B', 'Debu', ''),
  ('2024044', 'Qori Amalia', '9A', 'AB', '', ''),
  ('2024045', 'Rendi Pangestu', '9A', 'O', '', ''),
  ('2024046', 'Sarah Azhari', '9A', 'A', 'Kacang tanah', ''),
  ('2024047', 'Tio Nugraha', '9A', 'B', '', 'Asma'),
  ('2024048', 'Ulfa Nabila', '9B', 'O', '', ''),
  ('2024049', 'Vicky Prasetyo', '9B', 'A', '', ''),
  ('2024050', 'Wanda Hamidah', '9B', 'B', '', ''),
  ('2024051', 'Xander Wijaya', '9B', 'AB', '', ''),
  ('2024052', 'Yuni Shara', '9B', 'O', 'Debu', ''),
  ('2024053', 'Zaki Abdullah', '9B', 'A', '', ''),
  ('2024054', 'Abel Tanjung', '9C', 'O', '', ''),
  ('2024055', 'Bella Safira', '9C', 'A', '', ''),
  ('2024056', 'Cakra Wijaya', '9C', 'B', '', ''),
  ('2024057', 'Dea Ananda', '9C', 'AB', 'Kacang tanah', ''),
  ('2024058', 'Fajar Ramadhan', '9C', 'O', '', 'Asma'),
  ('2024059', 'Gisella Anastasia', '9C', 'A', '', ''),
  ('2024060', 'Hadi Pranoto', '9C', 'B', '', '')
     ) as v(nis, full_name, class, blood_type, allergies, chronic_diseases)
on conflict (school_id, nis) do nothing;

-- 5) Obat (18) — sebagian sengaja menipis & mendekati kedaluwarsa
insert into public.medicines (school_id, name, category, unit, stock, min_stock, location, expiry_date)
select sc.id, v.*
from (select id from public.schools order by created_at limit 1) sc,
     (values
  ('Paracetamol 500mg',        'Analgesik/Antipiretik', 'strip', 24,  5,  'Rak A1', current_date + 300),
  ('Paracetamol Sirup',        'Antipiretik',           'botol', 8,   3,  'Rak A1', current_date + 210),
  ('Amoxicillin 500mg',        'Antibiotik',            'strip', 4,   5,  'Rak A2', current_date + 150),
  ('Amoxicillin Sirup',        'Antibiotik',            'botol', 6,   3,  'Rak A2', current_date + 120),
  ('Ibuprofen 400mg',          'Analgesik',             'strip', 12,  5,  'Rak A1', current_date + 260),
  ('OBH Combi',                'Batuk',                 'botol', 3,   5,  'Rak B1', current_date + 25),
  ('Antasida DOEN',            'Gangguan Lambung',      'strip', 4,   5,  'Rak A3', current_date + 180),
  ('Oralit',                   'Rehidrasi',             'pcs',   6,   10, 'Rak C2', current_date + 90),
  ('Betadine',                 'Antiseptik',            'botol', 7,   2,  'Rak B2', current_date + 240),
  ('Alkohol 70%',              'Antiseptik',            'botol', 5,   2,  'Rak B2', current_date + 500),
  ('Plester Hansaplast',       'Pertolongan Luka',      'pcs',   60,  10, 'Rak C1', current_date + 700),
  ('Kasa Steril',              'Pertolongan Luka',      'pcs',   40,  10, 'Rak C1', current_date + 600),
  ('Minyak Angin',             'Nyeri Otot',            'botol', 9,   3,  'Rak B3', current_date + 400),
  ('CTM (Klorfeniramin)',      'Antihistamin',          'strip', 10,  4,  'Rak A4', current_date + 20),
  ('Salep Mata',               'Antibiotik',            'pcs',   5,   2,  'Rak B4', current_date + 18),
  ('Vitamin C',                'Suplemen',              'strip', 15,  5,  'Rak A5', current_date + 330),
  ('Tolak Angin',              'Herbal',                'pcs',   20,  5,  'Rak B5', current_date + 280),
  ('Handscoon',                'APD',                   'pcs',   100, 20, 'Rak D1', current_date + 900)
) as v(name, category, unit, stock, min_stock, location, expiry_date)
where not exists (select 1 from public.medicines m where m.name = v.name);

-- 6) Daftar keluhan + tindakan + status (dipakai acak berbobot)
drop table if exists _demo_complaint;
create temp table _demo_complaint (
  id serial primary key,
  complaint text,
  treatment text,
  tmin numeric,
  tmax numeric,
  status text,
  notes text
);

insert into _demo_complaint (complaint, treatment, tmin, tmax, status, notes) values
  ('Demam',              'Paracetamol 500mg',             37.5, 39.0, 'back_to_class', 'Kompres hangat, istirahat di UKS'),
  ('Demam',              'Paracetamol 500mg',             37.8, 39.4, 'picked_up',     'Orang tua dihubungi, istirahat di rumah'),
  ('Demam tinggi',       'Paracetamol 500mg, kompres',    38.8, 39.8, 'referred',      'Dirujuk ke puskesmas'),
  ('Sakit kepala',       'Paracetamol 500mg',             36.3, 37.2, 'back_to_class', 'Istirahat 20 menit, minum air'),
  ('Sakit kepala',       'Paracetamol 500mg',             36.4, 37.3, 'back_to_class', 'Kurang tidur, disarankan istirahat'),
  ('Sakit kepala berat', 'Paracetamol 500mg',             36.5, 37.5, 'picked_up',     'Orang tua dihubungi'),
  ('Nyeri perut',        'Antasida DOEN',                 36.4, 37.2, 'back_to_class', 'Diduga gastritis ringan'),
  ('Nyeri perut',        'Kompres hangat',                36.2, 37.0, 'back_to_class', 'Dismenorea, istirahat'),
  ('Nyeri perut',        'Antasida DOEN',                 36.6, 37.4, 'picked_up',     'Nyeri berulang'),
  ('Mual dan muntah',    'Oralit',                        36.5, 37.6, 'back_to_class', 'Rehidrasi, makan sedikit'),
  ('Diare',              'Oralit',                        36.8, 38.0, 'picked_up',     'Jaga hidrasi, orang tua dihubungi'),
  ('Pilek',              'Vitamin C',                     36.4, 37.4, 'back_to_class', 'Istirahat, minum air hangat'),
  ('Batuk',              'OBH Combi',                     36.5, 37.5, 'back_to_class', 'Batuk kering'),
  ('Batuk berdahak',     'OBH Combi',                     36.6, 37.8, 'picked_up',     'Orang tua dihubungi'),
  ('Luka ringan',        'Betadine, Plester Hansaplast',  36.3, 37.0, 'back_to_class', 'Luka lecet saat olahraga'),
  ('Luka ringan',        'Betadine, Plester Hansaplast',  36.4, 37.1, 'back_to_class', 'Tersandung di lapangan'),
  ('Luka robek',         'Kasa Steril, Betadine',         36.5, 37.4, 'referred',      'Dirujuk untuk penjahitan'),
  ('Mimisan',            'Kasa Steril',                   36.6, 37.4, 'back_to_class', 'Mimisan berhenti setelah kompres'),
  ('Alergi kulit',       'CTM (Klorfeniramin)',           36.4, 37.2, 'picked_up',     'Bentol, orang tua dihubungi'),
  ('Mata merah',         'Salep Mata',                    36.5, 37.3, 'picked_up',     'Orang tua dihubungi untuk berobat'),
  ('Keseleo',            'Minyak Angin',                  36.3, 37.0, 'back_to_class', 'Kompres dingin, elevasi'),
  ('Sesak napas',        'Inhaler pribadi, oksigen',      36.7, 37.8, 'referred',      'Riwayat asma, dirujuk'),
  ('Pingsan',            'Oralit, posisi berbaring',      36.2, 37.2, 'referred',      'Pingsan saat upacara'),
  ('Sakit gigi',         'Paracetamol 500mg',             36.5, 37.6, 'picked_up',     'Dirujuk ke dokter gigi'),
  ('Demam',              'Paracetamol 500mg',             37.4, 38.8, 'back_to_class', 'Observasi 30 menit'),
  ('Sakit kepala',       'Paracetamol 500mg',             36.4, 37.1, 'back_to_class', 'Dehidrasi ringan'),
  ('Nyeri perut',        'Antasida DOEN',                 36.5, 37.3, 'back_to_class', 'Sudah makan? Belum sarapan'),
  ('Luka ringan',        'Betadine, Plester Hansaplast',  36.4, 37.0, 'back_to_class', 'Terbentur meja'),
  ('Pilek',              'Vitamin C',                     36.6, 37.5, 'back_to_class', 'Flu ringan'),
  ('Batuk',              'OBH Combi',                     36.5, 37.3, 'back_to_class', 'Batuk 2 hari'),
  ('Demam',              'Paracetamol 500mg',             37.3, 38.6, 'back_to_class', 'Observasi, banyak minum'),
  ('Sakit kepala',       'Paracetamol 500mg',             36.3, 37.2, 'back_to_class', 'Sakit kepala tegang'),
  ('Nyeri perut',        'Kompres hangat',                36.4, 37.1, 'back_to_class', 'Nyeri haid, istirahat'),
  ('Luka ringan',        'Betadine, Plester Hansaplast',  36.3, 37.0, 'back_to_class', 'Luka gores saat praktik'),
  ('Pilek',              'Vitamin C',                     36.5, 37.3, 'back_to_class', 'Bersin pagi hari'),
  ('Batuk',              'OBH Combi',                     36.6, 37.4, 'back_to_class', 'Batuk ringan');

-- 7) Kunjungan (180 baris: 14 hari ini, sisanya tersebar 90 hari)
insert into public.visits (
  school_id, student_id, staff_id, check_in_at, check_out_at, chief_complaint,
  temperature, blood_pressure, weight, height, treatment, final_status, notes
)
select
  (select id from public.schools order by created_at limit 1),
  s.id,
  (select id from public.profiles order by created_at limit 1),
  t.ts,
  t.ts + make_interval(mins => (12 + floor(random() * 28))::int),
  c.complaint,
  round((c.tmin + random() * (c.tmax - c.tmin))::numeric, 1),
  (98 + floor(random() * 28))::text || '/' || (64 + floor(random() * 16))::text,
  case left(coalesce(s.class, '7'), 1)
    when '7' then round((39 + random() * 13)::numeric, 1)
    when '8' then round((44 + random() * 14)::numeric, 1)
    else round((49 + random() * 16)::numeric, 1)
  end,
  case left(coalesce(s.class, '7'), 1)
    when '7' then round((147 + random() * 13)::numeric, 1)
    when '8' then round((154 + random() * 13)::numeric, 1)
    else round((159 + random() * 14)::numeric, 1)
  end,
  c.treatment,
  c.status,
  c.notes
from generate_series(1, 180) as g
cross join lateral (
  select
    case when g <= 14 then 0 else 1 + floor(random() * 88)::int end as days_ago,
    (select id from public.students order by random() limit 1) as sid,
    1 + floor(random() * 36)::int as cid
) v
join public.students s on s.id = v.sid
join _demo_complaint c on c.id = v.cid
cross join lateral (
  select case
    when v.days_ago = 0 then
      now() - (random() * least(extract(epoch from (now() - date_trunc('day', now()))), 6 * 3600)) * interval '1 second'
    else
      date_trunc('day', now())
        - make_interval(days => v.days_ago)
        + interval '7 hours 30 minutes'
        + (random() * interval '5 hours 30 minutes')
  end as ts
) t;

-- 8) Ringkasan hasil
select
  (select count(*) from public.students) as siswa,
  (select count(*) from public.medicines) as obat,
  (select count(*) from public.visits) as kunjungan,
  (select count(*) from public.visits where check_in_at >= date_trunc('day', now())) as hari_ini,
  (select count(*) from public.visits where check_in_at >= now() - interval '7 days') as minggu_ini,
  (select count(*) from public.visits where check_in_at >= now() - interval '30 days') as bulan_ini;

select final_status, count(*) as jumlah
from public.visits
group by final_status
order by jumlah desc;
