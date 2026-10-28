-- ============================================================
-- 007 — Uji isolasi antar-sekolah (tenant isolation)
-- Fungsi ini TIDAK mengubah data. Ia memeriksa apakah
-- prasyarat isolasi sudah terpenuhi, lalu mengembalikan
-- laporan status per pemeriksaan.
--
--   select * from public.tenant_isolation_report();
-- ============================================================

create or replace function public.tenant_isolation_report()
returns table (check_name text, status text, detail text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t text;
  tables text[] := array['students', 'visits', 'medicines', 'medicine_logs', 'activity_logs'];
  v_nulls bigint;
  v_rls boolean;
  v_policy integer;
begin
  foreach t in array tables loop
    -- 1) Tidak ada baris tanpa school_id.
    execute format('select count(*) from public.%I where school_id is null', t) into v_nulls;
    check_name := format('school_id terisi: %s', t);
    status := case when v_nulls = 0 then 'OK' else 'GAGAL' end;
    detail := case when v_nulls = 0 then 'Semua baris memiliki school_id.' else format('%s baris NULL.', v_nulls) end;
    return next;

    -- 2) Row Level Security aktif.
    select relrowsecurity into v_rls
      from pg_class where oid = format('public.%I', t)::regclass;
    check_name := format('RLS aktif: %s', t);
    status := case when v_rls then 'OK' else 'GAGAL' end;
    detail := case when v_rls then 'Row Level Security aktif.' else 'RLS belum diaktifkan.' end;
    return next;

    -- 3) Policy "school isolation" ada.
    select count(*) into v_policy
      from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'school isolation';
    check_name := format('Policy isolasi: %s', t);
    status := case when v_policy > 0 then 'OK' else 'GAGAL' end;
    detail := case when v_policy > 0 then 'Policy school isolation terpasang.' else 'Policy belum ada.' end;
    return next;
  end loop;

  -- 4) Helper sekolah aktif.
  check_name := 'Fungsi current_school_id()';
  status := case when to_regprocedure('public.current_school_id()') is not null then 'OK' else 'GAGAL' end;
  detail := case when to_regprocedure('public.current_school_id()') is not null then 'Tersedia.' else 'Fungsi belum dibuat.' end;
  return next;

  -- 5) Unik NIS per sekolah.
  check_name := 'Keunikan NIS per sekolah';
  status := case
    when exists (
      select 1 from pg_constraint
      where conname = 'students_school_nis_key' and conrelid = 'public.students'::regclass
    ) then 'OK' else 'GAGAL' end;
  detail := case
    when exists (
      select 1 from pg_constraint
      where conname = 'students_school_nis_key' and conrelid = 'public.students'::regclass
    ) then 'Constraint students_school_nis_key ada.' else 'Constraint belum ada.' end;
  return next;
end;
$$;

grant execute on function public.tenant_isolation_report() to authenticated;
