import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addOrderItem, openTable, removeOrderItem, sendToKitchen, type Order, type OrderItem } from '../api/ordersApi';
import { updateTableStatus, type UpcomingReservation, type WaiterTable } from '../api/tablesApi';
import { updateReservationStatus } from '../api/reservationsApi';
import { getDishes, type WaiterDish } from '../api/dishesApi';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import {
  TABLE_CLEANING,
  TABLE_FREE,
  TABLE_OCCUPIED,
  TABLE_RESERVED,
  TABLE_PRIMARY_ACTION,
  TABLE_STATUS_META,
  manualStatusOptions,
  isDraftOrder,
  isReservationOverdue,
  reservationCountdownLabel,
  timeOfDayLabel,
  waitingLabel,
  occupiedSinceLabel,
} from '../domain/orders';
import './modals.css';
import './TablePanel.css';

const TABLES_QUERY_KEY = ['tables', 'waiter'];
const ORDERS_QUERY_KEY = ['orders', 'waiter'];
const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS', maximumFractionDigits: 0 });

const CANCEL_REASONS = ['Ошибка официанта', 'Клиент отменил', 'Нет продукта', 'Другое'];

interface TablePanelProps {
  table: WaiterTable;
  order: Order | null;
  onClose: () => void;
}

export function TablePanel({ table, order, onClose }: TablePanelProps) {
  const queryClient = useQueryClient();
  const [dishSearch, setDishSearch] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OrderItem | null>(null);

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
  };

  const dishesQuery = useQuery({
    queryKey: ['dishes', 'picker'],
    queryFn: () => getDishes({ isAvailable: true, pageSize: 200 }),
    enabled: order != null,
  });
  const visibleDishes = useMemo(() => {
    const dishes = dishesQuery.data?.items ?? [];
    const term = dishSearch.trim().toLowerCase();
    if (!term) return dishes;
    return dishes.filter((d) => d.name.toLowerCase().includes(term));
  }, [dishesQuery.data, dishSearch]);

  const addItemMutation = useMutation({
    mutationFn: (dish: WaiterDish) => addOrderItem(order!.id, { dishId: dish.id, quantity: 1 }),
    onSuccess: invalidateBoard,
    onError: (error) => pushToast(errorMessage(error, 'Не удалось добавить блюдо.'), { variant: 'error' }),
  });

  const sendToKitchenMutation = useMutation({
    mutationFn: () => sendToKitchen(order!.id),
    onSuccess: () => {
      pushToast('Отправлено на кухню.', { variant: 'info' });
      invalidateBoard();
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось отправить на кухню.'), { variant: 'error' }),
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ item, reason }: { item: OrderItem; reason?: string }) =>
      removeOrderItem(order!.id, item.id, item.sentToKitchenAt ? { force: true, reason } : undefined),
    onSuccess: () => {
      setCancelTarget(null);
      invalidateBoard();
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось убрать позицию.'), { variant: 'error' }),
  });

  const tableStatusMutation = useMutation({
    mutationFn: (status: number) => updateTableStatus(table.id, status),
    onSuccess: (_data, status) => {
      setStatusMenuOpen(false);
      invalidateBoard();
      if (status === TABLE_FREE || status === TABLE_CLEANING) {
        onClose();
      }
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось изменить статус стола.'), { variant: 'error' }),
  });

  const guestsArrivedMutation = useMutation({
    mutationFn: async (reservation: UpcomingReservation) => {
      await updateReservationStatus(reservation.id, 3); // Seated
      await openTable({ cafeTableId: table.id });
    },
    onSuccess: () => {
      pushToast('Гости усажены.', { variant: 'info' });
      invalidateBoard();
      onClose();
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось усадить гостей.'), { variant: 'error' }),
  });

  const pendingItems = order?.items.filter((i) => i.sentToKitchenAt == null) ?? [];
  const sentItems = order?.items.filter((i) => i.sentToKitchenAt != null) ?? [];
  const statusMeta = TABLE_STATUS_META[table.status] ?? { label: '—', className: '' };
  const primaryAction = TABLE_PRIMARY_ACTION[table.status];
  const reservation = table.upcomingReservation;
  const overdue = table.status === TABLE_RESERVED && reservation != null && isReservationOverdue(reservation.reservedAt);

  function confirmFreeTable() {
    if (window.confirm(`Вы действительно хотите освободить стол ${table.tableNumber}?`)) {
      tableStatusMutation.mutate(TABLE_FREE);
    }
  }

  function handleSendToKitchen() {
    if (pendingItems.length === 0) return;
    if (window.confirm(`Отправить ${pendingItems.length} позиций на кухню?`)) {
      sendToKitchenMutation.mutate();
    }
  }

  function handleRemoveItem(item: OrderItem) {
    if (item.sentToKitchenAt) {
      setCancelTarget(item);
    } else {
      removeItemMutation.mutate({ item });
    }
  }

  return (
    <div className="side-panel-overlay" onMouseDown={onClose}>
      <div className="side-panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="side-panel-header">
          <div className="side-panel-header-title">
            <div className="modal-title">Стол {table.tableNumber}</div>
            <span className={`waiter-card-status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
          </div>
          <button type="button" className="side-panel-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="side-panel-body">
          {table.status === TABLE_RESERVED && reservation && (
            <div className="side-panel-section">
              <p className="side-panel-section-title">Бронь</p>
              <div className={`reservation-card ${overdue ? 'is-overdue' : ''}`}>
                <div className="reservation-card-row">
                  <span className="reservation-card-time">{timeOfDayLabel(reservation.reservedAt)}</span>
                  <span>{reservation.guestsCount} гостей</span>
                </div>
                <div className="reservation-card-name">{reservation.customerName}</div>
                {reservation.phone && <div className="reservation-card-phone">{reservation.phone}</div>}
                {reservation.note && <div className="reservation-card-note">{reservation.note}</div>}
                <div className="reservation-card-countdown">{reservationCountdownLabel(reservation.reservedAt)}</div>

                {overdue ? (
                  <>
                    <p className="reservation-card-overdue-label">⚠️ Бронь просрочена</p>
                    <div className="side-panel-actions">
                      <button type="button" className="table-actions-btn is-danger" onClick={confirmFreeTable}>
                        Освободить стол
                      </button>
                      <button type="button" className="table-actions-btn" onClick={onClose}>
                        Оставить бронь
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="table-actions-btn is-primary"
                    disabled={guestsArrivedMutation.isPending}
                    onClick={() => guestsArrivedMutation.mutate(reservation)}
                  >
                    Гости пришли
                  </button>
                )}
              </div>
            </div>
          )}

          {table.status === TABLE_OCCUPIED && (
            <div className="side-panel-section">
              <p className="side-panel-section-title">Заказ</p>
              {occupiedSinceLabel(table.updatedAt) && <p className="side-panel-hint">{occupiedSinceLabel(table.updatedAt)}</p>}

              {!order || order.items.length === 0 ? (
                <p className="side-panel-empty">Нет блюд в заказе</p>
              ) : (
                <>
                  {sentItems.length > 0 && (
                    <div className="order-item-group">
                      <p className="order-item-group-title">Отправлено на кухню</p>
                      {sentItems.map((item) => (
                        <div className="order-item-row" key={item.id}>
                          <span className="order-item-check">✓</span>
                          <span className="order-item-name">
                            {item.dishName} {item.quantity > 1 ? `×${item.quantity}` : ''}
                          </span>
                          <button type="button" className="order-item-remove" onClick={() => handleRemoveItem(item)}>
                            Отменить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {pendingItems.length > 0 && (
                    <div className="order-item-group">
                      <p className="order-item-group-title">Новые позиции</p>
                      {pendingItems.map((item) => (
                        <div className="order-item-row" key={item.id}>
                          <span className="order-item-bullet">•</span>
                          <span className="order-item-name">
                            {item.dishName} {item.quantity > 1 ? `×${item.quantity}` : ''}
                          </span>
                          <button type="button" className="order-item-remove" onClick={() => handleRemoveItem(item)}>
                            Убрать
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {cancelTarget && (
                    <div className="cancel-reason-picker">
                      <p>Отменить «{cancelTarget.dishName}»?</p>
                      <div className="cancel-reason-list">
                        {CANCEL_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            className="table-actions-btn"
                            disabled={removeItemMutation.isPending}
                            onClick={() => removeItemMutation.mutate({ item: cancelTarget, reason })}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="table-actions-cancel" onClick={() => setCancelTarget(null)}>
                        Не отменять
                      </button>
                    </div>
                  )}

                  <div className="order-total-row">
                    <span>Итого</span>
                    <span>{currencyFormatter.format(order.totalAmount)}</span>
                  </div>
                  {!isDraftOrder(order) && <p className="side-panel-hint">{waitingLabel(order.orderedAt)}</p>}
                </>
              )}

              {order && pendingItems.length > 0 && (
                <button
                  type="button"
                  className="table-actions-btn is-primary"
                  disabled={sendToKitchenMutation.isPending}
                  onClick={handleSendToKitchen}
                >
                  {sendToKitchenMutation.isPending ? 'Отправляем…' : 'Отправить на кухню'}
                </button>
              )}

              {order && (
                <div className="dish-search-section">
                  <input
                    className="dish-picker-search"
                    type="text"
                    placeholder="Добавить блюдо…"
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                  />
                  {dishesQuery.isLoading ? (
                    <Skeleton height={40} />
                  ) : (
                    <div className="dish-picker-list">
                      {visibleDishes.slice(0, 8).map((dish) => (
                        <div className="dish-picker-row" key={dish.id}>
                          <div className="dish-picker-row-info">
                            <span className="dish-picker-row-name">{dish.name}</span>
                            <span className="dish-picker-row-category">{dish.categoryName}</span>
                          </div>
                          <span className="dish-picker-row-price">{currencyFormatter.format(dish.price)}</span>
                          <button
                            type="button"
                            className="dish-picker-add-btn"
                            disabled={addItemMutation.isPending && addItemMutation.variables?.id === dish.id}
                            onClick={() => addItemMutation.mutate(dish)}
                          >
                            Добавить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(table.status === TABLE_OCCUPIED || table.status === TABLE_CLEANING) && (
            <div className="side-panel-section">
              <p className="side-panel-section-title">Статус стола</p>
              <div className="side-panel-actions">
                {primaryAction && (
                  <button
                    type="button"
                    className="table-actions-btn is-primary"
                    disabled={tableStatusMutation.isPending}
                    onClick={() =>
                      primaryAction.targetStatus === TABLE_FREE
                        ? confirmFreeTable()
                        : tableStatusMutation.mutate(primaryAction.targetStatus)
                    }
                  >
                    {primaryAction.label}
                  </button>
                )}
                <button type="button" className="table-actions-btn" onClick={() => setStatusMenuOpen((v) => !v)}>
                  Изменить статус
                </button>
              </div>

              {statusMenuOpen && (
                <div className="status-menu">
                  {manualStatusOptions(table.status).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="status-menu-item"
                      disabled={tableStatusMutation.isPending}
                      onClick={() => (status === TABLE_FREE ? confirmFreeTable() : tableStatusMutation.mutate(status))}
                    >
                      {TABLE_STATUS_META[status]?.label ?? status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
