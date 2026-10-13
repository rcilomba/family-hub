import { useState } from 'react';
import type { AllowedEmail, Profile, Room, UserRole } from '../types/booking';
import type { AsyncStatus } from '../types/asyncStatus';
import { SummaryStat } from '../components/SummaryStat';
import { RoomStatusMessage } from '../components/status/RoomStatusMessage';
import { ProfileStatusMessage } from '../components/status/ProfileStatusMessage';
import { RoomAdminItem } from '../components/admin/RoomAdminItem';
import { ProfileAdminItem } from '../components/admin/ProfileAdminItem';
import { AllowedEmailsPanel } from '../components/admin/AllowedEmailsPanel';

export function AdminView({
  activeRoomsCount,
  allowedEmailList,
  allowedEmailStatus,
  currentUser,
  onAddAllowedEmail,
  onAddRoom,
  onRenameRoom,
  onRemoveAllowedEmail,
  onToggleRoom,
  onUpdateProfileName,
  onUpdateProfileRole,
  profileList,
  profileStatus,
  roomList,
  roomStatus,
}: {
  activeRoomsCount: number;
  allowedEmailList: AllowedEmail[];
  allowedEmailStatus: AsyncStatus;
  currentUser: Profile;
  onAddAllowedEmail: (email: string) => Promise<void>;
  onAddRoom: (roomName: string) => Promise<void>;
  onRenameRoom: (roomId: string, name: string) => Promise<void>;
  onRemoveAllowedEmail: (email: string) => Promise<void>;
  onToggleRoom: (roomId: string) => Promise<void>;
  onUpdateProfileName: (
    profileId: string,
    displayName: string,
  ) => Promise<void>;
  onUpdateProfileRole: (profileId: string, role: UserRole) => Promise<void>;
  profileList: Profile[];
  profileStatus: AsyncStatus;
  roomList: Room[];
  roomStatus: AsyncStatus;
}) {
  const [newRoomName, setNewRoomName] = useState('');
  const trimmedRoomName = newRoomName.trim();

  async function handleSubmit() {
    if (!trimmedRoomName) {
      return;
    }

    await onAddRoom(trimmedRoomName);
    setNewRoomName('');
  }

  return (
    <section className='content-section'>
      <div>
        <p className='section-label'>Admin</p>
        <h2>Boendets inställningar</h2>
        <p>Endast admin kan ändra rum och andra inställningar.</p>
      </div>

      <div className='settings-grid'>
        <SummaryStat
          label='Totalt antal rum'
          value={roomList.length.toString()}
        />
        <SummaryStat label='Aktiva rum' value={activeRoomsCount.toString()} />
        <SummaryStat label='Användare' value={profileList.length.toString()} />
        <SummaryStat
          label='Tillåtna e-postadresser'
          value={allowedEmailList.length.toString()}
        />
        <SummaryStat label='Bokningstyp' value='Per rum' />
      </div>

      <RoomStatusMessage roomList={roomList} roomStatus={roomStatus} />

      <form
        className='admin-room-form'
        onSubmit={(event) => event.preventDefault()}
      >
        <label>
          Nytt rum
          <input
            onChange={(event) => setNewRoomName(event.target.value)}
            placeholder='Exempel: Gästrum'
            value={newRoomName}
          />
        </label>
        <button
          disabled={!trimmedRoomName}
          onClick={handleSubmit}
          type='button'
        >
          Lägg till rum
        </button>
      </form>

      <div className='room-list'>
        {roomList.map((room) => (
          <RoomAdminItem
            key={room.id}
            onRenameRoom={onRenameRoom}
            onToggleRoom={onToggleRoom}
            room={room}
          />
        ))}
      </div>

      <div className='admin-panel'>
        <div>
          <p className='section-label'>Användare</p>
          <h3>Roller och behörighet</h3>
          <p>
            Admin kan ge andra adminrättigheter eller ändra tillbaka dem till
            medlem.
          </p>
        </div>

        <ProfileStatusMessage
          profileList={profileList}
          profileStatus={profileStatus}
        />

        <div className='profile-list'>
          {profileList.map((profile) => (
            <ProfileAdminItem
              currentUserId={currentUser.id}
              key={profile.id}
              onUpdateProfileName={onUpdateProfileName}
              onUpdateProfileRole={onUpdateProfileRole}
              profile={profile}
            />
          ))}
        </div>
      </div>

      <AllowedEmailsPanel
        allowedEmailList={allowedEmailList}
        allowedEmailStatus={allowedEmailStatus}
        currentUserEmail={currentUser.email}
        onAddAllowedEmail={onAddAllowedEmail}
        onRemoveAllowedEmail={onRemoveAllowedEmail}
      />
    </section>
  );
}
