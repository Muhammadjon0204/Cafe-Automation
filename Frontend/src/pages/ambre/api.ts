import { apiClient, type PagedData } from '@cafe/shared';

export interface ApiCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ApiDish {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: number;
  categoryName: string;
}

export interface ApiCafeTable {
  id: number;
  tableNumber: number;
  seatsCount: number;
  status: number;
}

const DISH_STATUS_ACTIVE = 2;
const TABLE_STATUS_DISABLED = 5;

export function getMenuCategories(): Promise<ApiCategory[]> {
  return apiClient
    .get<PagedData<ApiCategory>>('/categories', { params: { isActive: true, pageSize: 100 } })
    .then((page) => page.items);
}

// Only Status=Active dishes — matches "only active, not archived" for a public menu.
export function getMenuDishes(): Promise<ApiDish[]> {
  return apiClient
    .get<PagedData<ApiDish>>('/dishes', { params: { status: DISH_STATUS_ACTIVE, pageSize: 200 } })
    .then((page) => page.items);
}

export function getBookableTables(): Promise<ApiCafeTable[]> {
  return apiClient
    .get<PagedData<ApiCafeTable>>('/cafe-tables', { params: { pageSize: 100 } })
    .then((page) => page.items.filter((t) => t.status !== TABLE_STATUS_DISABLED));
}

export interface CreateReservationPayload {
  cafeTableId: number;
  customerName: string;
  phone?: string;
  guestsCount: number;
  reservedAt: string;
  note?: string;
}

// Requires a logged-in account (Client role) or staff — ReservationsController.Create is no
// longer AllowAnonymous. The caller is responsible for gating this behind useAuth().requireAuth
// first; apiClient attaches the bearer token automatically when one is present.
export function submitReservation(payload: CreateReservationPayload): Promise<GetReservationDto> {
  return apiClient.post('/reservations', payload);
}

export const RESERVATION_STATUS_LABELS: Record<number, string> = {
  1: 'Ожидает подтверждения',
  2: 'Подтверждена',
  3: 'Гости на месте',
  4: 'Завершена',
  5: 'Отменена',
  6: 'Не пришли',
};

export interface GetReservationDto {
  id: number;
  cafeTableId: number;
  tableNumber: number;
  customerId: number | null;
  customerName: string;
  phone: string | null;
  guestsCount: number;
  reservedAt: string;
  reservedUntil: string | null;
  cancelledAt: string | null;
  status: number;
  note: string | null;
  createdAt: string;
}

export function getMyReservations(): Promise<GetReservationDto[]> {
  return apiClient
    .get<PagedData<GetReservationDto>>('/reservations/mine', { params: { pageSize: 50 } })
    .then((page) => page.items);
}

export const ORDER_STATUS_LABELS: Record<number, string> = {
  1: 'Новый',
  2: 'Принят',
  3: 'Готовится',
  4: 'Готов',
  5: 'В пути',
  6: 'Завершён',
  7: 'Отменён',
  8: 'Запланирован',
};

export interface GetOrderItemDto {
  id: number;
  dishId: number;
  dishName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface GetOrderDto {
  id: number;
  orderNumber: string;
  status: number;
  deliveryAddress: string | null;
  subTotal: number;
  totalAmount: number;
  note: string | null;
  items: GetOrderItemDto[];
  createdAt: string;
}

export interface CreateDeliveryOrderPayload {
  items: { dishId: number; quantity: number }[];
  deliveryAddress: string;
  phone?: string;
  note?: string;
}

// Requires a logged-in account (Client role) — gate behind useAuth().requireAuth first.
export function createDeliveryOrder(payload: CreateDeliveryOrderPayload): Promise<GetOrderDto> {
  return apiClient.post('/customer-orders', payload);
}

export function getMyOrders(): Promise<GetOrderDto[]> {
  return apiClient
    .get<PagedData<GetOrderDto>>('/customer-orders', { params: { pageSize: 50 } })
    .then((page) => page.items);
}
