import { useState } from 'react';
import type {
  Booking,
  BookingWithDetails,
  Profile,
  Room,
} from '../types/booking';
import type { AsyncStatus } from '../types/asyncStatus';
import { canManageBooking } from '../utils/bookingUtils';
import { formatDateRange } from '../utils/dateUtils';
import { BookingForm } from '../components/bookings/BookingForm';
import { BookingSummary } from '../components/bookings/BookingSummary';
import { BookingConfirmationCard } from '../components/bookings/BookingConfirmationCard';
import { BookingRequestActions } from '../components/bookings/BookingRequestActions';
import { RoomStatusMessage } from '../components/status/RoomStatusMessage';
import { BookingStatusMessage } from '../components/status/BookingStatusMessage';

export function BookingsView({
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
