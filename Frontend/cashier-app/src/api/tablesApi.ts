import { apiClient, type PagedData } from '@cafe/shared';

// Trimmed to exactly what CashierPage needs to flag "guests already left" tables
// (see TABLE_CLEANING usage in domain/orders.ts) - nothing else here reads layout/zone fields.
export interface CashierTable {
  id: number;
  tableNumber: number;
  status: number;
}

export function getTables(): Promise<PagedData<CashierTable>> {
  return apiClient.get<PagedData<CashierTable>>('/cafe-tables', { params: { pageSize: 100 } });
}
