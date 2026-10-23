-- ============================================================
-- FIX: visits_staff_id_fkey
-- Pastikan setiap auth user punya baris di public.profiles.
-- Jalankan di Supabase SQL Editor.
-- ============================================================

-- 1) Backfill profil untuk auth user yang sudah ada
insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.email),
  'staff'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- 2) Auto-create profil setiap ada user baru
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
