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

const views: Array<{ id: View; label: string }> = [
  { id: 'calendar', label: 'Kalender' },
  { id: 'bookings', label: 'Bokningar' },
  { id: 'admin', label: 'Admin' },
];

const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

const initialAvailabilityResult: AvailabilityResult = {
  status: 'idle',
  message: 'Välj datum och rum för att kontrollera tillgänglighet.',
};

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
      <main className="auth-shell">
        <section className="auth-card">
          <img
            className="brand-logo auth-logo"
            src="/kapiamba-logo-cropped.png"
            alt="The Kapiambas"
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
        {auth.errorMessage && <p className="auth-error">{auth.errorMessage}</p>}
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

  async function handleUpdateProfileName(profileId: string, displayName: string) {
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      return;
    }

    setProfileStatus({ isLoading: false, errorMessage: null });

    try {
      const updatedProfile = await updateProfileName(profileId, trimmedDisplayName);

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

      setAllowedEmailList((currentAllowedEmails) => [
        ...currentAllowedEmails.filter(
          (allowedEmail) => allowedEmail.email !== createdAllowedEmail.email,
        ),
        createdAllowedEmail,
      ].sort((firstEmail, secondEmail) =>
        firstEmail.email.localeCompare(secondEmail.email),
      ));
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
        currentAllowedEmails.filter((allowedEmail) => allowedEmail.email !== email),
      );
    } catch {
      setAllowedEmailStatus({
        isLoading: false,
        errorMessage: 'Kunde inte ta bort e-postadressen.',
      });
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <img
            className="brand-logo app-logo"
            src="/kapiamba-logo-cropped.png"
            alt="The Kapiambas"
          />
          <h1>Sommarhuset</h1>
          <p>Boka rum, se tillgänglighet och planera familjens vistelser.</p>
        </div>
        <div className="account-area">
          <button
            aria-expanded={isUserMenuOpen}
            aria-label="Öppna användarmeny"
            className="menu-button"
            onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="user-pill" aria-label="Inloggad användare">
            <span>{authenticatedUser.displayName}</span>
            <small>{isAdmin ? 'Admin' : 'Medlem'}</small>
            <button className="logout-button" onClick={auth.signOut} type="button">
              Logga ut
            </button>
          </div>
          {isUserMenuOpen && (
            <div className="mobile-user-menu">
              <span>{authenticatedUser.displayName}</span>
              <small>{isAdmin ? 'Admin' : 'Medlem'}</small>
              <button className="logout-button" onClick={auth.signOut} type="button">
                Logga ut
              </button>
            </div>
          )}
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
              onClick={() => {
                setActiveView(view.id);
                setIsUserMenuOpen(false);
              }}
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
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthKey(bookings[0]?.startDate ?? getTodayDateString()),
  );
  const [selectedDate, setSelectedDate] = useState(
    bookings[0]?.startDate ?? getTodayDateString(),
  );
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState(selectedDate);
  const calendarDays = getMonthCalendarDays(visibleMonth);
  const selectedDateBookings = bookings.filter((booking) =>
    bookingIncludesDate(booking, selectedDate),
  );
  const selectedDateAvailableRooms = getAvailableRooms(
    roomList,
    existingBookings,
    selectedDate,
    selectedDate,
  );
  const availableRooms = getAvailableRooms(
    roomList,
    existingBookings,
    startDate,
    endDate,
  );

  useEffect(() => {
    if (bookings.length === 0) {
      return;
    }

    setVisibleMonth(getMonthKey(bookings[0].startDate));
    setSelectedDate(bookings[0].startDate);
    setStartDate(bookings[0].startDate);
    setEndDate(bookings[0].startDate);
  }, [bookings.length]);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setStartDate(date);
    setEndDate(date);
    setIsDayModalOpen(true);
  }

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

      <div className="month-calendar">
        <div className="month-calendar-header">
          <button
            className="secondary-button"
            onClick={() => setVisibleMonth(getAdjacentMonthKey(visibleMonth, -1))}
            type="button"
          >
            Föregående
          </button>
          <div>
            <p className="section-label">Månadsvy</p>
            <h3>{formatMonthLabel(visibleMonth)}</h3>
          </div>
          <button
            className="secondary-button"
            onClick={() => setVisibleMonth(getAdjacentMonthKey(visibleMonth, 1))}
            type="button"
          >
            Nästa
          </button>
        </div>

        <div className="calendar-grid" aria-label="Månadskalender">
          {weekdays.map((weekday) => (
            <strong key={weekday}>{weekday}</strong>
          ))}
          {calendarDays.map((day) => {
            const dayBookings = bookings.filter((booking) =>
              bookingIncludesDate(booking, day.date),
            );
            const isSelected = day.date === selectedDate;
            const isBooked = dayBookings.length > 0;
            const bookingLabels = dayBookings.map(getCalendarBookingLabel);
            const dayBookingLabel = isBooked
              ? bookingLabels.join(', ')
              : 'ingen bokning';

            return (
              <button
                aria-label={`${formatDate(day.date)} har ${dayBookingLabel}`}
                className={[
                  'day-cell',
                  day.isCurrentMonth ? '' : 'outside-month',
                  isSelected ? 'selected' : '',
                  isBooked ? 'booked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={day.date}
                onClick={() => handleSelectDate(day.date)}
                type="button"
              >
                <span>{day.dayNumber}</span>
                {isBooked && (
                  <div className="day-booking-badges">
                    {dayBookings.map((booking) => (
                      <small key={booking.id}>
                        {getCalendarBookingLabel(booking)}
                      </small>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isDayModalOpen && (
        <DayBookingModal
          bookingStatus={bookingStatus}
          bookings={selectedDateBookings}
          date={selectedDate}
          onClose={() => setIsDayModalOpen(false)}
        />
      )}

      <div className="selected-day-panel">
        <div>
          <p className="section-label">Vald dag</p>
          <h3>{formatDate(selectedDate)}</h3>
          <p>
            {selectedDateAvailableRooms.length} av {activeRoomsCount} aktiva rum
            är lediga den här dagen.
          </p>
        </div>

        <div className="room-availability-list">
          <RoomStatusMessage roomList={roomList} roomStatus={roomStatus} />
          {roomList.map((room) => (
            <RoomAvailabilityItem
              endDate={selectedDate}
              existingBookings={existingBookings}
              key={room.id}
              profiles={profiles}
              room={room}
              roomList={roomList}
              startDate={selectedDate}
            />
          ))}
        </div>

        <div className="calendar-list" aria-label="Bokningar för vald dag">
          <BookingStatusMessage
            bookingList={selectedDateBookings}
            bookingStatus={bookingStatus}
            emptyMessage="Inga bokningar den valda dagen."
          />
          {selectedDateBookings.map((booking) => (
            <BookingSummaryCard booking={booking} key={booking.id} />
          ))}
        </div>
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
  ) => Promise<BookingWithDetails>;
  onUpdateBooking: (updatedBooking: Booking) => Promise<void>;
  roomList: Room[];
  roomStatus: AsyncStatus;
}) {
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [latestConfirmation, setLatestConfirmation] =
    useState<BookingWithDetails | null>(null);
  const editingBooking = bookings.find((booking) => booking.id === editingBookingId);

  function handleEditBooking(booking: BookingWithDetails) {
    setLatestConfirmation(null);
    setEditingBookingId(booking.id);
  }

  function handleCancelEdit() {
    setEditingBookingId(null);
  }

  async function handleCancelWithConfirmation(booking: BookingWithDetails) {
    const shouldCancel = window.confirm(
      `Vill du avboka ${booking.rooms
        .map((room) => room.name)
        .join(', ')} ${formatDateRange(booking.startDate, booking.endDate)}?`,
    );

    if (!shouldCancel) {
      return;
    }

    await onCancelBooking(booking.id);
  }

  async function handleCreateWithConfirmation(
    newBooking: Omit<Booking, 'id' | 'userId' | 'status'>,
  ) {
    const createdBooking = await onCreateBooking(newBooking);

    setLatestConfirmation(createdBooking);
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
          Skapa nya bokningar och hantera befintliga bokningar för
          sommarhuset.
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
          onCreateBooking={handleCreateWithConfirmation}
          roomList={roomList}
        />
      )}

      {latestConfirmation && (
        <BookingConfirmationCard
          booking={latestConfirmation}
          onDismiss={() => setLatestConfirmation(null)}
        />
      )}

      <RoomStatusMessage roomList={roomList} roomStatus={roomStatus} />
      <BookingStatusMessage bookingList={bookings} bookingStatus={bookingStatus} />

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
                    onClick={() => handleCancelWithConfirmation(booking)}
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
  onUpdateProfileName: (profileId: string, displayName: string) => Promise<void>;
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
    <section className="content-section">
      <div>
        <p className="section-label">Admin</p>
        <h2>Boendets inställningar</h2>
        <p>Endast admin kan ändra rum och andra inställningar.</p>
      </div>

      <div className="settings-grid">
        <SummaryStat label="Totalt antal rum" value={roomList.length.toString()} />
        <SummaryStat label="Aktiva rum" value={activeRoomsCount.toString()} />
        <SummaryStat label="Användare" value={profileList.length.toString()} />
        <SummaryStat
          label="Tillåtna e-postadresser"
          value={allowedEmailList.length.toString()}
        />
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

      <div className="admin-panel">
        <div>
          <p className="section-label">Användare</p>
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

        <div className="profile-list">
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

function AllowedEmailsPanel({
  allowedEmailList,
  allowedEmailStatus,
  currentUserEmail,
  onAddAllowedEmail,
  onRemoveAllowedEmail,
}: {
  allowedEmailList: AllowedEmail[];
  allowedEmailStatus: AsyncStatus;
  currentUserEmail: string;
  onAddAllowedEmail: (email: string) => Promise<void>;
  onRemoveAllowedEmail: (email: string) => Promise<void>;
}) {
  const [newEmail, setNewEmail] = useState('');
  const trimmedEmail = newEmail.trim().toLowerCase();

  async function handleSubmit() {
    if (!trimmedEmail) {
      return;
    }

    await onAddAllowedEmail(trimmedEmail);
    setNewEmail('');
  }

  return (
    <div className="admin-panel">
      <div>
        <p className="section-label">Åtkomst</p>
        <h3>Tillåtna e-postadresser</h3>
        <p>
          Bara e-postadresser i listan kan skapa ett nytt konto. Befintliga
          användare påverkas inte.
        </p>
      </div>

      <AllowedEmailStatusMessage
        allowedEmailList={allowedEmailList}
        allowedEmailStatus={allowedEmailStatus}
      />

      <form className="admin-room-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Ny e-postadress
          <input
            autoComplete="email"
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="namn@example.com"
            type="email"
            value={newEmail}
          />
        </label>
        <button disabled={!trimmedEmail} onClick={handleSubmit} type="button">
          Lägg till e-post
        </button>
      </form>

      <div className="profile-list">
        {allowedEmailList.map((allowedEmail) => (
          <AllowedEmailItem
            allowedEmail={allowedEmail}
            currentUserEmail={currentUserEmail}
            key={allowedEmail.email}
            onRemoveAllowedEmail={onRemoveAllowedEmail}
          />
        ))}
      </div>
    </div>
  );
}

function AllowedEmailItem({
  allowedEmail,
  currentUserEmail,
  onRemoveAllowedEmail,
}: {
  allowedEmail: AllowedEmail;
  currentUserEmail: string;
  onRemoveAllowedEmail: (email: string) => Promise<void>;
}) {
  const isCurrentUserEmail =
    allowedEmail.email === currentUserEmail.trim().toLowerCase();

  return (
    <article className="profile-admin-item">
      <div>
        <h3>{allowedEmail.email}</h3>
        <p>Tillagd {formatDate(allowedEmail.createdAt.slice(0, 10))}</p>
      </div>
      <div className="item-actions">
        <strong>Tillåten</strong>
        <button
          className="secondary-button"
          disabled={isCurrentUserEmail}
          onClick={() => onRemoveAllowedEmail(allowedEmail.email)}
          type="button"
        >
          Ta bort
        </button>
      </div>
      {isCurrentUserEmail && (
        <p className="item-note">Du kan inte ta bort din egen e-post här.</p>
      )}
    </article>
  );
}

function ProfileAdminItem({
  currentUserId,
  onUpdateProfileName,
  onUpdateProfileRole,
  profile,
}: {
  currentUserId: string;
  onUpdateProfileName: (profileId: string, displayName: string) => Promise<void>;
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
    <article className="profile-admin-item">
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
      <div className="item-actions">
        <strong>{profile.role === 'admin' ? 'Admin' : 'Medlem'}</strong>
        <button
          disabled={!trimmedName || !hasNameChanged}
          onClick={handleSaveName}
          type="button"
        >
          Spara namn
        </button>
        <button
          className="secondary-button"
          disabled={isCurrentUser}
          onClick={() => onUpdateProfileRole(profile.id, nextRole)}
          type="button"
        >
          {profile.role === 'admin' ? 'Gör till medlem' : 'Gör till admin'}
        </button>
      </div>
      {isCurrentUser && (
        <p className="item-note">Du kan inte ändra din egen roll här.</p>
      )}
    </article>
  );
}

function BookingConfirmationCard({
  booking,
  onDismiss,
}: {
  booking: BookingWithDetails;
  onDismiss: () => void;
}) {
  const confirmation = buildBookingConfirmation(booking);

  return (
    <article className="confirmation-card" aria-live="polite">
      <div>
        <p className="section-label">Bokningsbekräftelse</p>
        <h3>{confirmation.subject}</h3>
        {confirmation.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <button className="secondary-button" onClick={onDismiss} type="button">
        Stäng
      </button>
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

function DayBookingModal({
  bookingStatus,
  bookings,
  date,
  onClose,
}: {
  bookingStatus: AsyncStatus;
  bookings: BookingWithDetails[];
  date: string;
  onClose: () => void;
}) {
  return (
    <div className="day-modal-overlay" role="presentation">
      <section
        aria-labelledby="day-modal-title"
        aria-modal="true"
        className="day-modal"
        role="dialog"
      >
        <div className="day-modal-header">
          <div>
            <p className="section-label">Vald dag</p>
            <h3 id="day-modal-title">{formatDate(date)}</h3>
          </div>
          <button
            aria-label="Stäng datum"
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="calendar-list" aria-label="Bokningar för vald dag">
          <BookingStatusMessage
            bookingList={bookings}
            bookingStatus={bookingStatus}
            emptyMessage="Ingen bokning"
          />
          {bookings.map((booking) => (
            <BookingSummaryCard booking={booking} key={booking.id} />
          ))}
        </div>
      </section>
    </div>
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
        Inga rum finns ännu. Lägg till rum i Admin-vyn.
      </div>
    );
  }

  return null;
}

function ProfileStatusMessage({
  profileList,
  profileStatus,
}: {
  profileList: Profile[];
  profileStatus: AsyncStatus;
}) {
  if (profileStatus.isLoading) {
    return (
      <div className="availability-message loading">
        Hämtar användare från Supabase...
      </div>
    );
  }

  if (profileStatus.errorMessage) {
    return (
      <div className="availability-message error">
        {profileStatus.errorMessage}
      </div>
    );
  }

  if (profileList.length === 0) {
    return (
      <div className="availability-message idle">
        Inga användare finns ännu.
      </div>
    );
  }

  return null;
}

function AllowedEmailStatusMessage({
  allowedEmailList,
  allowedEmailStatus,
}: {
  allowedEmailList: AllowedEmail[];
  allowedEmailStatus: AsyncStatus;
}) {
  if (allowedEmailStatus.isLoading) {
    return (
      <div className="availability-message loading">
        Hämtar tillåtna e-postadresser från Supabase...
      </div>
    );
  }

  if (allowedEmailStatus.errorMessage) {
    return (
      <div className="availability-message error">
        {allowedEmailStatus.errorMessage}
      </div>
    );
  }

  if (allowedEmailList.length === 0) {
    return (
      <div className="availability-message idle">
        Inga e-postadresser finns i allowlistan ännu.
      </div>
    );
  }

  return null;
}

function BookingStatusMessage({
  bookingList,
  bookingStatus,
  emptyMessage = 'Inga bokningar finns ännu.',
}: {
  bookingList: BookingWithDetails[];
  bookingStatus: AsyncStatus;
  emptyMessage?: string;
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
        {emptyMessage}
      </div>
    );
  }

  return null;
}

function getTodayDateString() {
  return toDateString(new Date());
}

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function getAdjacentMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthCalendarDays(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const mondayBasedStartOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const firstCalendarDate = new Date(year, month - 1, 1 - mondayBasedStartOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate);
    date.setDate(firstCalendarDate.getDate() + index);
    const dateString = toDateString(date);

    return {
      date: dateString,
      dayNumber: date.getDate(),
      isCurrentMonth: getMonthKey(dateString) === monthKey,
    };
  });
}

function toDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function bookingIncludesDate(booking: BookingWithDetails, date: string) {
  return booking.startDate <= date && booking.endDate >= date;
}

function getCalendarBookingLabel(booking: BookingWithDetails) {
  return `${getInitials(booking.user.displayName)}: ${booking.rooms
    .map((room) => room.name)
    .join(', ')}`;
}

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase())
    .join('.');
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);

  return new Intl.DateTimeFormat('sv-SE', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateString(date));
}

function parseDateString(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function buildBookingConfirmation(booking: BookingWithDetails) {
  const roomNames = booking.rooms.map((room) => room.name).join(', ');

  return {
    subject: 'Bokningen är skapad',
    lines: [
      `Rum: ${roomNames}`,
      `Datum: ${formatDateRange(booking.startDate, booking.endDate)}`,
      `Bokad av: ${booking.user.displayName}`,
      'Bekräftelsen visas här i appen nu och kan återanvändas för e-post senare.',
    ],
  };
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} till ${formatDate(endDate)}`;
}

function getRoomOptions(roomList: Room[], selectedRoomIds: string[]) {
  return roomList.filter(
    (room) => room.isActive || selectedRoomIds.includes(room.id),
  );
}

function getStatusLabel(booking: BookingWithDetails) {
  return booking.status === 'confirmed' ? 'Bekräftad' : 'Avbokad';
}
