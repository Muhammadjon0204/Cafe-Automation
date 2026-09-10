import { apiClient, type PagedData } from '@cafe/shared';

export interface PopularDish {
  dishId: number;
  dishName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface DashboardSummary {
  totalOrdersToday: number;
  totalRevenueToday: number;
  activeOrders: number;
  closedOrders: number;
  cancelledOrders: number;
  totalCustomers: number;
  totalTables: number;
  occupiedTables: number;
  freeTables: number;
  popularDishes: PopularDish[];
}

export interface PaymentBreakdown {
  cashTotal: number;
  cardTotal: number;
  onlineTotal: number;
  mixedTotal: number;
  grandTotal: number;
}

export interface RecentOrderItem {
  dishName: string;
  quantity: number;
}

// Numeric OrderStatus/OrderType — the backend has no JsonStringEnumConverter registered,
// so these cross the wire as the raw enum ints from Domain/Enums/OrderStatus.cs and OrderType.cs.
export interface RecentOrder {
  id: number;
  orderNumber: string;
  orderedAt: string;
  status: number;
  type: number;
  tableNumber: number | null;
  items: RecentOrderItem[];
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>('/dashboard/summary');
}

export function getRecentOrders(pageSize: number): Promise<PagedData<RecentOrder>> {
  return apiClient.get<PagedData<RecentOrder>>('/orders', { params: { pageSize, pageNumber: 1 } });
}

export function getTodayPayments(): Promise<PaymentBreakdown> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return apiClient.get<PaymentBreakdown>('/reports/payments', { params: { fromDate: todayStart.toISOString() } });
}

export interface SalesReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderAmount: number;
  totalDiscounts: number;
  totalTips: number;
}

// /api/reports/sales only aggregates a single [fromDate, toDate) range — there's no
// day-by-day breakdown endpoint. Callers build a real series by calling this once per
// bucket (see pages/dashboardSeries.ts) rather than inventing a bulk endpoint that
// doesn't exist.
export function getSalesReport(fromDate: Date, toDate: Date): Promise<SalesReport> {
  return apiClient.get<SalesReport>('/reports/sales', {
    params: { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() },
  });
}
