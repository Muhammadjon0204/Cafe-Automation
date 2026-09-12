import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { uploadDishPhoto, type Category, type Dish, type DishFormValues } from '../../api/menuApi';
import { ChevronDownIcon, CloseIcon } from '../../components/icons';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Switch } from '../../components/Switch';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { errorMessage } from '../../lib/errorMessage';
import { currencyFormatter, DISH_STATUSES, DISH_TYPES } from './dishConstants';
import { DishLivePreview } from './DishLivePreview';
import { dishSchema, type DishFormInput, type DishFormOutput } from './dishSchema';
import { PhotoIcon } from './menuIcons';

// Sentinel <option> value for "+ create new category" — never a real CategoryId,
// so it can't collide with one.
const CREATE_NEW_CATEGORY_VALUE = '__new_category__';

// Kept in sync with DishesController's AllowedPhotoContentTypes / MaxPhotoFileSizeBytes
// (same constants ZoneManagerModal.tsx mirrors from ZonesController for the same reason).
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_FILE_SIZE_BYTES = 8 * 1024 * 1024;

interface DishEditorDrawerProps {
  dish: Dish | null;
  categories: Category[];
  showCostPrice: boolean;
  busy: boolean;
  serverError: string | null;
  onSubmit: (values: DishFormValues) => void;
  onCancel: () => void;
  onCreateCategory: (name: string) => Promise<Category>;
}

/** Right-side drawer that replaces the old centered DishFormModal. Same
 * validation/category-creation logic as before, reorganized into sections
 * (basic info / pricing / availability / additional) with a sticky
 * header+footer and, on wide screens, a live preview of the dish card. */
export function DishEditorDrawer({
  dish,
  categories,
  showCostPrice,
  busy,
  serverError,
  onCancel,
  onSubmit,
  onCreateCategory,
}: DishEditorDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBusy, setNewCategoryBusy] = useState(false);
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  // Merged into the <select> immediately on creation so the new category shows up
  // and gets selected without waiting for the categories list to refetch.
  const [pendingNewCategory, setPendingNewCategory] = useState<Category | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm<DishFormInput, unknown, DishFormOutput>({
    resolver: zodResolver(dishSchema),
    defaultValues: dish
      ? {
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
        }
      : {
          isAvailable: true,
          isSeasonal: false,
          status: 2,
          type: 1,
          cookingTimeMinutes: 10,
          categoryId: categories[0]?.id ?? 0,
        },
  });

  const attemptClose = () => {
    if (isDirty) setShowUnsavedConfirm(true);
    else onCancel();
  };

  useDialogA11y(panelRef, true, attemptClose);

  const submit = handleSubmit((values) => {
    onSubmit({
      ...values,
      description: values.description || undefined,
      imageUrl: values.imageUrl || undefined,
      ingredientsDescription: values.ingredientsDescription || undefined,
    });
  });

  // categories won't include a just-created one until MenuPage's categoriesQuery
  // refetches — pendingNewCategory keeps the <select> (and the preview's category
  // resolution) showing it immediately, without waiting on that round trip.
  const categoryOptions = useMemo(() => {
    if (pendingNewCategory && !categories.some((c) => c.id === pendingNewCategory.id)) {
      return [...categories, pendingNewCategory];
    }
    return categories;
  }, [categories, pendingNewCategory]);

  const categoryField = register('categoryId', {
    onChange: (e: ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === CREATE_NEW_CATEGORY_VALUE) {
        setShowNewCategory(true);
        setNewCategoryError(null);
      }
    },
  });

  const cancelNewCategory = () => {
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryError(null);
    if (categoryOptions[0]) setValue('categoryId', categoryOptions[0].id, { shouldValidate: true });
  };

  const submitNewCategory = async (e: FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setNewCategoryBusy(true);
    setNewCategoryError(null);
    try {
      const created = await onCreateCategory(name);
      setPendingNewCategory(created);
      setValue('categoryId', created.id, { shouldValidate: true, shouldDirty: true });
      setShowNewCategory(false);
      setNewCategoryName('');
    } catch (error) {
      setNewCategoryError(errorMessage(error, 'Не удалось создать категорию.'));
    } finally {
      setNewCategoryBusy(false);
    }
  };

  const handlePhotoFileChange = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoUploadError('Только JPEG, PNG или WebP.');
      return;
    }
    if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
      setPhotoUploadError('Файл должен быть не больше 8 МБ.');
      return;
    }
    setPhotoUploadError(null);
    setPhotoUploading(true);
    try {
      const { url } = await uploadDishPhoto(file);
      setValue('imageUrl', url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      setPhotoUploadError(errorMessage(error, 'Не удалось загрузить фото.'));
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const imageUrlValue = watch('imageUrl');
  const isAvailableValue = Boolean(watch('isAvailable'));
  const isSeasonalValue = Boolean(watch('isSeasonal'));

  const priceValue = watch('price');
  const costPriceValue = watch('costPrice');
  const margin = useMemo(() => {
    if (!showCostPrice) return null;
    if (costPriceValue === undefined || costPriceValue === '') return null;
    const price = Number(priceValue);
    const cost = Number(costPriceValue);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(cost)) return null;
    const marginValue = price - cost;
    return { marginValue, marginPercent: (marginValue / price) * 100 };
  }, [priceValue, costPriceValue, showCostPrice]);

  return (
    <div className="drawer-overlay" onMouseDown={attemptClose}>
      <div
        className="drawer-panel drawer-panel-lg"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-drawer-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title" id="dish-drawer-title">
              {dish ? 'Редактирование блюда' : 'Новое блюдо'}
            </h2>
            <p className="drawer-subtitle">
              {dish ? 'Измените данные блюда и сохраните изменения.' : 'Добавьте информацию, цену и параметры доступности.'}
            </p>
          </div>
          <button type="button" className="drawer-close" aria-label="Закрыть" onClick={attemptClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="drawer-split">
          <form className="dish-form" onSubmit={submit} noValidate>
            <div className="dish-form-scroll">
              <section className="dish-form-section">
                <h3 className="dish-form-section-title">Основная информация</h3>
                <p className="dish-form-section-hint">Название и описание, которые увидит гость.</p>

                <div className="dish-photo-field">
                  <div className="dish-photo-preview">
                    {imageUrlValue ? (
                      <img src={imageUrlValue} alt="" />
                    ) : (
                      <span className="dish-photo-placeholder">
                        <PhotoIcon />
                      </span>
                    )}
                  </div>
                  <div className="dish-photo-input">
                    <span>Фото блюда</span>
                    <div className="dish-photo-actions">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept={ALLOWED_PHOTO_TYPES.join(',')}
                        className="dish-photo-file-input"
                        onChange={(e) => handlePhotoFileChange(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        aria-busy={photoUploading}
                      >
                        {photoUploading ? 'Загрузка…' : 'Выбрать фото'}
                      </button>
                      {imageUrlValue && (
                        <button
                          type="button"
                          className="dish-photo-remove"
                          onClick={() => setValue('imageUrl', '', { shouldDirty: true })}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <label className="dish-field">
                      <span className="dish-field-hint">Или вставьте прямую ссылку на изображение</span>
                      <input placeholder="https://…" {...register('imageUrl')} />
                      {errors.imageUrl && <span className="dish-field-error">{errors.imageUrl.message}</span>}
                      {photoUploadError && <span className="dish-field-error">{photoUploadError}</span>}
                    </label>
                  </div>
                </div>

                <label className="dish-field">
                  <span>Название</span>
                  <input {...register('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'dish-name-error' : undefined} />
                  {errors.name && (
                    <span className="dish-field-error" id="dish-name-error">
                      {errors.name.message}
                    </span>
                  )}
                </label>

                <div className="dish-field-row">
                  <label className="dish-field">
                    <span>Категория</span>
                    <select {...categoryField} aria-invalid={Boolean(errors.categoryId)}>
                      {categoryOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value={CREATE_NEW_CATEGORY_VALUE}>+ Создать новую категорию</option>
                    </select>
                    {errors.categoryId && <span className="dish-field-error">{errors.categoryId.message}</span>}
                  </label>
                  <label className="dish-field">
                    <span>Тип</span>
                    <select {...register('type')}>
                      {DISH_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {showNewCategory && (
                  <div className="dish-field">
                    <form className="dish-inline-row" onSubmit={submitNewCategory}>
                      <input
                        className="dish-inline-input"
                        placeholder="Название категории"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn-primary btn-sm" disabled={newCategoryBusy || !newCategoryName.trim()}>
                        Добавить
                      </button>
                      <button type="button" className="btn-ghost btn-sm" onClick={cancelNewCategory} disabled={newCategoryBusy}>
                        Отмена
                      </button>
                    </form>
                    {newCategoryError && <span className="dish-field-error">{newCategoryError}</span>}
                  </div>
                )}

                <label className="dish-field">
                  <span>Описание</span>
                  <textarea rows={3} {...register('description')} />
                  {errors.description && <span className="dish-field-error">{errors.description.message}</span>}
                </label>
              </section>

              <section className="dish-form-section">
                <h3 className="dish-form-section-title">Цена и приготовление</h3>
                <p className="dish-form-section-hint">Стоимость для гостя и время подачи на кухне.</p>

                <div className="dish-field-row">
                  <label className="dish-field">
                    <span>Цена</span>
                    <div className="dish-input-suffix">
                      <input type="number" step="0.01" {...register('price')} />
                      <span>TJS</span>
                    </div>
                    {errors.price && <span className="dish-field-error">{errors.price.message}</span>}
                  </label>
                  {showCostPrice && (
                    <label className="dish-field">
                      <span>Себестоимость</span>
                      <div className="dish-input-suffix">
                        <input type="number" step="0.01" {...register('costPrice')} />
                        <span>TJS</span>
                      </div>
                      {errors.costPrice && <span className="dish-field-error">{errors.costPrice.message}</span>}
                    </label>
                  )}
                </div>

                {margin && (
                  <p className="dish-margin">
                    Маржа: {currencyFormatter.format(margin.marginValue)} · {margin.marginPercent.toFixed(0)}%
                  </p>
                )}

                <div className="dish-field-row">
                  <label className="dish-field">
                    <span>Время приготовления</span>
                    <div className="dish-input-suffix">
                      <input type="number" {...register('cookingTimeMinutes')} />
                      <span>мин</span>
                    </div>
                    {errors.cookingTimeMinutes && <span className="dish-field-error">{errors.cookingTimeMinutes.message}</span>}
                  </label>
                  <label className="dish-field">
                    <span>Калории</span>
                    <div className="dish-input-suffix">
                      <input type="number" {...register('calories')} />
                      <span>ккал</span>
                    </div>
                  </label>
                </div>
              </section>

              <section className="dish-form-section">
                <h3 className="dish-form-section-title">Доступность</h3>

                <Switch
                  checked={isAvailableValue}
                  onChange={(checked) => setValue('isAvailable', checked, { shouldDirty: true })}
                  label="Доступно для заказа"
                  description="Гости могут добавить блюдо в заказ."
                  id="dish-is-available"
                />
                <Switch
                  checked={isSeasonalValue}
                  onChange={(checked) => setValue('isSeasonal', checked, { shouldDirty: true })}
                  label="Сезонное блюдо"
                  description="Используется для временных предложений."
                  id="dish-is-seasonal"
                />

                <label className="dish-field">
                  <span>Статус</span>
                  <select {...register('status')}>
                    {DISH_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="dish-form-section">
                <button
                  type="button"
                  className="dish-form-collapsible-toggle"
                  onClick={() => setShowAdditional((v) => !v)}
                  aria-expanded={showAdditional}
                >
                  Дополнительные параметры
                  <ChevronDownIcon open={showAdditional} />
                </button>
                {showAdditional && (
                  <label className="dish-field">
                    <span>Состав / ингредиенты</span>
                    <textarea rows={3} {...register('ingredientsDescription')} />
                    {errors.ingredientsDescription && <span className="dish-field-error">{errors.ingredientsDescription.message}</span>}
                  </label>
                )}
              </section>

              {serverError && (
                <div className="dish-form-banner" role="alert">
                  {serverError}
                </div>
              )}
            </div>

            <div className="drawer-footer">
              <span className="drawer-footer-status">{isDirty ? 'Есть несохранённые изменения' : ''}</span>
              <div className="drawer-footer-actions">
                <button type="button" className="btn-secondary" onClick={attemptClose} disabled={busy}>
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy || showNewCategory || photoUploading}
                  aria-busy={busy}
                >
                  {busy ? 'Сохранение…' : dish ? 'Сохранить изменения' : 'Создать блюдо'}
                </button>
              </div>
            </div>
          </form>

          <aside className="dish-preview-pane">
            <DishLivePreview control={control} categories={categoryOptions} />
          </aside>
        </div>
      </div>

      {showUnsavedConfirm && (
        <ConfirmModal
          title="Закрыть без сохранения?"
          message="Внесённые изменения будут потеряны."
          confirmLabel="Закрыть"
          cancelLabel="Продолжить редактирование"
          tone="danger"
          onCancel={() => setShowUnsavedConfirm(false)}
          onConfirm={() => {
            setShowUnsavedConfirm(false);
            onCancel();
          }}
        />
      )}
    </div>
  );
}
