import { useState } from 'react';

type UserRole = 'admin' | 'member';
type View = 'calendar' | 'bookings' | 'admin';

type UserPreview = {
  name: string;
  email: string;
  role: UserRole;
};

const currentUser: UserPreview = {
  name: 'Ramadan',
  email: 'ramadan@example.com',
  role: 'admin',
};

const views: Array<{ id: View; label: string }> = [
  { id: 'calendar', label: 'Kalender' },
  { id: 'bookings', label: 'Bokningar' },
  { id: 'admin', label: 'Admin' },
];

export function App() {
  const [activeView, setActiveView] = useState<View>('calendar');
  const isAdmin = currentUser.role === 'admin';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Family Hub</p>
          <h1>Sommarhusets bokningar</h1>
        </div>
        <div className="user-pill" aria-label="Inloggad användare">
          <span>{currentUser.name}</span>
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

      {activeView === 'calendar' && <CalendarView />}
      {activeView === 'bookings' && <BookingsView isAdmin={isAdmin} />}
      {activeView === 'admin' && isAdmin && <AdminView />}
    </main>
  );
}

function CalendarView() {
  return (
    <section className="content-section">
      <div>
        <p className="section-label">Översikt</p>
        <h2>Kalender</h2>
        <p>
          Här kommer familjen se bokade datum, lediga rum och vem som har bokat.
        </p>
      </div>

      <div className="calendar-grid" aria-label="Kalenderplatshållare">
        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day) => (
          <strong key={day}>{day}</strong>
        ))}
        {Array.from({ length: 14 }, (_, index) => (
          <div className="day-cell" key={index}>
            <span>{index + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BookingsView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="content-section">
      <div>
        <p className="section-label">Bokningar</p>
        <h2>Hantera bokningar</h2>
        <p>
          Nästa steg blir att skapa riktig bokningsdata, datumval och kontroll
          mot dubbelbokningar.
        </p>
      </div>

      <div className="booking-list">
        <article className="booking-item">
          <div>
            <h3>Exempelbokning</h3>
            <p>Rum 1 · 12 juli till 16 juli · Ramadan</p>
          </div>
          {isAdmin && <button type="button">Redigera</button>}
        </article>
      </div>
    </section>
  );
}

function AdminView() {
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
        <div>
          <span>Antal rum</span>
          <strong>4</strong>
        </div>
        <div>
          <span>Bokningstyp</span>
          <strong>Per rum</strong>
        </div>
        <div>
          <span>Behörighet</span>
          <strong>Admin styr borttagning</strong>
        </div>
      </div>
    </section>
  );
}
