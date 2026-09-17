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

// Requires order.PaymentStatus === Paid (OrderService.CloseAsync) - releases the table
// (-> Cleaning, see OrderService.ReleaseTableAsync) and stamps ClosedAt.
export function closeOrder(id: number, note?: string): Promise<Order> {
  return apiClient.post<Order>(`/orders/${id}/close`, { note });
}
