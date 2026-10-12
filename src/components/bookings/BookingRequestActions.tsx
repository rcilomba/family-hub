import { useState } from 'react';
import type { BookingWithDetails, Profile } from '../../types/booking';

export function BookingRequestActions({
  booking,
  bookings,
  currentUser,
  onDecide,
}: {
  booking: BookingWithDetails;
  bookings: BookingWithDetails[];
  currentUser: Profile;
  onDecide: (id: string, approve: boolean) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiredUsers = [
    ...new Map(
      bookings
        .filter(
          (item) =>
            item.status === 'confirmed' &&
            item.userId !== booking.userId &&
            item.startDate <= booking.endDate &&
            item.endDate >= booking.startDate,
        )
        .map((item) => [item.userId, item.user]),
    ).values(),
  ];
  const approvedBy = booking.approvedBy ?? [];
  const canDecide =
    currentUser.role === 'admin' ||
    requiredUsers.some((user) => user.id === currentUser.id);
  const alreadyApproved = approvedBy.includes(currentUser.id);

  async function decide(approve: boolean) {
    setIsSaving(true);
    setError(null);
    try {
      await onDecide(booking.id, approve);
    } catch {
      setError(
        'Beslutet kunde inte sparas. Uppdatera listan och kontrollera att rummen fortfarande är lediga.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className='request-actions'>
      <p>Förfrågan reserverar inte rummen.</p>
      {requiredUsers.map((user) => (
        <p key={user.id}>
          {user.displayName}:{' '}
          {approvedBy.includes(user.id) ? 'Godkänt' : 'Inväntar svar'}
        </p>
      ))}
      {canDecide && (
        <div className='item-actions'>
          <button
            disabled={
              isSaving || (alreadyApproved && currentUser.role !== 'admin')
            }
            onClick={() => decide(true)}
            type='button'
          >
            {currentUser.role === 'admin' ? 'Godkänn som admin' : 'Godkänn'}
          </button>
          <button
            className='secondary-button'
            disabled={isSaving}
            onClick={() => decide(false)}
            type='button'
          >
            Neka
          </button>
        </div>
      )}
      {error && <p role='alert'>{error}</p>}
    </div>
  );
}
