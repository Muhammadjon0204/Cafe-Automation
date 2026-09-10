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

// AllowAnonymous on the backend (ReservationsController) — a guest can book without an
// account, so this call carries no auth token.
export function submitReservation(payload: CreateReservationPayload): Promise<unknown> {
  return apiClient.post('/reservations', payload);
}
