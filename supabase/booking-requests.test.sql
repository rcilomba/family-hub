-- Run AFTER booking-requests.sql, preferably in a separate test project.
-- All temporary users, rooms and bookings are rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid();
  r2 uuid := gen_random_uuid();
  r3 uuid := gen_random_uuid();
  first_id uuid;
  request_id uuid;
  second_id uuid;
  third_id uuid;
  failed boolean;
begin
  insert into public.allowed_emails(email)
    select id::text || '@booking-test.invalid' from unnest(array[a,b,c,admin_id]) id;
  insert into auth.users(id, email, raw_user_meta_data)
    select id, id::text || '@booking-test.invalid', '{"display_name":"Booking Test"}'::jsonb
    from unnest(array[a,b,c,admin_id]) id;
  update public.profiles set role = 'admin' where id = admin_id;
  insert into public.rooms(id,name) values (r1,'Test 1'),(r2,'Test 2'),(r3,'Test 3');

  perform set_config('request.jwt.claim.sub', a::text, true);
  first_id := public.save_booking_request('2099-01-10','2099-01-14',array[r1]);
  if (select status from public.bookings where id = first_id) <> 'confirmed' then
    raise exception 'First booking should be confirmed';
  end if;

  perform set_config('request.jwt.claim.sub', b::text, true);
  request_id := public.save_booking_request('2099-01-12','2099-01-14',array[r2]);
  if (select status from public.bookings where id = request_id) <> 'pending' then
    raise exception 'Overlapping stay should be pending';
  end if;
  -- A requester cannot approve their own request.
  failed := false;
  begin
    perform public.decide_booking_request(request_id,true);
  exception when raise_exception then failed := true;
  end;
  if not failed then raise exception 'Self approval must fail'; end if;

  -- Unrelated users cannot approve, edit others, or cancel bookings.
  perform set_config('request.jwt.claim.sub', c::text, true);
  failed := false;
  begin
    perform public.decide_booking_request(request_id,true);
  exception when raise_exception then failed := true;
  end;
  if not failed then raise exception 'Unrelated approval must fail'; end if;
  failed := false;
  begin
    perform public.save_booking_request('2099-01-12','2099-01-14',array[r2],request_id);
  exception when raise_exception then failed := true;
  end;
  if not failed then raise exception 'Editing another user must fail'; end if;
  failed := false;
  begin
    perform public.cancel_booking_request(first_id);
  exception when raise_exception then failed := true;
  end;
  if not failed then raise exception 'Member cancellation must fail'; end if;

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.decide_booking_request(request_id,true);
  if (select status from public.bookings where id = request_id) <> 'confirmed' then
    raise exception 'Approval should confirm request';
  end if;

  perform set_config('request.jwt.claim.sub', c::text, true);
  third_id := public.save_booking_request('2099-01-12','2099-01-14',array[r3]);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.decide_booking_request(third_id,true);
  if (select status from public.bookings where id = third_id) <> 'pending' then
    raise exception 'All overlapping owners must approve';
  end if;
  perform set_config('request.jwt.claim.sub', c::text, true);
  perform public.save_booking_request('2099-01-13','2099-01-14',array[r3],third_id);
  if exists (select 1 from public.booking_approvals where booking_id = third_id) then
    raise exception 'Edit should reset approvals';
  end if;
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.decide_booking_request(third_id,false);
  if (select status from public.bookings where id = third_id) <> 'rejected' then
    raise exception 'Denial should reject request';
  end if;

  -- Two pending requests may target the same room; only one can be confirmed.
  perform set_config('request.jwt.claim.sub', c::text, true);
  third_id := public.save_booking_request('2099-01-12','2099-01-14',array[r3]);
  perform set_config('request.jwt.claim.sub', b::text, true);
  second_id := public.save_booking_request('2099-01-12','2099-01-14',array[r3]);
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform public.decide_booking_request(third_id,true);
  failed := false;
  begin
    perform public.decide_booking_request(second_id,true);
  exception when raise_exception then failed := true;
  end;
  if not failed then raise exception 'Confirmation must recheck room conflicts'; end if;
  if (select status from public.bookings where id = second_id) <> 'pending' then
    raise exception 'Failed confirmation must leave request pending';
  end if;

  if has_table_privilege('authenticated','public.bookings','INSERT') or
     has_table_privilege('authenticated','public.bookings','UPDATE') or
     has_table_privilege('authenticated','public.booking_rooms','INSERT') or
     has_table_privilege('authenticated','public.booking_approvals','INSERT') then
    raise exception 'Clients must not bypass the booking functions';
  end if;
  raise notice 'Booking request tests passed';
end;
$$;
rollback;
