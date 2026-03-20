-- ============================================
-- SMC Room Booking - Supabase Schema v2
-- Run this in Supabase SQL Editor
-- ============================================

create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  phone_internal text,       -- เบอร์ติดต่อภายใน (optional)
  department text,           -- สาขาวิชา (optional)
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Rooms table
create table public.rooms (
  id text primary key,
  name text not null,
  capacity integer not null default 50,
  description text,
  amenities text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now() not null
);

insert into public.rooms (id, name, capacity, description, amenities) values
  ('smc-601', 'SMC 601', 50, 'ห้องประชุมขนาดกลาง ชั้น 6', array['โปรเจกเตอร์','ไวท์บอร์ด','สมาร์ทบอร์ด','WiFi','เครื่องปรับอากาศ']),
  ('smc-605', 'SMC 605', 50, 'ห้องประชุมขนาดใหญ่ ชั้น 6',  array['โปรเจกเตอร์','ไวท์บอร์ด','สมาร์ทบอร์ด','WiFi','เครื่องปรับอากาศ','ระบบเสียง']);

-- Reservations table (supports multiple rooms via room_ids array)
create table public.reservations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  room_ids text[] not null default '{}',     -- e.g. {'smc-601','smc-605'}
  date date not null,
  start_time time not null,
  end_time time not null,
  title text not null,
  description text,
  equipment text[] default '{}',             -- e.g. {'smartboard','bi_machine'}
  status text default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index reservations_date_idx    on public.reservations(date);
create index reservations_user_id_idx on public.reservations(user_id);
create index reservations_status_idx  on public.reservations(status);
create index reservations_room_ids_idx on public.reservations using gin(room_ids);

-- RLS
alter table public.profiles     enable row level security;
alter table public.rooms        enable row level security;
alter table public.reservations enable row level security;

create policy "Profiles viewable by all"      on public.profiles for select using (true);
create policy "Users insert own profile"      on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile"      on public.profiles for update using (auth.uid() = id);

create policy "Rooms viewable by all"         on public.rooms for select using (true);

create policy "Confirmed reservations public" on public.reservations for select using (status = 'confirmed');
create policy "Users see own reservations"    on public.reservations for select using (auth.uid() = user_id);
create policy "Users insert own reservation"  on public.reservations for insert with check (auth.uid() = user_id);
create policy "Users update own reservation"  on public.reservations for update using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger update_reservations_updated_at before update on public.reservations
  for each row execute procedure public.update_updated_at_column();

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at_column();
