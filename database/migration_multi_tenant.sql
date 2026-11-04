-- ============================================================
-- MIGRATION: Multi-tenant (banyak sekolah)
-- Jalankan SEKALI di Supabase SQL Editor, setelah schema.sql.
-- Urutan aman untuk data yang sudah ada (backfill otomatis).
-- Catatan: peran super_admin sudah DIHAPUS (lihat 009_remove_super_admin.sql).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabel sekolah
-- ------------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.schools (name, slug, address)
select 'Sekolah Demo', 'sekolah-demo', 'Alamat sekolah'
where not exists (select 1 from public.schools);

-- ------------------------------------------------------------
-- 2) profiles: email, school_id, role baru
-- ------------------------------------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists school_id uuid references public.schools(id) on delete cascade;

-- Helper: sekolah user saat ini
-- (dibuat setelah kolom profiles.school_id ada)
create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Longgarkan constraint role lama SEBELUM rename 'admin' -> 'school_admin'
alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles
set role = 'school_admin'
where role = 'admin';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('school_admin', 'staff'));

-- semua user lama masuk ke sekolah default
update public.profiles
set school_id = (select id from public.schools order by created_at limit 1)
where school_id is null;

-- ------------------------------------------------------------
-- 4) school_id di tabel data + backfill + default
-- ------------------------------------------------------------
alter table public.students add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.visits add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.medicines add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.medicine_logs add column if not exists school_id uuid references public.schools(id) on delete cascade;

update public.students set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.visits set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.medicines set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;
update public.medicine_logs set school_id = (select id from public.schools order by created_at limit 1) where school_id is null;

alter table public.students alter column school_id set default public.current_school_id();
alter table public.visits alter column school_id set default public.current_school_id();
alter table public.medicines alter column school_id set default public.current_school_id();
alter table public.medicine_logs alter column school_id set default public.current_school_id();

alter table public.students alter column school_id set not null;
alter table public.visits alter column school_id set not null;
alter table public.medicines alter column school_id set not null;
alter table public.medicine_logs alter column school_id set not null;

create index if not exists profiles_school_idx on public.profiles(school_id);
create index if not exists students_school_idx on public.students(school_id);
create index if not exists visits_school_idx on public.visits(school_id);
create index if not exists medicines_school_idx on public.medicines(school_id);
create index if not exists medicine_logs_school_idx on public.medicine_logs(school_id);

-- NIS cukup unik di dalam satu sekolah (bukan global antar sekolah)
alter table public.students drop constraint if exists students_nis_key;
alter table public.students drop constraint if exists students_school_nis_key;
alter table public.students
  add constraint students_school_nis_key unique (school_id, nis);

-- ------------------------------------------------------------
-- 5) RLS: isolasi per sekolah
-- ------------------------------------------------------------
drop policy if exists "UKS staff full access" on public.students;
drop policy if exists "UKS staff full access" on public.visits;
drop policy if exists "UKS staff full access" on public.medicines;
drop policy if exists "UKS staff full access" on public.medicine_logs;
drop policy if exists "UKS staff full access" on public.profiles;

drop policy if exists "school isolation" on public.students;
drop policy if exists "school isolation" on public.visits;
drop policy if exists "school isolation" on public.medicines;
drop policy if exists "school isolation" on public.medicine_logs;

create policy "school isolation" on public.students
  for all to authenticated
  using (school_id = (select public.current_school_id()))
  with check (school_id = (select public.current_school_id()));

create policy "school isolation" on public.visits
  for all to authenticated
  using (school_id = (select public.current_school_id()))
  with check (school_id = (select public.current_school_id()));

create policy "school isolation" on public.medicines
  for all to authenticated
  using (school_id = (select public.current_school_id()))
  with check (school_id = (select public.current_school_id()));

create policy "school isolation" on public.medicine_logs
  for all to authenticated
  using (school_id = (select public.current_school_id()))
  with check (school_id = (select public.current_school_id()));

-- profiles
drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles super admin" on public.profiles;

create policy "profiles read" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or school_id = (select public.current_school_id())
  );

-- schools
drop policy if exists "schools read" on public.schools;
drop policy if exists "schools super admin" on public.schools;

create policy "schools read" on public.schools
  for select to authenticated
  using (id = (select public.current_school_id()));

-- ------------------------------------------------------------
-- 6) Trigger user baru: bawa email, role, school_id dari metadata
--    (role hanya school_admin/staff; super_admin tidak ada lagi)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 7) Peran super_admin sudah dihapus.
--    Untuk menjadikan seseorang admin sekolah, ubah lewat aplikasi
--    (Pengaturan → Pengguna & peran) atau:
--      update public.profiles set role = 'school_admin' where id = '...';
-- ------------------------------------------------------------
