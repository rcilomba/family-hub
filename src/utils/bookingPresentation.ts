import type { BookingWithDetails } from '../types/booking';

export function getStatusLabel(booking: BookingWithDetails) {
  const labels = {
    confirmed: 'Bekräftad',
    cancelled: 'Avbokad',
    pending: 'Väntar på godkännande',
    rejected: 'Nekad',
  };
  return labels[booking.status];
}
