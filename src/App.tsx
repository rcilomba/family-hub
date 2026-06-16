import { useMemo, useState } from 'react';
import { bookings, profiles, rooms } from './data/mockData';
import type { BookingWithDetails } from './types/booking';
import {
  canManageBooking,
  findConflictingBookings,
  getActiveRooms,
  getAvailableRooms,
  getBookingDetails,
} from './utils/bookingUtils';

type View = 'calendar' | 'bookings' | 'admin';

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

export function App() {
  const [activeView, setActiveView] = useState<View>('calendar');
  const isAdmin = currentUser.role === 'admin';
  const activeRooms = getActiveRooms(rooms);
  const bookingDetails = useMemo(
    () => getBookingDetails(bookings, profiles, rooms),
    [],
  );
  const confirmedBookingDetails = bookingDetails.filter(
    (booking) => booking.status === 'confirmed',
  );

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
        <BookingsView bookings={bookingDetails} isAdmin={isAdmin} />
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
                {formatDateRange(booking.startDate, booking.endDate)} ·{' '}
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
  isAdmin,
}: {
  bookings: BookingWithDetails[];
  isAdmin: boolean;
}) {
  const conflicts = findConflictingBookings(exampleBookingRequest, bookings);

  return (
    <section className="content-section">
      <div>
        <p className="section-label">Bokningar</p>
        <h2>Hantera bokningar</h2>
        <p>
          Den här vyn använder mockdata och visar hur appen hittar krockar innan
          en ny bokning sparas.
        </p>
      </div>

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
                  {formatDateRange(booking.startDate, booking.endDate)} ·{' '}
                  {booking.user.displayName} · {getStatusLabel(booking)}
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
