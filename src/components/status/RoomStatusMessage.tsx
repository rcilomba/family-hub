import type { Room } from '../../types/booking';
import type { AsyncStatus } from '../../types/asyncStatus';

export function RoomStatusMessage({
  roomList,
  roomStatus,
}: {
  roomList: Room[];
  roomStatus: AsyncStatus;
}) {
  if (roomStatus.isLoading) {
    return (
      <div className='availability-message loading'>
        Hämtar rum från Supabase...
      </div>
    );
  }

  if (roomStatus.errorMessage) {
    return (
      <div className='availability-message error'>
        {roomStatus.errorMessage}
      </div>
    );
  }

  if (roomList.length === 0) {
    return (
      <div className='availability-message idle'>
        Inga rum finns ännu. Lägg till rum i Admin-vyn.
      </div>
    );
  }

  return null;
}
