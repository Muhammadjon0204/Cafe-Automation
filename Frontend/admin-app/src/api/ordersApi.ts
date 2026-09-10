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
// API (see Backend/src/Api/Program.cs), so these cross the wire as raw enum ints from
// Backend/src/Domain/Enums/{OrderStatus,OrderType,PaymentStatus}.cs.
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

export function getOrders(filter: OrderFilter): Promise<PagedData<Order>> {
  return apiClient.get<PagedData<Order>>('/orders', { params: filter });
}

// OrderType (Backend/src/Domain/Enums/OrderType.cs): DineIn=1, Takeaway=2, Delivery=3.
export interface CreateOrderValues {
  type: number;
  cafeTableId?: number;
  waiterId?: number;
  createdByStaffMemberId?: number;
  note?: string;
}

export function createOrder(values: CreateOrderValues): Promise<Order> {
  return apiClient.post<Order>('/orders', values);
}

export function updateOrderStatus(id: number, status: number, note?: string): Promise<Order> {
  return apiClient.patch<Order>(`/orders/${id}/status`, { status, note });
}

export function cancelOrder(id: number, reason?: string): Promise<Order> {
  return apiClient.post<Order>(`/orders/${id}/cancel`, { reason });
}

export function closeOrder(id: number, note?: string): Promise<Order> {
  return apiClient.post<Order>(`/orders/${id}/close`, { note });
}
