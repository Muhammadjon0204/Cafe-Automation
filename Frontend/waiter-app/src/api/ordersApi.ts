import { apiClient, type PagedData } from '@cafe/shared';

export interface OrderItem {
  id: number;
  dishId: number;
  dishName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: number;
  note: string | null;
  // Null until this item has actually been pushed to the kitchen - see
  // OrderService.SendToKitchenAsync. Kitchen boards must only render items where this is set;
  // the waiter panel uses it to split "Отправлено на кухню" from "Новые позиции".
  sentToKitchenAt: string | null;
}

// Numeric Status/Type/PaymentStatus — no JsonStringEnumConverter is registered on the
// API, so these cross the wire as raw enum ints from Backend/src/Domain/Enums/*.cs.
export interface Order {
  id: number;
  orderNumber: string;
  orderedAt: string;
  closedAt: string | null;
  status: number;
  type: number;
  customerId: number | null;
  customerName: string | null;
  cafeTableId: number | null;
  tableNumber: number | null;
  waiterId: number | null;
  waiterName: string | null;
  createdByStaffMemberId: number | null;
  createdByStaffMemberName: string | null;
  subTotal: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentStatus: number;
  note: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string | null;
}

export interface OrderFilter {
  search?: string;
  status?: number;
  type?: number;
  paymentStatus?: number;
  cafeTableId?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface OpenTableValues {
  cafeTableId: number;
  waiterId?: number;
  note?: string;
  forceOpen?: boolean;
}

export interface OpenTableResult {
  order: Order;
  // Non-blocking heads-up (e.g. an upcoming reservation on this table) - show as a toast,
  // the open itself already succeeded.
  warning: string | null;
}

export interface AddOrderItemValues {
  dishId: number;
  quantity: number;
  note?: string;
}

export function getOrders(filter: OrderFilter): Promise<PagedData<Order>> {
  return apiClient.get<PagedData<Order>>('/orders', { params: filter });
}

export function updateOrderStatus(id: number, status: number, note?: string): Promise<Order> {
  return apiClient.patch<Order>(`/orders/${id}/status`, { status, note });
}

// Walk-in seating with the backend's concurrency + reservation-proximity checks (see
// OrderService.OpenTableAsync) - a 409 here means another waiter opened the table first.
export function openTable(values: OpenTableValues): Promise<OpenTableResult> {
  return apiClient.post<OpenTableResult>('/orders/open-table', values);
}

export function addOrderItem(orderId: number, values: AddOrderItemValues): Promise<Order> {
  return apiClient.post<Order>(`/orders/${orderId}/items`, values);
}

// Draft/Scheduled order -> promotes the whole order into the kitchen's queue. Already-live
// order (New/Accepted/Cooking/Ready) with items added since the last send -> only the unsent
// items are stamped/sent, the order's own status is untouched. Same endpoint either way - see
// OrderService.SendToKitchenAsync.
export function sendToKitchen(orderId: number): Promise<Order> {
  return apiClient.post<Order>(`/orders/${orderId}/send-to-kitchen`, {});
}

export interface RemoveOrderItemValues {
  force?: boolean;
  reason?: string;
}

// A not-yet-sent item (sentToKitchenAt == null) removes silently. One already sent to the
// kitchen requires force+reason (OrderService.ValidateForceGuard) - the caller is expected to
// confirm with the user and collect a reason before passing force: true.
export function removeOrderItem(orderId: number, itemId: number, values?: RemoveOrderItemValues): Promise<Order> {
  return apiClient.delete<Order>(`/orders/${orderId}/items/${itemId}`, { data: values ?? {} });
}
