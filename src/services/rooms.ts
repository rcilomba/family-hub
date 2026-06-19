import { supabase } from '../lib/supabase';
import type { Room } from '../types/booking';

type RoomRow = {
  id: string;
  name: string;
  is_active: boolean;
};

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
  };
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function fetchRooms() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('rooms')
    .select('id, name, is_active')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(mapRoom);
}

export async function createRoom(name: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('rooms')
    .insert({ name })
    .select('id, name, is_active')
    .single();

  if (error) {
    throw error;
  }

  return mapRoom(data);
}

export async function updateRoomName(roomId: string, name: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('rooms')
    .update({ name })
    .eq('id', roomId)
    .select('id, name, is_active')
    .single();

  if (error) {
    throw error;
  }

  return mapRoom(data);
}

export async function updateRoomStatus(roomId: string, isActive: boolean) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('rooms')
    .update({ is_active: isActive })
    .eq('id', roomId)
    .select('id, name, is_active')
    .single();

  if (error) {
    throw error;
  }

  return mapRoom(data);
}
