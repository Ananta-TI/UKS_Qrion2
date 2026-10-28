-- ============================================================
-- 006 — RPC stock opname
-- Menyesuaikan stok obat ke jumlah hasil hitung fisik.
-- Selisih dicatat ke medicine_logs (in/out) dengan catatan opname.
-- ============================================================

create or replace function public.apply_stock_opname(
  p_medicine uuid,
  p_counted integer,
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
  v_diff integer;
  v_remaining integer;
  v_deduct integer;
  v_batch record;
  v_note text := coalesce(nullif(trim(p_note), ''), 'Penyesuaian stok opname');
begin
  if p_counted is null or p_counted < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_count');
  end if;

  select * into v_med from public.medicines where id = p_medicine for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_school is not null and v_med.school_id <> v_school then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_diff := p_counted - v_med.stock;

  if v_diff <> 0 then
    update public.medicines set stock = p_counted where id = v_med.id;

    insert into public.medicine_logs (medicine_id, type, qty, notes)
      values (v_med.id, case when v_diff > 0 then 'in' else 'out' end, abs(v_diff), v_note);

    if to_regclass('public.medicine_batches') is not null then
      if v_diff < 0 then
        v_remaining := -v_diff;
        for v_batch in
          select id, qty from public.medicine_batches
          where medicine_id = v_med.id and qty > 0
          order by expiry_date nulls last, received_at
        loop
          exit when v_remaining <= 0;
          v_deduct := least(v_batch.qty, v_remaining);
          update public.medicine_batches set qty = qty - v_deduct where id = v_batch.id;
          v_remaining := v_remaining - v_deduct;
        end loop;
      else
        insert into public.medicine_batches (school_id, medicine_id, qty, expiry_date, notes)
        values (v_med.school_id, v_med.id, v_diff, v_med.expiry_date, v_note);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'before', v_med.stock,
    'after', p_counted,
    'diff', v_diff
  );
end;
$$;

grant execute on function public.apply_stock_opname(uuid, integer, text) to authenticated;
