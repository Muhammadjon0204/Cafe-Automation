import { apiClient, type PagedData } from '@cafe/shared';

// Trimmed to what the dish picker needs - see admin-app's menuApi.ts for the fuller Dish
// type (costPrice, ingredients, etc. - not relevant to a waiter adding items to an order).
export interface WaiterDish {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
  categoryId: number;
  categoryName: string;
}

export interface DishFilter {
  search?: string;
  categoryId?: number;
  isAvailable?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export function getDishes(filter: DishFilter): Promise<PagedData<WaiterDish>> {
  return apiClient.get<PagedData<WaiterDish>>('/dishes', { params: filter });
}
