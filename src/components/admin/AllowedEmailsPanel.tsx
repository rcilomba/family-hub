import { useState } from 'react';
import type { AllowedEmail } from '../../types/booking';
import type { AsyncStatus } from '../../types/asyncStatus';
import { AllowedEmailItem } from './AllowedEmailItem';
import { AllowedEmailStatusMessage } from '../status/AllowedEmailStatusMessage';

export function AllowedEmailsPanel({
  allowedEmailList,
  allowedEmailStatus,
  currentUserEmail,
  onAddAllowedEmail,
  onRemoveAllowedEmail,
}: {
  allowedEmailList: AllowedEmail[];
  allowedEmailStatus: AsyncStatus;
  currentUserEmail: string;
  onAddAllowedEmail: (email: string) => Promise<void>;
  onRemoveAllowedEmail: (email: string) => Promise<void>;
}) {
  const [newEmail, setNewEmail] = useState('');
  const trimmedEmail = newEmail.trim().toLowerCase();

  async function handleSubmit() {
    if (!trimmedEmail) {
      return;
    }

    await onAddAllowedEmail(trimmedEmail);
    setNewEmail('');
  }

  return (
    <div className='admin-panel'>
      <div>
        <p className='section-label'>Åtkomst</p>
        <h3>Tillåtna e-postadresser</h3>
        <p>
          Bara e-postadresser i listan kan skapa ett nytt konto. Befintliga
          användare påverkas inte.
        </p>
      </div>

      <AllowedEmailStatusMessage
        allowedEmailList={allowedEmailList}
        allowedEmailStatus={allowedEmailStatus}
      />

      <form
        className='admin-room-form'
        onSubmit={(event) => event.preventDefault()}
      >
        <label>
          Ny e-postadress
          <input
            autoComplete='email'
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder='namn@example.com'
            type='email'
            value={newEmail}
          />
        </label>
        <button disabled={!trimmedEmail} onClick={handleSubmit} type='button'>
          Lägg till e-post
        </button>
      </form>

      <div className='profile-list'>
        {allowedEmailList.map((allowedEmail) => (
          <AllowedEmailItem
            allowedEmail={allowedEmail}
            currentUserEmail={currentUserEmail}
            key={allowedEmail.email}
            onRemoveAllowedEmail={onRemoveAllowedEmail}
          />
        ))}
      </div>
    </div>
  );
}
