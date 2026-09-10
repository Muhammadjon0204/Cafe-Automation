import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { TABLE_SHAPE, type CafeTableLayout, type TableShapeValue, type Zone } from '../../api/tablesApi';
import '../crud.css';

const SHAPE_OPTIONS: { value: number; label: string }[] = [
  { value: TABLE_SHAPE.Rectangle, label: 'Прямоугольник' },
  { value: TABLE_SHAPE.Square, label: 'Квадрат' },
  { value: TABLE_SHAPE.Circle, label: 'Круг' },
];

// Mirrors CafeTableService's private ValidateAsync for the number/seats fields
// (Backend/src/Application/Services/CafeTableService.cs) and UpdateLayoutAsync's
// width/height range check (1-400) for the size field.
const tableFormSchema = z.object({
  tableNumber: z.coerce.number().int().positive('Номер должен быть больше нуля'),
  seatsCount: z.coerce.number().int().positive('Должно быть больше нуля').max(50, 'Максимум 50'),
  shape: z.coerce.number().int(),
  width: z.coerce.number().min(40, 'Минимум 40').max(400, 'Максимум 400'),
  height: z.coerce.number().min(40, 'Минимум 40').max(400, 'Максимум 400'),
  zoneId: z.string(),
});

type TableFormInput = z.input<typeof tableFormSchema>;
type TableFormOutput = z.output<typeof tableFormSchema>;

export interface TableFormValues {
  tableNumber: number;
  seatsCount: number;
  shape: TableShapeValue;
  width: number;
  height: number;
  zoneId: number | null;
}

interface TableFormModalProps {
  table: CafeTableLayout | null;
  zones: Zone[];
  defaultZoneId: number | null;
  busy: boolean;
  serverError: string | null;
  onSubmit: (values: TableFormValues) => void;
  onCancel: () => void;
}

export function TableFormModal({ table, zones, defaultZoneId, busy, serverError, onCancel, onSubmit }: TableFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TableFormInput, unknown, TableFormOutput>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: table
      ? {
          tableNumber: table.tableNumber,
          seatsCount: table.seatsCount,
          shape: table.shape,
          width: table.width,
          height: table.height,
          zoneId: table.zoneId != null ? String(table.zoneId) : '',
        }
      : {
          tableNumber: 1,
          seatsCount: 2,
          shape: TABLE_SHAPE.Rectangle,
          width: 80,
          height: 80,
          zoneId: defaultZoneId != null ? String(defaultZoneId) : '',
        },
  });

  const shape = Number(watch('shape'));
  const width = watch('width');
  const isRectangle = shape === TABLE_SHAPE.Rectangle;

  // Square/Circle keep Height locked to Width — the backend persists both regardless
  // of shape, but only Rectangle exposes them as independent dimensions (see the
  // Width/Height convention noted in tablesApi.ts / CafeTableLayout).
  useEffect(() => {
    if (!isRectangle) setValue('height', width);
  }, [isRectangle, width, setValue]);

  const submit = handleSubmit((values) => {
    onSubmit({
      tableNumber: values.tableNumber,
      seatsCount: values.seatsCount,
      shape: values.shape as TableShapeValue,
      width: values.width,
      height: isRectangle ? values.height : values.width,
      zoneId: values.zoneId === '' ? null : Number(values.zoneId),
    });
  });

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal-card crud-form-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">{table ? `Стол ${table.tableNumber}` : 'Новый стол'}</div>

        <form className="crud-form" onSubmit={submit} noValidate>
          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>Номер</span>
              <input type="number" {...register('tableNumber')} />
              {errors.tableNumber && <span className="crud-form-error">{errors.tableNumber.message}</span>}
            </label>
            <label className="crud-form-field">
              <span>Мест</span>
              <input type="number" {...register('seatsCount')} />
              {errors.seatsCount && <span className="crud-form-error">{errors.seatsCount.message}</span>}
            </label>
          </div>

          <label className="crud-form-field">
            <span>Форма</span>
            <select {...register('shape')}>
              {SHAPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>{isRectangle ? 'Ширина' : 'Размер'}</span>
              <input type="number" {...register('width')} />
              {errors.width && <span className="crud-form-error">{errors.width.message}</span>}
            </label>
            {isRectangle && (
              <label className="crud-form-field">
                <span>Высота</span>
                <input type="number" {...register('height')} />
                {errors.height && <span className="crud-form-error">{errors.height.message}</span>}
              </label>
            )}
          </div>

          <label className="crud-form-field">
            <span>Зона</span>
            <select {...register('zoneId')}>
              <option value="">Без зоны</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>

          {serverError && <div className="crud-form-banner">{serverError}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn-ghost" onClick={onCancel} disabled={busy}>
              Отмена
            </button>
            <button type="submit" className="modal-btn modal-btn-primary" disabled={busy}>
              {table ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
