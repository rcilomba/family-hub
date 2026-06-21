import { supabase } from '../lib/supabase';
import type { AllowedEmail } from '../types/booking';

type AllowedEmailRow = {
  email: string;
  created_at: string;
};

function mapAllowedEmail(row: AllowedEmailRow): AllowedEmail {
  return {
    email: row.email,
    createdAt: row.created_at,
  };
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function fetchAllowedEmails() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('allowed_emails')
    .select('email, created_at')
    .order('email', { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(mapAllowedEmail);
}

export async function addAllowedEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('allowed_emails')
    .insert({ email: normalizedEmail })
    .select('email, created_at')
    .single();

  if (error) {
    throw error;
  }

  return mapAllowedEmail(data);
}

export async function removeAllowedEmail(email: string) {
  const client = getSupabaseClient();
  const { error } = await client
    .from('allowed_emails')
    .delete()
    .eq('email', email);

  if (error) {
    throw error;
  }
}
