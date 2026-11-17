-- ============================================================
-- 012 — Kode kartu siswa (hasil scan)
--
-- card_code : kode unik pada kartu siswa (RFID/barcode/QR),
--             disimpan sebagai teks agar angka nol di depan tetap utuh.
--
-- Kartu dipakai untuk membuka halaman Catat Kunjungan dengan siswa
-- yang sesuai, dari halaman mana pun.
--
-- Aman dijalankan berulang.
-- ============================================================

alter table public.students
  add column if not exists card_code text;

-- Jangan simpan string kosong; gunakan NULL.
update public.students
set card_code = null
where card_code = '';

-- Satu kode kartu hanya boleh dipakai satu siswa dalam satu sekolah.
create unique index if not exists students_school_card_code_key
  on public.students (school_id, card_code)
  where card_code is not null;

-- Mempercepat pencarian kartu saat scan (RLS tetap membatasi per sekolah).
create index if not exists students_card_code_idx
  on public.students (card_code)
  where card_code is not null;

comment on column public.students.card_code is
  'Kode unik kartu siswa (hasil scan), unik per sekolah.';

-- Daftarkan kartu 0008289331 untuk Abel Tanjung di SMA Suzuran.
-- NIS dipakai untuk membedakan dari siswa bernama sama di sekolah lain.
update public.students s
set card_code = '0008289331'
where lower(trim(s.full_name)) = lower('Abel Tanjung')
  and s.nis = '2627050'
  and s.school_id = (
    select id from public.schools where name = 'SMA Suzuran' limit 1
  )
  and (s.card_code is null or s.card_code = '0008289331');

-- Segarkan cache skema PostgREST agar kolom baru langsung terbaca aplikasi.
notify pgrst, 'reload schema';
