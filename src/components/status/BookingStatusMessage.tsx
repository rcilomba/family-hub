import type { BookingWithDetails } from '../../types/booking';
import type { AsyncStatus } from '../../types/asyncStatus';

export function BookingStatusMessage({
  bookingList,
  bookingStatus,
  emptyMessage = 'Inga bokningar finns ännu.',
}: {
  bookingList: BookingWithDetails[];
  bookingStatus: AsyncStatus;
  emptyMessage?: string;
}) {
  if (bookingStatus.isLoading) {
    return (
      <div className='availability-message loading'>
        Hämtar bokningar från Supabase...
      </div>
    );
  }

  if (bookingStatus.errorMessage) {
    return (
      <div className='availability-message error'>
        {bookingStatus.errorMessage}
      </div>
    );
  }

  if (bookingList.length === 0) {
    return <div className='availability-message idle'>{emptyMessage}</div>;
  }

  return null;
}
