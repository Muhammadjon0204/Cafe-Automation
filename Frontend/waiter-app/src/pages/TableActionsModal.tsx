import './modals.css';

interface TableActionsModalProps {
  tableNumber: number;
  seatsCount: number;
  isOpening: boolean;
  onOpenTable: () => void;
  onReserve: () => void;
  onClose: () => void;
}

// A Free table's click target — table and order are separate concerns (TZ 1), so clicking a
// free table must never itself create an order. The waiter picks one of these two explicit
// actions instead.
export function TableActionsModal({ tableNumber, seatsCount, isOpening, onOpenTable, onReserve, onClose }: TableActionsModalProps) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="table-actions-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">Стол {tableNumber}</div>
        <p className="table-actions-subtitle">{seatsCount} мест · сейчас свободен</p>

        <div className="table-actions-list">
          <button type="button" className="table-actions-btn is-primary" disabled={isOpening} onClick={onOpenTable}>
            {isOpening ? 'Открываем…' : 'Занять стол'}
          </button>
          <button type="button" className="table-actions-btn" onClick={onReserve}>
            Забронировать
          </button>
        </div>

        <button type="button" className="table-actions-cancel" onClick={onClose}>
          Отмена
        </button>
      </div>
    </div>
  );
}
