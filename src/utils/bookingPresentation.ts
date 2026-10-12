import type { BookingWithDetails } from '../types/booking';
import { formatDateRange } from './dateUtils';

export function getStatusLabel(booking: BookingWithDetails) {
  const labels = {
    confirmed: 'Bekräftad',
    cancelled: 'Avbokad',
    pending: 'Väntar på godkännande',
    rejected: 'Nekad',
  };
  return labels[booking.status];
}

export function buildBookingConfirmation(booking: BookingWithDetails) {
  const roomNames = booking.rooms.map((room) => room.name).join(', ');

  return {
    subject:
      booking.status === 'pending'
        ? 'Förfrågan är skickad'
        : 'Bokningen är skapad',
    lines: [
      `Rum: ${roomNames}`,
      `Datum: ${formatDateRange(booking.startDate, booking.endDate)}`,
      `Bokad av: ${booking.user.displayName}`,
      getStatusLabel(booking),
    ],
  };
}
