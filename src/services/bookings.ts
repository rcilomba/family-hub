import { supabase } from '../lib/supabase';
import type { Booking, BookingStatus, Profile } from '../types/booking';

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: Profile['role'];
};

type BookingRoomRow = {
  room_id: string;
};

type BookingRow = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  profiles: ProfileRow | ProfileRow[] | null;
  booking_rooms: BookingRoomRow[];
};

type CreateBookingInput = {
  userId: string;
  roomIds: string[];
  startDate: string;
  endDate: string;
};

type UpdateBookingInput = {
  id: string;
  roomIds: string[];
  startDate: string;
  endDate: string;
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    roomIds: row.booking_rooms.map((bookingRoom) => bookingRoom.room_id),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  };
}

function getProfileRow(row: BookingRow) {
  if (Array.isArray(row.profiles)) {
    return row.profiles[0] ?? null;
  }

  return row.profiles;
}

export async function fetchBookings() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .select(
      `
        id,
        user_id,
        start_date,
        end_date,
        status,
        profiles (
          id,
          email,
          display_name,
          role
        ),
        booking_rooms (
          room_id
        )
      `,
    )
    .order('start_date', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = data as unknown as BookingRow[];
  const profileMap = new Map<string, Profile>();

  rows.forEach((row) => {
    const profile = getProfileRow(row);

    if (profile) {
      profileMap.set(profile.id, mapProfile(profile));
    }
  });

  return {
    bookings: rows.map(mapBooking),
    profiles: Array.from(profileMap.values()),
  };
}

export async function createBooking(input: CreateBookingInput) {
  const client = getSupabaseClient();
  const { data: booking, error: bookingError } = await client
    .from('bookings')
    .insert({
      user_id: input.userId,
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'confirmed',
    })
    .select('id, user_id, start_date, end_date, status')
    .single();

  if (bookingError) {
    throw bookingError;
  }

  const bookingRooms = input.roomIds.map((roomId) => ({
    booking_id: booking.id,
    room_id: roomId,
  }));
  const { error: bookingRoomsError } = await client
    .from('booking_rooms')
    .insert(bookingRooms);

  if (bookingRoomsError) {
    throw bookingRoomsError;
  }

  return {
    id: booking.id,
    userId: booking.user_id,
    roomIds: input.roomIds,
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
  } satisfies Booking;
}

export async function updateBooking(input: UpdateBookingInput) {
  const client = getSupabaseClient();
  const { data: currentRooms, error: currentRoomsError } = await client
    .from('booking_rooms')
    .select('room_id')
    .eq('booking_id', input.id);

  if (currentRoomsError) {
    throw currentRoomsError;
  }

  const currentRoomIds = currentRooms.map((room) => room.room_id);
  const roomIdsToAdd = input.roomIds.filter(
    (roomId) => !currentRoomIds.includes(roomId),
  );
  const roomIdsToRemove = currentRoomIds.filter(
    (roomId) => !input.roomIds.includes(roomId),
  );
  const { data: booking, error: bookingError } = await client
    .from('bookings')
    .update({
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'confirmed',
    })
    .eq('id', input.id)
    .select('id, user_id, start_date, end_date, status')
    .single();

  if (bookingError) {
    throw bookingError;
  }

  if (roomIdsToAdd.length > 0) {
    const bookingRooms = roomIdsToAdd.map((roomId) => ({
      booking_id: input.id,
      room_id: roomId,
    }));
    const { error: insertRoomsError } = await client
      .from('booking_rooms')
      .insert(bookingRooms);

    if (insertRoomsError) {
      throw insertRoomsError;
    }
  }

  if (roomIdsToRemove.length > 0) {
    const { error: deleteRoomsError } = await client
      .from('booking_rooms')
      .delete()
      .eq('booking_id', input.id)
      .in('room_id', roomIdsToRemove);

    if (deleteRoomsError) {
      throw deleteRoomsError;
    }
  }

  return {
    id: booking.id,
    userId: booking.user_id,
    roomIds: input.roomIds,
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
  } satisfies Booking;
}

export async function cancelBooking(bookingId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .select('id, user_id, start_date, end_date, status')
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    roomIds: [],
    startDate: data.start_date,
    endDate: data.end_date,
    status: data.status,
  } satisfies Booking;
}
