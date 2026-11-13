-- ============================================================
-- 011 — Data demografi siswa
--
-- gender     : 'L' (laki-laki) / 'P' (perempuan), boleh kosong.
-- birth_date : tanggal lahir, dipakai untuk menghitung usia.
--
-- Aman dijalankan berulang.
-- ============================================================

alter table public.students
  add column if not exists gender text;

alter table public.students
  add column if not exists birth_date date;

-- Batasi nilai gender tanpa gagal bila constraint sudah ada.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_gender_check'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_gender_check
      check (gender is null or gender in ('L', 'P'));
  end if;
end $$;

comment on column public.students.gender is 'L = laki-laki, P = perempuan.';
comment on column public.students.birth_date is 'Tanggal lahir siswa untuk hitung usia.';
