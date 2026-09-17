import { apiClient } from '@cafe/shared';

export interface CreateReservationValues {
  cafeTableId: number;
  customerName: string;
  phone?: string;
  guestsCount: number;
  reservedAt: string;
  reservedUntil?: string;
  note?: string;
}

export interface Reservation {
  id: number;
  cafeTableId: number;
  tableNumber: number;
  customerName: string;
  phone: string | null;
  guestsCount: number;
  reservedAt: string;
  reservedUntil: string | null;
  status: number;
  note: string | null;
}

// Conflict-checked server-side (ReservationRepository.HasConflictAsync, 15-minute buffer) -
// a genuine double-booking on the same table always fails regardless of what the client thinks.
export function createReservation(values: CreateReservationValues): Promise<Reservation> {
  return apiClient.post<Reservation>('/reservations', values);
}

// Seated (3) also flips the table to Occupied server-side (ReservationService.UpdateStatusAsync)
// - call this before openTable() so the reservation stops counting as "upcoming" and no longer
// blocks the walk-in-availability check on its own table.
export function updateReservationStatus(id: number, status: number, note?: string): Promise<Reservation> {
  return apiClient.patch<Reservation>(`/reservations/${id}/status`, { status, note });
}
