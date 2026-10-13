import { useEffect, useMemo, useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { profiles } from './data/mockData';
import { useAuth } from './hooks/useAuth';
import {
  addAllowedEmail,
  fetchAllowedEmails,
  removeAllowedEmail,
} from './services/allowedEmails';
import {
  cancelBooking,
  decideBookingRequest,
  createBooking,
  fetchBookings,
  updateBooking,
} from './services/bookings';
import {
  fetchProfiles,
  updateProfileName,
  updateProfileRole,
} from './services/profiles';
import {
  createRoom,
  fetchRooms,
  updateRoomName,
  updateRoomStatus,
} from './services/rooms';
import type {
  AllowedEmail,
  Booking,
  BookingWithDetails,
  Profile,
  Room,
  UserRole,
} from './types/booking';
import { getActiveRooms, getBookingDetails } from './utils/bookingUtils';
import type { AsyncStatus } from './types/asyncStatus';
import { AdminView } from './views/AdminView';
import { BookingsView } from './views/BookingsView';
import { CalendarView } from './views/CalendarView';

type View = 'calendar' | 'bookings' | 'admin';

const views: Array<{ id: View; label: string }> = [
  { id: 'calendar', label: 'Kalender' },
  { id: 'bookings', label: 'Bokningar' },
  { id: 'admin', label: 'Admin' },
];

export function App() {
  const auth = useAuth();
  const [activeView, setActiveView] = useState<View>('calendar');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const [bookingProfiles, setBookingProfiles] = useState<Profile[]>([]);
  const [bookingStatus, setBookingStatus] = useState<AsyncStatus>({
    isLoading: false,
    errorMessage: null,
  });
  const [allowedEmailList, setAllowedEmailList] = useState<AllowedEmail[]>([]);
  const [allowedEmailStatus, setAllowedEmailStatus] = useState<AsyncStatus>({
    isLoading: false,
    errorMessage: null,
  });
  const [profileList, setProfileList] = useState<Profile[]>([]);
  const [profileStatus, setProfileStatus] = useState<AsyncStatus>({
    isLoading: false,
    errorMessage: null,
  });
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [roomStatus, setRoomStatus] = useState<AsyncStatus>({
    isLoading: false,
    errorMessage: null,
  });
  const currentUser = auth.profile;
  const appProfiles = useMemo(() => {
    const profileMap = new Map<string, Profile>();

    profiles.forEach((profile) => profileMap.set(profile.id, profile));
    profileList.forEach((profile) => profileMap.set(profile.id, profile));
    bookingProfiles.forEach((profile) => profileMap.set(profile.id, profile));

    if (currentUser) {
      profileMap.set(currentUser.id, currentUser);
    }

    return Array.from(profileMap.values());
  }, [bookingProfiles, currentUser, profileList]);
  const isAdmin = currentUser?.role === 'admin';
  const activeRooms = getActiveRooms(roomList);
  const bookingDetails = useMemo(
    () => getBookingDetails(bookingList, appProfiles, roomList),
    [appProfiles, bookingList, roomList],
  );
  const confirmedBookingDetails = bookingDetails.filter(
    (booking) => booking.status === 'confirmed',
  );

  useEffect(() => {
    if (!currentUser) {
      setRoomList([]);
      return;
    }

    let isMounted = true;

    async function loadRooms() {
      setRoomStatus({ isLoading: true, errorMessage: null });

      try {
        const rooms = await fetchRooms();

        if (!isMounted) {
          return;
        }

        setRoomList(rooms);
        setRoomStatus({ isLoading: false, errorMessage: null });
      } catch {
        if (!isMounted) {
          return;
        }

        setRoomStatus({
          isLoading: false,
          errorMessage: 'Kunde inte hämta rum från Supabase.',
        });
      }
    }

    void loadRooms();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setBookingList([]);
      setBookingProfiles([]);
      return;
    }

    let isMounted = true;

    async function loadBookings() {
      setBookingStatus({ isLoading: true, errorMessage: null });

      try {
        const result = await fetchBookings();

        if (!isMounted) {
          return;
        }

        setBookingList(result.bookings);
        setBookingProfiles(result.profiles);
        setBookingStatus({ isLoading: false, errorMessage: null });
      } catch {
        if (!isMounted) {
          return;
        }

        setBookingStatus({
          isLoading: false,
          errorMessage: 'Kunde inte hämta bokningar från Supabase.',
        });
      }
    }

    void loadBookings();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setProfileList([]);
      return;
    }

    let isMounted = true;

    async function loadProfiles() {
      setProfileStatus({ isLoading: true, errorMessage: null });

      try {
        const loadedProfiles = await fetchProfiles();

        if (!isMounted) {
          return;
        }

        setProfileList(loadedProfiles);
        setProfileStatus({ isLoading: false, errorMessage: null });
      } catch {
        if (!isMounted) {
          return;
        }

        setProfileStatus({
          isLoading: false,
          errorMessage: 'Kunde inte hämta användare från Supabase.',
        });
      }
    }

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!isAdmin) {
      setAllowedEmailList([]);
      return;
    }

    let isMounted = true;

    async function loadAllowedEmails() {
      setAllowedEmailStatus({ isLoading: true, errorMessage: null });

      try {
        const loadedAllowedEmails = await fetchAllowedEmails();

        if (!isMounted) {
          return;
        }

        setAllowedEmailList(loadedAllowedEmails);
        setAllowedEmailStatus({ isLoading: false, errorMessage: null });
      } catch {
        if (!isMounted) {
          return;
        }

        setAllowedEmailStatus({
          isLoading: false,
          errorMessage: 'Kunde inte hämta tillåtna e-postadresser.',
        });
      }
    }

    void loadAllowedEmails();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  if (auth.isLoading) {
    return (
      <main className='auth-shell'>
        <section className='auth-card'>
          <img
            className='brand-logo auth-logo'
            src='/kapiamba-cropped.png'
            alt='The Kapiamba'
          />
          <h1>Laddar...</h1>
          <p>Vi kontrollerar om du redan är inloggad.</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthForm />
        {auth.errorMessage && <p className='auth-error'>{auth.errorMessage}</p>}
      </>
    );
  }

  const authenticatedUser = currentUser;

  async function handleCreateBooking(
    newBooking: Omit<Booking, 'id' | 'userId' | 'status'>,
  ): Promise<BookingWithDetails> {
    setBookingStatus({ isLoading: false, errorMessage: null });

    try {
      const createdBooking = await createBooking({
        ...newBooking,
        userId: authenticatedUser.id,
      });

      setBookingList((currentBookings) => [createdBooking, ...currentBookings]);

      return getBookingDetails(
        [createdBooking],
        [authenticatedUser],
        roomList,
      )[0];
    } catch {
      setBookingStatus({
        isLoading: false,
        errorMessage:
          'Kunde inte skapa bokningen. Kontrollera att rummen är lediga.',
      });
      throw new Error('Could not create booking.');
    }
  }

  async function handleUpdateBooking(updatedBooking: Booking) {
    setBookingStatus({ isLoading: false, errorMessage: null });

    try {
      const savedBooking = await updateBooking({
        id: updatedBooking.id,
        roomIds: updatedBooking.roomIds,
        startDate: updatedBooking.startDate,
        endDate: updatedBooking.endDate,
      });

      setBookingList((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === savedBooking.id ? savedBooking : booking,
        ),
      );
    } catch {
      setBookingStatus({
        isLoading: false,
        errorMessage:
          'Kunde inte uppdatera bokningen. Kontrollera dubbelbokning.',
      });
      throw new Error('Could not update booking.');
    }
  }

  async function handleDecideBooking(bookingId: string, approve: boolean) {
    await decideBookingRequest(bookingId, approve);
    await handleRefreshBookings();
  }

  async function handleRefreshBookings() {
    setBookingStatus({ isLoading: true, errorMessage: null });
    try {
      const result = await fetchBookings();
      setBookingList(result.bookings);
      setBookingProfiles(result.profiles);
      setBookingStatus({ isLoading: false, errorMessage: null });
    } catch {
      setBookingStatus({
        isLoading: false,
        errorMessage: 'Kunde inte uppdatera bokningarna.',
      });
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setBookingStatus({ isLoading: false, errorMessage: null });

    try {
      await cancelBooking(bookingId);
      setBookingList((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled' }
            : booking,
        ),
      );
    } catch {
      setBookingStatus({
        isLoading: false,
        errorMessage: 'Kunde inte avboka bokningen.',
      });
    }
  }

  async function handleAddRoom(roomName: string) {
    setRoomStatus({ isLoading: false, errorMessage: null });

    try {
      const createdRoom = await createRoom(roomName);
      setRoomList((currentRooms) => [...currentRooms, createdRoom]);
    } catch {
      setRoomStatus({
        isLoading: false,
        errorMessage: 'Kunde inte lägga till rummet.',
      });
    }
  }

  async function handleRenameRoom(roomId: string, name: string) {
    setRoomStatus({ isLoading: false, errorMessage: null });

    try {
      const updatedRoom = await updateRoomName(roomId, name);
      setRoomList((currentRooms) =>
        currentRooms.map((room) => (room.id === roomId ? updatedRoom : room)),
      );
    } catch {
      setRoomStatus({
        isLoading: false,
        errorMessage: 'Kunde inte byta namn på rummet.',
      });
    }
  }

  async function handleToggleRoom(roomId: string) {
    const room = roomList.find((currentRoom) => currentRoom.id === roomId);

    if (!room) {
      return;
    }

    setRoomStatus({ isLoading: false, errorMessage: null });

    try {
      const updatedRoom = await updateRoomStatus(roomId, !room.isActive);
      setRoomList((currentRooms) =>
        currentRooms.map((currentRoom) =>
          currentRoom.id === roomId ? updatedRoom : currentRoom,
        ),
      );
    } catch {
      setRoomStatus({
        isLoading: false,
        errorMessage: 'Kunde inte ändra rummets status.',
      });
    }
  }

  async function handleUpdateProfileRole(profileId: string, role: UserRole) {
    if (profileId === authenticatedUser.id) {
      setProfileStatus({
        isLoading: false,
        errorMessage: 'Du kan inte ändra din egen adminroll här.',
      });
      return;
    }

    setProfileStatus({ isLoading: false, errorMessage: null });

    try {
      const updatedProfile = await updateProfileRole(profileId, role);

      setProfileList((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === updatedProfile.id ? updatedProfile : profile,
        ),
      );
      setBookingProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === updatedProfile.id ? updatedProfile : profile,
        ),
      );
    } catch {
      setProfileStatus({
        isLoading: false,
        errorMessage: 'Kunde inte uppdatera användarens roll.',
      });
    }
  }

  async function handleUpdateProfileName(
    profileId: string,
    displayName: string,
  ) {
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      return;
    }

    setProfileStatus({ isLoading: false, errorMessage: null });

    try {
      const updatedProfile = await updateProfileName(
        profileId,
        trimmedDisplayName,
      );

      setProfileList((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === updatedProfile.id ? updatedProfile : profile,
        ),
      );
      setBookingProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === updatedProfile.id ? updatedProfile : profile,
        ),
      );
    } catch {
      setProfileStatus({
        isLoading: false,
        errorMessage: 'Kunde inte uppdatera användarens namn.',
      });
    }
  }

  async function handleAddAllowedEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    setAllowedEmailStatus({ isLoading: false, errorMessage: null });

    try {
      const createdAllowedEmail = await addAllowedEmail(normalizedEmail);

      setAllowedEmailList((currentAllowedEmails) =>
        [
          ...currentAllowedEmails.filter(
            (allowedEmail) => allowedEmail.email !== createdAllowedEmail.email,
          ),
          createdAllowedEmail,
        ].sort((firstEmail, secondEmail) =>
          firstEmail.email.localeCompare(secondEmail.email),
        ),
      );
    } catch {
      setAllowedEmailStatus({
        isLoading: false,
        errorMessage: 'Kunde inte lägga till e-postadressen.',
      });
    }
  }

  async function handleRemoveAllowedEmail(email: string) {
    if (email === authenticatedUser.email.toLowerCase()) {
      setAllowedEmailStatus({
        isLoading: false,
        errorMessage: 'Du kan inte ta bort din egen e-post från allowlistan.',
      });
      return;
    }

    setAllowedEmailStatus({ isLoading: false, errorMessage: null });

    try {
      await removeAllowedEmail(email);
      setAllowedEmailList((currentAllowedEmails) =>
        currentAllowedEmails.filter(
          (allowedEmail) => allowedEmail.email !== email,
        ),
      );
    } catch {
      setAllowedEmailStatus({
        isLoading: false,
        errorMessage: 'Kunde inte ta bort e-postadressen.',
      });
    }
  }

  return (
    <main className='app-shell'>
      <header className='topbar'>
        <div className='brand-block'>
          <img
            className='brand-logo app-logo'
            src='/kapiamba-cropped.png'
            alt='The Kapiamba'
          />
          <h1>Sommarhuset</h1>
          <p>Boka rum, se tillgänglighet och planera familjens vistelser.</p>
        </div>
        <div className='account-area'>
          <button
            aria-expanded={isUserMenuOpen}
            aria-label='Öppna användarmeny'
            className='menu-button'
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
            type='button'
          >
            <span />
            <span />
            <span />
          </button>
          <div className='user-pill' aria-label='Inloggad användare'>
            <span>{authenticatedUser.displayName}</span>
            <small>{isAdmin ? 'Admin' : 'Medlem'}</small>
            <button
              className='logout-button'
              onClick={auth.signOut}
              type='button'
            >
              Logga ut
            </button>
          </div>
          {isUserMenuOpen && (
            <div className='mobile-user-menu'>
              <span>{authenticatedUser.displayName}</span>
              <small>{isAdmin ? 'Admin' : 'Medlem'}</small>
              <button
                className='logout-button'
                onClick={auth.signOut}
                type='button'
              >
                Logga ut
              </button>
            </div>
          )}
        </div>
      </header>

      <nav className='tabs' aria-label='Huvudnavigation'>
        {views.map((view) => {
          if (view.id === 'admin' && !isAdmin) {
            return null;
          }

          return (
            <button
              className={activeView === view.id ? 'tab active' : 'tab'}
              key={view.id}
              onClick={() => {
                setActiveView(view.id);
                setIsUserMenuOpen(false);
              }}
              type='button'
            >
              {view.label}
            </button>
          );
        })}
      </nav>

      {activeView === 'calendar' && (
        <CalendarView
          activeRoomsCount={activeRooms.length}
          bookings={confirmedBookingDetails}
          existingBookings={bookingList}
          bookingStatus={bookingStatus}
          profiles={appProfiles}
          roomList={roomList}
          roomStatus={roomStatus}
        />
      )}
      {activeView === 'bookings' && (
        <BookingsView
          bookings={bookingDetails}
          bookingStatus={bookingStatus}
          currentUser={authenticatedUser}
          existingBookings={bookingList}
          isAdmin={isAdmin}
          onCancelBooking={handleCancelBooking}
          onDecideBooking={handleDecideBooking}
          onRefreshBookings={handleRefreshBookings}
          onCreateBooking={handleCreateBooking}
          onUpdateBooking={handleUpdateBooking}
          roomList={roomList}
          roomStatus={roomStatus}
        />
      )}
      {activeView === 'admin' && isAdmin && (
        <AdminView
          activeRoomsCount={activeRooms.length}
          allowedEmailList={allowedEmailList}
          allowedEmailStatus={allowedEmailStatus}
          currentUser={authenticatedUser}
          onAddAllowedEmail={handleAddAllowedEmail}
          onAddRoom={handleAddRoom}
          onRenameRoom={handleRenameRoom}
          onRemoveAllowedEmail={handleRemoveAllowedEmail}
          onToggleRoom={handleToggleRoom}
          onUpdateProfileName={handleUpdateProfileName}
          onUpdateProfileRole={handleUpdateProfileRole}
          profileList={profileList}
          profileStatus={profileStatus}
          roomList={roomList}
          roomStatus={roomStatus}
        />
      )}
    </main>
  );
}
