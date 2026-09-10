import type { Reservation } from '../../api/reservationsApi';
import { Skeleton } from '../../components/Skeleton';

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ReservationStatus (Backend/src/Domain/Enums/ReservationStatus.cs): Pending=1, Confirmed=2
// are the only statuses that still block the table (mirrors ReservationRepository's
// HasConflictAsync exclusion of Cancelled/Completed).
const ACTIVE_STATUSES = [1, 2];

interface TableReservationSummaryProps {
  reservations: Reservation[];
  isLoading: boolean;
  seatBusy: boolean;
  onSeat: (id: number) => void;
  onWalkIn: () => void;
}

export function TableReservationSummary({ reservations, isLoading, seatBusy, onSeat, onWalkIn }: TableReservationSummaryProps) {
  if (isLoading) {
    return (
      <div className="table-panel-section">
        <Skeleton height={18} />
        <Skeleton height={60} />
      </div>
    );
  }

  const upcoming = reservations
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime())[0];

  if (!upcoming) {
    return <p className="dashboard-empty">Активная бронь не найдена.</p>;
  }

  return (
    <div className="table-panel-section">
      <div className="table-panel-row">
        <span className="table-panel-label">Гость</span>
        <span>{upcoming.customerName}</span>
      </div>
      {upcoming.phone && (
        <div className="table-panel-row">
          <span className="table-panel-label">Телефон</span>
          <span>{upcoming.phone}</span>
        </div>
      )}
      <div className="table-panel-row">
        <span className="table-panel-label">Гостей</span>
        <span>{upcoming.guestsCount}</span>
      </div>
      <div className="table-panel-row">
        <span className="table-panel-label">Время</span>
        <span>{dateTimeFormatter.format(new Date(upcoming.reservedAt))}</span>
      </div>
      {upcoming.note && <p className="table-panel-items">{upcoming.note}</p>}

      <div className="table-panel-actions">
        <button type="button" className="modal-btn modal-btn-primary" disabled={seatBusy} onClick={() => onSeat(upcoming.id)}>
          Гость пришёл
        </button>
        <button type="button" className="modal-btn modal-btn-ghost" onClick={onWalkIn}>
          Заказ без брони
        </button>
      </div>
    </div>
  );
}
