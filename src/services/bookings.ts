import { supabase } from '../lib/supabase';
import type { Booking, BookingStatus, Profile } from '../types/booking';

type BookingRow = {
  id: string; user_id: string; start_date: string; end_date: string;
  status: BookingStatus;
  profiles: { id: string; email: string; display_name: string; role: Profile['role'] } | null;
  booking_rooms: { room_id: string }[];
  booking_approvals: { user_id: string }[];
};

function getClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function fetchBookings() {
  // Approvals also link bookings to profiles; select the booking owner's relation.
  const { data, error } = await getClient().from('bookings').select(`
    id, user_id, start_date, end_date, status,
    profiles!bookings_user_id_fkey (id, email, display_name, role),
    booking_rooms (room_id), booking_approvals (user_id)
  `).order('start_date', { ascending: true });
  if (error) throw error;
  const rows = data as unknown as BookingRow[];
  const profiles = new Map<string, Profile>();
  const bookings: Booking[] = rows.map((row) => {
    if (row.profiles) {
      const profile = row.profiles;
      profiles.set(profile.id, {
        id: profile.id, email: profile.email,
        displayName: profile.display_name, role: profile.role,
      });
    }
    return {
      id: row.id, userId: row.user_id, startDate: row.start_date,
      endDate: row.end_date, status: row.status,
      roomIds: row.booking_rooms.map((room) => room.room_id),
      approvedBy: row.booking_approvals.map((approval) => approval.user_id),
    };
  });
  return { bookings, profiles: Array.from(profiles.values()) };
}

type BookingInput = { roomIds: string[]; startDate: string; endDate: string };

async function saveBooking(input: BookingInput, id: string | null) {
  const { data, error } = await getClient().rpc('save_booking_request', {
    p_start: input.startDate, p_end: input.endDate, p_rooms: input.roomIds, p_id: id,
  });
  if (error) throw error;
  const result = await fetchBookings();
  const booking = result.bookings.find((item) => item.id === data);
  if (!booking) throw new Error('Saved booking could not be loaded.');
  return booking;
}

export function createBooking(input: BookingInput & { userId: string }) {
  // The database uses the signed-in identity instead of a supplied user ID.
  return saveBooking(input, null);
}

export function updateBooking(input: BookingInput & { id: string }) {
  return saveBooking(input, input.id);
}

export async function cancelBooking(bookingId: string) {
  const { error } = await getClient().rpc('cancel_booking_request', { p_id: bookingId });
  if (error) throw error;
}

export async function decideBookingRequest(bookingId: string, approve: boolean) {
  const { error } = await getClient().rpc('decide_booking_request', {
    p_id: bookingId, p_approve: approve,
  });
  if (error) throw error;
}
