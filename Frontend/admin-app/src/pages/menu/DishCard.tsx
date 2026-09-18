import type { Dish } from '../../api/menuApi';
import { classifyDishState, currencyFormatter, DISH_STATUS, DISH_STATUS_LABEL } from './dishConstants';
import { MenuItemActions } from './MenuItemActions';

interface DishCardProps {
  dish: Dish;
  canManage: boolean;
  canToggleAvailability: boolean;
  showCostPrice: boolean;
  availabilityPending: boolean;
  onToggleAvailability: (isAvailable: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

/** Compact card for one dish inside a category column (see MenuCategoryColumn) —
 * replaces the old full-width row. Category isn't repeated here since the
 * column it sits in already says which one this is. */
export function DishCard({
  dish,
  canManage,
  canToggleAvailability,
  showCostPrice,
  availabilityPending,
  onToggleAvailability,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
}: DishCardProps) {
  const state = classifyDishState(dish);
  // Draft/Inactive are meaningful curation states distinct from IsAvailable —
  // surfaced as a quiet secondary badge rather than folded into the switch.
  const secondaryStatusLabel =
    dish.status === DISH_STATUS.Draft || dish.status === DISH_STATUS.Inactive ? DISH_STATUS_LABEL[dish.status] : null;

  return (
    <article className="dish-card" data-state={state}>
      {dish.imageUrl && (
        <div className="dish-card-media">
          <img src={dish.imageUrl} alt="" loading="lazy" />
        </div>
      )}

      <div className="dish-card-body">
        <h3 className="dish-card-name">{dish.name}</h3>
        {dish.description && <p className="dish-card-desc">{dish.description}</p>}
        {(dish.isSeasonal || secondaryStatusLabel) && (
          <div className="dish-card-badges">
            {dish.isSeasonal && <span className="menu-badge menu-badge-seasonal">Сезонное</span>}
            {secondaryStatusLabel && <span className="menu-badge menu-badge-muted">{secondaryStatusLabel}</span>}
          </div>
        )}

        <div className="dish-card-price">
          {currencyFormatter.format(dish.price)} · {dish.cookingTimeMinutes} мин
        </div>
        {showCostPrice && dish.costPrice != null && (
          <div className="dish-card-cost">себестоимость {currencyFormatter.format(dish.costPrice)}</div>
        )}

        <div className="dish-card-footer">
          {state === 'archived' ? (
            <span className="availability-tag availability-tag-archived">Архив</span>
          ) : canToggleAvailability ? (
            <button
              type="button"
              className={`availability-tag availability-toggle ${dish.isAvailable ? 'availability-tag-on' : 'availability-tag-off'}`}
              role="switch"
              aria-checked={dish.isAvailable}
              disabled={availabilityPending}
              onClick={() => onToggleAvailability(!dish.isAvailable)}
            >
              <span className="availability-dot" aria-hidden="true" />
              {dish.isAvailable ? 'В продаже' : 'Нет в продаже'}
            </button>
          ) : (
            <span className={`availability-tag ${dish.isAvailable ? 'availability-tag-on' : 'availability-tag-off'}`}>
              <span className="availability-dot" aria-hidden="true" />
              {dish.isAvailable ? 'В продаже' : 'Нет в продаже'}
            </span>
          )}

          {canManage && (
            <MenuItemActions
              dish={dish}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onRestore={onRestore}
            />
          )}
        </div>
      </div>
    </article>
  );
}
