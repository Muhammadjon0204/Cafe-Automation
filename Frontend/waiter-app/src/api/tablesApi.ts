import { apiClient, type PagedData } from '@cafe/shared';

// Nearest active (Pending/Confirmed) reservation on a table, whether or not the table has
// already flipped to Reserved (see CafeTableService.GetCafeTableDto.UpcomingReservation) — lets
// the board show a "Бронь сегодня в 20:00" preview before the activation window kicks in.
export interface UpcomingReservation {
  id: number;
  customerName: string;
  phone: string | null;
  guestsCount: number;
  reservedAt: string;
  reservedUntil: string | null;
  note: string | null;
}

// Trimmed to exactly what WaiterPage reads — floor-plan fields (position/
// size/shape/zone) live on the fuller CafeTableLayout type in admin-app's
// tablesApi.ts, not needed here.
export interface WaiterTable {
  id: number;
  tableNumber: number;
  seatsCount: number;
  status: number;
  location: string | null;
  updatedAt: string | null;
  upcomingReservation: UpcomingReservation | null;
}

export function getTables(): Promise<PagedData<WaiterTable>> {
  return apiClient.get<PagedData<WaiterTable>>('/cafe-tables', { params: { pageSize: 100 } });
}

// The one hard backend rule (CafeTableService.UpdateStatusAsync): a target of Free fails if the
// table still has an active order with an unpaid balance - the caller surfaces that failure
// message as-is. Every other manual transition ("Гости ушли" -> Cleaning, "Стол убран" -> Free,
// or an explicit correction from the "Изменить статус" menu) goes through this same endpoint.
export function updateTableStatus(id: number, status: number): Promise<void> {
  return apiClient.patch<void>(`/cafe-tables/${id}/status`, { status });
}
