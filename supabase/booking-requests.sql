-- Run in SQL Editor after schema.sql. Existing bookings are preserved.
-- Enum changes must commit before the functions below use the new values.
begin;
alter type public.booking_status add value if not exists 'pending';
alter type public.booking_status add value if not exists 'rejected';
commit;

begin;

create table if not exists public.booking_approvals (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (booking_id, user_id)
);
alter table public.booking_approvals enable row level security;
drop policy if exists "Signed-in users read approvals" on public.booking_approvals;
create policy "Signed-in users read approvals" on public.booking_approvals
for select to authenticated using (true);
grant select on public.booking_approvals to authenticated;

-- Writes go through authenticated functions so clients cannot bypass approval.
revoke insert, update, delete, truncate on public.bookings, public.booking_rooms,
  public.booking_approvals from anon, authenticated;

create or replace function public.save_booking_request(
  p_start date, p_end date, p_rooms uuid[], p_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_owner uuid;
  v_status public.booking_status;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  -- Serialize booking writes: two simultaneous requests cannot both take a room.
  lock table public.bookings in share row exclusive mode;
  lock table public.rooms in share mode;
  if p_start is null or p_end is null or p_start > p_end
    or coalesce(cardinality(p_rooms), 0) = 0 then
    raise exception 'Invalid dates or rooms';
  end if;
  if exists (select 1 from unnest(p_rooms) r(id)
    where r.id is null or not exists (
      select 1 from public.rooms where id = r.id and is_active
    )) then raise exception 'Room is missing or inactive'; end if;
  v_owner := auth.uid();
  if p_id is not null then
    select user_id into v_owner from public.bookings
      where id = p_id and status in ('confirmed', 'pending');
    if not found or (v_owner <> auth.uid() and not public.is_admin()) then
      raise exception 'Booking cannot be edited';
    end if;
  end if;
  if exists (select 1 from public.bookings b
    join public.booking_rooms br on br.booking_id = b.id
    where b.status = 'confirmed' and (p_id is null or b.id <> p_id)
      and b.start_date <= p_end and b.end_date >= p_start
      and br.room_id = any(p_rooms)) then
    raise exception 'Room is already booked for the selected dates.';
  end if;
  v_status := case when exists (
    select 1 from public.bookings b where b.status = 'confirmed'
      and (p_id is null or b.id <> p_id) and b.user_id <> v_owner
      and b.start_date <= p_end and b.end_date >= p_start
  ) then 'pending'::public.booking_status else 'confirmed'::public.booking_status end;
  if p_id is null then
    insert into public.bookings(user_id, start_date, end_date, status)
      values (v_owner, p_start, p_end, 'pending') returning id into v_id;
  else
    v_id := p_id;
    update public.bookings set status = 'pending' where id = v_id;
    delete from public.booking_rooms where booking_id = v_id;
    delete from public.booking_approvals where booking_id = v_id;
    update public.bookings set start_date = p_start, end_date = p_end where id = v_id;
  end if;
  insert into public.booking_rooms(booking_id, room_id)
    select v_id, id from (select distinct unnest(p_rooms) as id) r;
  update public.bookings set status = v_status where id = v_id;
  return v_id;
end;
$$;

create or replace function public.decide_booking_request(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings%rowtype;
begin
  if auth.uid() is null or p_approve is null then raise exception 'Invalid decision'; end if;
  lock table public.bookings in share row exclusive mode;
  lock table public.rooms in share mode;
  select * into v_booking from public.bookings where id = p_id and status = 'pending';
  if not found then raise exception 'Request is no longer pending'; end if;
  if not public.is_admin() and not exists (
    select 1 from public.bookings b where b.status = 'confirmed'
      and b.user_id = auth.uid() and b.user_id <> v_booking.user_id
      and b.start_date <= v_booking.end_date and b.end_date >= v_booking.start_date
  ) then raise exception 'Not allowed to decide this request'; end if;
  if not p_approve then
    update public.bookings set status = 'rejected' where id = p_id;
    return;
  end if;
  insert into public.booking_approvals values (p_id, auth.uid()) on conflict do nothing;
  if public.is_admin() or not exists (
    select 1 from public.bookings b where b.status = 'confirmed'
      and b.user_id <> v_booking.user_id
      and b.start_date <= v_booking.end_date and b.end_date >= v_booking.start_date
      and not exists (select 1 from public.booking_approvals a
        where a.booking_id = p_id and a.user_id = b.user_id)
  ) then
    if exists (select 1 from public.booking_rooms br join public.rooms r on r.id = br.room_id
      where br.booking_id = p_id and not r.is_active) then
      raise exception 'Room is inactive';
    end if;
    -- Existing double-booking trigger checks rooms again on confirmation.
    update public.bookings set status = 'confirmed' where id = p_id;
  end if;
end;
$$;

create or replace function public.cancel_booking_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin required'; end if;
  lock table public.bookings in share row exclusive mode;
  update public.bookings set status = 'cancelled' where id = p_id;
end;
$$;
revoke all on function public.save_booking_request(date,date,uuid[],uuid),
  public.decide_booking_request(uuid,boolean), public.cancel_booking_request(uuid) from public, anon;
grant execute on function public.save_booking_request(date,date,uuid[],uuid),
  public.decide_booking_request(uuid,boolean), public.cancel_booking_request(uuid) to authenticated;
commit;
