-- ============================================================
-- 003 — RPC atomik pemotongan stok obat
-- Dipanggil aplikasi saat menyimpan kunjungan dengan obat.
-- Mengunci baris obat (FOR UPDATE) sehingga dua pemotongan
-- bersamaan tidak bisa menghasilkan stok minus.
--
-- p_items: [ { "id": "<uuid>", "qty": 2, "name": "Paracetamol" }, ... ]
-- returns: { "dispensed": [...], "skipped": [...] }
-- ============================================================

create or replace function public.dispense_medicines(
  p_visit_id uuid,
  p_items jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  item jsonb;
  v_med public.medicines%rowtype;
  v_req integer;
  v_take integer;
  v_remaining integer;
  v_deduct integer;
  v_batch record;
  dispensed jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('dispensed', dispensed, 'skipped', skipped);
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    v_req := greatest(0, coalesce((item->>'qty')::int, 0));
    if v_req = 0 then
      continue;
    end if;

    select * into v_med from public.medicines where id = (item->>'id')::uuid for update;

    if not found then
      skipped := skipped || jsonb_build_object(
        'id', item->>'id', 'name', coalesce(item->>'name', ''), 'reason', 'not_found');
      continue;
    end if;

    -- Isolasi sekolah: user biasa hanya boleh memotong stok sekolahnya.
    if v_school is not null and v_med.school_id <> v_school then
      skipped := skipped || jsonb_build_object(
        'id', v_med.id, 'name', v_med.name, 'reason', 'forbidden');
      continue;
    end if;

    v_take := least(v_req, greatest(0, v_med.stock));

    if v_take <= 0 then
      skipped := skipped || jsonb_build_object(
        'id', v_med.id, 'name', v_med.name, 'reason', 'empty');
      continue;
    end if;

    update public.medicines
      set stock = stock - v_take
      where id = v_med.id;

    insert into public.medicine_logs (medicine_id, type, qty, reference_id, notes)
      values (
        v_med.id,
        'out',
        v_take,
        p_visit_id,
        coalesce(p_note, 'Diberikan pada kunjungan')
      );

    -- Kurangi batch secara FIFO berdasarkan kedaluwarsa terdekat.
    if to_regclass('public.medicine_batches') is not null then
      v_remaining := v_take;
      for v_batch in
        select id, qty
        from public.medicine_batches
        where medicine_id = v_med.id and qty > 0
        order by expiry_date nulls last, received_at
      loop
        exit when v_remaining <= 0;
        v_deduct := least(v_batch.qty, v_remaining);
        update public.medicine_batches
          set qty = qty - v_deduct
          where id = v_batch.id;
        v_remaining := v_remaining - v_deduct;
      end loop;
    end if;

    dispensed := dispensed || jsonb_build_object(
      'id', v_med.id,
      'name', v_med.name,
      'qty', v_take,
      'requested', v_req
    );

    if v_take < v_req then
      skipped := skipped || jsonb_build_object(
        'id', v_med.id,
        'name', v_med.name,
        'reason', 'insufficient',
        'requested', v_req,
        'given', v_take
      );
    end if;
  end loop;

  return jsonb_build_object('dispensed', dispensed, 'skipped', skipped);
end;
$$;

grant execute on function public.dispense_medicines(uuid, jsonb, text) to authenticated;
