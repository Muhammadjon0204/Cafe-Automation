import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { closeOrder, getOrders, type Order } from '../api/ordersApi';
import { getTables } from '../api/tablesApi';
import {
  CLOSED_STATUS,
  isCheckEligible,
  minutesAgoLabel,
  orderItemsLabel,
  orderTableLabel,
  PAYMENT_PAID,
  TABLE_CLEANING,
} from '../domain/orders';
import { PaymentModal } from './PaymentModal';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import './CashierPage.css';

const ORDERS_QUERY_KEY = ['orders', 'cashier'];
const TABLES_QUERY_KEY = ['tables', 'cashier'];
const RECENTLY_CLOSED_LIMIT = 15;
const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS', maximumFractionDigits: 0 });

export function CashierPage() {
  const queryClient = useQueryClient();
  const [paymentTarget, setPaymentTarget] = useState<Order | null>(null);

  // Realtime hub (Shell) is the primary update path — this interval is just a
  // safety net for a dropped/reconnecting connection.
  const ordersQuery = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => getOrders({ pageSize: 100, pageNumber: 1 }),
    refetchInterval: 60_000,
  });
  const tablesQuery = useQuery({ queryKey: TABLES_QUERY_KEY, queryFn: getTables });

  const cleaningTableIds = useMemo(() => {
    const ids = new Set<number>();
    for (const table of tablesQuery.data?.items ?? []) {
      if (table.status === TABLE_CLEANING) ids.add(table.id);
    }
    return ids;
  }, [tablesQuery.data]);

  const { awaitingPayment, paid, closed } = useMemo(() => {
    const orders = ordersQuery.data?.items ?? [];
    const eligible = orders.filter(isCheckEligible);

    const awaiting = eligible
      .filter((o) => o.paymentStatus !== PAYMENT_PAID)
      .sort((a, b) => {
        const aUrgent = a.cafeTableId != null && cleaningTableIds.has(a.cafeTableId) ? 0 : 1;
        const bUrgent = b.cafeTableId != null && cleaningTableIds.has(b.cafeTableId) ? 0 : 1;
        return aUrgent !== bUrgent ? aUrgent - bUrgent : a.orderedAt.localeCompare(b.orderedAt);
      });

    const readyToClose = eligible.filter((o) => o.paymentStatus === PAYMENT_PAID);

    const closedOrders = orders
      .filter((o) => o.status === CLOSED_STATUS)
      .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''))
      .slice(0, RECENTLY_CLOSED_LIMIT);

    return { awaitingPayment: awaiting, paid: readyToClose, closed: closedOrders };
  }, [ordersQuery.data, cleaningTableIds]);

  const closeMutation = useMutation({
    mutationFn: (id: number) => closeOrder(id),
    onSuccess: () => {
      pushToast('Заказ закрыт.', { variant: 'info' });
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось закрыть заказ.'), { variant: 'error' }),
  });

  function handleClose(order: Order) {
    if (window.confirm(`Закрыть заказ №${order.orderNumber} (${orderTableLabel(order)})?`)) {
      closeMutation.mutate(order.id);
    }
  }

  if (ordersQuery.isLoading || tablesQuery.isLoading) {
    return (
      <div className="cashier-page">
        <div className="cashier-page-title">
          <h1>Касса</h1>
        </div>
        <div className="cashier-board">
          {[0, 1, 2].map((i) => (
            <div className="kanban-column" key={i}>
              <div className="kanban-column-header">…</div>
              <div className="kanban-column-body">
                <Skeleton height={110} />
                <Skeleton height={110} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (ordersQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить заказы." onRetry={() => ordersQuery.refetch()} />;
  }

  return (
    <div className="cashier-page">
      <div className="cashier-page-title">
        <h1>Касса</h1>
        <p>Счета, ожидающие оплаты, поднимаются наверх — принимайте оплату и закрывайте заказ.</p>
      </div>

      <div className="cashier-board">
        <div className="kanban-column">
          <div className="kanban-column-header">
            <span>Ожидает оплаты</span>
            <span className="kanban-column-count">{awaitingPayment.length}</span>
          </div>
          <div className="kanban-column-body">
            {awaitingPayment.length === 0 && <p className="kanban-empty">Пусто</p>}
            {awaitingPayment.map((order) => {
              const isUrgent = order.cafeTableId != null && cleaningTableIds.has(order.cafeTableId);
              return (
                <div className={`cashier-card ${isUrgent ? 'is-urgent' : ''}`} key={order.id}>
                  {isUrgent && <p className="cashier-card-urgent-flag">⚠ Гости ушли</p>}
                  <div className="cashier-card-header">
                    <span className="cashier-card-table">{orderTableLabel(order)}</span>
                    <span className="cashier-card-amount">{currencyFormatter.format(order.totalAmount)}</span>
                  </div>
                  <p className="cashier-card-items">{orderItemsLabel(order.items)}</p>
                  {order.paymentStatus === 4 && <p className="cashier-card-note">Оплачено частично</p>}
                  <button type="button" className="cashier-card-btn is-primary" onClick={() => setPaymentTarget(order)}>
                    Оплатить
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="kanban-column">
          <div className="kanban-column-header">
            <span>Оплачено</span>
            <span className="kanban-column-count">{paid.length}</span>
          </div>
          <div className="kanban-column-body">
            {paid.length === 0 && <p className="kanban-empty">Пусто</p>}
            {paid.map((order) => (
              <div className="cashier-card is-paid" key={order.id}>
                <div className="cashier-card-header">
                  <span className="cashier-card-table">{orderTableLabel(order)}</span>
                  <span className="cashier-card-amount">{currencyFormatter.format(order.totalAmount)}</span>
                </div>
                <p className="cashier-card-items">{orderItemsLabel(order.items)}</p>
                <button
                  type="button"
                  className="cashier-card-btn is-primary"
                  disabled={closeMutation.isPending && closeMutation.variables === order.id}
                  onClick={() => handleClose(order)}
                >
                  Закрыть
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="kanban-column">
          <div className="kanban-column-header">
            <span>Закрыт</span>
            <span className="kanban-column-count">{closed.length}</span>
          </div>
          <div className="kanban-column-body">
            {closed.length === 0 && <p className="kanban-empty">Пусто</p>}
            {closed.map((order) => (
              <div className="cashier-card is-closed" key={order.id}>
                <div className="cashier-card-header">
                  <span className="cashier-card-table">{orderTableLabel(order)}</span>
                  <span className="cashier-card-amount">{currencyFormatter.format(order.totalAmount)}</span>
                </div>
                <p className="cashier-card-items">{orderItemsLabel(order.items)}</p>
                {order.closedAt && <p className="cashier-card-time">{minutesAgoLabel(order.closedAt)}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {paymentTarget && <PaymentModal order={paymentTarget} onClose={() => setPaymentTarget(null)} />}
    </div>
  );
}
