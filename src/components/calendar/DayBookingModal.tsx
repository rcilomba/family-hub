import type { AsyncStatus } from '../../types/asyncStatus';
import type { BookingWithDetails } from '../../types/booking';
import { formatDate } from '../../utils/dateUtils';
import { BookingStatusMessage } from '../status/BookingStatusMessage';
import { BookingSummaryCard } from '../bookings/BookingSummaryCard';

export function DayBookingModal({
  bookingStatus,
  bookings,
  date,
  onClose,
}: {
  bookingStatus: AsyncStatus;
  bookings: BookingWithDetails[];
  date: string;
  onClose: () => void;
}) {
  return (
    <div className='day-modal-overlay' role='presentation'>
      <section
        aria-labelledby='day-modal-title'
        aria-modal='true'
        className='day-modal'
        role='dialog'
      >
        <div className='day-modal-header'>
          <div>
            <p className='section-label'>Vald dag</p>
            <h3 id='day-modal-title'>{formatDate(date)}</h3>
          </div>
          <button
            aria-label='Stäng datum'
            className='modal-close-button'
            onClick={onClose}
            type='button'
          >
            ×
          </button>
        </div>

        <div className='calendar-list' aria-label='Bokningar för vald dag'>
          <BookingStatusMessage
            bookingList={bookings}
            bookingStatus={bookingStatus}
            emptyMessage='Ingen bokning'
          />
          {bookings.map((booking) => (
            <BookingSummaryCard booking={booking} key={booking.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
