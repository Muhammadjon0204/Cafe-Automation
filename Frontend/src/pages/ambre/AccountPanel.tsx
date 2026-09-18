import { useEffect, useState } from 'react';
import { ApiError } from '@cafe/shared';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from './Modal';
import {
  getMyOrders,
  getMyReservations,
  ORDER_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  type GetOrderDto,
  type GetReservationDto,
} from './api';

const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

interface AccountPanelProps {
  onClose: () => void;
}

export function AccountPanel({ onClose }: AccountPanelProps) {
  const { customer, logout } = useAuth();
  const [reservations, setReservations] = useState<GetReservationDto[]>([]);
  const [orders, setOrders] = useState<GetOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyReservations(), getMyOrders()])
      .then(([res, ord]) => {
        if (cancelled) return;
        setReservations(res);
        setOrders(ord);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Не удалось загрузить данные аккаунта.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal onClose={onClose} labelledBy="account-modal-title" panelClassName="account-modal">
      <p className="eyebrow">Личный кабинет</p>
      <h2 id="account-modal-title" className="menu-title auth-modal-title">
        {customer?.fullName || 'Аккаунт'}
      </h2>
      <p className="account-email">{customer?.email}</p>

      {loading ? (
        <div className="dish-grid">
          <div className="dish-card skeleton-card" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="section-error">
          <span>{error}</span>
        </div>
      ) : (
        <div className="account-sections">
          <section>
            <h3 className="account-section-title">Мои брони</h3>
            {reservations.length === 0 ? (
              <p className="dish-empty">Пока нет броней.</p>
            ) : (
              <ul className="account-list">
                {reservations.map((r) => (
                  <li key={r.id} className="account-list-item">
                    <span>Стол {r.tableNumber} · {dateFormatter.format(new Date(r.reservedAt))} · {r.guestsCount} гостей</span>
                    <span className="account-status">{RESERVATION_STATUS_LABELS[r.status] ?? r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="account-section-title">Мои заказы</h3>
            {orders.length === 0 ? (
              <p className="dish-empty">Пока нет заказов.</p>
            ) : (
              <ul className="account-list">
                {orders.map((o) => (
                  <li key={o.id} className="account-list-item">
                    <span>{o.orderNumber} · {currencyFormatter.format(o.totalAmount)}</span>
                    <span className="account-status">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <button
        type="button"
        className="btn btn-outline account-logout"
        onClick={() => {
          void logout();
          onClose();
        }}
      >
        Выйти
      </button>
    </Modal>
  );
}
