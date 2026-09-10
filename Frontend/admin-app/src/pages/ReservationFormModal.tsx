import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CafeTable, ReservationFormValues } from '../api/reservationsApi';
import './crud.css';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

function defaultReservedAt(): string {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
  inOneHour.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${inOneHour.getFullYear()}-${pad(inOneHour.getMonth() + 1)}-${pad(inOneHour.getDate())}T${pad(inOneHour.getHours())}:00`;
}

// Mirrors ReservationService's private ValidateAsync (Backend/src/Application/Services/
// ReservationService.cs) for everything that can be checked without a DB round trip.
// Table-capacity and slot-conflict checks are inherently server-side (need the selected
// table's seat count / other bookings) and land in the root-level banner on submit.
const reservationSchema = z
  .object({
    cafeTableId: z.coerce.number().int().min(1, 'Выберите стол'),
    customerName: z.string().trim().min(1, 'Укажите имя гостя').max(150, 'Максимум 150 символов'),
    phone: z.string().max(30, 'Максимум 30 символов').optional(),
    guestsCount: z.coerce.number().int().positive('Должно быть больше нуля'),
    reservedAt: z.string().min(1, 'Укажите дату и время'),
    reservedUntil: z.preprocess(emptyToUndefined, z.string().optional()),
    note: z.string().max(500, 'Максимум 500 символов').optional(),
  })
  .refine((data) => new Date(data.reservedAt).getTime() > Date.now(), {
    message: 'Время брони должно быть в будущем',
    path: ['reservedAt'],
  })
  .refine(
    (data) => !data.reservedUntil || new Date(data.reservedUntil).getTime() > new Date(data.reservedAt).getTime(),
    { message: 'Должно быть позже времени начала', path: ['reservedUntil'] },
  );

type ReservationFormInput = z.input<typeof reservationSchema>;
type ReservationFormOutput = z.output<typeof reservationSchema>;

interface ReservationFormModalProps {
  tables: CafeTable[];
  busy: boolean;
  serverError: string | null;
  onSubmit: (values: ReservationFormValues) => void;
  onCancel: () => void;
}

export function ReservationFormModal({ tables, busy, serverError, onCancel, onSubmit }: ReservationFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReservationFormInput, unknown, ReservationFormOutput>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      cafeTableId: tables[0]?.id ?? 0,
      guestsCount: 2,
      reservedAt: defaultReservedAt(),
    },
  });

  const selectedTableId = Number(watch('cafeTableId'));
  const selectedTable = tables.find((t) => t.id === selectedTableId);

  const submit = handleSubmit((values) => {
    onSubmit({
      ...values,
      phone: values.phone || undefined,
      reservedUntil: values.reservedUntil || undefined,
      note: values.note || undefined,
    });
  });

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal-card crud-form-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">Новая бронь</div>

        <form className="crud-form" onSubmit={submit} noValidate>
          <label className="crud-form-field">
            <span>Стол</span>
            <select {...register('cafeTableId')}>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Стол {t.tableNumber} · {t.seatsCount} мест{t.location ? ` · ${t.location}` : ''}
                </option>
              ))}
            </select>
            {errors.cafeTableId && <span className="crud-form-error">{errors.cafeTableId.message}</span>}
          </label>

          <label className="crud-form-field">
            <span>Имя гостя</span>
            <input {...register('customerName')} />
            {errors.customerName && <span className="crud-form-error">{errors.customerName.message}</span>}
          </label>

          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>Телефон</span>
              <input {...register('phone')} />
              {errors.phone && <span className="crud-form-error">{errors.phone.message}</span>}
            </label>
            <label className="crud-form-field">
              <span>Гостей{selectedTable ? ` (мест за столом: ${selectedTable.seatsCount})` : ''}</span>
              <input type="number" {...register('guestsCount')} />
              {errors.guestsCount && <span className="crud-form-error">{errors.guestsCount.message}</span>}
            </label>
          </div>

          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>Начало брони</span>
              <input type="datetime-local" {...register('reservedAt')} />
              {errors.reservedAt && <span className="crud-form-error">{errors.reservedAt.message}</span>}
            </label>
            <label className="crud-form-field">
              <span>Окончание (опционально)</span>
              <input type="datetime-local" {...register('reservedUntil')} />
              {errors.reservedUntil && <span className="crud-form-error">{errors.reservedUntil.message}</span>}
            </label>
          </div>

          <label className="crud-form-field">
            <span>Заметка</span>
            <textarea rows={2} {...register('note')} />
            {errors.note && <span className="crud-form-error">{errors.note.message}</span>}
          </label>

          {serverError && <div className="crud-form-banner">{serverError}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn-ghost" onClick={onCancel} disabled={busy}>
              Отмена
            </button>
            <button type="submit" className="modal-btn modal-btn-primary" disabled={busy}>
              Забронировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
