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
