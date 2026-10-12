import type { Booking, Profile, Room } from '../../types/booking';
import {
  findRoomConflictingBookings,
  getBookingDetails,
} from '../../utils/bookingUtils';
import { formatDateRange } from '../../utils/dateUtils';

export function RoomAvailabilityItem({
  endDate,
  existingBookings,
  profiles,
  room,
  roomList,
  startDate,
}: {
  endDate: string;
  existingBookings: Booking[];
  profiles: Profile[];
  room: Room;
  roomList: Room[];
  startDate: string;
}) {
  const conflicts = findRoomConflictingBookings(
    room.id,
    existingBookings,
    startDate,
    endDate,
  );
  const conflictingDetails = getBookingDetails(conflicts, profiles, roomList);

  if (!room.isActive) {
    return (
      <article className='room-availability inactive'>
        <div>
          <h3>{room.name}</h3>
          <p>Rummet kan inte bokas just nu.</p>
        </div>
        <span>Inaktivt</span>
      </article>
    );
  }

  if (conflictingDetails.length === 0) {
    return (
      <article className='room-availability available'>
        <div>
          <h3>{room.name}</h3>
          <p>Inga bokningar krockar med valda datum.</p>
        </div>
        <span>Ledigt</span>
      </article>
    );
  }

  return (
    <article className='room-availability occupied'>
      <div>
        <h3>{room.name}</h3>
        {conflictingDetails.map((booking) => (
          <p key={booking.id}>
            {booking.user.displayName},{' '}
            {formatDateRange(booking.startDate, booking.endDate)}
          </p>
        ))}
      </div>
      <span>Upptaget</span>
    </article>
  );
}
