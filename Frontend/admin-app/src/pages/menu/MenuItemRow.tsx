import type { Dish } from '../../api/menuApi';
import { Switch } from '../../components/Switch';
import { classifyDishState, currencyFormatter, DISH_STATUS, DISH_STATUS_LABEL, DISH_TYPE } from './dishConstants';
import { MenuItemActions } from './MenuItemActions';
import { DishDessertIcon, DishDrinkIcon, DishFoodIcon, DishOtherIcon } from './menuIcons';

function TypePlaceholderIcon({ type }: { type: number }) {
  if (type === DISH_TYPE.Drink) return <DishDrinkIcon />;
  if (type === DISH_TYPE.Dessert) return <DishDessertIcon />;
  if (type === DISH_TYPE.Food) return <DishFoodIcon />;
  return <DishOtherIcon />;
}

interface MenuItemRowProps {
  dish: Dish;
  canManage: boolean;
  canToggleAvailability: boolean;
  showCostPrice: boolean;
  availabilityPending: boolean;
  onToggleAvailability: (isAvailable: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}

export function MenuItemRow({
  dish,
  canManage,
  canToggleAvailability,
  showCostPrice,
  availabilityPending,
  onToggleAvailability,
  onEdit,
  onDuplicate,
  onArchive,
}: MenuItemRowProps) {
  const state = classifyDishState(dish);
  // Draft/Inactive are meaningful curation states distinct from IsAvailable —
  // surfaced as a quiet secondary badge rather than folded into the switch.
  const secondaryStatusLabel =
    dish.status === DISH_STATUS.Draft || dish.status === DISH_STATUS.Inactive ? DISH_STATUS_LABEL[dish.status] : null;

  return (
    <div className="menu-row" data-state={state}>
      <div className="menu-row-media">
        {dish.imageUrl ? (
          <img src={dish.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="menu-row-media-placeholder">
            <TypePlaceholderIcon type={dish.type} />
          </span>
        )}
      </div>

      <div className="menu-row-identity">
        <div className="menu-row-name">{dish.name}</div>
        <div className="menu-row-meta">
          {dish.categoryName}
          {dish.description ? ` · ${dish.description}` : ''}
        </div>
        <div className="menu-row-badges">
          {dish.isSeasonal && <span className="menu-badge menu-badge-seasonal">Сезонное</span>}
          {secondaryStatusLabel && <span className="menu-badge menu-badge-muted">{secondaryStatusLabel}</span>}
        </div>
      </div>

      <div className="menu-row-stats">
        <span className="menu-row-price">
          {currencyFormatter.format(dish.price)}
          {showCostPrice && dish.costPrice != null && (
            <span className="menu-row-cost">себестоимость {currencyFormatter.format(dish.costPrice)}</span>
          )}
        </span>
        <span className="menu-row-time">{dish.cookingTimeMinutes} мин</span>
      </div>

      <div className="menu-row-availability">
        {state === 'archived' ? (
          <span className="availability-tag availability-tag-archived">Архив</span>
        ) : canToggleAvailability ? (
          <Switch
            checked={dish.isAvailable}
            disabled={availabilityPending}
            onChange={onToggleAvailability}
            label={dish.isAvailable ? 'В продаже' : 'Стоп-лист'}
            id={`avail-${dish.id}`}
          />
        ) : (
          <span className={`availability-tag ${dish.isAvailable ? 'availability-tag-on' : 'availability-tag-off'}`}>
            {dish.isAvailable ? '● В продаже' : '○ Стоп-лист'}
          </span>
        )}
      </div>

      {canManage && <MenuItemActions dish={dish} onEdit={onEdit} onDuplicate={onDuplicate} onArchive={onArchive} />}
    </div>
  );
}
