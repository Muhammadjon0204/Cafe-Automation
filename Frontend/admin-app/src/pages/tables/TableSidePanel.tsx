import type { Order } from '../../api/ordersApi';
import type { Reservation } from '../../api/reservationsApi';
import type { CafeTableLayout } from '../../api/tablesApi';
import { TableOrderSummary } from './TableOrderSummary';
import { TableReservationSummary } from './TableReservationSummary';
import './TableSidePanel.css';

const TABLE_STATUS = { Free: 1, Occupied: 2, Reserved: 3, Cleaning: 4 } as const;
const STATUS_LABEL: Record<number, string> = {
  1: 'Свободен',
  2: 'Занят',
  3: 'Забронирован',
  4: 'Уборка',
  5: 'Отключён',
};

interface TableSidePanelProps {
  table: CafeTableLayout;
  canCreate: boolean;
  order: Order | null;
  ordersLoading: boolean;
  reservations: Reservation[];
  reservationsLoading: boolean;
  seatBusy: boolean;
  markFreeBusy: boolean;
  onCreateOrder: () => void;
  onCreateReservation: () => void;
  onSeatReservation: (id: number) => void;
  onMarkFree: () => void;
  onOpenOrders: () => void;
  onClose: () => void;
}

export function TableSidePanel({
  table,
  canCreate,
  order,
  ordersLoading,
  reservations,
  reservationsLoading,
  seatBusy,
  markFreeBusy,
  onCreateOrder,
  onCreateReservation,
  onSeatReservation,
  onMarkFree,
  onOpenOrders,
  onClose,
}: TableSidePanelProps) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="table-side-panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="table-side-panel-header">
          <div>
            <div className="modal-title">Стол {table.tableNumber}</div>
            <div className="table-side-panel-subtitle">
              {STATUS_LABEL[table.status] ?? '—'} · {table.seatsCount} мест{table.zoneName ? ` · ${table.zoneName}` : ''}
            </div>
          </div>
          <button type="button" className="table-side-panel-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {table.status === TABLE_STATUS.Free && (
          <div className="table-panel-section">
            <p className="dashboard-empty">Стол свободен.</p>
            {canCreate && (
              <div className="table-panel-actions">
                <button type="button" className="modal-btn modal-btn-primary" onClick={onCreateOrder}>
                  Создать заказ
                </button>
                <button type="button" className="modal-btn modal-btn-ghost" onClick={onCreateReservation}>
                  Создать бронь
                </button>
              </div>
            )}
          </div>
        )}

        {table.status === TABLE_STATUS.Occupied && (
          <TableOrderSummary table={table} order={order} isLoading={ordersLoading} onOpenOrders={onOpenOrders} />
        )}

        {table.status === TABLE_STATUS.Reserved && (
          <TableReservationSummary
            reservations={reservations}
            isLoading={reservationsLoading}
            seatBusy={seatBusy}
            onSeat={onSeatReservation}
            onWalkIn={onCreateOrder}
          />
        )}

        {table.status === TABLE_STATUS.Cleaning && (
          <div className="table-panel-section">
            <p className="dashboard-empty">Стол убирается.</p>
            {canCreate && (
              <div className="table-panel-actions">
                <button type="button" className="modal-btn modal-btn-primary" disabled={markFreeBusy} onClick={onMarkFree}>
                  Отметить свободным
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
