-- Enable extensions
create extension if not exists "pgcrypto";

-- Profiles (UKS staff only)
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text check (role in ('admin', 'staff')) default 'staff',
  school text,
  created_at timestamptz default now()
);

-- Students
create table students (
  id uuid default gen_random_uuid() primary key,
  nis text unique not null,
  full_name text not null,
  class text,
  blood_type text,
  allergies text default '',
  chronic_diseases text default '',
  created_at timestamptz default now()
);

-- Visits / Medical records
create table visits (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) on delete cascade not null,
  staff_id uuid references profiles(id) not null,
  check_in_at timestamptz default now(),
  check_out_at timestamptz,
  chief_complaint text,
  temperature numeric,
  blood_pressure text,
  weight numeric,
  height numeric,
  treatment text,
  final_status text check (final_status in ('back_to_class','referred','picked_up')),
  notes text,
  created_at timestamptz default now()
);

-- Medicines
create table medicines (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text,
  unit text check (unit in ('strip','botol','pcs')) default 'pcs',
  stock integer default 0,
  min_stock integer default 5,
  location text,
  expiry_date date,
  created_at timestamptz default now()
);

-- Medicine stock logs
create table medicine_logs (
  id uuid default gen_random_uuid() primary key,
  medicine_id uuid references medicines(id) on delete cascade not null,
  type text check (type in ('in','out')) not null,
  qty integer not null,
  reference_id uuid,
  notes text,
  created_at timestamptz default now()
);

-- Indexes
create index visits_student_id_idx on visits(student_id);
create index visits_check_in_at_idx on visits(check_in_at);
create index medicine_logs_medicine_id_idx on medicine_logs(medicine_id);

-- RLS
alter table profiles enable row level security;
alter table students enable row level security;
alter table visits enable row level security;
alter table medicines enable row level security;
alter table medicine_logs enable row level security;

-- Policies: authenticated UKS staff can read/write all internal tables
create policy "UKS staff full access" on profiles for all to authenticated using (true) with check (true);
create policy "UKS staff full access" on students for all to authenticated using (true) with check (true);
create policy "UKS staff full access" on visits for all to authenticated using (true) with check (true);
create policy "UKS staff full access" on medicines for all to authenticated using (true) with check (true);
create policy "UKS staff full access" on medicine_logs for all to authenticated using (true) with check (true);

-- Auto-create profil staf saat user baru dibuat (mencegah FK visits_staff_id_fkey)
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
