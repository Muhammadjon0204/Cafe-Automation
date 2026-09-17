import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReservation } from '../api/reservationsApi';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import { TABLE_OCCUPIED } from '../domain/orders';
import './modals.css';

interface ReservationFormModalProps {
  tableId: number;
  tableNumber: number;
  tableStatus: number;
  onClose: () => void;
  onCreated: () => void;
}

// Defaults to 30 minutes from now, rounded to the next 5 minutes - a reasonable starting point
// for "someone's calling right now to book a table for tonight", not meant to be the common case.
function defaultReservedAt(): string {
  const date = new Date(Date.now() + 30 * 60000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ReservationFormModal({ tableId, tableNumber, tableStatus, onClose, onCreated }: ReservationFormModalProps) {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const [reservedAt, setReservedAt] = useState(defaultReservedAt);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createReservation({
        cafeTableId: tableId,
        customerName,
        phone: phone.trim() || undefined,
        guestsCount,
        reservedAt: new Date(reservedAt).toISOString(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      pushToast('Бронь создана.', { variant: 'info' });
      void queryClient.invalidateQueries({ queryKey: ['tables', 'waiter'] });
      onCreated();
    },
    onError: (err) => setError(errorMessage(err, 'Не удалось создать бронь.')),
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="reservation-form-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">Бронь — стол {tableNumber}</div>

        {tableStatus === TABLE_OCCUPIED && (
          <p className="reservation-form-warning">
            Стол сейчас занят. Новая бронь может пересекаться с текущим использованием стола.
          </p>
        )}

        <form className="reservation-form" onSubmit={handleSubmit}>
          <label className="reservation-form-field">
            <span>Имя клиента</span>
            <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </label>
          <label className="reservation-form-field">
            <span>Телефон</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="reservation-form-row">
            <label className="reservation-form-field">
              <span>Гостей</span>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value))}
              />
            </label>
            <label className="reservation-form-field">
              <span>Время</span>
              <input
                type="datetime-local"
                required
                value={reservedAt}
                onChange={(e) => setReservedAt(e.target.value)}
              />
            </label>
          </div>
          <label className="reservation-form-field">
            <span>Комментарий</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: день рождения" />
          </label>

          {error && <div className="reservation-form-error">{error}</div>}

          <div className="reservation-form-actions">
            <button type="button" className="table-actions-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="table-actions-btn is-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Сохраняем…' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
