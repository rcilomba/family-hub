import type { AllowedEmail } from '../../types/booking';
import { formatDate } from '../../utils/dateUtils';

export function AllowedEmailItem({
  allowedEmail,
  currentUserEmail,
  onRemoveAllowedEmail,
}: {
  allowedEmail: AllowedEmail;
  currentUserEmail: string;
  onRemoveAllowedEmail: (email: string) => Promise<void>;
}) {
  const isCurrentUserEmail =
    allowedEmail.email === currentUserEmail.trim().toLowerCase();

  return (
    <article className='profile-admin-item'>
      <div>
        <h3>{allowedEmail.email}</h3>
        <p>Tillagd {formatDate(allowedEmail.createdAt.slice(0, 10))}</p>
      </div>
      <div className='item-actions'>
        <strong>Tillåten</strong>
        <button
          className='secondary-button'
          disabled={isCurrentUserEmail}
          onClick={() => onRemoveAllowedEmail(allowedEmail.email)}
          type='button'
        >
          Ta bort
        </button>
      </div>
      {isCurrentUserEmail && (
        <p className='item-note'>Du kan inte ta bort din egen e-post här.</p>
      )}
    </article>
  );
}
