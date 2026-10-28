-- ============================================================
-- 001 — Tenant defaults
-- Memastikan school_id SELALU terisi otomatis pada setiap tabel
-- data, walau nilai tidak dikirim dari aplikasi.
-- Aman dijalankan berulang.
-- ============================================================

-- Pastikan helper ada (biasanya sudah dibuat migration_multi_tenant.sql).
create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

-- ------------------------------------------------------------
-- Trigger: isi school_id dari sesi bila kosong.
-- Berlaku untuk insert dari aplikasi maupun SQL manual.
-- ------------------------------------------------------------
create or replace function public.set_school_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.school_id is null then
    new.school_id := public.current_school_id();
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array['students', 'visits', 'medicines', 'medicine_logs', 'activity_logs'];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'school_id'
    ) then
      execute format('drop trigger if exists set_school_id on public.%I', t);
      execute format(
        'create trigger set_school_id before insert on public.%I for each row execute function public.set_school_id()',
        t
      );
      execute format('alter table public.%I alter column school_id set default public.current_school_id()', t);
    end if;
  end loop;
end $$;
