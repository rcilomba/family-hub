import type { Booking, BookingWithDetails, Profile, Room } from '../types/booking';

export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  return startA <= endB && endA >= startB;
}

export function getActiveRooms(rooms: Room[]) {
  return rooms.filter((room) => room.isActive);
}

export function getBookingDetails(
  bookings: Booking[],
  profiles: Profile[],
  rooms: Room[],
): BookingWithDetails[] {
  return bookings.map((booking) => {
    const user = profiles.find((profile) => profile.id === booking.userId);
    const bookedRooms = rooms.filter((room) => booking.roomIds.includes(room.id));

    if (!user) {
      throw new Error(`Missing profile for booking ${booking.id}`);
    }

    return {
      ...booking,
      user,
      rooms: bookedRooms,
    };
  });
}

export function getConfirmedBookings(bookings: Booking[]) {
  return bookings.filter((booking) => booking.status === 'confirmed');
}

export function findConflictingBookings(
  newBooking: Pick<Booking, 'roomIds' | 'startDate' | 'endDate'>,
  existingBookings: Booking[],
) {
  return getConfirmedBookings(existingBookings).filter((booking) => {
    const hasSameRoom = booking.roomIds.some((roomId) =>
      newBooking.roomIds.includes(roomId),
    );

    return (
      hasSameRoom &&
      datesOverlap(
        booking.startDate,
        booking.endDate,
        newBooking.startDate,
        newBooking.endDate,
      )
    );
  });
}

export function findRoomConflictingBookings(
  roomId: string,
  existingBookings: Booking[],
  startDate: string,
  endDate: string,
) {
  return getConfirmedBookings(existingBookings).filter(
    (booking) =>
      booking.roomIds.includes(roomId) &&
      datesOverlap(booking.startDate, booking.endDate, startDate, endDate),
  );
}

export function getAvailableRooms(
  rooms: Room[],
  bookings: Booking[],
  startDate: string,
  endDate: string,
) {
  return getActiveRooms(rooms).filter((room) => {
    const conflicts = findConflictingBookings(
      { roomIds: [room.id], startDate, endDate },
      bookings,
    );

    return conflicts.length === 0;
  });
}

export function canManageBooking(profile: Profile, booking: Booking) {
  return profile.role === 'admin' || profile.id === booking.userId;
}
