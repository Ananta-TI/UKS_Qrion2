-- ============================================================
-- SEED DATA UKS — anantafirdaus14@gmail.com
-- ============================================================
-- Menambahkan:
--   • 80 siswa baru (NIS 2627001–2627080) dengan nama & kelas bervariasi
--   • 480 kunjungan historis + hingga 20 kunjungan hari ini
--     (total hingga 500 kunjungan) selama ±6 bulan terakhir
--     - hanya hari Senin–Jumat
--     - jam 07.15–13.45 WIB
--     - keluhan, tindakan, status, dan tanda vital bervariasi
--     - ±75% kembali ke kelas, ±20% dijemput, ±5% dirujuk
--
-- Catatan:
--   • Data lama TIDAK dihapus.
--   • Script aman dijalankan ulang: jika NIS 2627xxx sudah ada,
--     script berhenti dan tidak menambah data lagi.
--   • Jalankan di Supabase SQL Editor.
--   • Semua jam memakai zona Asia/Jakarta (WIB).
--
-- Jika ingin mengulang dari awal, hapus dulu siswa seed (kunjungan
-- ikut terhapus karena ON DELETE CASCADE):
--   delete from public.students
--   where school_id = (
--     select school_id from public.profiles
--     where email = 'anantafirdaus14@gmail.com'
--     limit 1
--   )
--   and nis like '2627%';
-- ============================================================

do $$
declare
  v_school   uuid;
  v_staff    uuid;
  v_students int;
  v_visits   int;
begin
  -- Semua jam sekolah dihitung dalam WIB.
  perform set_config('TimeZone', 'Asia/Jakarta', true);

  select p.school_id, p.id
    into v_school, v_staff
  from public.profiles p
  where p.email = 'anantafirdaus14@gmail.com'
  limit 1;

  if v_school is null or v_staff is null then
    raise exception 'Profil anantafirdaus14@gmail.com tidak ditemukan.';
  end if;

  -- Cegah data dobel kalau script dijalankan dua kali.
  if exists (
    select 1
    from public.students
    where school_id = v_school
      and nis like '2627%'
  ) then
    raise notice 'Seed sudah pernah dijalankan untuk sekolah ini. Tidak ada data baru yang ditambahkan.';
    return;
  end if;

  -- ----------------------------------------------------------
  -- 1) Siswa baru: 80 orang, 9 kelas (10A–12C)
  -- ----------------------------------------------------------
  insert into public.students (
    school_id, nis, full_name, class, blood_type, allergies, chronic_diseases
  )
  select
    v_school,
    '2627' || lpad(v.seq::text, 3, '0'),
    v.full_name,
    v.class,
    (array['A', 'B', 'AB', 'O'])[1 + floor(random() * 4)::int],
    case
      when random() < 0.22
        then (array['Debu', 'Udang', 'Kacang tanah', 'Penisilin', 'Seafood', 'Telur'])[1 + floor(random() * 6)::int]
      else ''
    end,
    case
      when random() < 0.10
        then (array['Asma', 'Epilepsi', 'Maag', 'Alergi musiman'])[1 + floor(random() * 4)::int]
      else ''
    end
  from (values
    ( 1, 'Alya Putri Ramadhani',       '10 A'),
    ( 2, 'Bagas Aditya Pratama',       '10 A'),
    ( 3, 'Citra Amelia Sari',          '10 A'),
    ( 4, 'Dimas Arya Nugraha',         '10 A'),
    ( 5, 'Fira Anindya Putri',         '10 A'),
    ( 6, 'Galih Rizky Saputra',        '10 A'),
    ( 7, 'Hana Salsabila',             '10 A'),
    ( 8, 'Ilham Maulana Akbar',        '10 A'),
    ( 9, 'Jihan Aulia Rahma',          '10 A'),
    (10, 'Kevin Ardiansyah',           '10 B'),
    (11, 'Larasati Dewi Anggraini',    '10 B'),
    (12, 'Miftahul Huda',              '10 B'),
    (13, 'Nadia Zahra Fitriani',       '10 B'),
    (14, 'Oscar Dwi Prasetyo',         '10 B'),
    (15, 'Putri Ayu Lestari',          '10 B'),
    (16, 'Rafi Ahmad Fauzan',          '10 B'),
    (17, 'Sinta Maharani',             '10 B'),
    (18, 'Taufik Hidayatullah',        '10 B'),
    (19, 'Umi Nur Aisyah',             '10 C'),
    (20, 'Vino Bagas Saputra',         '10 C'),
    (21, 'Wulan Sari Dewi',            '10 C'),
    (22, 'Yoga Pratama',               '10 C'),
    (23, 'Zahra Nabila Putri',         '10 C'),
    (24, 'Adnan Fauzi',                '10 C'),
    (25, 'Bunga Citra Amelia',         '10 C'),
    (26, 'Candra Kurniawan',           '10 C'),
    (27, 'Dinda Ayu Safitri',          '10 C'),
    (28, 'Eka Putri Wulandari',        '11 A'),
    (29, 'Fajar Nugroho',              '11 A'),
    (30, 'Gita Rahmawati',             '11 A'),
    (31, 'Hendra Setiawan',            '11 A'),
    (32, 'Intan Permatasari',          '11 A'),
    (33, 'Joko Susilo',                '11 A'),
    (34, 'Kirana Maharani',            '11 A'),
    (35, 'Lukman Hakim',               '11 A'),
    (36, 'Maya Anggraini',             '11 A'),
    (37, 'Naufal Hidayat',             '11 B'),
    (38, 'Oktavia Ramadhani',          '11 B'),
    (39, 'Putra Mahendra',             '11 B'),
    (40, 'Qonita Zahra',               '11 B'),
    (41, 'Rangga Pratama',             '11 B'),
    (42, 'Salsabila Putri',            '11 B'),
    (43, 'Tio Nugraha',                '11 B'),
    (44, 'Ulfa Nabila',                '11 B'),
    (45, 'Vicky Prasetyo',             '11 B'),
    (46, 'Wanda Hamidah',              '11 C'),
    (47, 'Xander Wijaya',              '11 C'),
    (48, 'Yuni Shara',                 '11 C'),
    (49, 'Zaki Abdullah',              '11 C'),
    (50, 'Abel Tanjung',               '11 C'),
    (51, 'Bella Safira',               '11 C'),
    (52, 'Cakra Wijaya',               '11 C'),
    (53, 'Dea Ananda',                 '11 C'),
    (54, 'Erlangga Putra',             '11 C'),
    (55, 'Fitri Handayani',            '12 A'),
    (56, 'Gilang Ramadhan',            '12 A'),
    (57, 'Hesti Wulandari',            '12 A'),
    (58, 'Irfan Maulana',              '12 A'),
    (59, 'Jessica Tambunan',           '12 A'),
    (60, 'Kevin Sanjaya',              '12 A'),
    (61, 'Laura Meisya',               '12 A'),
    (62, 'Muhammad Iqbal Ramadhan',    '12 A'),
    (63, 'Nabila Syafira',             '12 A'),
    (64, 'Oki Setiana',                '12 B'),
    (65, 'Prasetya Adi',               '12 B'),
    (66, 'Qori Amalia',                '12 B'),
    (67, 'Rendi Pangestu',             '12 B'),
    (68, 'Sarah Azhari',               '12 B'),
    (69, 'Teguh Firmansyah',           '12 B'),
    (70, 'Ulya Rahmawati',             '12 B'),
    (71, 'Farhan Maulana',             '12 B'),
    (72, 'Winda Lestari',              '12 B'),
    (73, 'Yudi Hartono',               '12 C'),
    (74, 'Zulfa Aulia',                '12 C'),
    (75, 'Arif Budiman',               '12 C'),
    (76, 'Bela Kartika',               '12 C'),
    (77, 'Doni Saputra',               '12 C'),
    (78, 'Erika Putri',                '12 C'),
    (79, 'Fikri Ramadhan',             '12 C'),
    (80, 'Gina Sonia',                 '12 C')
  ) as v(seq, full_name, class)
  on conflict (school_id, nis) do nothing;

  -- Berat & tinggi dihitung sekali per siswa supaya konsisten
  -- di semua kunjungan (tidak berubah-ubah tiap kunjungan).
  create temp table _seed_student on commit drop as
  select
    s.id,
    case left(regexp_replace(coalesce(s.class, '10'), '[^0-9]', '', 'g'), 2)
      when '7'  then round((38 + random() * 14)::numeric, 1)
      when '8'  then round((40 + random() * 16)::numeric, 1)
      when '9'  then round((42 + random() * 16)::numeric, 1)
      when '10' then round((44 + random() * 16)::numeric, 1)
      when '11' then round((46 + random() * 17)::numeric, 1)
      else           round((48 + random() * 18)::numeric, 1)
    end as weight,
    case left(regexp_replace(coalesce(s.class, '10'), '[^0-9]', '', 'g'), 2)
      when '7'  then round((145 + random() * 15)::numeric, 1)
      when '8'  then round((148 + random() * 15)::numeric, 1)
      when '9'  then round((150 + random() * 15)::numeric, 1)
      when '10' then round((152 + random() * 16)::numeric, 1)
      when '11' then round((154 + random() * 16)::numeric, 1)
      else           round((155 + random() * 17)::numeric, 1)
    end as height
  from public.students s
  where s.school_id = v_school;

  -- ----------------------------------------------------------
  -- 2) Profil keluhan: 40 kombinasi keluhan/tindakan/status
  --    30 kembali ke kelas, 8 dijemput, 2 dirujuk.
  -- ----------------------------------------------------------
  create temp table _seed_complaint (
    complaint text,
    treatment text,
    tmin      numeric,
    tmax      numeric,
    status    text,
    notes     text
  ) on commit drop;

  insert into _seed_complaint (complaint, treatment, tmin, tmax, status, notes) values
    ('Demam ringan',           'Paracetamol 500mg',             37.4, 38.2, 'back_to_class', 'Kompres hangat, istirahat di UKS'),
    ('Demam',                  'Paracetamol 500mg',             37.8, 38.6, 'back_to_class', 'Observasi 30 menit, banyak minum'),
    ('Sakit kepala',           'Paracetamol 500mg',             36.4, 37.2, 'back_to_class', 'Istirahat 20 menit, minum air'),
    ('Sakit kepala tegang',    'Paracetamol 500mg',             36.3, 37.1, 'back_to_class', 'Kurang tidur, disarankan istirahat'),
    ('Nyeri perut',            'Antasida DOEN',                 36.4, 37.2, 'back_to_class', 'Diduga gastritis ringan'),
    ('Nyeri perut',            'Kompres hangat',                36.2, 37.0, 'back_to_class', 'Nyeri haid, istirahat'),
    ('Nyeri perut',            'Antasida DOEN',                 36.5, 37.3, 'back_to_class', 'Belum sarapan, diberi makan ringan'),
    ('Mual',                   'Oralit',                        36.5, 37.5, 'back_to_class', 'Rehidrasi, makan sedikit'),
    ('Diare ringan',           'Oralit',                        36.8, 37.8, 'back_to_class', 'Jaga hidrasi, observasi'),
    ('Batuk kering',           'OBH Combi',                     36.5, 37.4, 'back_to_class', 'Batuk 2 hari, minum air hangat'),
    ('Batuk berdahak',         'OBH Combi',                     36.6, 37.6, 'back_to_class', 'Istirahat, minum air hangat'),
    ('Pilek',                  'Vitamin C',                     36.4, 37.4, 'back_to_class', 'Flu ringan, istirahat'),
    ('Sakit tenggorokan',      'Vitamin C',                     36.6, 37.5, 'back_to_class', 'Berkumur air garam'),
    ('Luka lecet',             'Betadine, Plester Hansaplast',  36.3, 37.0, 'back_to_class', 'Luka lecet saat olahraga'),
    ('Luka ringan',            'Betadine, Plester Hansaplast',  36.4, 37.1, 'back_to_class', 'Terbentur meja'),
    ('Mimisan',                'Kasa Steril',                   36.6, 37.4, 'back_to_class', 'Mimisan berhenti setelah kompres'),
    ('Alergi kulit',           'CTM (Klorfeniramin)',           36.4, 37.2, 'back_to_class', 'Bentol ringan, observasi di UKS'),
    ('Mata merah',             'Salep Mata',                    36.5, 37.3, 'back_to_class', 'Diberi salep mata, observasi'),
    ('Keseleo ringan',         'Minyak Angin',                  36.3, 37.0, 'back_to_class', 'Kompres dingin, elevasi'),
    ('Sakit gigi',             'Paracetamol 500mg',             36.5, 37.6, 'back_to_class', 'Nyeri gigi ringan, diberi paracetamol'),
    ('Dehidrasi ringan',       'Oralit',                        36.4, 37.3, 'back_to_class', 'Banyak minum, istirahat'),
    ('Nyeri otot',             'Minyak Angin',                  36.4, 37.1, 'back_to_class', 'Setelah olahraga, kompres'),
    ('Pusing',                 'Istirahat, minum air',          36.3, 37.2, 'back_to_class', 'Observasi 15 menit'),
    ('Sakit perut',            'Oralit',                        36.5, 37.4, 'back_to_class', 'Observasi, hindari makanan pedas'),
    ('Luka gores',             'Betadine, Plester Hansaplast',  36.3, 37.0, 'back_to_class', 'Luka gores saat praktik'),
    ('Bersin pagi',            'Vitamin C',                     36.5, 37.3, 'back_to_class', 'Alergi debu ringan'),
    ('Nyeri haid',             'Kompres hangat',                36.2, 37.0, 'back_to_class', 'Istirahat di UKS'),
    ('Sariawan',               'Vitamin C',                     36.5, 37.2, 'back_to_class', 'Anjuran makan buah'),
    ('Hidung tersumbat',       'Vitamin C',                     36.4, 37.3, 'back_to_class', 'Uap hangat'),
    ('Nyeri punggung',         'Minyak Angin',                  36.4, 37.1, 'back_to_class', 'Postur duduk, istirahat'),
    ('Demam',                  'Paracetamol 500mg',             37.8, 38.6, 'picked_up',     'Orang tua dihubungi, istirahat di rumah'),
    ('Diare',                  'Oralit',                        36.8, 38.0, 'picked_up',     'Jaga hidrasi, orang tua dihubungi'),
    ('Alergi kulit',           'CTM (Klorfeniramin)',           36.4, 37.2, 'picked_up',     'Bentol menyebar, orang tua dihubungi'),
    ('Mata merah',             'Salep Mata',                    36.5, 37.3, 'picked_up',     'Orang tua dihubungi untuk berobat'),
    ('Sakit gigi',             'Paracetamol 500mg',             36.5, 37.6, 'picked_up',     'Dirujuk ke dokter gigi'),
    ('Nyeri perut berulang',   'Antasida DOEN',                 36.6, 37.4, 'picked_up',     'Nyeri berulang, orang tua dihubungi'),
    ('Mual dan muntah',        'Oralit',                        36.5, 37.6, 'picked_up',     'Observasi, orang tua dihubungi'),
    ('Demam dan batuk',        'Paracetamol 500mg',             37.6, 38.4, 'picked_up',     'Istirahat di rumah'),
    ('Demam tinggi',           'Paracetamol 500mg, kompres',    38.8, 39.4, 'referred',      'Dirujuk ke puskesmas'),
    ('Sesak napas ringan',     'Inhaler pribadi, oksigen',      36.7, 37.8, 'referred',      'Riwayat asma, dirujuk');

  -- ----------------------------------------------------------
  -- 3) 480 kunjungan historis (180 hari ke belakang, hari kerja)
  -- ----------------------------------------------------------
  insert into public.visits (
    school_id, student_id, staff_id, check_in_at, check_out_at,
    chief_complaint, temperature, blood_pressure, weight, height,
    treatment, final_status, notes, created_at
  )
  select
    v_school,
    s.id,
    v_staff,
    t.ts,
    least(t.ts + make_interval(mins => (10 + floor(random() * 31))::int), now()),
    c.complaint,
    round((c.tmin + random() * (c.tmax - c.tmin))::numeric, 1),
    (100 + floor(random() * 26))::text || '/' || (65 + floor(random() * 16))::text,
    s.weight,
    s.height,
    c.treatment,
    c.status,
    c.notes,
    t.ts
  from generate_series(1, 480) as g
  cross join lateral (
    select d::date as day
    from generate_series(current_date - 180, current_date - 1, interval '1 day') as d
    where extract(isodow from d) between 1 and 5
    order by random() + g * 0
    limit 1
  ) d
  cross join lateral (
    select d.day + interval '7 hours 15 minutes'
             + random() * interval '6 hours 30 minutes' as ts
  ) t
  cross join lateral (
    select id, weight, height
    from _seed_student
    order by random() + g * 0
    limit 1
  ) s
  cross join lateral (
    select *
    from _seed_complaint
    order by random() + g * 0
    limit 1
  ) c;

  -- ----------------------------------------------------------
  -- 4) 20 kunjungan hari ini (kalau hari kerja & sudah lewat 07.30)
  -- ----------------------------------------------------------
  insert into public.visits (
    school_id, student_id, staff_id, check_in_at, check_out_at,
    chief_complaint, temperature, blood_pressure, weight, height,
    treatment, final_status, notes, created_at
  )
  select
    v_school,
    s.id,
    v_staff,
    t.ts,
    least(t.ts + make_interval(mins => (10 + floor(random() * 31))::int), now()),
    c.complaint,
    round((c.tmin + random() * (c.tmax - c.tmin))::numeric, 1),
    (100 + floor(random() * 26))::text || '/' || (65 + floor(random() * 16))::text,
    s.weight,
    s.height,
    c.treatment,
    c.status,
    c.notes,
    t.ts
  from generate_series(1, 20) as g
  cross join lateral (
    select id, weight, height
    from _seed_student
    order by random() + g * 0
    limit 1
  ) s
  cross join lateral (
    select *
    from _seed_complaint
    order by random() + g * 0
    limit 1
  ) c
  cross join lateral (
    select
      date_trunc('day', now()) + interval '7 hours 15 minutes'
        + (random() + g * 0) * (
            least(now(), date_trunc('day', now()) + interval '13 hours 45 minutes')
            - (date_trunc('day', now()) + interval '7 hours 15 minutes')
          ) as ts
  ) t
  where extract(isodow from now()) between 1 and 5
    and now() >= date_trunc('day', now()) + interval '7 hours 30 minutes';

  -- ----------------------------------------------------------
  -- 5) Ringkasan
  -- ----------------------------------------------------------
  select count(*) into v_students
  from public.students
  where school_id = v_school;

  select count(*) into v_visits
  from public.visits
  where school_id = v_school;

  raise notice 'Selesai. Total siswa: %, total kunjungan: %', v_students, v_visits;
  raise notice 'Kunjungan 7 hari terakhir: %',
    (select count(*) from public.visits
     where school_id = v_school
       and check_in_at >= now() - interval '7 days');
end $$;
