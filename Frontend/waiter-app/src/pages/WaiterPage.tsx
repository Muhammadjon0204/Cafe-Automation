import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrders, openTable, updateOrderStatus, type Order } from '../api/ordersApi';
import { getTables, type WaiterTable } from '../api/tablesApi';
import {
  isDraftOrder,
  occupiedSinceLabel,
  orderItemsLabel,
  reservationCountdownLabel,
  timeOfDayLabel,
  TABLE_STATUS_META,
  TABLE_FREE,
  TABLE_OCCUPIED,
  TABLE_RESERVED,
  TABLE_CLEANING,
  TABLE_DISABLED,
  waitingLabel,
} from '../domain/orders';
import { useAuth } from '../auth/AuthContext';
import { TableActionsModal } from './TableActionsModal';
import { ReservationFormModal } from './ReservationFormModal';
import { TablePanel } from './TablePanel';
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

type ActiveModal =
  | { type: 'actions'; table: WaiterTable }
  | { type: 'reserve'; table: WaiterTable }
  | { type: 'panel'; table: WaiterTable };

// getOrders is auto-scoped server-side to the caller's own WaiterId for the Waiter
// role (see OrderService.GetAllAsync) — Admin/Manager viewing this page see every
// table's order instead, which is the intended oversight behavior for those roles.
export function WaiterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [modal, setModal] = useState<ActiveModal | null>(null);

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

  // Keep the currently-open panel's table/order in sync with the latest fetch (a status/item
  // change elsewhere — SignalR, another waiter — must be reflected live, not just on reopen).
  const panelTable = modal?.type === 'panel' ? (tables.find((t) => t.id === modal.table.id) ?? modal.table) : null;
  const panelOrder = panelTable ? (orderByTableId.get(panelTable.id) ?? null) : null;

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

  // A 409 here (backend's partial unique index / serializable transaction - see
  // OrderService.OpenTableAsync) means another waiter opened this table first; the
  // toast + refetch below is the project's standing 409 convention.
  const openTableMutation = useMutation({
    mutationFn: (tableId: number) => openTable({ cafeTableId: tableId, waiterId: user?.staffMemberId ?? undefined }),
    onSuccess: (result, tableId) => {
      if (result.warning) {
        pushToast(result.warning, { variant: 'info' });
      }
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      const table = tables.find((t) => t.id === tableId);
      if (table) setModal({ type: 'panel', table });
      else setModal(null);
    },
    onError: (error) => {
      pushToast(errorMessage(error, 'Не удалось открыть стол.'), { variant: 'error' });
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });

  // Table and order are separate concerns (TZ 1) — opening the panel never itself creates
  // anything. A Free table only ever offers an explicit choice (Занять / Забронировать); every
  // other status opens the panel straight away.
  function handleCardClick(table: WaiterTable) {
    if (table.status === TABLE_DISABLED) return;
    if (table.status === TABLE_FREE) {
      setModal({ type: 'actions', table });
      return;
    }
    setModal({ type: 'panel', table });
  }

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

  const counts = tables.reduce(
    (acc, t) => {
      if (t.status === TABLE_FREE) acc.free += 1;
      else if (t.status === TABLE_OCCUPIED) acc.occupied += 1;
      else if (t.status === TABLE_CLEANING) acc.cleaning += 1;
      else if (t.status === TABLE_RESERVED) acc.reserved += 1;
      return acc;
    },
    { free: 0, occupied: 0, cleaning: 0, reserved: 0 },
  );

  return (
    <div className="waiter-page">
      <div className="waiter-page-title">
        <h1>Мои столы</h1>
        <p>Столы с готовым заказом поднимаются наверх — заберите и подайте.</p>
      </div>

      {tables.length > 0 && (
        <div className="waiter-summary">
          <span>{tables.length} столов</span>
          <span className="waiter-summary-item is-free">🟢 {counts.free} свободны</span>
          <span className="waiter-summary-item is-occupied">🟠 {counts.occupied} заняты</span>
          <span className="waiter-summary-item is-cleaning">🟡 {counts.cleaning} убираются</span>
          <span className="waiter-summary-item is-reserved">🔵 {counts.reserved} бронь</span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="empty-state">Столов пока нет.</p>
      ) : (
        <div className="waiter-grid">
          {rows.map(({ table, order }) => {
            const statusMeta = TABLE_STATUS_META[table.status] ?? { label: '—', className: '' };
            const isReady = order?.status === READY_STATUS;
            const isServedUnpaid = order?.status === SERVED_STATUS && order.paymentStatus !== PAID_STATUS && order.totalAmount > 0;
            const isClickable = table.status !== TABLE_DISABLED;
            const draft = isDraftOrder(order);
            return (
              <div
                className={`waiter-card ${statusMeta.className} ${isReady ? 'is-ready' : ''} ${isClickable ? 'is-clickable' : ''}`}
                key={table.id}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => handleCardClick(table) : undefined}
              >
                <div className="waiter-card-header">
                  <span className="waiter-card-table">Стол {table.tableNumber}</span>
                  <span className={`waiter-card-status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                </div>

                {table.status === TABLE_RESERVED && table.upcomingReservation ? (
                  <>
                    <p className="waiter-card-items">
                      {timeOfDayLabel(table.upcomingReservation.reservedAt)} · {table.upcomingReservation.customerName} · {table.upcomingReservation.guestsCount} гостей
                    </p>
                    <p className="waiter-card-hint">{reservationCountdownLabel(table.upcomingReservation.reservedAt)}</p>
                  </>
                ) : order ? (
                  <>
                    <p className="waiter-card-items">{orderItemsLabel(order.items)}</p>
                    {draft ? (
                      <p className="waiter-card-meta">
                        <span>{order.items.length === 0 ? 'Заказ пока не создан' : 'Черновик — не отправлено'}</span>
                      </p>
                    ) : (
                      <div className="waiter-card-meta">
                        <span>{waitingLabel(order.orderedAt)}</span>
                      </div>
                    )}
                    {isServedUnpaid && <p className="waiter-card-note">Подан · ожидает оплаты</p>}
                    {isReady && (
                      <button
                        type="button"
                        className="waiter-card-serve-btn"
                        disabled={serveMutation.isPending && serveMutation.variables === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          serveMutation.mutate(order.id);
                        }}
                      >
                        Подать
                      </button>
                    )}
                  </>
                ) : table.status === TABLE_FREE ? (
                  <>
                    <p className="waiter-card-empty">{table.seatsCount} мест</p>
                    {table.upcomingReservation && (
                      <p className="waiter-card-hint">Бронь сегодня в {timeOfDayLabel(table.upcomingReservation.reservedAt)}</p>
                    )}
                  </>
                ) : table.status === TABLE_CLEANING ? (
                  <p className="waiter-card-empty">Подготовьте стол</p>
                ) : table.status === TABLE_OCCUPIED ? (
                  <>
                    <p className="waiter-card-empty">{table.seatsCount} мест</p>
                    {occupiedSinceLabel(table.updatedAt) && <p className="waiter-card-meta">{occupiedSinceLabel(table.updatedAt)}</p>}
                  </>
                ) : (
                  <p className="waiter-card-empty">{table.seatsCount} мест</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal?.type === 'actions' && (
        <TableActionsModal
          tableNumber={modal.table.tableNumber}
          seatsCount={modal.table.seatsCount}
          isOpening={openTableMutation.isPending}
          onOpenTable={() => openTableMutation.mutate(modal.table.id)}
          onReserve={() => setModal({ type: 'reserve', table: modal.table })}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'reserve' && (
        <ReservationFormModal
          tableId={modal.table.id}
          tableNumber={modal.table.tableNumber}
          tableStatus={modal.table.status}
          onClose={() => setModal(null)}
          onCreated={() => setModal(null)}
        />
      )}

      {modal?.type === 'panel' && panelTable && <TablePanel table={panelTable} order={panelOrder} onClose={() => setModal(null)} />}
    </div>
  );
}
