-- Run this once in Supabase SQL Editor after role-management.sql.
-- It creates an email allowlist and blocks new signups unless the email is listed.

create table if not exists public.allowed_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint allowed_emails_lowercase_email check (email = lower(email))
);

insert into public.allowed_emails (email)
select lower(email)
from public.profiles
on conflict (email) do nothing;

alter table public.allowed_emails enable row level security;

drop policy if exists "Admins can manage allowed emails" on public.allowed_emails;

create policy "Admins can manage allowed emails"
on public.allowed_emails
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles)
    and not exists (
      select 1
      from public.allowed_emails
      where email = lower(new.email)
    ) then
    raise exception 'Email address is not allowed for this application.';
  end if;

  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  return new;
end;
$$;
