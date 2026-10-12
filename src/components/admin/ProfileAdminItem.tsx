import { useState } from 'react';
import type { Profile, UserRole } from '../../types/booking';

export function ProfileAdminItem({
  currentUserId,
  onUpdateProfileName,
  onUpdateProfileRole,
  profile,
}: {
  currentUserId: string;
  onUpdateProfileName: (
    profileId: string,
    displayName: string,
  ) => Promise<void>;
  onUpdateProfileRole: (profileId: string, role: UserRole) => Promise<void>;
  profile: Profile;
}) {
  const [draftName, setDraftName] = useState(profile.displayName);
  const isCurrentUser = profile.id === currentUserId;
  const nextRole: UserRole = profile.role === 'admin' ? 'member' : 'admin';
  const trimmedName = draftName.trim();
  const hasNameChanged = trimmedName !== profile.displayName;

  async function handleSaveName() {
    if (!trimmedName || !hasNameChanged) {
      return;
    }

    await onUpdateProfileName(profile.id, trimmedName);
  }

  return (
    <article className='profile-admin-item'>
      <div>
        <label>
          Namn
          <input
            onChange={(event) => setDraftName(event.target.value)}
            value={draftName}
          />
        </label>
        <p>{profile.email}</p>
      </div>
      <div className='item-actions'>
        <strong>{profile.role === 'admin' ? 'Admin' : 'Medlem'}</strong>
        <button
          disabled={!trimmedName || !hasNameChanged}
          onClick={handleSaveName}
          type='button'
        >
          Spara namn
        </button>
        <button
          className='secondary-button'
          disabled={isCurrentUser}
          onClick={() => onUpdateProfileRole(profile.id, nextRole)}
          type='button'
        >
          {profile.role === 'admin' ? 'Gör till medlem' : 'Gör till admin'}
        </button>
      </div>
      {isCurrentUser && (
        <p className='item-note'>Du kan inte ändra din egen roll här.</p>
      )}
    </article>
  );
}
