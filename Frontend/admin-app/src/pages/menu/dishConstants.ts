import type { Dish } from '../../api/menuApi';
import type { MenuSortOption } from './useMenuFilters';

// Numeric Status/Type mirror Backend/src/Domain/Enums/{DishStatus,DishType}.cs — no
// JsonStringEnumConverter is registered on the API, so these cross the wire as raw ints.
export const DISH_STATUS = { Draft: 1, Active: 2, Inactive: 3, Archived: 4 } as const;
export const DISH_TYPE = { Food: 1, Drink: 2, Dessert: 3, Other: 4 } as const;

export const DISH_STATUSES = [
  { value: DISH_STATUS.Draft, label: 'Черновик' },
  { value: DISH_STATUS.Active, label: 'Активно' },
  { value: DISH_STATUS.Inactive, label: 'Неактивно' },
  { value: DISH_STATUS.Archived, label: 'В архиве' },
];

export const DISH_TYPES = [
  { value: DISH_TYPE.Food, label: 'Еда' },
  { value: DISH_TYPE.Drink, label: 'Напиток' },
  { value: DISH_TYPE.Dessert, label: 'Десерт' },
  { value: DISH_TYPE.Other, label: 'Другое' },
];

export const DISH_STATUS_LABEL: Record<number, string> = Object.fromEntries(
  DISH_STATUSES.map((s) => [s.value, s.label]),
);
export const DISH_TYPE_LABEL: Record<number, string> = Object.fromEntries(DISH_TYPES.map((t) => [t.value, t.label]));

export const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

export type DishAvailabilityState = 'available' | 'stoplist' | 'archived';

// A dish's operational state for the row badge / status filter / overview counts is
// derived from two independent backend fields (IsAvailable + Status) rather than a
// single tri-state one — Archived wins regardless of IsAvailable's value.
export function classifyDishState(dish: { isAvailable: boolean; status: number }): DishAvailabilityState {
  if (dish.status === DISH_STATUS.Archived) return 'archived';
  return dish.isAvailable ? 'available' : 'stoplist';
}

// No SortOrder field exists on Dish yet (see CLAUDE.md), so "По умолчанию" falls back
// to the same alphabetical order the old grouped view used.
export function sortDishes(dishes: Dish[], sort: MenuSortOption): Dish[] {
  const list = [...dishes];
  switch (sort) {
    case 'newest':
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'cooking-time':
      return list.sort((a, b) => a.cookingTimeMinutes - b.cookingTimeMinutes);
    case 'name':
    case 'default':
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }
}
