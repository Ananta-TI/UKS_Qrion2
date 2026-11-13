-- ============================================================
-- 010 — Dosis obat + RPC koreksi stok
--
-- 1) medicines.dosage: aturan pakai yang dicetak/ditampilkan saat
--    obat diberikan.
-- 2) adjust_medicine_stock(): mengubah stok ke nilai tertentu
--    (stok opname, rusak, kedaluwarsa dibuang, hilang) sekaligus
--    mencatat log + menyesuaikan batch secara FIFO.
--
-- Aman dijalankan berulang.
-- ============================================================

alter table public.medicines
  add column if not exists dosage text;

comment on column public.medicines.dosage is
  'Aturan pakai, mis. "3 x 1 tablet setelah makan".';

-- ------------------------------------------------------------
-- RPC koreksi stok
--
-- returns: { "ok": true,  "before": n, "after": n, "delta": n }
--          { "ok": false, "error": "invalid_stock" | "missing_reason"
--                                | "not_found" | "forbidden" }
-- ------------------------------------------------------------
create or replace function public.adjust_medicine_stock(
  p_medicine uuid,
  p_new_stock integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  v_med public.medicines%rowtype;
  v_before integer;
  v_delta integer;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_remaining integer;
  v_deduct integer;
  v_batch record;
begin
  if p_new_stock is null or p_new_stock < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_stock');
  end if;

  if v_reason is null then
    return jsonb_build_object('ok', false, 'error', 'missing_reason');
  end if;

  -- Kunci baris agar dua koreksi bersamaan tidak saling menimpa.
  select * into v_med from public.medicines where id = p_medicine for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Isolasi sekolah: user biasa hanya boleh mengoreksi stok sekolahnya.
  if v_school is not null and v_med.school_id <> v_school then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_before := coalesce(v_med.stock, 0);
  v_delta := p_new_stock - v_before;

  if v_delta = 0 then
    return jsonb_build_object(
      'ok', true, 'before', v_before, 'after', v_before, 'delta', 0);
  end if;

  update public.medicines
    set stock = p_new_stock
    where id = v_med.id;

  insert into public.medicine_logs (medicine_id, type, qty, notes)
    values (
      v_med.id,
      case when v_delta > 0 then 'in' else 'out' end,
      abs(v_delta),
      'Koreksi stok: ' || v_reason
    );

  -- Batch ikut disesuaikan agar sisa batch tidak menyimpang dari stok.
  if to_regclass('public.medicine_batches') is not null then
    if v_delta < 0 then
      v_remaining := -v_delta;
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
    else
      insert into public.medicine_batches (medicine_id, qty, expiry_date, notes)
        values (v_med.id, v_delta, v_med.expiry_date, 'Koreksi stok: ' || v_reason);
    end if;
  end if;

  return jsonb_build_object(
    'ok', true, 'before', v_before, 'after', p_new_stock, 'delta', v_delta);
end;
$$;

grant execute on function public.adjust_medicine_stock(uuid, integer, text) to authenticated;
