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
import {
  canManageBooking,
  getActiveRooms,
  getAvailableRooms,
  getBookingDetails,
} from './utils/bookingUtils';
import { SummaryStat } from './components/SummaryStat';
import type { AsyncStatus } from './types/asyncStatus';
import { RoomStatusMessage } from './components/status/RoomStatusMessage';
import { ProfileStatusMessage } from './components/status/ProfileStatusMessage';
import { BookingStatusMessage } from './components/status/BookingStatusMessage';
import { formatDate, formatDateRange } from './utils/dateUtils';
import { BookingSummary } from './components/bookings/BookingSummary';
import { BookingSummaryCard } from './components/bookings/BookingSummaryCard';
import { BookingConfirmationCard } from './components/bookings/BookingConfirmationCard';
import { RoomAdminItem } from './components/admin/RoomAdminItem';
import { ProfileAdminItem } from './components/admin/ProfileAdminItem';
import { AllowedEmailsPanel } from './components/admin/AllowedEmailsPanel';
import { BookingRequestActions } from './components/bookings/BookingRequestActions';
import { BookingForm } from './components/bookings/BookingForm';
import { RoomAvailabilityItem } from './components/calendar/RoomAvailabilityItem';

type View = 'calendar' | 'bookings' | 'admin';

const views: Array<{ id: View; label: string }> = [
  { id: 'calendar', label: 'Kalender' },
  { id: 'bookings', label: 'Bokningar' },
  { id: 'admin', label: 'Admin' },
];

const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

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
    getMonthKey(getTodayDateString()),
  );
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
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

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setStartDate(date);
    setEndDate(date);
    setIsDayModalOpen(true);
  }

  return (
    <section className='content-section'>
      <div>
        <p className='section-label'>Översikt</p>
        <h2>Kalender</h2>
        <p>
          Välj datum för att se vilka rum som är lediga, upptagna eller
          inaktiva.
        </p>
      </div>

      <div className='summary-grid'>
        <SummaryStat label='Aktiva rum' value={activeRoomsCount.toString()} />
        <SummaryStat
          label='Bekräftade bokningar'
          value={bookings.length.toString()}
        />
        <SummaryStat
          label='Lediga rum för valda datum'
          value={availableRooms.length.toString()}
        />
      </div>

      <div className='month-calendar'>
        <div className='month-calendar-header'>
          <button
            className='secondary-button'
            onClick={() =>
              setVisibleMonth(getAdjacentMonthKey(visibleMonth, -1))
            }
            type='button'
          >
            Föregående
          </button>
          <div>
            <p className='section-label'>Månadsvy</p>
            <h3>{formatMonthLabel(visibleMonth)}</h3>
          </div>
          <button
            className='secondary-button'
            onClick={() =>
              setVisibleMonth(getAdjacentMonthKey(visibleMonth, 1))
            }
            type='button'
          >
            Nästa
          </button>
        </div>

        <div className='calendar-grid' aria-label='Månadskalender'>
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
                type='button'
              >
                <span>{day.dayNumber}</span>
                {isBooked && (
                  <div className='day-booking-badges'>
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

      <div className='selected-day-panel'>
        <div>
          <p className='section-label'>Vald dag</p>
          <h3>{formatDate(selectedDate)}</h3>
          <p>
            {selectedDateAvailableRooms.length} av {activeRoomsCount} aktiva rum
            är lediga den här dagen.
          </p>
        </div>

        <div className='room-availability-list'>
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

        <div className='calendar-list' aria-label='Bokningar för vald dag'>
          <BookingStatusMessage
            bookingList={selectedDateBookings}
            bookingStatus={bookingStatus}
            emptyMessage='Inga bokningar den valda dagen.'
          />
          {selectedDateBookings.map((booking) => (
            <BookingSummaryCard booking={booking} key={booking.id} />
          ))}
        </div>
      </div>

      <div className='availability-panel'>
        <div>
          <p className='section-label'>Tillgänglighet</p>
          <h3>{formatDateRange(startDate, endDate)}</h3>
        </div>

        <div className='form-grid'>
          <label>
            Startdatum
            <input
              onChange={(event) => setStartDate(event.target.value)}
              type='date'
              value={startDate}
            />
          </label>
          <label>
            Slutdatum
            <input
              onChange={(event) => setEndDate(event.target.value)}
              type='date'
              value={endDate}
            />
          </label>
        </div>

        <RoomStatusMessage roomList={roomList} roomStatus={roomStatus} />

        {roomList.length > 0 && (
          <div className='room-availability-list'>
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

      <div className='calendar-list' aria-label='Bekräftade bokningar'>
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

function BookingsView({
  onDecideBooking,
  onRefreshBookings,
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
  onDecideBooking: (bookingId: string, approve: boolean) => Promise<void>;
  onRefreshBookings: () => Promise<void>;
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
  const editingBooking = bookings.find(
    (booking) => booking.id === editingBookingId,
  );

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
    <section className='content-section'>
      <div>
        <p className='section-label'>Bokningar</p>
        <h2>Hantera bokningar</h2>
        <p>
          Skapa nya bokningar och hantera befintliga bokningar för sommarhuset.
        </p>
      </div>

      {editingBooking ? (
        <BookingForm
          key={editingBooking.id}
          currentUserId={currentUser.id}
          existingBookings={existingBookings}
          mode={{ type: 'edit', booking: editingBooking }}
          onCancelEdit={handleCancelEdit}
          onUpdateBooking={handleSaveEdit}
          roomList={roomList}
        />
      ) : (
        <BookingForm
          key='create'
          currentUserId={currentUser.id}
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
      <BookingStatusMessage
        bookingList={bookings}
        bookingStatus={bookingStatus}
      />
      <button
        className='secondary-button'
        disabled={bookingStatus.isLoading}
        onClick={onRefreshBookings}
        type='button'
      >
        Uppdatera bokningar
      </button>

      <div className='booking-list'>
        {bookings.map((booking) => {
          const canManage = isAdmin || canManageBooking(currentUser, booking);

          return (
            <article className='booking-item' key={booking.id}>
              <BookingSummary booking={booking} />
              {booking.status === 'pending' && (
                <BookingRequestActions
                  booking={booking}
                  bookings={bookings}
                  currentUser={currentUser}
                  onDecide={onDecideBooking}
                />
              )}
              {canManage && (
                <div className='item-actions'>
                  <button
                    disabled={
                      !['confirmed', 'pending'].includes(booking.status)
                    }
                    onClick={() => handleEditBooking(booking)}
                    type='button'
                  >
                    Redigera
                  </button>
                  <button
                    className='secondary-button'
                    disabled={!isAdmin || booking.status === 'cancelled'}
                    onClick={() => handleCancelWithConfirmation(booking)}
                    type='button'
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
    <div className='day-modal-overlay' role='presentation'>
      <section
        aria-labelledby='day-modal-title'
        aria-modal='true'
        className='day-modal'
        role='dialog'
      >
        <div className='day-modal-header'>
          <div>
            <p className='section-label'>Vald dag</p>
            <h3 id='day-modal-title'>{formatDate(date)}</h3>
          </div>
          <button
            aria-label='Stäng datum'
            className='modal-close-button'
            onClick={onClose}
            type='button'
          >
            ×
          </button>
        </div>

        <div className='calendar-list' aria-label='Bokningar för vald dag'>
          <BookingStatusMessage
            bookingList={bookings}
            bookingStatus={bookingStatus}
            emptyMessage='Ingen bokning'
          />
          {bookings.map((booking) => (
            <BookingSummaryCard booking={booking} key={booking.id} />
          ))}
        </div>
      </section>
    </div>
  );
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
  const firstCalendarDate = new Date(
    year,
    month - 1,
    1 - mondayBasedStartOffset,
  );

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
