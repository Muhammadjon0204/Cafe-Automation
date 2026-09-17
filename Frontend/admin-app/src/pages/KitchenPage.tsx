import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrders, updateOrderStatus, type Order } from '../api/ordersApi';
import { FORWARD_TRANSITIONS, minutesAgoLabel, orderStatusLabel, orderTableLabel } from '../domain/orders';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
// Reuses OrdersPage's .kanban-column* rules (column chrome is identical between the
// two boards) — only the card itself differs enough to warrant its own styles below.
import './OrdersPage.css';
import './KitchenPage.css';

// See OrdersPage.tsx's BOARD_QUERY_KEY comment — same ['orders', ...] prefix
// convention so AppShell's realtime handler's one invalidateQueries catches this too.
const BOARD_QUERY_KEY = ['orders', 'kitchen'];

// Kitchen only owns the cooking pipeline, not the full order lifecycle — the board
// stops at Ready (4). Served (5)/Closed/Cancelled are the waiter's and cashier's
// calls respectively (see WaiterPage and OrdersPage), matching the backend's
// IsKitchenOnly() restriction on PATCH /orders/{id}/status to Accepted/Cooking/Ready.
const COLUMNS: { status: number; label: string }[] = [
  { status: 1, label: 'Новый' },
  { status: 2, label: 'Принят' },
  { status: 3, label: 'Готовится' },
  { status: 4, label: 'Готов' },
];
const ACTIVE_STATUSES = new Set(COLUMNS.map((c) => c.status));

// Long-waiting tickets need to stand out at a glance from across the kitchen —
// thresholds are deliberately coarse (not a live countdown).
function urgency(minutes: number): 'normal' | 'warn' | 'late' {
  if (minutes >= 20) return 'late';
  if (minutes >= 10) return 'warn';
  return 'normal';
}

export function KitchenPage() {
  const queryClient = useQueryClient();
  const [draggedOverStatus, setDraggedOverStatus] = useState<number | null>(null);

  // Realtime hub (AppShell) is the primary update path — this interval is just a
  // safety net for a dropped/reconnecting connection.
  const boardQuery = useQuery({
    queryKey: BOARD_QUERY_KEY,
    queryFn: () => getOrders({ pageSize: 100, pageNumber: 1 }),
    refetchInterval: 60_000,
  });

  const orders = useMemo(
    () => (boardQuery.data?.items ?? []).filter((o) => ACTIVE_STATUSES.has(o.status)),
    [boardQuery.data],
  );
  const ordersByStatus = useMemo(() => {
    const map = new Map<number, Order[]>();
    for (const column of COLUMNS) map.set(column.status, []);
    for (const order of orders) map.get(order.status)?.push(order);
    // Oldest first within a column — that's the ticket that's been waiting longest.
    map.forEach((list) => list.sort((a, b) => a.orderedAt.localeCompare(b.orderedAt)));
    return map;
  }, [orders]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) => updateOrderStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: BOARD_QUERY_KEY });
      const previous = queryClient.getQueryData(BOARD_QUERY_KEY);
      queryClient.setQueryData<typeof boardQuery.data>(BOARD_QUERY_KEY, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.map((o) => (o.id === id ? { ...o, status } : o)) };
      });
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
      <div className="kitchen-page">
        <div className="kitchen-page-title">
          <h1>Кухня</h1>
        </div>
        <div className="kitchen-board">
          {COLUMNS.map((column) => (
            <div className="kanban-column" key={column.status}>
              <div className="kanban-column-header">{column.label}</div>
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

  if (boardQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить заказы." onRetry={() => boardQuery.refetch()} />;
  }

  return (
    <div className="kitchen-page">
      <div className="kitchen-page-title">
        <h1>Кухня</h1>
        <p>Перетаскивайте карточку в следующую колонку по мере готовности заказа.</p>
      </div>

      <div className="kitchen-board">
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
                {columnOrders.map((order) => {
                  const minutes = Math.max(0, Math.round((Date.now() - new Date(order.orderedAt).getTime()) / 60000));
                  return (
                    <div
                      className={`kitchen-card is-${urgency(minutes)}`}
                      key={order.id}
                      draggable={FORWARD_TRANSITIONS[order.status] !== undefined}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', String(order.id));
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <div className="kitchen-card-header">
                        <span className="kitchen-card-table">{orderTableLabel(order)}</span>
                        <span className="kitchen-card-time">{minutesAgoLabel(order.orderedAt)}</span>
                      </div>
                      <ul className="kitchen-card-items">
                        {/* A waiter can add a new item to an order the kitchen is already cooking
                            (TZ 10/21) - it must not appear here until they explicitly send it. */}
                        {order.items
                          .filter((item) => item.sentToKitchenAt != null)
                          .map((item) => (
                            <li key={item.id}>
                              <span className="kitchen-card-item-qty">{item.quantity}×</span> {item.dishName}
                              {item.note && <span className="kitchen-card-item-note"> — {item.note}</span>}
                            </li>
                          ))}
                      </ul>
                      {order.note && <p className="kitchen-card-note">⚠ {order.note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
