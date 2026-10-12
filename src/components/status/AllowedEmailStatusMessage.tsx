import type { AllowedEmail } from '../../types/booking';
import type { AsyncStatus } from '../../types/asyncStatus';

export function AllowedEmailStatusMessage({
  allowedEmailList,
  allowedEmailStatus,
}: {
  allowedEmailList: AllowedEmail[];
  allowedEmailStatus: AsyncStatus;
}) {
  if (allowedEmailStatus.isLoading) {
    return (
      <div className='availability-message loading'>
        Hämtar tillåtna e-postadresser från Supabase...
      </div>
    );
  }

  if (allowedEmailStatus.errorMessage) {
    return (
      <div className='availability-message error'>
        {allowedEmailStatus.errorMessage}
      </div>
    );
  }

  if (allowedEmailList.length === 0) {
    return (
      <div className='availability-message idle'>
        Inga e-postadresser finns i allowlistan ännu.
      </div>
    );
  }

  return null;
}
