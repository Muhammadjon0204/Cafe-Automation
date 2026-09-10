import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  archiveDish,
  createCategory,
  createDish,
  deleteCategory,
  getCategories,
  getDishes,
  getDishesAdmin,
  updateCategory,
  updateDish,
  updateDishAvailability,
  type Category,
  type Dish,
  type DishFormValues,
} from '../api/menuApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { ErrorRetry } from '../components/ErrorRetry';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import { CategoryManagerDrawer } from './menu/CategoryManagerDrawer';
import { CategoryTabs } from './menu/CategoryTabs';
import { classifyDishState, sortDishes } from './menu/dishConstants';
import { DishEditorDrawer } from './menu/DishEditorDrawer';
import { MenuEmptyState } from './menu/MenuEmptyState';
import { MenuItemRow } from './menu/MenuItemRow';
import { MenuOverview } from './menu/MenuOverview';
import { MenuPageHeader } from './menu/MenuPageHeader';
import { MenuSection } from './menu/MenuSection';
import { MenuSkeleton } from './menu/MenuSkeleton';
import { MenuToolbar } from './menu/MenuToolbar';
import { useMenuFilters } from './menu/useMenuFilters';
import './menu/menu.css';

const DISHES_QUERY_KEY = ['menu-dishes'];
const CATEGORIES_QUERY_KEY = ['menu-categories'];

function dishToFormValues(dish: Dish): DishFormValues {
  return {
    name: dish.name,
    description: dish.description ?? undefined,
    price: dish.price,
    costPrice: dish.costPrice ?? undefined,
    cookingTimeMinutes: dish.cookingTimeMinutes,
    calories: dish.calories ?? undefined,
    imageUrl: dish.imageUrl ?? undefined,
    ingredientsDescription: dish.ingredientsDescription ?? undefined,
    isAvailable: dish.isAvailable,
    isSeasonal: dish.isSeasonal,
    categoryId: dish.categoryId,
    status: dish.status,
    type: dish.type,
  };
}

export function MenuPage() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes('Admin');
  const isManager = isAdmin || roles.includes('Manager');
  const canToggleAvailability = isManager || roles.includes('Waiter');

  const filters = useMenuFilters();
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Dish | null>(null);
  const [formServerError, setFormServerError] = useState<string | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [pendingAvailabilityId, setPendingAvailabilityId] = useState<number | null>(null);

  const categoriesQuery = useQuery({ queryKey: CATEGORIES_QUERY_KEY, queryFn: getCategories });
  const dishesQuery = useQuery({
    queryKey: DISHES_QUERY_KEY,
    queryFn: () => (isAdmin ? getDishesAdmin({ pageSize: 100 }) : getDishes({ pageSize: 100 })),
  });

  const categories = useMemo(() => categoriesQuery.data?.items ?? [], [categoriesQuery.data]);
  const dishes = useMemo(() => dishesQuery.data?.items ?? [], [dishesQuery.data]);

  const overviewCounts = useMemo(() => {
    let available = 0;
    let stoplist = 0;
    let archived = 0;
    for (const dish of dishes) {
      const state = classifyDishState(dish);
      if (state === 'available') available++;
      else if (state === 'stoplist') stoplist++;
      else archived++;
    }
    return { total: dishes.length, available, stoplist, archived };
  }, [dishes]);

  const categoryTabItems = useMemo(
    () =>
      [...categories]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((c) => ({ id: c.id, name: c.name, count: dishes.filter((d) => d.categoryId === c.id).length })),
    [categories, dishes],
  );

  const filteredDishes = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return dishes.filter((dish) => {
      if (filters.categoryId !== 'all' && dish.categoryId !== filters.categoryId) return false;
      if (filters.status !== 'all' && classifyDishState(dish) !== filters.status) return false;
      if (!term) return true;
      return (
        dish.name.toLowerCase().includes(term) ||
        dish.categoryName.toLowerCase().includes(term) ||
        (dish.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [dishes, filters.search, filters.categoryId, filters.status]);

  const groupedDishes = useMemo(() => {
    const groups = new Map<string, { category: Category | null; dishes: Dish[] }>();
    for (const dish of filteredDishes) {
      const key = String(dish.categoryId);
      const existing = groups.get(key);
      if (existing) existing.dishes.push(dish);
      else groups.set(key, { category: categories.find((c) => c.id === dish.categoryId) ?? null, dishes: [dish] });
    }
    return [...groups.values()]
      .sort((a, b) => (a.category?.name ?? '').localeCompare(b.category?.name ?? '', 'ru'))
      .map((group) => ({ ...group, dishes: sortDishes(group.dishes, filters.sort) }));
  }, [filteredDishes, categories, filters.sort]);

  const flatSortedDishes = useMemo(() => sortDishes(filteredDishes, filters.sort), [filteredDishes, filters.sort]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: (values: DishFormValues) => createDish(values),
    onSuccess: () => {
      setShowCreateForm(false);
      setFormServerError(null);
      void queryClient.invalidateQueries({ queryKey: DISHES_QUERY_KEY });
      // A dish landing in a category changes that category's DishesCount, which the
      // category manager's delete guard relies on — keep it from going stale.
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      pushToast('Блюдо создано.');
    },
    onError: (error) => setFormServerError(errorMessage(error, 'Не удалось создать блюдо.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: DishFormValues }) => updateDish(id, values),
    onSuccess: () => {
      setEditingDish(null);
      setFormServerError(null);
      void queryClient.invalidateQueries({ queryKey: DISHES_QUERY_KEY });
      // Editing a dish can move it to a different category, changing two DishesCounts.
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      pushToast('Изменения сохранены.');
    },
    onError: (error) => setFormServerError(errorMessage(error, 'Не удалось сохранить изменения.')),
  });

  // Reuses the plain create endpoint with the source dish's own field values (minus
  // id) — there's no dedicated /duplicate endpoint, but this achieves the same result
  // without inventing one.
  const duplicateMutation = useMutation({
    mutationFn: (dish: Dish) => createDish({ ...dishToFormValues(dish), name: `${dish.name} (копия)` }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: DISHES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      pushToast(`«${created.name}» создано.`);
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось дублировать блюдо.'), { variant: 'error' }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveDish(id),
    onSuccess: () => {
      setArchiveTarget(null);
      void queryClient.invalidateQueries({ queryKey: DISHES_QUERY_KEY });
      // Archiving is a soft delete, which is what DishesCount actually counts (see
      // CategoryService.MapToDto) — so an archive can free a category up for deletion.
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      pushToast('Блюдо архивировано.');
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось архивировать блюдо.'), { variant: 'error' }),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) => updateDishAvailability(id, isAvailable),
    onMutate: async ({ id, isAvailable }) => {
      setPendingAvailabilityId(id);
      await queryClient.cancelQueries({ queryKey: DISHES_QUERY_KEY });
      const previous = queryClient.getQueryData(DISHES_QUERY_KEY);
      queryClient.setQueryData<typeof dishesQuery.data>(DISHES_QUERY_KEY, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.map((d) => (d.id === id ? { ...d, isAvailable } : d)) };
      });
      return { previous };
    },
    onSuccess: (_data, { isAvailable }) => {
      pushToast(isAvailable ? 'Блюдо добавлено в продажу.' : 'Блюдо перемещено в стоп-лист.');
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(DISHES_QUERY_KEY, context.previous);
      pushToast(errorMessage(error, 'Не удалось обновить статус.'), { variant: 'error' });
    },
    onSettled: () => {
      setPendingAvailabilityId(null);
      void queryClient.invalidateQueries({ queryKey: DISHES_QUERY_KEY });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (values: { name: string }) => createCategory(values),
    onSuccess: () => {
      setCategoryFormError(null);
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      pushToast('Категория добавлена.');
    },
    onError: (error) => setCategoryFormError(errorMessage(error, 'Не удалось создать категорию.')),
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateCategory(id, { name }),
    onSuccess: () => {
      setCategoryFormError(null);
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      // CategoryName on Dish is a live join (Backend/src/Application/Services/DishService.cs
      // MapToDto reads dish.Category?.Name), not copied onto the dish row — refetching here
      // is what makes the rename show up on already-created dishes without editing them.
      void queryClient.invalidateQueries({ queryKey: DISHES_QUERY_KEY });
      pushToast('Категория переименована.');
    },
    onError: (error) => setCategoryFormError(errorMessage(error, 'Не удалось переименовать категорию.')),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      setDeleteCategoryTarget(null);
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      pushToast('Категория удалена.');
    },
    // The "cannot delete" dialog already blocks non-empty categories client-side; this
    // only fires on a race (dish added to the category after the list last loaded), so
    // it surfaces the backend's own guard message rather than a generic fallback.
    onError: (error) => {
      setDeleteCategoryTarget(null);
      pushToast(errorMessage(error, 'Не удалось удалить категорию.'), { variant: 'error' });
    },
  });

  if (dishesQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="menu-page">
        <MenuPageHeader />
        <MenuSkeleton />
      </div>
    );
  }

  if (dishesQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить меню." onRetry={() => dishesQuery.refetch()} />;
  }
  if (categoriesQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить категории." onRetry={() => categoriesQuery.refetch()} />;
  }

  const isFiltered = Boolean(filters.search.trim()) || filters.categoryId !== 'all' || filters.status !== 'all';
  const activeCategoryName =
    filters.categoryId !== 'all' ? categories.find((c) => c.id === filters.categoryId)?.name ?? null : null;

  const renderRow = (dish: Dish) => (
    <MenuItemRow
      key={dish.id}
      dish={dish}
      canManage={isManager}
      canToggleAvailability={canToggleAvailability}
      showCostPrice={isAdmin}
      availabilityPending={pendingAvailabilityId === dish.id}
      onToggleAvailability={(isAvailable) => availabilityMutation.mutate({ id: dish.id, isAvailable })}
      onEdit={() => setEditingDish(dish)}
      onDuplicate={() => duplicateMutation.mutate(dish)}
      onArchive={() => setArchiveTarget(dish)}
    />
  );

  return (
    <div className="menu-page">
      <MenuPageHeader
        actions={
          isManager && (
            <>
              <button type="button" className="btn-secondary" onClick={() => setCategoryManagerOpen(true)}>
                Категории
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowCreateForm(true)}>
                + Добавить блюдо
              </button>
            </>
          )
        }
      />

      {categories.length === 0 ? (
        <MenuEmptyState
          title="Меню пока пустое"
          description={
            isManager
              ? 'Начните с создания категории — это первый шаг перед добавлением блюд.'
              : 'Категории пока не созданы.'
          }
          actionLabel={isManager ? 'Создать категорию' : undefined}
          onAction={isManager ? () => setCategoryManagerOpen(true) : undefined}
        />
      ) : (
        <>
          <MenuOverview {...overviewCounts} />
          <MenuToolbar
            search={filters.search}
            onSearchChange={filters.setSearch}
            status={filters.status}
            onStatusChange={filters.setStatus}
            sort={filters.sort}
            onSortChange={filters.setSort}
          />
          <CategoryTabs
            categories={categoryTabItems}
            totalCount={dishes.length}
            activeId={filters.categoryId}
            onChange={filters.setCategoryId}
          />

          {dishes.length === 0 ? (
            <MenuEmptyState
              title="Меню пока пустое"
              description="Добавьте первое блюдо, чтобы оно появилось в клиентском меню и стало доступно для заказа."
              actionLabel={isManager ? 'Добавить первое блюдо' : undefined}
              onAction={isManager ? () => setShowCreateForm(true) : undefined}
            />
          ) : filteredDishes.length === 0 ? (
            <MenuEmptyState
              title="Ничего не найдено"
              description="Попробуйте изменить запрос, категорию или статус."
              actionLabel={isFiltered ? 'Сбросить фильтры' : undefined}
              onAction={isFiltered ? filters.resetFilters : undefined}
            />
          ) : activeCategoryName ? (
            <div className="menu-rows">{flatSortedDishes.map(renderRow)}</div>
          ) : (
            <div className="menu-groups">
              {groupedDishes.map(({ category, dishes: dishesInGroup }) => {
                const key = category ? String(category.id) : 'none';
                return (
                  <MenuSection
                    key={key}
                    title={category?.name ?? 'Без категории'}
                    count={dishesInGroup.length}
                    collapsed={collapsedSections.has(key)}
                    onToggleCollapse={() => toggleSection(key)}
                  >
                    <div className="menu-rows">{dishesInGroup.map(renderRow)}</div>
                  </MenuSection>
                );
              })}
            </div>
          )}
        </>
      )}

      {showCreateForm && (
        <DishEditorDrawer
          dish={null}
          categories={categories}
          showCostPrice={isAdmin}
          busy={createMutation.isPending}
          serverError={formServerError}
          onCancel={() => {
            setShowCreateForm(false);
            setFormServerError(null);
          }}
          onSubmit={(values) => createMutation.mutate(values)}
          onCreateCategory={(name) => createCategoryMutation.mutateAsync({ name })}
        />
      )}

      {editingDish && (
        <DishEditorDrawer
          dish={editingDish}
          categories={categories}
          showCostPrice={isAdmin}
          busy={updateMutation.isPending}
          serverError={formServerError}
          onCancel={() => {
            setEditingDish(null);
            setFormServerError(null);
          }}
          onSubmit={(values) => updateMutation.mutate({ id: editingDish.id, values })}
          onCreateCategory={(name) => createCategoryMutation.mutateAsync({ name })}
        />
      )}

      {archiveTarget && (
        <ConfirmModal
          title={`Архивировать «${archiveTarget.name}»?`}
          message="Блюдо исчезнет из активного меню и не будет доступно для заказа."
          confirmLabel="Архивировать"
          tone="danger"
          busy={archiveMutation.isPending}
          onCancel={() => setArchiveTarget(null)}
          onConfirm={() => archiveMutation.mutate(archiveTarget.id)}
        />
      )}

      {categoryManagerOpen && (
        <CategoryManagerDrawer
          categories={categories}
          busy={createCategoryMutation.isPending || renameCategoryMutation.isPending}
          serverError={categoryFormError}
          onCreate={(name) => createCategoryMutation.mutate({ name })}
          onRename={(id, name) => renameCategoryMutation.mutate({ id, name })}
          onDeleteRequest={(category) => setDeleteCategoryTarget(category)}
          onClose={() => {
            setCategoryManagerOpen(false);
            setCategoryFormError(null);
          }}
        />
      )}

      {deleteCategoryTarget &&
        (deleteCategoryTarget.dishesCount > 0 ? (
          <ConfirmModal
            title={`Нельзя удалить категорию «${deleteCategoryTarget.name}»`}
            message={`В категории ${deleteCategoryTarget.dishesCount} блюд. Сначала переместите их в другую категорию или архивируйте.`}
            confirmLabel="Понятно"
            hideCancel
            onCancel={() => setDeleteCategoryTarget(null)}
            onConfirm={() => setDeleteCategoryTarget(null)}
          />
        ) : (
          <ConfirmModal
            title={`Удалить категорию «${deleteCategoryTarget.name}»?`}
            message="Это действие нельзя отменить."
            confirmLabel="Удалить категорию"
            tone="danger"
            busy={deleteCategoryMutation.isPending}
            onCancel={() => setDeleteCategoryTarget(null)}
            onConfirm={() => deleteCategoryMutation.mutate(deleteCategoryTarget.id)}
          />
        ))}
    </div>
  );
}
