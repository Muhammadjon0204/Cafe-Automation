export type OrderTone = 'new' | 'progress' | 'good' | 'cancel';

// Numeric keys mirror Backend/src/Domain/Enums/OrderStatus.cs — no string enum
// converter is registered on the API, so statuses cross the wire as raw ints.
export const ORDER_STATUS_META: Record<number, { label: string; tone: OrderTone }> = {
  1: { label: 'Новый', tone: 'new' },
  2: { label: 'Принят', tone: 'progress' },
  3: { label: 'Готовится', tone: 'progress' },
  4: { label: 'Готов', tone: 'good' },
  5: { label: 'Подан', tone: 'good' },
  6: { label: 'Закрыт', tone: 'good' },
  7: { label: 'Отменён', tone: 'cancel' },
};

export function orderStatusLabel(status: number): string {
  return ORDER_STATUS_META[status]?.label ?? '—';
}

export function orderTableLabel(order: { tableNumber: number | null; type: number }): string {
  if (order.tableNumber) return `Стол ${order.tableNumber}`;
  if (order.type === 2) return 'На вынос';
  if (order.type === 3) return 'Доставка';
  return '—';
}

export function orderItemsLabel(items: Array<{ dishName: string; quantity: number }>): string {
  if (items.length === 0) return '—';
  return items.map((item) => (item.quantity > 1 ? `${item.dishName} ×${item.quantity}` : item.dishName)).join(', ');
}

export function minutesAgoLabel(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

// Mirrors OrderService.CanMoveToStatus for the linear happy-path progression only
// (New -> Accepted -> Cooking -> Ready -> Served). Cancel and Close are separate
// actions in the UI, not drag targets, since they're modeled as distinct backend
// operations (POST /cancel, POST /close) rather than a plain status PATCH.
export const FORWARD_TRANSITIONS: Record<number, number | undefined> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
};

// Mirrors CanMoveToStatus's cancellable-source check: New, Accepted, Cooking, Ready.
export function isCancellable(status: number): boolean {
  return status >= 1 && status <= 4;
}
