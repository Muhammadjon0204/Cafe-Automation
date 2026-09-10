import { apiClient, type PagedData } from '@cafe/shared';

// Numeric Status — no JsonStringEnumConverter is registered on the API, so this crosses
// the wire as a raw int from Backend/src/Domain/Enums/ReservationStatus.cs.
export interface Reservation {
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
  updatedAt: string | null;
}

export interface CafeTable {
  id: number;
  tableNumber: number;
  seatsCount: number;
  status: number;
  location: string | null;
}

export interface ReservationFilter {
  search?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
  cafeTableId?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface ReservationFormValues {
  cafeTableId: number;
  customerName: string;
  phone?: string;
  guestsCount: number;
  reservedAt: string;
  reservedUntil?: string;
  note?: string;
}

export function getReservations(filter: ReservationFilter): Promise<PagedData<Reservation>> {
  return apiClient.get<PagedData<Reservation>>('/reservations', { params: filter });
}

export function getCafeTables(): Promise<PagedData<CafeTable>> {
  return apiClient.get<PagedData<CafeTable>>('/cafe-tables', { params: { pageSize: 100 } });
}

export function createReservation(dto: ReservationFormValues): Promise<Reservation> {
  return apiClient.post<Reservation>('/reservations', dto);
}

// Modeled as a status PATCH (Cancelled) rather than DELETE — DELETE is Admin/Manager-only
// on the backend, while this mirrors the AdminManagerWaiter-level "cancel" action a waiter
// taking a phone call would actually perform.
export function cancelReservation(id: number): Promise<Reservation> {
  return apiClient.patch<Reservation>(`/reservations/${id}/status`, { status: 5 });
}

// ReservationStatus.Seated = 3 (Backend/src/Domain/Enums/ReservationStatus.cs) — "guest has
// arrived," used by the floor plan's Reserved-table panel.
export function seatReservation(id: number): Promise<Reservation> {
  return apiClient.patch<Reservation>(`/reservations/${id}/status`, { status: 3 });
}
