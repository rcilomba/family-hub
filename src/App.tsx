import { useEffect, useMemo, useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { profiles } from './data/mockData';
import { useAuth } from './hooks/useAuth';
import {
  cancelBooking,
  createBooking,
  fetchBookings,
  updateBooking,
} from './services/bookings';
import {
  createRoom,
  fetchRooms,
  updateRoomName,
  updateRoomStatus,
} from './services/rooms';
import type { Booking, BookingWithDetails, Profile, Room } from './types/booking';
import {
  canManageBooking,
  findConflictingBookings,
  findRoomConflictingBookings,
  getActiveRooms,
  getAvailableRooms,
  getBookingDetails,
} from './utils/bookingUtils';

type View = 'calendar' | 'bookings' | 'admin';

type AvailabilityResult =
  | { status: 'idle'; message: string }
  | { status: 'available'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'invalid'; message: string };

type BookingFormMode =
  | { type: 'create' }
  | { type: 'edit'; booking: BookingWithDetails };

type AsyncStatus = {
  isLoading: boolean;
  errorMessage: string | null;
};

const exampleBookingRequest = {
  roomIds: ['room-1'],
  startDate: '2026-07-14',
  endDate: '2026-07-15',
};

const views: Array<{ id: View; label: string }> = [
  { id: 'calendar', label: 'Kalender' },
  { id: 'bookings', label: 'Bokningar' },
  { id: 'admin', label: 'Admin' },
];

const initialAvailabilityResult: AvailabilityResult = {
  status: 'idle',
  message: 'Välj datum och rum för att kontrollera tillgänglighet.',
};

export function App() {
  const auth = useAuth();
  const [activeView, setActiveView] = useState<View>('calendar');
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const [bookingProfiles, setBookingProfiles] = useState<Profile[]>([]);
  const [bookingStatus, setBookingStatus] = useState<AsyncStatus>({
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
    bookingProfiles.forEach((profile) => profileMap.set(profile.id, profile));

    if (currentUser) {
      profileMap.set(currentUser.id, currentUser);
    }

    return Array.from(profileMap.values());
  }, [bookingProfiles, currentUser]);
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

  if (auth.isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Family Hub</p>
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
        {auth.errorMessage && <p className="auth-error">{auth.errorMessage}</p>}
      </>
    );
  }

  const authenticatedUser = currentUser;

  async function handleCreateBooking(
    newBooking: Omit<Booking, 'id' | 'userId' | 'status'>,
  ) {
    setBookingStatus({ isLoading: false, errorMessage: null });

    try {
      const createdBooking = await createBooking({
        ...newBooking,
        userId: authenticatedUser.id,
      });

      setBookingList((currentBookings) => [createdBooking, ...currentBookings]);
    } catch {
      setBookingStatus({
        isLoading: false,
        errorMessage:
          'Kunde inte skapa bokningen i Supabase. Kontrollera att rummen är lediga.',
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
          'Kunde inte uppdatera bokningen i Supabase. Kontrollera dubbelbokning.',
      });
      throw new Error('Could not update booking.');
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setBookingStatus({ isLoading: false, errorMessage: null });

    try {
      await cancelBooking(bookingId);
      setBookingList((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking,
        ),
      );
    } catch {
      setBookingStatus({
        isLoading: false,
        errorMessage: 'Kunde inte avboka bokningen i Supabase.',
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
        errorMessage: 'Kunde inte lägga till rummet i Supabase.',
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
        errorMessage: 'Kunde inte byta namn på rummet i Supabase.',
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
        errorMessage: 'Kunde inte ändra rummets status i Supabase.',
      });
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Family Hub</p>
          <h1>Sommarhusets bokningar</h1>
        </div>
        <div className="user-pill" aria-label="Inloggad användare">
          <span>{authenticatedUser.displayName}</span>
          <small>{isAdmin ? 'Admin' : 'Medlem'}</small>
          <button className="link-button" onClick={auth.signOut} type="button">
            Logga ut
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Huvudnavigation">
        {views.map((view) => {
          if (view.id === 'admin' && !isAdmin) {
            return null;
          }

          return (
            <button
              className={activeView === view.id ? 'tab active' : 'tab'}
              key={view.id}
              onClick={() => setActiveView(view.id)}
              type="button"
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
          onCreateBooking={handleCreateBooking}
          onUpdateBooking={handleUpdateBooking}
          roomList={roomList}
          roomStatus={roomStatus}
        />
      )}
      {activeView === 'admin' && isAdmin && (
        <AdminView
          activeRoomsCount={activeRooms.length}
          onAddRoom={handleAddRoom}
          onRenameRoom={handleRenameRoom}
          onToggleRoom={handleToggleRoom}
          roomList={roomList}
          roomStatus={roomStatus}
        />
      )}
    </main>
  );
}

function CalendarView({
  activeRoomsCount,
  bookingStatus,
  bookings,
  existingBookings,
  profiles,
  roomList,
  roomStatus,
}: {
  activeRoomsCount: number;
  bookingStatus: AsyncStatus;
  bookings: BookingWithDetails[];
  existingBookings: Booking[];
  profiles: Profile[];
  roomList: Room[];
  roomStatus: AsyncStatus;
}) {
  const [startDate, setStartDate] = useState('2026-07-14');
  const [endDate, setEndDate] = useState('2026-07-15');
  const availableRooms = getAvailableRooms(
    roomList,
    existingBookings,
    startDate,
    endDate,
  );

  return (
    <section className="content-section">
      <div>
        <p className="section-label">Översikt</p>
        <h2>Kalender</h2>
        <p>
          Välj datum för att se vilka rum som är lediga, upptagna eller
          inaktiva.
        </p>
      </div>

      <div className="summary-grid">
        <SummaryStat label="Aktiva rum" value={activeRoomsCount.toString()} />
        <SummaryStat
          label="Bekräftade bokningar"
          value={bookings.length.toString()}
        />
        <SummaryStat
          label="Lediga rum för valda datum"
          value={availableRooms.length.toString()}
        />
      </div>

      <div className="availability-panel">
        <div>
          <p className="section-label">Tillgänglighet</p>
          <h3>{formatDateRange(startDate, endDate)}</h3>
        </div>

        <div className="form-grid">
          <label>
            Startdatum
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label>
            Slutdatum
            <input
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
        </div>

        <RoomStatusMessage roomList={roomList} roomStatus={roomStatus} />

        {roomList.length > 0 && (
          <div className="room-availability-list">
            {roomList.map((room) => (
              <RoomAvailabilityItem
                endDate={endDate}
                existingBookings={existingBookings}
                key={room.id}
                profiles={profiles}
                room={room}
                roomList={roomList}
                startDate={startDate}
              />
            ))}
          </div>
        )}
      </div>

      <div className="calendar-list" aria-label="Bekräftade bokningar">
        <BookingStatusMessage
          bookingList={bookings}
          bookingStatus={bookingStatus}
        />
        {bookings.map((booking) => (
          <BookingSummaryCard booking={booking} key={booking.id} />
        ))}
      </div>
    </section>
  );
}

function RoomAvailabilityItem({
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
      <article className="room-availability inactive">
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
      <article className="room-availability available">
        <div>
          <h3>{room.name}</h3>
          <p>Inga bokningar krockar med valda datum.</p>
        </div>
        <span>Ledigt</span>
      </article>
    );
  }

  return (
    <article className="room-availability occupied">
      <div>
        <h3>{room.name}</h3>
        {conflictingDetails.map((booking) => (
          <p key={booking.id}>
            {booking.user.displayName}, {formatDateRange(booking.startDate, booking.endDate)}
          </p>
        ))}
      </div>
      <span>Upptaget</span>
    </article>
  );
}

function BookingsView({
  bookingStatus,
  bookings,
  currentUser,
  existingBookings,
  isAdmin,
  onCancelBooking,
  onCreateBooking,
  onUpdateBooking,
  roomList,
  roomStatus,
}: {
  bookingStatus: AsyncStatus;
  bookings: BookingWithDetails[];
  currentUser: Profile;
  existingBookings: Booking[];
  isAdmin: boolean;
  onCancelBooking: (bookingId: string) => Promise<void>;
  onCreateBooking: (
    newBooking: Omit<Booking, 'id' | 'userId' | 'status'>,
  ) => Promise<void>;
  onUpdateBooking: (updatedBooking: Booking) => Promise<void>;
  roomList: Room[];
  roomStatus: AsyncStatus;
}) {
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const conflicts = findConflictingBookings(exampleBookingRequest, existingBookings);
  const editingBooking = bookings.find((booking) => booking.id === editingBookingId);

  function handleEditBooking(booking: BookingWithDetails) {
    setEditingBookingId(booking.id);
  }

  function handleCancelEdit() {
    setEditingBookingId(null);
  }

  async function handleSaveEdit(updatedBooking: Booking) {
    await onUpdateBooking(updatedBooking);
    setEditingBookingId(null);
  }

  return (
    <section className="content-section">
      <div>
        <p className="section-label">Bokningar</p>
        <h2>Hantera bokningar</h2>
        <p>
          Skapa, redigera och avboka bokningar lokalt. Admin kan hantera alla
          bokningar.
        </p>
      </div>

      {editingBooking ? (
        <BookingForm
          existingBookings={existingBookings}
          mode={{ type: 'edit', booking: editingBooking }}
          onCancelEdit={handleCancelEdit}
          onUpdateBooking={handleSaveEdit}
          roomList={roomList}
        />
      ) : (
        <BookingForm
          existingBookings={existingBookings}
          mode={{ type: 'create' }}
          onCreateBooking={onCreateBooking}
          roomList={roomList}
        />
      )}

      <RoomStatusMessage roomList={roomList} roomStatus={roomStatus} />
      <BookingStatusMessage bookingList={bookings} bookingStatus={bookingStatus} />

      <div className="notice">
        <strong>Test av dubbelbokning</strong>
        <p>
          Försök: Rum 1, 14 juli till 15 juli. Resultat:{' '}
          {conflicts.length > 0
            ? 'krockar med en befintlig bokning.'
            : 'rummet är ledigt.'}
        </p>
      </div>

      <div className="booking-list">
        {bookings.map((booking) => {
          const canManage = isAdmin || canManageBooking(currentUser, booking);

          return (
            <article className="booking-item" key={booking.id}>
              <BookingSummary booking={booking} />
              {canManage && (
                <div className="item-actions">
                  <button
                    disabled={booking.status === 'cancelled'}
                    onClick={() => handleEditBooking(booking)}
                    type="button"
                  >
                    Redigera
                  </button>
                  <button
                    className="secondary-button"
                    disabled={booking.status === 'cancelled'}
                    onClick={() => onCancelBooking(booking.id)}
                    type="button"
                  >
                    Avboka
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BookingForm({
  existingBookings,
  mode,
  onCancelEdit,
  onCreateBooking,
  onUpdateBooking,
  roomList,
}: {
  existingBookings: Booking[];
  mode: BookingFormMode;
  onCancelEdit?: () => void;
  onCreateBooking?: (
    newBooking: Omit<Booking, 'id' | 'userId' | 'status'>,
  ) => Promise<void>;
  onUpdateBooking?: (updatedBooking: Booking) => Promise<void>;
  roomList: Room[];
}) {
  const isEditMode = mode.type === 'edit';
  const initialBooking = isEditMode ? mode.booking : null;
  const [startDate, setStartDate] = useState(initialBooking?.startDate ?? '2026-07-19');
  const [endDate, setEndDate] = useState(initialBooking?.endDate ?? '2026-07-21');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    initialBooking?.roomIds ?? [],
  );
  const [availabilityResult, setAvailabilityResult] =
    useState<AvailabilityResult>(initialAvailabilityResult);
  const roomOptions = getRoomOptions(roomList, selectedRoomIds);
  const canSaveBooking = availabilityResult.status === 'available';
  const title = isEditMode ? 'Redigera bokning' : 'Skapa bokning';

  function resetAvailabilityResult() {
    setAvailabilityResult(initialAvailabilityResult);
  }

  function handleRoomToggle(roomId: string) {
    resetAvailabilityResult();
    setSelectedRoomIds((currentRoomIds) => {
      if (currentRoomIds.includes(roomId)) {
        return currentRoomIds.filter((currentRoomId) => currentRoomId !== roomId);
      }

      return [...currentRoomIds, roomId];
    });
  }

  function validateBookingRequest(): AvailabilityResult | null {
    if (!startDate || !endDate) {
      return { status: 'invalid', message: 'Välj både startdatum och slutdatum.' };
    }

    if (startDate > endDate) {
      return {
        status: 'invalid',
        message: 'Startdatum kan inte vara efter slutdatum.',
      };
    }

    if (selectedRoomIds.length === 0) {
      return { status: 'invalid', message: 'Välj minst ett rum.' };
    }

    return null;
  }

  function getComparableBookings() {
    if (!isEditMode) {
      return existingBookings;
    }

    return existingBookings.filter((booking) => booking.id !== mode.booking.id);
  }

  function handleCheckAvailability() {
    const validationError = validateBookingRequest();

    if (validationError) {
      setAvailabilityResult(validationError);
      return;
    }

    const conflicts = findConflictingBookings(
      { roomIds: selectedRoomIds, startDate, endDate },
      getComparableBookings(),
    );

    if (conflicts.length > 0) {
      setAvailabilityResult({
        status: 'conflict',
        message: 'Minst ett valt rum är redan bokat under de datumen.',
      });
      return;
    }

    setAvailabilityResult({
      status: 'available',
      message: 'Rummen är lediga. Du kan spara bokningen.',
    });
  }

  async function handleSubmit() {
    if (!canSaveBooking) {
      return;
    }

    if (isEditMode) {
      try {
        await onUpdateBooking?.({
          ...mode.booking,
          roomIds: selectedRoomIds,
          startDate,
          endDate,
        });
      } catch {
        setAvailabilityResult({
          status: 'conflict',
          message: 'Ändringen kunde inte sparas i Supabase.',
        });
      }

      return;
    }

    try {
      await onCreateBooking?.({
        roomIds: selectedRoomIds,
        startDate,
        endDate,
      });
    } catch {
      setAvailabilityResult({
        status: 'conflict',
        message: 'Bokningen kunde inte sparas i Supabase.',
      });
      return;
    }

    setAvailabilityResult({
      status: 'idle',
      message: 'Bokningen skapades. Du kan skapa en till bokning om du vill.',
    });
  }

  return (
    <form className="booking-form" onSubmit={(event) => event.preventDefault()}>
      <div className="form-heading">
        <div>
          <p className="section-label">{isEditMode ? 'Ändra' : 'Ny bokning'}</p>
          <h3>{title}</h3>
        </div>
        {isEditMode && (
          <button className="secondary-button" onClick={onCancelEdit} type="button">
            Avbryt
          </button>
        )}
      </div>

      <div className="form-grid">
        <label>
          Startdatum
          <input
            onChange={(event) => {
              resetAvailabilityResult();
              setStartDate(event.target.value);
            }}
            type="date"
            value={startDate}
          />
        </label>

        <label>
          Slutdatum
          <input
            onChange={(event) => {
              resetAvailabilityResult();
              setEndDate(event.target.value);
            }}
            type="date"
            value={endDate}
          />
        </label>
      </div>

      <fieldset>
        <legend>Välj rum</legend>
        <div className="room-options">
          {roomOptions.map((room) => (
            <label className="room-option" key={room.id}>
              <input
                checked={selectedRoomIds.includes(room.id)}
                disabled={!room.isActive}
                onChange={() => handleRoomToggle(room.id)}
                type="checkbox"
              />
              <span>{room.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`availability-message ${availabilityResult.status}`}>
        {availabilityResult.message}
      </div>

      <div className="form-actions">
        <button onClick={handleCheckAvailability} type="button">
          Kontrollera tillgänglighet
        </button>
        {canSaveBooking && (
          <button onClick={handleSubmit} type="button">
            {isEditMode ? 'Spara ändringar' : 'Skapa bokning'}
          </button>
        )}
      </div>
    </form>
  );
}

function AdminView({
  activeRoomsCount,
  onAddRoom,
  onRenameRoom,
  onToggleRoom,
  roomList,
  roomStatus,
}: {
  activeRoomsCount: number;
  onAddRoom: (roomName: string) => Promise<void>;
  onRenameRoom: (roomId: string, name: string) => Promise<void>;
  onToggleRoom: (roomId: string) => Promise<void>;
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
    <section className="content-section">
      <div>
        <p className="section-label">Admin</p>
        <h2>Boendets inställningar</h2>
        <p>
          Endast Ramadan/admin kan ändra rum, regler och andra inställningar.
        </p>
      </div>

      <div className="settings-grid">
        <SummaryStat label="Totalt antal rum" value={roomList.length.toString()} />
        <SummaryStat label="Aktiva rum" value={activeRoomsCount.toString()} />
        <SummaryStat label="Bokningstyp" value="Per rum" />
      </div>

      <RoomStatusMessage roomList={roomList} roomStatus={roomStatus} />

      <form className="admin-room-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Nytt rum
          <input
            onChange={(event) => setNewRoomName(event.target.value)}
            placeholder="Exempel: Gästrum"
            value={newRoomName}
          />
        </label>
        <button disabled={!trimmedRoomName} onClick={handleSubmit} type="button">
          Lägg till rum
        </button>
      </form>

      <div className="room-list">
        {roomList.map((room) => (
          <RoomAdminItem
            key={room.id}
            onRenameRoom={onRenameRoom}
            onToggleRoom={onToggleRoom}
            room={room}
          />
        ))}
      </div>
    </section>
  );
}

function RoomAdminItem({
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
    <article className="room-admin-item">
      <label>
        Rumsnamn
        <input
          onChange={(event) => setDraftName(event.target.value)}
          value={draftName}
        />
      </label>
      <div className="item-actions">
        <strong>{room.isActive ? 'Aktivt' : 'Inaktivt'}</strong>
        <button disabled={!trimmedName || !hasChanged} onClick={handleSaveName} type="button">
          Spara namn
        </button>
        <button
          className="secondary-button"
          onClick={() => onToggleRoom(room.id)}
          type="button"
        >
          {room.isActive ? 'Inaktivera' : 'Aktivera'}
        </button>
      </div>
    </article>
  );
}

function BookingSummaryCard({ booking }: { booking: BookingWithDetails }) {
  return (
    <article className="calendar-booking">
      <BookingSummary booking={booking} />
      <span>{booking.status === 'confirmed' ? 'Bokad' : 'Avbokad'}</span>
    </article>
  );
}

function BookingSummary({ booking }: { booking: BookingWithDetails }) {
  return (
    <div>
      <h3>{booking.rooms.map((room) => room.name).join(', ')}</h3>
      <p>
        {formatDateRange(booking.startDate, booking.endDate)} -{' '}
        {booking.user.displayName} - {getStatusLabel(booking)}
      </p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RoomStatusMessage({
  roomList,
  roomStatus,
}: {
  roomList: Room[];
  roomStatus: AsyncStatus;
}) {
  if (roomStatus.isLoading) {
    return (
      <div className="availability-message loading">
        Hämtar rum från Supabase...
      </div>
    );
  }

  if (roomStatus.errorMessage) {
    return (
      <div className="availability-message error">{roomStatus.errorMessage}</div>
    );
  }

  if (roomList.length === 0) {
    return (
      <div className="availability-message idle">
        Inga rum finns i Supabase ännu. Lägg till rum i Admin-vyn.
      </div>
    );
  }

  return null;
}

function BookingStatusMessage({
  bookingList,
  bookingStatus,
}: {
  bookingList: BookingWithDetails[];
  bookingStatus: AsyncStatus;
}) {
  if (bookingStatus.isLoading) {
    return (
      <div className="availability-message loading">
        Hämtar bokningar från Supabase...
      </div>
    );
  }

  if (bookingStatus.errorMessage) {
    return (
      <div className="availability-message error">
        {bookingStatus.errorMessage}
      </div>
    );
  }

  if (bookingList.length === 0) {
    return (
      <div className="availability-message idle">
        Inga bokningar finns i Supabase ännu.
      </div>
    );
  }

  return null;
}

function formatDateRange(startDate: string, endDate: string) {
  return `${startDate} till ${endDate}`;
}

function getRoomOptions(roomList: Room[], selectedRoomIds: string[]) {
  return roomList.filter(
    (room) => room.isActive || selectedRoomIds.includes(room.id),
  );
}

function getStatusLabel(booking: BookingWithDetails) {
  return booking.status === 'confirmed' ? 'Bekräftad' : 'Avbokad';
}
