import { useMemo, useState } from 'react';
import { bookings as initialBookings, profiles, rooms } from './data/mockData';
import type { Booking, BookingWithDetails } from './types/booking';
import {
  canManageBooking,
  findConflictingBookings,
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
        />
      )}
      {activeView === 'bookings' && (
        <BookingsView
          bookings={bookingDetails}
          existingBookings={bookingList}
          isAdmin={isAdmin}
          onCreateBooking={handleCreateBooking}
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
}: {
  activeRoomsCount: number;
  bookings: BookingWithDetails[];
}) {
  const availableRooms = getAvailableRooms(
    rooms,
    bookings,
    exampleBookingRequest.startDate,
    exampleBookingRequest.endDate,
  );

  return (
    <section className="content-section">
      <div>
        <p className="section-label">Översikt</p>
        <h2>Kalender</h2>
        <p>
          Här ser familjen bekräftade bokningar, bokade rum och vem som har
          bokat.
        </p>
      </div>

      <div className="summary-grid">
        <SummaryStat label="Aktiva rum" value={activeRoomsCount.toString()} />
        <SummaryStat
          label="Bekräftade bokningar"
          value={bookings.length.toString()}
        />
        <SummaryStat
          label="Lediga rum 14-15 juli"
          value={availableRooms.length.toString()}
        />
      </div>

      <div className="calendar-list" aria-label="Bekräftade bokningar">
        {bookings.map((booking) => (
          <article className="calendar-booking" key={booking.id}>
            <div>
              <h3>{booking.rooms.map((room) => room.name).join(', ')}</h3>
              <p>
                {formatDateRange(booking.startDate, booking.endDate)} -{' '}
                {booking.user.displayName}
              </p>
            </div>
            <span>{booking.status === 'confirmed' ? 'Bokad' : 'Avbokad'}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function BookingsView({
  bookings,
  existingBookings,
  isAdmin,
  onCreateBooking,
}: {
  bookings: BookingWithDetails[];
  existingBookings: Booking[];
  isAdmin: boolean;
  onCreateBooking: (newBooking: Omit<Booking, 'id' | 'userId' | 'status'>) => void;
}) {
  const conflicts = findConflictingBookings(exampleBookingRequest, existingBookings);

  return (
    <section className="content-section">
      <div>
        <p className="section-label">Bokningar</p>
        <h2>Hantera bokningar</h2>
        <p>
          Skapa en lokal testbokning. I nästa större steg kan samma flöde kopplas
          till en databas.
        </p>
      </div>

      <BookingForm existingBookings={existingBookings} onCreateBooking={onCreateBooking} />

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
              <div>
                <h3>{booking.rooms.map((room) => room.name).join(', ')}</h3>
                <p>
                  {formatDateRange(booking.startDate, booking.endDate)} -{' '}
                  {booking.user.displayName} - {getStatusLabel(booking)}
                </p>
              </div>
              {canManage && <button type="button">Redigera</button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BookingForm({
  existingBookings,
  onCreateBooking,
}: {
  existingBookings: Booking[];
  onCreateBooking: (newBooking: Omit<Booking, 'id' | 'userId' | 'status'>) => void;
}) {
  const [startDate, setStartDate] = useState('2026-07-19');
  const [endDate, setEndDate] = useState('2026-07-21');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(['room-1']);
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResult>(
    initialAvailabilityResult,
  );
  const activeRooms = getActiveRooms(rooms);
  const canCreateBooking = availabilityResult.status === 'available';

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

  function handleCheckAvailability() {
    const validationError = validateBookingRequest();

    if (validationError) {
      setAvailabilityResult(validationError);
      return;
    }

    const conflicts = findConflictingBookings(
      { roomIds: selectedRoomIds, startDate, endDate },
      existingBookings,
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
      message: 'Rummen är lediga. Du kan skapa bokningen.',
    });
  }

  function handleSubmit() {
    if (!canCreateBooking) {
      return;
    }

    onCreateBooking({
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
        {canCreateBooking && (
          <button onClick={handleSubmit} type="button">
            Skapa bokning
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
