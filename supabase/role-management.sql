-- Run this once in Supabase SQL Editor after the initial schema.
-- It removes self-service profile updates so members cannot change their own role.

drop policy if exists "Users can update their own profile" on public.profiles;
