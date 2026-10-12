import type { BookingWithDetails } from '../../types/booking';
import { BookingSummary } from './BookingSummary';
import { getStatusLabel } from '../../utils/bookingPresentation';

export function BookingSummaryCard({
  booking,
}: {
  booking: BookingWithDetails;
}) {
  return (
    <article className='calendar-booking'>
      <BookingSummary booking={booking} />
      <span>{getStatusLabel(booking)}</span>
    </article>
  );
}
