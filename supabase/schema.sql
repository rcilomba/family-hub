-- Family Hub database schema for Supabase.
-- Run this file in the Supabase SQL editor when setting up the project.

create type public.user_role as enum ('admin', 'member');
create type public.booking_status as enum ('confirmed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_date_range check (start_date <= end_date)
);

create table public.booking_rooms (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete restrict,
  primary key (booking_id, room_id)
);

create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_date_range_idx on public.bookings (start_date, end_date);
create index booking_rooms_room_id_idx on public.booking_rooms (room_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.prevent_room_double_booking()
returns trigger
language plpgsql
as $$
declare
  target_booking public.bookings%rowtype;
begin
  select *
  into target_booking
  from public.bookings
  where id = new.booking_id;

  if target_booking.status <> 'confirmed' then
    return new;
  end if;

  if exists (
    select 1
    from public.booking_rooms existing_booking_room
    join public.bookings existing_booking
      on existing_booking.id = existing_booking_room.booking_id
    where existing_booking_room.room_id = new.room_id
      and existing_booking.id <> target_booking.id
      and existing_booking.status = 'confirmed'
      and existing_booking.start_date <= target_booking.end_date
      and existing_booking.end_date >= target_booking.start_date
  ) then
    raise exception 'Room is already booked for the selected dates.';
  end if;

  return new;
end;
$$;

create trigger booking_rooms_prevent_double_booking
before insert or update on public.booking_rooms
for each row
execute function public.prevent_room_double_booking();

create or replace function public.prevent_booking_update_double_booking()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  if exists (
    select 1
    from public.booking_rooms current_booking_room
    join public.booking_rooms existing_booking_room
      on existing_booking_room.room_id = current_booking_room.room_id
    join public.bookings existing_booking
      on existing_booking.id = existing_booking_room.booking_id
    where current_booking_room.booking_id = new.id
      and existing_booking.id <> new.id
      and existing_booking.status = 'confirmed'
      and existing_booking.start_date <= new.end_date
      and existing_booking.end_date >= new.start_date
  ) then
    raise exception 'Room is already booked for the selected dates.';
  end if;

  return new;
end;
$$;

create trigger bookings_prevent_double_booking_on_update
before update on public.bookings
for each row
execute function public.prevent_booking_update_double_booking();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_rooms enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create policy "Profiles are readable by signed-in users"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Rooms are readable by signed-in users"
on public.rooms
for select
to authenticated
using (true);

create policy "Admins can manage rooms"
on public.rooms
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Bookings are readable by signed-in users"
on public.bookings
for select
to authenticated
using (true);

create policy "Users can create their own bookings"
on public.bookings
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Admins can manage bookings"
on public.bookings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Booking rooms are readable by signed-in users"
on public.booking_rooms
for select
to authenticated
using (true);

create policy "Users can add rooms to their own bookings"
on public.booking_rooms
for insert
to authenticated
with check (
  exists (
    select 1
    from public.bookings
    where bookings.id = booking_rooms.booking_id
      and bookings.user_id = auth.uid()
  )
);

create policy "Admins can manage booking rooms"
on public.booking_rooms
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
