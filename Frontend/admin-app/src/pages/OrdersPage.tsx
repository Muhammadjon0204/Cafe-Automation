import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelOrder, closeOrder, getOrders, updateOrderStatus, type Order } from '../api/ordersApi';
import {
  FORWARD_TRANSITIONS,
  ORDER_STATUS_META,
  isCancellable,
  minutesAgoLabel,
  orderItemsLabel,
  orderStatusLabel,
  orderTableLabel,
} from '../domain/orders';
import { ConfirmModal } from '../components/ConfirmModal';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import './OrdersPage.css';

// Array form (not a single 'orders-board' string) so AppShell's realtime handler
// can invalidate the whole ['orders', ...] prefix in one call and catch every
// orders-flavored query across pages (this board, KitchenPage, WaiterPage, and
// TablesPage's by-table lookup) without needing to know each one's exact key.
const BOARD_QUERY_KEY = ['orders', 'board'];
const PAID_STATUS = 3;

const COLUMNS: { status: number; label: string }[] = [
  { status: 1, label: 'Новый' },
  { status: 2, label: 'Принят' },
  { status: 3, label: 'Готовится' },
  { status: 4, label: 'Готов' },
  { status: 5, label: 'Подан' },
];

const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS', maximumFractionDigits: 0 });

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [draggedOverStatus, setDraggedOverStatus] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [closeTarget, setCloseTarget] = useState<Order | null>(null);

  // A 100-row page covers every order currently in flight for a single café; if that
  // stops being true this needs real pagination/virtualization instead of one big page.
  // The realtime hub (see AppShell) is the primary update path now — this interval is
  // just a safety net for a dropped/reconnecting connection, not the main mechanism.
  const boardQuery = useQuery({
    queryKey: BOARD_QUERY_KEY,
    queryFn: () => getOrders({ pageSize: 100, pageNumber: 1 }),
    refetchInterval: 60_000,
  });

  const orders = useMemo(() => boardQuery.data?.items ?? [], [boardQuery.data]);
  const ordersByStatus = useMemo(() => {
    const map = new Map<number, Order[]>();
    for (const column of COLUMNS) map.set(column.status, []);
    for (const order of orders) {
      map.get(order.status)?.push(order);
    }
    return map;
  }, [orders]);

  function patchLocalOrder(id: number, patch: Partial<Order>) {
    queryClient.setQueryData<typeof boardQuery.data>(BOARD_QUERY_KEY, (old) => {
      if (!old) return old;
      return { ...old, items: old.items.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
    });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) => updateOrderStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: BOARD_QUERY_KEY });
      const previous = queryClient.getQueryData(BOARD_QUERY_KEY);
      patchLocalOrder(id, { status });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(BOARD_QUERY_KEY, context.previous);
      pushToast(errorMessage(error, 'Не удалось изменить статус заказа.'), { variant: 'error' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: () => {
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
    onError: (error) => {
      pushToast(errorMessage(error, 'Не удалось отменить заказ.'), { variant: 'error' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => closeOrder(id),
    onSuccess: () => {
      setCloseTarget(null);
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
    onError: (error) => {
      pushToast(errorMessage(error, 'Не удалось закрыть заказ.'), { variant: 'error' });
    },
  });

  function handleDrop(order: Order, targetStatus: number) {
    setDraggedOverStatus(null);
    if (order.status === targetStatus) return;
    if (FORWARD_TRANSITIONS[order.status] !== targetStatus) {
      pushToast(
        `Нельзя переместить заказ из «${orderStatusLabel(order.status)}» в «${orderStatusLabel(targetStatus)}».`,
        { variant: 'error' },
      );
      return;
    }
    statusMutation.mutate({ id: order.id, status: targetStatus });
  }

  if (boardQuery.isLoading) {
    return (
      <div className="orders-board">
        {COLUMNS.map((column) => (
          <div className="kanban-column" key={column.status}>
            <div className="kanban-column-header">{column.label}</div>
            <div className="kanban-column-body">
              <Skeleton height={92} />
              <Skeleton height={92} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (boardQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить заказы." onRetry={() => boardQuery.refetch()} />;
  }

  return (
    <div className="orders-page">
      <div className="orders-board">
        {COLUMNS.map((column) => {
          const columnOrders = ordersByStatus.get(column.status) ?? [];
          return (
            <div
              className={`kanban-column ${draggedOverStatus === column.status ? 'is-drag-over' : ''}`}
              key={column.status}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggedOverStatus(column.status);
              }}
              onDragLeave={() => setDraggedOverStatus((current) => (current === column.status ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                const orderId = Number(event.dataTransfer.getData('text/plain'));
                const order = orders.find((o) => o.id === orderId);
                if (order) handleDrop(order, column.status);
              }}
            >
              <div className="kanban-column-header">
                <span>{column.label}</span>
                <span className="kanban-column-count">{columnOrders.length}</span>
              </div>
              <div className="kanban-column-body">
                {columnOrders.length === 0 && <p className="kanban-empty">Пусто</p>}
                {columnOrders.map((order) => (
                  <div
                    className="kanban-card"
                    key={order.id}
                    draggable={FORWARD_TRANSITIONS[order.status] !== undefined}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', String(order.id));
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    <div className="kanban-card-header">
                      <span className="kanban-card-number">{order.orderNumber}</span>
                      <span className="kanban-card-time">{minutesAgoLabel(order.orderedAt)}</span>
                    </div>
                    <div className="kanban-card-items">{orderItemsLabel(order.items)}</div>
                    <div className="kanban-card-meta">
                      <span>{orderTableLabel(order)}</span>
                      {order.waiterName && <span>{order.waiterName}</span>}
                      <span className="kanban-card-total">{currencyFormatter.format(order.totalAmount)}</span>
                    </div>
                    <div className="kanban-card-actions">
                      {isCancellable(order.status) && (
                        <button type="button" className="kanban-card-action-danger" onClick={() => setCancelTarget(order)}>
                          Отменить
                        </button>
                      )}
                      {order.status === 5 && (
                        <button
                          type="button"
                          className="kanban-card-action-primary"
                          disabled={order.paymentStatus !== PAID_STATUS}
                          title={order.paymentStatus !== PAID_STATUS ? 'Сначала нужно провести оплату' : undefined}
                          onClick={() => setCloseTarget(order)}
                        >
                          Закрыть
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const cancelled = orders.filter((o) => o.status === 7).length;
        const closed = orders.filter((o) => o.status === 6).length;
        if (cancelled === 0 && closed === 0) return null;
        return (
          <p className="orders-board-footnote">
            Ещё {closed} закрытых и {cancelled} отменённых заказов не показаны на доске — доска отслеживает только
            активный поток (статус {ORDER_STATUS_META[6].label.toLowerCase()}/{ORDER_STATUS_META[7].label.toLowerCase()}{' '}
            заказы уходят в историю заказов).
          </p>
        );
      })()}

      {cancelTarget && (
        <ConfirmModal
          title={`Отменить заказ ${cancelTarget.orderNumber}?`}
          message="Это действие нельзя будет отменить."
          confirmLabel="Отменить заказ"
          cancelLabel="Назад"
          tone="danger"
          busy={cancelMutation.isPending}
          onCancel={() => setCancelTarget(null)}
          onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
        />
      )}

      {closeTarget && (
        <ConfirmModal
          title={`Закрыть заказ ${closeTarget.orderNumber}?`}
          message="Заказ будет отмечен как закрытый."
          confirmLabel="Закрыть заказ"
          cancelLabel="Отмена"
          busy={closeMutation.isPending}
          onCancel={() => setCloseTarget(null)}
          onConfirm={() => closeMutation.mutate(closeTarget.id)}
        />
      )}
    </div>
  );
}
