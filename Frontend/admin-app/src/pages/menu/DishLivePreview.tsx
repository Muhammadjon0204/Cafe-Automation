import { useWatch, type Control } from 'react-hook-form';
import type { Category } from '../../api/menuApi';
import { currencyFormatter, DISH_TYPE } from './dishConstants';
import { DishDessertIcon, DishDrinkIcon, DishFoodIcon, DishOtherIcon } from './menuIcons';
import type { DishFormInput } from './dishSchema';

function toNumber(value: unknown): number | null {
  const num = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : null;
}

interface DishLivePreviewProps {
  control: Control<DishFormInput>;
  categories: Category[];
}

/** Compact read-only card mirroring how the dish will render in the public
 * client menu (see Frontend/src/pages/ambre/AmbreLanding.tsx dish-card) —
 * not a fully interactive customer page, just enough to sanity-check the
 * result while filling the form. */
export function DishLivePreview({ control, categories }: DishLivePreviewProps) {
  const values = useWatch({ control });
  const name = (values.name as string) || 'Название блюда';
  const description = (values.description as string) || '';
  const imageUrl = (values.imageUrl as string) || '';
  const price = toNumber(values.price);
  const cookingTime = toNumber(values.cookingTimeMinutes);
  const isAvailable = Boolean(values.isAvailable);
  const isSeasonal = Boolean(values.isSeasonal);
  const type = toNumber(values.type) ?? DISH_TYPE.Food;
  const category = categories.find((c) => c.id === toNumber(values.categoryId));

  return (
    <div className="dish-preview">
      <p className="dish-preview-label">Предпросмотр</p>
      <p className="dish-preview-hint">Так блюдо будет выглядеть для гостя</p>

      <div className="dish-preview-card">
        <div className="dish-preview-media">
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <span className="dish-preview-media-placeholder">
              {type === DISH_TYPE.Drink ? (
                <DishDrinkIcon />
              ) : type === DISH_TYPE.Dessert ? (
                <DishDessertIcon />
              ) : type === DISH_TYPE.Food ? (
                <DishFoodIcon />
              ) : (
                <DishOtherIcon />
              )}
            </span>
          )}
        </div>
        <div className="dish-preview-body">
          <div className="dish-preview-row">
            <h4 className="dish-preview-name">{name}</h4>
            {price != null && <span className="dish-preview-price">{currencyFormatter.format(price)}</span>}
          </div>
          {category && <p className="dish-preview-category">{category.name}</p>}
          {description && <p className="dish-preview-desc">{description}</p>}
          <div className="dish-preview-meta">
            {cookingTime != null && <span>{cookingTime} мин</span>}
            <span className={isAvailable ? 'dish-preview-status-on' : 'dish-preview-status-off'}>
              {isAvailable ? 'В продаже' : 'Стоп-лист'}
            </span>
            {isSeasonal && <span className="dish-preview-seasonal">Сезонное</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
