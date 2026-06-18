import { useMemo, useState } from 'react';
import { bookings as initialBookings, profiles, rooms } from './data/mockData';
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
  const isAdmin = currentUser.role === 'admin';
  const activeRooms = getActiveRooms(rooms);
  const bookingDetails = useMemo(
    () => getBookingDetails(bookingList, profiles, rooms),
    [bookingList],
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
        />
      )}
      {activeView === 'admin' && isAdmin && (
        <AdminView activeRoomsCount={activeRooms.length} />
      )}
    </main>
  );
}

function CalendarView({
  activeRoomsCount,
  bookings,
  existingBookings,
}: {
  activeRoomsCount: number;
  bookings: BookingWithDetails[];
  existingBookings: Booking[];
}) {
  const [startDate, setStartDate] = useState('2026-07-14');
  const [endDate, setEndDate] = useState('2026-07-15');
  const availableRooms = getAvailableRooms(rooms, existingBookings, startDate, endDate);

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
          {rooms.map((room) => (
            <RoomAvailabilityItem
              endDate={endDate}
              existingBookings={existingBookings}
              key={room.id}
              room={room}
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
  startDate,
}: {
  endDate: string;
  existingBookings: Booking[];
  room: Room;
  startDate: string;
}) {
  const conflicts = findRoomConflictingBookings(
    room.id,
    existingBookings,
    startDate,
    endDate,
  );
  const conflictingDetails = getBookingDetails(conflicts, profiles, rooms);

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
}: {
  bookings: BookingWithDetails[];
  existingBookings: Booking[];
  isAdmin: boolean;
  onCancelBooking: (bookingId: string) => void;
  onCreateBooking: (newBooking: Omit<Booking, 'id' | 'userId' | 'status'>) => void;
  onUpdateBooking: (updatedBooking: Booking) => void;
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
        />
      ) : (
        <BookingForm
          existingBookings={existingBookings}
          mode={{ type: 'create' }}
          onCreateBooking={onCreateBooking}
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
}: {
  existingBookings: Booking[];
  mode: BookingFormMode;
  onCancelEdit?: () => void;
  onCreateBooking?: (newBooking: Omit<Booking, 'id' | 'userId' | 'status'>) => void;
  onUpdateBooking?: (updatedBooking: Booking) => void;
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
  const activeRooms = getActiveRooms(rooms);
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
          {activeRooms.map((room) => (
            <label className="room-option" key={room.id}>
              <input
                checked={selectedRoomIds.includes(room.id)}
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

function AdminView({ activeRoomsCount }: { activeRoomsCount: number }) {
  return (
    <section className="content-section">
      <div>
        <p className="section-label">Admin</p>
        <h2>Boendets inställningar</h2>
        <p>
          Endast Ramadan/admin ska kunna ändra rum, regler och andra
          inställningar.
        </p>
      </div>

      <div className="settings-grid">
        <SummaryStat label="Totalt antal rum" value={rooms.length.toString()} />
        <SummaryStat label="Aktiva rum" value={activeRoomsCount.toString()} />
        <SummaryStat label="Bokningstyp" value="Per rum" />
      </div>

      <div className="room-list">
        {rooms.map((room) => (
          <article className="room-item" key={room.id}>
            <span>{room.name}</span>
            <strong>{room.isActive ? 'Aktivt' : 'Inaktivt'}</strong>
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

function getStatusLabel(booking: BookingWithDetails) {
  return booking.status === 'confirmed' ? 'Bekräftad' : 'Avbokad';
}
