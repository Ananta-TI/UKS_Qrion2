-- ============================================================
-- 002 — Batch obat per penerimaan (qty + kedaluwarsa)
-- medicines.stock tetap menjadi saldo total yang dipakai UI.
-- medicine_batches adalah lapisan tambahan (FIFO berdasarkan
-- kedaluwarsa) untuk pelacakan yang lebih akurat.
-- ============================================================

create table if not exists public.medicine_batches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default public.current_school_id() references public.schools(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  qty integer not null default 0 check (qty >= 0),
  expiry_date date,
  batch_no text,
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists medicine_batches_medicine_idx
  on public.medicine_batches(medicine_id, expiry_date nulls last);
create index if not exists medicine_batches_school_idx
  on public.medicine_batches(school_id);

drop trigger if exists set_school_id on public.medicine_batches;
create trigger set_school_id
  before insert on public.medicine_batches
  for each row execute function public.set_school_id();

alter table public.medicine_batches enable row level security;

drop policy if exists "school isolation" on public.medicine_batches;
create policy "school isolation" on public.medicine_batches
  for all to authenticated
  using ((select public.is_super_admin()) or school_id = (select public.current_school_id()))
  with check ((select public.is_super_admin()) or school_id = (select public.current_school_id()));

-- ------------------------------------------------------------
-- Backfill: buat satu batch "saldo awal" dari stok berjalan.
-- Hanya untuk obat yang belum punya batch sama sekali.
-- ------------------------------------------------------------
insert into public.medicine_batches (school_id, medicine_id, qty, expiry_date, notes)
select m.school_id, m.id, m.stock, m.expiry_date, 'Saldo awal migrasi batch'
from public.medicines m
where m.stock > 0
  and not exists (
    select 1 from public.medicine_batches b where b.medicine_id = m.id
  );
