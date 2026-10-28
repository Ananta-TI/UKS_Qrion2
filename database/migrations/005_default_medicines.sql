-- ============================================================
-- 005 — Seeder obat bawaan untuk sekolah baru
-- Menyalin daftar obat standar UKS ketika sekolah dibuat,
-- supaya sekolah baru tidak mulai dengan inventaris kosong.
-- ============================================================

create or replace function public.seed_default_medicines(p_school uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer := 0;
begin
  if p_school is null then
    return 0;
  end if;

  -- Jangan menimpa sekolah yang sudah punya obat.
  if exists (select 1 from public.medicines where school_id = p_school) then
    return 0;
  end if;

  insert into public.medicines (school_id, name, category, unit, stock, min_stock, location)
  values
    (p_school, 'Paracetamol 500 mg', 'Analgesik / Antipiretik', 'strip', 20, 5, 'Rak A1'),
    (p_school, 'CTM (Chlorpheniramine)', 'Antihistamin', 'strip', 12, 4, 'Rak A2'),
    (p_school, 'Antasida DOEN', 'Antasida', 'strip', 15, 5, 'Rak A1'),
    (p_school, 'Oralit', 'Rehidrasi', 'pcs', 24, 8, 'Rak A3'),
    (p_school, 'Povidone Iodine 10%', 'Antiseptik', 'botol', 6, 2, 'Rak B1'),
    (p_school, 'Kasa Steril', 'Perawatan Luka', 'pcs', 30, 10, 'Rak B1'),
    (p_school, 'Plester Luka', 'Perawatan Luka', 'pcs', 25, 8, 'Rak B2'),
    (p_school, 'Minyak Kayu Putih', 'Tradisional', 'botol', 8, 3, 'Rak C1'),
    (p_school, 'Betadine Solution', 'Antiseptik', 'botol', 5, 2, 'Rak B1'),
    (p_school, 'Vitamin C', 'Suplemen', 'strip', 10, 3, 'Rak C2');

  get diagnostics inserted = row_count;

  -- Buat batch saldo awal agar pelacakan batch konsisten.
  if to_regclass('public.medicine_batches') is not null then
    insert into public.medicine_batches (school_id, medicine_id, qty, notes)
    select m.school_id, m.id, m.stock, 'Stok awal (obat bawaan)'
    from public.medicines m
    where m.school_id = p_school
      and not exists (select 1 from public.medicine_batches b where b.medicine_id = m.id);
  end if;

  return inserted;
end;
$$;

-- Otomatis saat sekolah baru dibuat.
create or replace function public.handle_new_school()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_medicines(new.id);
  return new;
end;
$$;

drop trigger if exists on_school_created on public.schools;
create trigger on_school_created
  after insert on public.schools
  for each row execute function public.handle_new_school();

-- Backfill: sekolah lama yang belum punya obat sama sekali.
do $$
declare
  s record;
begin
  for s in
    select sc.id from public.schools sc
    where not exists (select 1 from public.medicines m where m.school_id = sc.id)
  loop
    perform public.seed_default_medicines(s.id);
  end loop;
end $$;
