// Numeric keys mirror Backend/src/Domain/Enums/*.cs — no string enum converter is
// registered on the API, so these all cross the wire as raw ints.

export const DRAFT_STATUS = 9;
export const SCHEDULED_STATUS = 8;
export const CANCELLED_STATUS = 7;
export const CLOSED_STATUS = 6;

export const PAYMENT_UNPAID = 1;
export const PAYMENT_PAID = 3;
export const PAYMENT_PARTIALLY_PAID = 4;

export const TABLE_CLEANING = 4;

export function isCheckEligible(order: { status: number; items: unknown[] }): boolean {
  return (
    order.status !== DRAFT_STATUS &&
    order.status !== SCHEDULED_STATUS &&
    order.status !== CLOSED_STATUS &&
    order.status !== CANCELLED_STATUS &&
    order.items.length > 0
  );
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

export const PAYMENT_METHOD_META: Record<number, string> = {
  1: 'Наличные',
  2: 'Карта',
  3: 'Онлайн',
  4: 'Смешанная',
};

export function minutesAgoLabel(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин назад`;
}
