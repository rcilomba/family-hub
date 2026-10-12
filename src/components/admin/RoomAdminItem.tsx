import { useState } from 'react';
import type { Room } from '../../types/booking';

export function RoomAdminItem({
  onRenameRoom,
  onToggleRoom,
  room,
}: {
  onRenameRoom: (roomId: string, name: string) => Promise<void>;
  onToggleRoom: (roomId: string) => Promise<void>;
  room: Room;
}) {
  const [draftName, setDraftName] = useState(room.name);
  const trimmedName = draftName.trim();
  const hasChanged = trimmedName !== room.name;

  async function handleSaveName() {
    if (!trimmedName || !hasChanged) {
      return;
    }

    await onRenameRoom(room.id, trimmedName);
  }

  return (
    <article className='room-admin-item'>
      <label>
        Rumsnamn
        <input
          onChange={(event) => setDraftName(event.target.value)}
          value={draftName}
        />
      </label>
      <div className='item-actions'>
        <strong>{room.isActive ? 'Aktivt' : 'Inaktivt'}</strong>
        <button
          disabled={!trimmedName || !hasChanged}
          onClick={handleSaveName}
          type='button'
        >
          Spara namn
        </button>
        <button
          className='secondary-button'
          onClick={() => onToggleRoom(room.id)}
          type='button'
        >
          {room.isActive ? 'Inaktivera' : 'Aktivera'}
        </button>
      </div>
    </article>
  );
}
