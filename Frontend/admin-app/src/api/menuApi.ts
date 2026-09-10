import { apiClient, type PagedData } from '@cafe/shared';

// Numeric Status/Type — no JsonStringEnumConverter is registered on the API, so these
// cross the wire as raw ints from Backend/src/Domain/Enums/{DishStatus,DishType}.cs.
export interface Dish {
  id: number;
  name: string;
  description: string | null;
  price: number;
  costPrice?: number | null; // only present via the /admin projection (Admin role)
  cookingTimeMinutes: number;
  calories: number | null;
  imageUrl: string | null;
  ingredientsDescription: string | null;
  isAvailable: boolean;
  isSeasonal: boolean;
  status: number;
  type: number;
  categoryId: number;
  categoryName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  dishesCount: number;
}

export interface DishFilter {
  search?: string;
  categoryId?: number;
  isAvailable?: boolean;
  status?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface DishFormValues {
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  cookingTimeMinutes: number;
  calories?: number;
  imageUrl?: string;
  ingredientsDescription?: string;
  isAvailable: boolean;
  isSeasonal: boolean;
  categoryId: number;
  status: number;
  type: number;
}

export interface CategoryFormValues {
  name: string;
  description?: string;
}

export function getDishes(filter: DishFilter): Promise<PagedData<Dish>> {
  return apiClient.get<PagedData<Dish>>('/dishes', { params: filter });
}

export function getDishesAdmin(filter: DishFilter): Promise<PagedData<Dish>> {
  return apiClient.get<PagedData<Dish>>('/dishes/admin', { params: filter });
}

export function getCategories(): Promise<PagedData<Category>> {
  return apiClient.get<PagedData<Category>>('/categories', { params: { pageSize: 100, isActive: true } });
}

export function createCategory(values: CategoryFormValues): Promise<Category> {
  return apiClient.post<Category>('/categories', values);
}

// isActive always true here — this app has no UI for deactivating a category, so a
// rename must not accidentally flip it off.
export function updateCategory(id: number, values: CategoryFormValues): Promise<Category> {
  return apiClient.put<Category>(`/categories/${id}`, { ...values, isActive: true });
}

// Backend guards this with HasActiveDishesAsync — fails with a 400 ("Category has
// active dishes.") if the category still has dishes, which errorMessage() surfaces.
export function deleteCategory(id: number): Promise<void> {
  return apiClient.delete<void>(`/categories/${id}`);
}

export function createDish(dto: DishFormValues): Promise<Dish> {
  return apiClient.post<Dish>('/dishes', dto);
}

export function updateDish(id: number, dto: DishFormValues): Promise<Dish> {
  return apiClient.put<Dish>(`/dishes/${id}`, dto);
}

export function updateDishAvailability(id: number, isAvailable: boolean): Promise<Dish> {
  return apiClient.patch<Dish>(`/dishes/${id}/availability`, { isAvailable });
}

// Soft delete — DishService.DeleteAsync sets IsDeleted/IsAvailable=false and
// Status=Archived rather than removing the row, so this is a real archive action.
export function archiveDish(id: number): Promise<void> {
  return apiClient.delete<void>(`/dishes/${id}`);
}
