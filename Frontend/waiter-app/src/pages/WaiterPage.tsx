import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrders, updateOrderStatus, type Order } from '../api/ordersApi';
import { getTables } from '../api/tablesApi';
import { minutesAgoLabel, orderItemsLabel } from '../domain/orders';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import './WaiterPage.css';

// See admin-app's WaiterPage.tsx — same board, running as its own standalone
// app so a Waiter login lands directly here instead of inside the full admin
// shell. Keep the two in sync by hand if either changes.
const TABLES_QUERY_KEY = ['tables', 'waiter'];
const ORDERS_QUERY_KEY = ['orders', 'waiter'];
const READY_STATUS = 4;
const SERVED_STATUS = 5;
const PAID_STATUS = 3;

const TABLE_STATUS_META: Record<number, { label: string; className: string }> = {
  1: { label: 'Свободен', className: 'is-free' },
  2: { label: 'Занят', className: 'is-occupied' },
  3: { label: 'Бронь', className: 'is-reserved' },
  4: { label: 'Уборка', className: 'is-cleaning' },
  5: { label: 'Недоступен', className: 'is-disabled' },
};

// getOrders is auto-scoped server-side to the caller's own WaiterId for the Waiter
// role (see OrderService.GetAllAsync) — Admin/Manager viewing this page see every
// table's order instead, which is the intended oversight behavior for those roles.
export function WaiterPage() {
  const queryClient = useQueryClient();

  const tablesQuery = useQuery({ queryKey: TABLES_QUERY_KEY, queryFn: getTables });
  // Realtime hub (Shell) is the primary update path for both queries below — the
  // interval on the orders query is just a safety net for a dropped connection.
  const ordersQuery = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => getOrders({ pageSize: 100, pageNumber: 1 }),
    refetchInterval: 60_000,
  });

  const tables = useMemo(() => tablesQuery.data?.items ?? [], [tablesQuery.data]);
  // At most one open (non-Closed/non-Cancelled) order per table by backend invariant —
  // filter defensively rather than assume it holds, mirroring TablesPage's own lookup.
  const orderByTableId = useMemo(() => {
    const map = new Map<number, Order>();
    for (const order of ordersQuery.data?.items ?? []) {
      if (order.status === 6 || order.status === 7) continue;
      if (order.cafeTableId == null) continue;
      if (!map.has(order.cafeTableId)) map.set(order.cafeTableId, order);
    }
    return map;
  }, [ordersQuery.data]);

  const rows = useMemo(() => {
    return tables
      .map((table) => ({ table, order: orderByTableId.get(table.id) ?? null }))
      .sort((a, b) => {
        const rank = (order: Order | null) => (order?.status === READY_STATUS ? 0 : order ? 1 : 2);
        const diff = rank(a.order) - rank(b.order);
        return diff !== 0 ? diff : a.table.tableNumber - b.table.tableNumber;
      });
  }, [tables, orderByTableId]);

  const serveMutation = useMutation({
    mutationFn: (id: number) => updateOrderStatus(id, SERVED_STATUS),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ORDERS_QUERY_KEY });
      const previous = queryClient.getQueryData(ORDERS_QUERY_KEY);
      queryClient.setQueryData<typeof ordersQuery.data>(ORDERS_QUERY_KEY, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.map((o) => (o.id === id ? { ...o, status: SERVED_STATUS } : o)) };
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(ORDERS_QUERY_KEY, context.previous);
      pushToast(errorMessage(error, 'Не удалось отметить заказ поданным.'), { variant: 'error' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });

  if (tablesQuery.isLoading || ordersQuery.isLoading) {
    return (
      <div className="waiter-page">
        <div className="waiter-page-title">
          <h1>Мои столы</h1>
        </div>
        <div className="waiter-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={140} />
          ))}
        </div>
      </div>
    );
  }

  if (tablesQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить столы." onRetry={() => tablesQuery.refetch()} />;
  }
  if (ordersQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить заказы." onRetry={() => ordersQuery.refetch()} />;
  }

  return (
    <div className="waiter-page">
      <div className="waiter-page-title">
        <h1>Мои столы</h1>
        <p>Столы с готовым заказом поднимаются наверх — заберите и подайте.</p>
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">Столов пока нет.</p>
      ) : (
        <div className="waiter-grid">
          {rows.map(({ table, order }) => {
            const statusMeta = TABLE_STATUS_META[table.status] ?? { label: '—', className: '' };
            const isReady = order?.status === READY_STATUS;
            const isServedUnpaid = order?.status === SERVED_STATUS && order.paymentStatus !== PAID_STATUS;
            return (
              <div className={`waiter-card ${statusMeta.className} ${isReady ? 'is-ready' : ''}`} key={table.id}>
                <div className="waiter-card-header">
                  <span className="waiter-card-table">Стол {table.tableNumber}</span>
                  <span className={`waiter-card-status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                </div>

                {order ? (
                  <>
                    <p className="waiter-card-items">{orderItemsLabel(order.items)}</p>
                    <div className="waiter-card-meta">
                      <span>{order.orderNumber}</span>
                      <span>{minutesAgoLabel(order.orderedAt)}</span>
                    </div>
                    {isServedUnpaid && <p className="waiter-card-note">Подан · ожидает оплаты</p>}
                    {isReady && (
                      <button
                        type="button"
                        className="waiter-card-serve-btn"
                        disabled={serveMutation.isPending && serveMutation.variables === order.id}
                        onClick={() => serveMutation.mutate(order.id)}
                      >
                        Подать
                      </button>
                    )}
                  </>
                ) : (
                  <p className="waiter-card-empty">{table.seatsCount} мест</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
