import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/booking';

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function fetchProfiles() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, email, display_name, role')
    .order('display_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(mapProfile);
}

export async function updateProfileRole(profileId: string, role: UserRole) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
    .select('id, email, display_name, role')
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

export async function updateProfileName(profileId: string, displayName: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', profileId)
    .select('id, email, display_name, role')
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}
