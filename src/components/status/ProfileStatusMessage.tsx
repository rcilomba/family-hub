import type { Profile } from '../../types/booking';
import type { AsyncStatus } from '../../types/asyncStatus';

export function ProfileStatusMessage({
  profileList,
  profileStatus,
}: {
  profileList: Profile[];
  profileStatus: AsyncStatus;
}) {
  if (profileStatus.isLoading) {
    return (
      <div className='availability-message loading'>
        Hämtar användare från Supabase...
      </div>
    );
  }

  if (profileStatus.errorMessage) {
    return (
      <div className='availability-message error'>
        {profileStatus.errorMessage}
      </div>
    );
  }

  if (profileList.length === 0) {
    return (
      <div className='availability-message idle'>
        Inga användare finns ännu.
      </div>
    );
  }

  return null;
}
