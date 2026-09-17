import { useState, type FormEvent } from 'react';
import { ApiError } from '@cafe/shared';
import { useAuth } from '../../auth/AuthContext';
import { createDeliveryOrder, type ApiDish, type GetOrderDto } from './api';

export interface CartLine {
  dish: ApiDish;
  quantity: number;
}

interface CartDrawerProps {
  lines: CartLine[];
  onClose: () => void;
  onIncrement: (dishId: number) => void;
  onDecrement: (dishId: number) => void;
  onRemove: (dishId: number) => void;
  onOrderPlaced: () => void;
}

const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

export function CartDrawer({ lines, onClose, onIncrement, onDecrement, onRemove, onOrderPlaced }: CartDrawerProps) {
  const { requireAuth } = useAuth();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<GetOrderDto | null>(null);

  const total = lines.reduce((sum, l) => sum + l.dish.price * l.quantity, 0);

  const doCheckout = () => {
    setSubmitting(true);
    setError(null);
    createDeliveryOrder({
      items: lines.map((l) => ({ dishId: l.dish.id, quantity: l.quantity })),
      deliveryAddress: address,
      phone: phone || undefined,
      note: note || undefined,
    })
      .then((order) => {
        setPlacedOrder(order);
        onOrderPlaced();
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Не удалось оформить заказ.'))
      .finally(() => setSubmitting(false));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lines.length === 0) return;
    requireAuth('order', doCheckout);
  };

  return (
    <div className="cart-overlay" onClick={onClose} role="presentation">
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Корзина">
        <div className="cart-head">
          <h2 className="menu-title cart-title">Корзина</h2>
          <button type="button" className="modal-close" aria-label="Закрыть" onClick={onClose}>
            &times;
          </button>
        </div>

        {placedOrder ? (
          <div className="reserve-success">
            <p>Заказ {placedOrder.orderNumber} оформлен! Мы уже готовим его к доставке — статус будет виден в «Моих заказах».</p>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Закрыть
            </button>
          </div>
        ) : lines.length === 0 ? (
          <p className="dish-empty">Корзина пуста — добавьте блюда из меню.</p>
        ) : (
          <>
            <ul className="cart-list">
              {lines.map((l) => (
                <li key={l.dish.id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{l.dish.name}</span>
                    <span className="cart-item-price">{currencyFormatter.format(l.dish.price * l.quantity)}</span>
                  </div>
                  <div className="cart-item-qty">
                    <button type="button" onClick={() => onDecrement(l.dish.id)} aria-label="Уменьшить количество">
                      −
                    </button>
                    <span>{l.quantity}</span>
                    <button type="button" onClick={() => onIncrement(l.dish.id)} aria-label="Увеличить количество">
                      +
                    </button>
                    <button type="button" className="cart-item-remove" onClick={() => onRemove(l.dish.id)}>
                      Убрать
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <form className="reserve-form cart-checkout" onSubmit={handleSubmit}>
              <div className="cart-total">
                <span>Итого</span>
                <span>{currencyFormatter.format(total)}</span>
              </div>
              <label className="reserve-field">
                <span>Адрес доставки</span>
                <input required value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
              <label className="reserve-field">
                <span>Телефон</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="reserve-field">
                <span>Комментарий</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              {error && <div className="reserve-error">{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Оформляем…' : 'Оформить доставку'}
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
