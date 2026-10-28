-- ============================================================
-- 008 — RPC atomik penambahan stok (restok)
-- Dipakai inventaris saat menekan "+1 Stok". Menambah stok dan
-- mencatat log + batch dalam satu transaksi, sehingga dua restok
-- bersamaan tidak saling menimpa (dulu: read-modify-write di klien).
--
-- returns: { "ok": true, "before": n, "after": n, "added": q }
--          { "ok": false, "error": "invalid_qty" | "not_found" | "forbidden" }
-- ============================================================

create or replace function public.restock_medicine(
  p_medicine uuid,
  p_qty integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  v_med public.medicines%rowtype;
  v_note text := coalesce(nullif(trim(p_note), ''), 'Restok');
begin
  if p_qty is null or p_qty <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_qty');
  end if;

  select * into v_med from public.medicines where id = p_medicine for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Isolasi sekolah: user biasa hanya boleh menambah stok sekolahnya.
  if v_school is not null and v_med.school_id <> v_school then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.medicines
    set stock = stock + p_qty
    where id = v_med.id;

  insert into public.medicine_logs (medicine_id, type, qty, notes)
    values (v_med.id, 'in', p_qty, v_note);

  -- Catat batch penerimaan bila tabel batch tersedia.
  if to_regclass('public.medicine_batches') is not null then
    insert into public.medicine_batches (school_id, medicine_id, qty, expiry_date, notes)
      values (v_med.school_id, v_med.id, p_qty, v_med.expiry_date, v_note);
  end if;

  return jsonb_build_object(
    'ok', true,
    'before', v_med.stock,
    'after', v_med.stock + p_qty,
    'added', p_qty
  );
end;
$$;

grant execute on function public.restock_medicine(uuid, integer, text) to authenticated;
