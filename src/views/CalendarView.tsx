import type { BookingWithDetails } from '../types/booking';
import { useState } from 'react';
import type { Booking, Profile, Room } from '../types/booking';
import type { AsyncStatus } from '../types/asyncStatus';
import { getAvailableRooms } from '../utils/bookingUtils';
import { formatDate, formatDateRange } from '../utils/dateUtils';
import { SummaryStat } from '../components/SummaryStat';
import { RoomStatusMessage } from '../components/status/RoomStatusMessage';
import { BookingStatusMessage } from '../components/status/BookingStatusMessage';
import { BookingSummaryCard } from '../components/bookings/BookingSummaryCard';
import { RoomAvailabilityItem } from '../components/calendar/RoomAvailabilityItem';
import { DayBookingModal } from '../components/calendar/DayBookingModal';

const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function getTodayDateString() {
  return toDateString(new Date());
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

export function CalendarView({
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
