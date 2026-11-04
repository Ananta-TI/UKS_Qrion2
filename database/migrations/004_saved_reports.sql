-- ============================================================
-- 004 — Laporan tersimpan di server (dibagi antar-staf)
-- Menggantikan penyimpanan localStorage lama.
-- ============================================================

create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default public.current_school_id() references public.schools(id) on delete cascade,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_by_name text,
  name text not null,
  metric text not null default 'visits',
  group_by text not null default 'month',
  chart text not null default 'area',
  range_key text not null default '6m',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_reports_school_idx
  on public.saved_reports(school_id, created_at desc);

drop trigger if exists set_school_id on public.saved_reports;
create trigger set_school_id
  before insert on public.saved_reports
  for each row execute function public.set_school_id();

alter table public.saved_reports enable row level security;

drop policy if exists "school isolation" on public.saved_reports;
create policy "school isolation" on public.saved_reports
  for all to authenticated
  using (school_id = (select public.current_school_id()))
  with check (school_id = (select public.current_school_id()));
