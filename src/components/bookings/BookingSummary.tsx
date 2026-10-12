import type { BookingWithDetails } from '../../types/booking';
import { formatDateRange } from '../../utils/dateUtils';
import { getStatusLabel } from '../../utils/bookingPresentation';

export function BookingSummary({ booking }: { booking: BookingWithDetails }) {
  return (
    <div>
      <h3>{booking.rooms.map((room) => room.name).join(', ')}</h3>
      <p>
        {formatDateRange(booking.startDate, booking.endDate)} -{' '}
        {booking.user.displayName} - {getStatusLabel(booking)}
      </p>
    </div>
  );
}
