import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addOrderItem, type Order } from '../api/ordersApi';
import { getDishes, type WaiterDish } from '../api/dishesApi';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import './DishPickerModal.css';

const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });

interface DishPickerModalProps {
  tableNumber: number;
  orderId: number;
  onClose: () => void;
}

// No existing dish-picker UI exists anywhere in the frontend to reuse (admin-app's
// QuickOrderFormModal only creates the order shell - item selection happens on the full
// Orders board, which a Waiter-only login never sees). Kept deliberately simple: a flat,
// searchable list with a one-click add, not a full cart/qty-stepper builder.
export function DishPickerModal({ tableNumber, orderId, onClose }: DishPickerModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  const dishesQuery = useQuery({
    queryKey: ['dishes', 'picker'],
    queryFn: () => getDishes({ isAvailable: true, pageSize: 200 }),
  });

  const dishes = useMemo(() => dishesQuery.data?.items ?? [], [dishesQuery.data]);
  const visibleDishes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dishes;
    return dishes.filter((d) => d.name.toLowerCase().includes(term));
  }, [dishes, search]);

  const addItemMutation = useMutation({
    mutationFn: (dish: WaiterDish) => addOrderItem(orderId, { dishId: dish.id, quantity: 1 }),
    onSuccess: (order: Order) => {
      setAddedCount(order.items.length);
      void queryClient.invalidateQueries({ queryKey: ['orders', 'waiter'] });
      void queryClient.invalidateQueries({ queryKey: ['tables', 'waiter'] });
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось добавить блюдо.'), { variant: 'error' }),
  });

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="dish-picker-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dish-picker-header">
          <div>
            <div className="modal-title">Стол {tableNumber} — блюда</div>
            {addedCount > 0 && <p className="dish-picker-subtitle">Добавлено позиций: {addedCount}</p>}
          </div>
          <button type="button" className="dish-picker-close" onClick={onClose} aria-label="Готово">
            Готово
          </button>
        </div>

        <input
          className="dish-picker-search"
          type="text"
          placeholder="Поиск блюда..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {dishesQuery.isLoading ? (
          <div className="dish-picker-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={52} />
            ))}
          </div>
        ) : dishesQuery.isError ? (
          <p className="empty-state">Не удалось загрузить меню.</p>
        ) : visibleDishes.length === 0 ? (
          <p className="empty-state">Блюда не найдены.</p>
        ) : (
          <div className="dish-picker-list">
            {visibleDishes.map((dish) => (
              <div className="dish-picker-row" key={dish.id}>
                <div className="dish-picker-row-info">
                  <span className="dish-picker-row-name">{dish.name}</span>
                  <span className="dish-picker-row-category">{dish.categoryName}</span>
                </div>
                <span className="dish-picker-row-price">{currencyFormatter.format(dish.price)}</span>
                <button
                  type="button"
                  className="dish-picker-add-btn"
                  disabled={addItemMutation.isPending && addItemMutation.variables?.id === dish.id}
                  onClick={() => addItemMutation.mutate(dish)}
                >
                  Добавить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
