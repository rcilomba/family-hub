import { useMemo, useState } from 'react';
import {
  bookings as initialBookings,
  profiles,
  rooms as initialRooms,
} from './data/mockData';
import type { Booking, BookingWithDetails, Room } from './types/booking';
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

const currentUser = profiles[0];
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
  const [activeView, setActiveView] = useState<View>('calendar');
  const [bookingList, setBookingList] = useState<Booking[]>(initialBookings);
  const [roomList, setRoomList] = useState<Room[]>(initialRooms);
  const isAdmin = currentUser.role === 'admin';
  const activeRooms = getActiveRooms(roomList);
  const bookingDetails = useMemo(
    () => getBookingDetails(bookingList, profiles, roomList),
    [bookingList, roomList],
  );
  const confirmedBookingDetails = bookingDetails.filter(
    (booking) => booking.status === 'confirmed',
  );

  function handleCreateBooking(newBooking: Omit<Booking, 'id' | 'userId' | 'status'>) {
    setBookingList((currentBookings) => [
      {
        ...newBooking,
        id: `booking-${Date.now()}`,
        userId: currentUser.id,
        status: 'confirmed',
      },
      ...currentBookings,
    ]);
  }

  function handleUpdateBooking(updatedBooking: Booking) {
    setBookingList((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === updatedBooking.id ? updatedBooking : booking,
      ),
    );
  }

  function handleCancelBooking(bookingId: string) {
    setBookingList((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking,
      ),
    );
  }

  function handleAddRoom(roomName: string) {
    setRoomList((currentRooms) => [
      ...currentRooms,
      {
        id: `room-${Date.now()}`,
        name: roomName,
        isActive: true,
      },
    ]);
  }

  function handleRenameRoom(roomId: string, name: string) {
    setRoomList((currentRooms) =>
      currentRooms.map((room) => (room.id === roomId ? { ...room, name } : room)),
    );
  }

  function handleToggleRoom(roomId: string) {
    setRoomList((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId ? { ...room, isActive: !room.isActive } : room,
      ),
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Family Hub</p>
          <h1>Sommarhusets bokningar</h1>
        </div>
        <div className="user-pill" aria-label="Inloggad användare">
          <span>{currentUser.displayName}</span>
          <small>{isAdmin ? 'Admin' : 'Medlem'}</small>
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
          roomList={roomList}
        />
      )}
      {activeView === 'bookings' && (
        <BookingsView
          bookings={bookingDetails}
          existingBookings={bookingList}
          isAdmin={isAdmin}
          onCancelBooking={handleCancelBooking}
          onCreateBooking={handleCreateBooking}
          onUpdateBooking={handleUpdateBooking}
          roomList={roomList}
        />
      )}
      {activeView === 'admin' && isAdmin && (
        <AdminView
          activeRoomsCount={activeRooms.length}
          onAddRoom={handleAddRoom}
          onRenameRoom={handleRenameRoom}
          onToggleRoom={handleToggleRoom}
          roomList={roomList}
        />
      )}
    </main>
  );
}

function CalendarView({
  activeRoomsCount,
  bookings,
  existingBookings,
  roomList,
}: {
  activeRoomsCount: number;
  bookings: BookingWithDetails[];
  existingBookings: Booking[];
  roomList: Room[];
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

        <div className="room-availability-list">
          {roomList.map((room) => (
            <RoomAvailabilityItem
              endDate={endDate}
              existingBookings={existingBookings}
              key={room.id}
              room={room}
              roomList={roomList}
              startDate={startDate}
            />
          ))}
        </div>
      </div>

      <div className="calendar-list" aria-label="Bekräftade bokningar">
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
  room,
  roomList,
  startDate,
}: {
  endDate: string;
  existingBookings: Booking[];
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
  bookings,
  existingBookings,
  isAdmin,
  onCancelBooking,
  onCreateBooking,
  onUpdateBooking,
  roomList,
}: {
  bookings: BookingWithDetails[];
  existingBookings: Booking[];
  isAdmin: boolean;
  onCancelBooking: (bookingId: string) => void;
  onCreateBooking: (newBooking: Omit<Booking, 'id' | 'userId' | 'status'>) => void;
  onUpdateBooking: (updatedBooking: Booking) => void;
  roomList: Room[];
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

  function handleSaveEdit(updatedBooking: Booking) {
    onUpdateBooking(updatedBooking);
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
  onCreateBooking?: (newBooking: Omit<Booking, 'id' | 'userId' | 'status'>) => void;
  onUpdateBooking?: (updatedBooking: Booking) => void;
  roomList: Room[];
}) {
  const isEditMode = mode.type === 'edit';
  const initialBooking = isEditMode ? mode.booking : null;
  const [startDate, setStartDate] = useState(initialBooking?.startDate ?? '2026-07-19');
  const [endDate, setEndDate] = useState(initialBooking?.endDate ?? '2026-07-21');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    initialBooking?.roomIds ?? ['room-1'],
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

  function handleSubmit() {
    if (!canSaveBooking) {
      return;
    }

    if (isEditMode) {
      onUpdateBooking?.({
        ...mode.booking,
        roomIds: selectedRoomIds,
        startDate,
        endDate,
      });
      return;
    }

    onCreateBooking?.({
      roomIds: selectedRoomIds,
      startDate,
      endDate,
    });

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
}: {
  activeRoomsCount: number;
  onAddRoom: (roomName: string) => void;
  onRenameRoom: (roomId: string, name: string) => void;
  onToggleRoom: (roomId: string) => void;
  roomList: Room[];
}) {
  const [newRoomName, setNewRoomName] = useState('');
  const trimmedRoomName = newRoomName.trim();

  function handleSubmit() {
    if (!trimmedRoomName) {
      return;
    }

    onAddRoom(trimmedRoomName);
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
          <article className="room-admin-item" key={room.id}>
            <label>
              Rumsnamn
              <input
                onChange={(event) => onRenameRoom(room.id, event.target.value)}
                value={room.name}
              />
            </label>
            <div className="item-actions">
              <strong>{room.isActive ? 'Aktivt' : 'Inaktivt'}</strong>
              <button
                className="secondary-button"
                onClick={() => onToggleRoom(room.id)}
                type="button"
              >
                {room.isActive ? 'Inaktivera' : 'Aktivera'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
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
