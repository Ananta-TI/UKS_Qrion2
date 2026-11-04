-- ============================================================
-- 009 — Hapus peran super_admin (satu sekolah, tanpa lintas tenant)
-- Jalankan SEKALI di Supabase SQL Editor.
--
-- Efek:
--   • Semua akun super_admin dipindahkan ke sekolah pertama, peran
--     diturunkan menjadi school_admin (bukan dihapus, supaya login tetap
--     bisa dipakai dan datanya tidak menggantung).
--   • Constraint role hanya mengizinkan school_admin & staff.
--   • Fungsi public.is_super_admin() dihapus; policy RLS disusun ulang
--     tanpa bypass lintas sekolah.
--
-- PERIKSA DULU (opsional) — lihat siapa yang akan berubah:
--   select id, email, role, school_id
--   from public.profiles
--   where role = 'super_admin';
--
-- Jalankan di dalam satu transaksi: bila ada langkah yang gagal,
-- tidak ada perubahan yang tersimpan.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Sekolah tujuan untuk akun yang belum punya sekolah
-- ------------------------------------------------------------
do $$
declare
  v_school uuid;
begin
  select id into v_school from public.schools order by created_at limit 1;

  if v_school is null then
    raise exception
      'Tidak ada baris di public.schools. Buat minimal satu sekolah sebelum menjalankan migrasi ini.';
  end if;

  -- Akun super_admin: turunkan peran + tempelkan ke sekolah.
  update public.profiles
  set role = 'school_admin',
      school_id = coalesce(school_id, v_school)
  where role = 'super_admin';

  -- Jaring pengaman: profil lain yang sekolahnya kosong (mis. sisa akun
  -- lintas tenant) ikut ditempelkan agar tidak ada profil yatim.
  update public.profiles
  set school_id = v_school
  where school_id is null;
end
$$;

-- ------------------------------------------------------------
-- 2) Constraint role: hanya dua peran
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('school_admin', 'staff'));

-- ------------------------------------------------------------
-- 3) school_id wajib terisi (sekarang semua profil sudah punya sekolah)
-- ------------------------------------------------------------
alter table public.profiles alter column school_id set not null;

-- ------------------------------------------------------------
-- 4) Policy RLS tanpa bypass super admin
--    Dibuat ulang agar klausa is_super_admin() ikut hilang.
-- ------------------------------------------------------------

do $$
declare
  t text;
  core_tables text[] := array['students', 'visits', 'medicines', 'medicine_logs'];
begin
  foreach t in array core_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('drop policy if exists "school isolation" on public.%I', t);
      execute format(
        'create policy "school isolation" on public.%I '
        'for all to authenticated '
        'using (school_id = (select public.current_school_id())) '
        'with check (school_id = (select public.current_school_id()))',
        t
      );
    end if;
  end loop;
end
$$;

-- medicine_batches (dibuat di 002) — lewati bila tabelnya belum ada
do $$
begin
  if to_regclass('public.medicine_batches') is not null then
    drop policy if exists "school isolation" on public.medicine_batches;
    create policy "school isolation" on public.medicine_batches
      for all to authenticated
      using (school_id = (select public.current_school_id()))
      with check (school_id = (select public.current_school_id()));
  end if;
end
$$;

-- saved_reports (dibuat di 004) — lewati bila tabelnya belum ada
do $$
begin
  if to_regclass('public.saved_reports') is not null then
    drop policy if exists "school isolation" on public.saved_reports;
    create policy "school isolation" on public.saved_reports
      for all to authenticated
      using (school_id = (select public.current_school_id()))
      with check (school_id = (select public.current_school_id()));
  end if;
end
$$;

-- activity_logs — lewati bila tabelnya belum ada
do $$
begin
  if to_regclass('public.activity_logs') is not null then
    drop policy if exists "activity read" on public.activity_logs;
    create policy "activity read" on public.activity_logs
      for select to authenticated
      using (school_id = (select public.current_school_id()));
  end if;
end
$$;

-- profiles: baca anggota sekolah sendiri + diri sendiri
drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles super admin" on public.profiles;
create policy "profiles read" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or school_id = (select public.current_school_id())
  );

-- schools: hanya sekolah sendiri (tidak ada lagi pengelola lintas sekolah)
drop policy if exists "schools read" on public.schools;
drop policy if exists "schools super admin" on public.schools;
create policy "schools read" on public.schools
  for select to authenticated
  using (id = (select public.current_school_id()));

-- ------------------------------------------------------------
-- 5) Trigger user baru: tolak role super_admin dari metadata
--    (sudah begitu sebelumnya, dipertahankan eksplisit)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case
      when new.raw_user_meta_data->>'role' in ('school_admin', 'staff')
        then new.raw_user_meta_data->>'role'
      else 'staff'
    end,
    nullif(new.raw_user_meta_data->>'school_id', '')::uuid
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 6) Hapus helper super admin
-- ------------------------------------------------------------
drop function if exists public.is_super_admin();

commit;

-- ============================================================
-- VERIFIKASI setelah commit:
--   select role, count(*) from public.profiles group by role;
--   -- harapan: hanya school_admin dan staff
--
--   select count(*) from public.profiles where school_id is null;
--   -- harapan: 0
--
--   select proname from pg_proc
--   where proname = 'is_super_admin';
--   -- harapan: 0 baris
-- ============================================================
