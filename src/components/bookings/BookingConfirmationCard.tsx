import type { BookingWithDetails } from '../../types/booking';
import { buildBookingConfirmation } from '../../utils/bookingPresentation';

export function BookingConfirmationCard({
  booking,
  onDismiss,
}: {
  booking: BookingWithDetails;
  onDismiss: () => void;
}) {
  const confirmation = buildBookingConfirmation(booking);

  return (
    <article className='confirmation-card' aria-live='polite'>
      <div>
        <p className='section-label'>Bokningsbekräftelse</p>
        <h3>{confirmation.subject}</h3>
        {confirmation.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <button className='secondary-button' onClick={onDismiss} type='button'>
        Stäng
      </button>
    </article>
  );
}
