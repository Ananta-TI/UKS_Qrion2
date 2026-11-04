-- ============================================================
-- Activity log UKS
-- Jalankan SEKALI di Supabase SQL Editor, setelah
-- migration_multi_tenant.sql. Tanpa tabel ini, semua log
-- aktivitas (termasuk login) tidak akan tersimpan.
-- ============================================================

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default public.current_school_id() references public.schools(id) on delete cascade,
  actor_id uuid default auth.uid() references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_school_created_idx
  on public.activity_logs(school_id, created_at desc);

create index if not exists activity_logs_actor_created_idx
  on public.activity_logs(actor_id, created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "activity read" on public.activity_logs;
drop policy if exists "activity insert" on public.activity_logs;

-- Semua anggota sekolah boleh membaca log sekolahnya sendiri.
create policy "activity read" on public.activity_logs
  for select to authenticated
  using (
    school_id = (select public.current_school_id())
  );

-- Browser menulis lewat /api/activity (service role), tetapi policy ini tetap
-- dipertahankan agar insert langsung dari sesi pengguna juga sah.
create policy "activity insert" on public.activity_logs
  for insert to authenticated
  with check (
    school_id = (select public.current_school_id())
    and actor_id = auth.uid()
  );
