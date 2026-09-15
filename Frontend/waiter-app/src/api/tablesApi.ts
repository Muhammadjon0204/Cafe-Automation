import { apiClient, type PagedData } from '@cafe/shared';

// Trimmed to exactly what WaiterPage reads — floor-plan fields (position/
// size/shape/zone) live on the fuller CafeTableLayout type in admin-app's
// tablesApi.ts, not needed here.
export interface WaiterTable {
  id: number;
  tableNumber: number;
  seatsCount: number;
  status: number;
  location: string | null;
}

export function getTables(): Promise<PagedData<WaiterTable>> {
  return apiClient.get<PagedData<WaiterTable>>('/cafe-tables', { params: { pageSize: 100 } });
}
