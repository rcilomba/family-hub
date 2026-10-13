import { useEffect, useRef, useState } from 'react';
import { findConflictingBookings } from '../../utils/bookingUtils';
import type { Booking, BookingWithDetails, Room } from '../../types/booking';
import { formatDateRange, getTodayDateString } from '../../utils/dateUtils';

type AvailabilityResult =
  | { status: 'idle'; message: string }
  | { status: 'available'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'invalid'; message: string };

type BookingFormMode =
  | { type: 'create' }
  | { type: 'edit'; booking: BookingWithDetails };

function getRoomOptions(roomList: Room[], selectedRoomIds: string[]) {
  return roomList.filter(
    (room) => room.isActive || selectedRoomIds.includes(room.id),
  );
}

const initialAvailabilityResult: AvailabilityResult = {
  status: 'idle',
  message: 'Välj datum och rum för att kontrollera tillgänglighet.',
};

export function BookingForm({
  currentUserId,
  existingBookings,
  mode,
  onCancelEdit,
  onCreateBooking,
  onUpdateBooking,
  roomList,
}: {
  existingBookings: Booking[];
  currentUserId: string;
  mode: BookingFormMode;
  onCancelEdit?: () => void;
  onCreateBooking?: (
    newBooking: Omit<Booking, 'id' | 'userId' | 'status'>,
  ) => Promise<void>;
  onUpdateBooking?: (updatedBooking: Booking) => Promise<void>;
  roomList: Room[];
}) {
  const isEditMode = mode.type === 'edit';
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialBooking = isEditMode ? mode.booking : null;
  const [startDate, setStartDate] = useState(
    () => initialBooking?.startDate ?? getTodayDateString(),
  );
  const [endDate, setEndDate] = useState(
    () => initialBooking?.endDate ?? getTodayDateString(),
  );
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    initialBooking?.roomIds ?? [],
  );
  const [availabilityResult, setAvailabilityResult] =
    useState<AvailabilityResult>(initialAvailabilityResult);
  const roomOptions = getRoomOptions(roomList, selectedRoomIds);
  const canSaveBooking = availabilityResult.status === 'available';
  const title = isEditMode ? 'Redigera bokning' : 'Skapa bokning';
  const needsApproval = existingBookings.some(
    (booking) =>
      booking.id !== initialBooking?.id &&
      booking.status === 'confirmed' &&
      booking.userId !== (initialBooking?.userId ?? currentUserId) &&
      booking.startDate <= endDate &&
      booking.endDate >= startDate,
  );

  useEffect(() => {
    if (isEditMode) {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [isEditMode]);

  function resetAvailabilityResult() {
    setAvailabilityResult(initialAvailabilityResult);
  }

  function handleRoomToggle(roomId: string) {
    resetAvailabilityResult();
    setSelectedRoomIds((currentRoomIds) => {
      if (currentRoomIds.includes(roomId)) {
        return currentRoomIds.filter(
          (currentRoomId) => currentRoomId !== roomId,
        );
      }

      return [...currentRoomIds, roomId];
    });
  }

  function validateBookingRequest(): AvailabilityResult | null {
    if (!startDate || !endDate) {
      return {
        status: 'invalid',
        message: 'Välj både startdatum och slutdatum.',
      };
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
      message: needsApproval
        ? 'Rummen är lediga. Vistelsen överlappar en annan bokning och kräver godkännande.'
        : 'Rummen är lediga. Du kan spara bokningen.',
    });
  }

  async function handleSubmit() {
    if (!canSaveBooking || isSubmitting) {
      return;
    }
    setIsSubmitting(true);

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
      } finally {
        setIsSubmitting(false);
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
    } finally {
      setIsSubmitting(false);
    }

    setAvailabilityResult({
      status: 'idle',
      message: 'Bokningen eller förfrågan har sparats.',
    });
  }

  return (
    <form
      ref={formRef}
      className={
        isEditMode ? 'booking-form booking-form-editing' : 'booking-form'
      }
      onSubmit={(event) => event.preventDefault()}
    >
      <div className='form-heading'>
        <div>
          <p className='section-label'>{isEditMode ? 'Ändra' : 'Ny bokning'}</p>
          <h3>{title}</h3>
          {isEditMode && (
            <p>
              Redigerar bokning för {mode.booking.user.displayName}
              <br />
              Nuvarande datum:{' '}
              {formatDateRange(mode.booking.startDate, mode.booking.endDate)}
            </p>
          )}
        </div>
        {isEditMode && (
          <button
            className='secondary-button'
            onClick={onCancelEdit}
            type='button'
          >
            Avbryt
          </button>
        )}
      </div>

      <div className='form-grid'>
        <label>
          Startdatum
          <input
            onChange={(event) => {
              resetAvailabilityResult();
              setStartDate(event.target.value);
            }}
            type='date'
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
            type='date'
            value={endDate}
          />
        </label>
      </div>

      <fieldset>
        <legend>Välj rum</legend>
        <div className='room-options'>
          {roomOptions.map((room) => (
            <label className='room-option' key={room.id}>
              <input
                checked={selectedRoomIds.includes(room.id)}
                disabled={!room.isActive}
                onChange={() => handleRoomToggle(room.id)}
                type='checkbox'
              />
              <span>{room.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`availability-message ${availabilityResult.status}`}>
        {availabilityResult.message}
      </div>

      <div className='form-actions'>
        <button onClick={handleCheckAvailability} type='button'>
          Kontrollera tillgänglighet
        </button>
        {canSaveBooking && (
          <button disabled={isSubmitting} onClick={handleSubmit} type='button'>
            {isEditMode
              ? 'Spara ändringar'
              : needsApproval
                ? 'Skicka förfrågan'
                : 'Skapa bokning'}
          </button>
        )}
      </div>
    </form>
  );
}
