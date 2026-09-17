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
  8: { label: 'Ожидает брони', tone: 'new' },
  9: { label: 'Черновик', tone: 'new' },
};

export const DRAFT_STATUS = 9;
export const SCHEDULED_STATUS = 8;

export function orderStatusLabel(status: number): string {
  return ORDER_STATUS_META[status]?.label ?? '—';
}

export function isDraftOrder(order: { status: number } | null | undefined): boolean {
  return order?.status === DRAFT_STATUS || order?.status === SCHEDULED_STATUS;
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

function durationLabel(minutes: number): string {
  const clamped = Math.max(0, Math.round(minutes));
  if (clamped < 60) return `${clamped} мин`;
  const hours = Math.floor(clamped / 60);
  return `${hours} ч ${clamped % 60} мин`;
}

export function minutesAgoLabel(iso: string): string {
  return durationLabel((Date.now() - new Date(iso).getTime()) / 60000);
}

// "Ожидание: 11 мин" — how long an already-sent order has been waiting on the kitchen.
export function waitingLabel(orderedAtIso: string): string {
  return `Ожидание: ${durationLabel((Date.now() - new Date(orderedAtIso).getTime()) / 60000)}`;
}

// "За столом: 42 мин" — how long the table has been Occupied. Reuses CafeTable.UpdatedAt,
// which the backend already stamps the moment the table flips to Occupied
// (OrderService.OpenTableInTransactionAsync) - no separate "occupied since" field needed.
export function occupiedSinceLabel(tableUpdatedAtIso: string | null): string | null {
  if (!tableUpdatedAtIso) return null;
  return `За столом: ${durationLabel((Date.now() - new Date(tableUpdatedAtIso).getTime()) / 60000)}`;
}

const RESERVATION_GRACE_PERIOD_MINUTES = 20;

export function isReservationOverdue(reservedAtIso: string): boolean {
  return Date.now() - new Date(reservedAtIso).getTime() > RESERVATION_GRACE_PERIOD_MINUTES * 60000;
}

// "До брони: 1 ч 40 мин" ahead of time, "Опоздание: 12 мин" once past the reserved time.
export function reservationCountdownLabel(reservedAtIso: string): string {
  const diffMinutes = (new Date(reservedAtIso).getTime() - Date.now()) / 60000;
  if (diffMinutes >= 0) return `До брони: ${durationLabel(diffMinutes)}`;
  return `Опоздание: ${durationLabel(-diffMinutes)}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function timeOfDayLabel(iso: string): string {
  const date = new Date(iso);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// Mirrors OrderService.CanMoveToStatus for the linear happy-path progression only
// (New -> Accepted -> Cooking -> Ready -> Served).
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

// Numeric keys mirror Backend/src/Domain/Enums/TableStatus.cs.
export const TABLE_FREE = 1;
export const TABLE_OCCUPIED = 2;
export const TABLE_RESERVED = 3;
export const TABLE_CLEANING = 4;
export const TABLE_DISABLED = 5;

export const TABLE_STATUS_META: Record<number, { label: string; className: string }> = {
  [TABLE_FREE]: { label: 'Свободен', className: 'is-free' },
  [TABLE_OCCUPIED]: { label: 'Занят', className: 'is-occupied' },
  [TABLE_RESERVED]: { label: 'Бронь', className: 'is-reserved' },
  [TABLE_CLEANING]: { label: 'Убирается', className: 'is-cleaning' },
  [TABLE_DISABLED]: { label: 'Недоступен', className: 'is-disabled' },
};

// The single primary action the card/panel suggests for the table's current status - the
// interface picks the next step rather than making the waiter choose from a status list
// (TZ 26/33). Reserved has no single-button primary action (its panel shows a small reservation
// card with its own two actions instead), so it's absent here.
export const TABLE_PRIMARY_ACTION: Partial<Record<number, { label: string; targetStatus: number }>> = {
  [TABLE_OCCUPIED]: { label: 'Гости ушли', targetStatus: TABLE_CLEANING },
  [TABLE_CLEANING]: { label: 'Стол убран', targetStatus: TABLE_FREE },
};

// "Изменить статус" menu options for a given current status - deliberately excludes
// already-happened transitions (TZ 13: a Cleaning table isn't offered "Гости ушли" again) and
// the current status itself. The backend only hard-blocks ->Free with an unpaid order still
// open (CafeTableService.UpdateStatusAsync); everything else here is a UI-level guide, not an
// enforced state machine, so an unusual manual correction is still just one extra tap away.
export function manualStatusOptions(currentStatus: number): number[] {
  switch (currentStatus) {
    case TABLE_FREE:
      return [TABLE_OCCUPIED, TABLE_RESERVED];
    case TABLE_OCCUPIED:
      return [TABLE_CLEANING, TABLE_FREE];
    case TABLE_RESERVED:
      return [TABLE_OCCUPIED, TABLE_FREE];
    case TABLE_CLEANING:
      return [TABLE_FREE, TABLE_OCCUPIED];
    default:
      return [TABLE_FREE, TABLE_OCCUPIED, TABLE_RESERVED, TABLE_CLEANING];
  }
}
