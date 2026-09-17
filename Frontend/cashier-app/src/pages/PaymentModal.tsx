import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPayment, getPaymentsByOrder } from '../api/paymentsApi';
import type { Order } from '../api/ordersApi';
import { orderItemsLabel, orderTableLabel, PAYMENT_METHOD_META } from '../domain/orders';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import './PaymentModal.css';

const currencyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const METHODS = [1, 2, 3, 4];

interface PaymentModalProps {
  order: Order;
  onClose: () => void;
}

export function PaymentModal({ order, onClose }: PaymentModalProps) {
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: ['payments', order.id],
    queryFn: () => getPaymentsByOrder(order.id),
  });

  const paidSoFar = useMemo(
    () => (paymentsQuery.data ?? []).reduce((sum, p) => sum + p.amount, 0),
    [paymentsQuery.data],
  );
  const remaining = Math.max(0, order.totalAmount - paidSoFar);

  const [amount, setAmount] = useState<number | ''>('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [method, setMethod] = useState(1);
  const [note, setNote] = useState('');

  // Reopening this modal for an order that already has a prior payment (e.g. a partial
  // payment made in an earlier visit) remounts the query - React Query serves the cached
  // (now-stale) payments list immediately (isLoading is only true on a truly first fetch),
  // then refetches in the background. Seeding off paymentsQuery.data directly, rather than
  // an isLoading check, means the field updates once the fresh amount actually lands instead
  // of latching onto the stale cached total.
  useEffect(() => {
    if (!amountTouched && paymentsQuery.data !== undefined) {
      setAmount(remaining > 0 ? remaining : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentsQuery.data, order.totalAmount]);

  const mutation = useMutation({
    mutationFn: () =>
      createPayment({
        orderId: order.id,
        amount: Number(amount),
        method,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      pushToast('Оплата принята.', { variant: 'info' });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['payments', order.id] });
      onClose();
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось провести оплату.'), { variant: 'error' }),
  });

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="payment-modal-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">
          {orderTableLabel(order)} — №{order.orderNumber}
        </div>
        <p className="payment-modal-items">{orderItemsLabel(order.items)}</p>

        <div className="payment-modal-totals">
          <div className="payment-modal-total-row">
            <span>Итого</span>
            <span>{currencyFormatter.format(order.totalAmount)} ₽</span>
          </div>
          {paymentsQuery.isLoading ? (
            <Skeleton height={16} width={140} />
          ) : (
            paidSoFar > 0 && (
              <div className="payment-modal-total-row is-muted">
                <span>Уже оплачено</span>
                <span>{currencyFormatter.format(paidSoFar)} ₽</span>
              </div>
            )
          )}
          <div className="payment-modal-total-row is-remaining">
            <span>К оплате</span>
            <span>{currencyFormatter.format(remaining)} ₽</span>
          </div>
        </div>

        <label className="payment-modal-field">
          <span>Сумма</span>
          <input
            type="number"
            min={1}
            max={remaining}
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmountTouched(true);
              setAmount(e.target.value === '' ? '' : Number(e.target.value));
            }}
          />
        </label>

        <div className="payment-modal-methods">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              className={`payment-method-btn ${method === m ? 'is-selected' : ''}`}
              onClick={() => setMethod(m)}
            >
              {PAYMENT_METHOD_META[m]}
            </button>
          ))}
        </div>

        <label className="payment-modal-field">
          <span>Комментарий</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
        </label>

        <div className="payment-modal-actions">
          <button type="button" className="payment-modal-cancel" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="payment-modal-submit"
            disabled={mutation.isPending || amount === '' || Number(amount) <= 0}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Проводим…' : 'Принять оплату'}
          </button>
        </div>
      </div>
    </div>
  );
}
