import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { StaffFormValues, StaffMember } from '../api/staffApi';
import './crud.css';

const ROLE_OPTIONS = [
  { value: 1, label: 'Администратор' },
  { value: 2, label: 'Управляющий' },
  { value: 3, label: 'Официант' },
  { value: 4, label: 'Кассир' },
  { value: 5, label: 'Кухня' },
];

const STATUS_OPTIONS = [
  { value: 1, label: 'Активен' },
  { value: 2, label: 'В отпуске' },
  { value: 3, label: 'Отстранён' },
  { value: 4, label: 'Уволен' },
];

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

// Mirrors StaffMemberService's private ValidateAsync (Backend/src/Application/Services/
// StaffMemberService.cs) — server-only checks (email/phone uniqueness) still land in the
// root-level banner since the backend returns a message + flat string list, not
// field-keyed errors.
const staffSchema = z.object({
  firstName: z.string().trim().min(1, 'Укажите имя').max(100, 'Максимум 100 символов'),
  lastName: z.string().trim().min(1, 'Укажите фамилию').max(100, 'Максимум 100 символов'),
  middleName: z.string().max(100, 'Максимум 100 символов').optional(),
  phone: z.string().max(30, 'Максимум 30 символов').optional(),
  email: z.string().max(150, 'Максимум 150 символов').optional(),
  role: z.coerce.number().int(),
  status: z.coerce.number().int(),
  hireDate: z.string().min(1, 'Укажите дату найма'),
  salary: z.preprocess(emptyToUndefined, z.coerce.number().min(0, 'Не может быть отрицательной').optional()),
  note: z.string().max(500, 'Максимум 500 символов').optional(),
});

type StaffFormInput = z.input<typeof staffSchema>;
type StaffFormOutput = z.output<typeof staffSchema>;

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

interface StaffFormModalProps {
  staff: StaffMember | null;
  showSalary: boolean;
  busy: boolean;
  serverError: string | null;
  onSubmit: (values: StaffFormValues) => void;
  onCancel: () => void;
}

export function StaffFormModal({ staff, showSalary, busy, serverError, onCancel, onSubmit }: StaffFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffFormInput, unknown, StaffFormOutput>({
    resolver: zodResolver(staffSchema),
    defaultValues: staff
      ? {
          firstName: staff.firstName,
          lastName: staff.lastName,
          middleName: staff.middleName ?? undefined,
          phone: staff.phone ?? undefined,
          email: staff.email ?? undefined,
          role: staff.role,
          status: staff.status,
          hireDate: toDateInputValue(staff.hireDate),
          salary: staff.salary ?? undefined,
          note: staff.note ?? undefined,
        }
      : {
          role: 3,
          status: 1,
          hireDate: new Date().toISOString().slice(0, 10),
        },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      ...values,
      middleName: values.middleName || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      note: values.note || undefined,
    });
  });

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal-card crud-form-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">{staff ? `Редактировать «${staff.fullName}»` : 'Новый сотрудник'}</div>

        <form className="crud-form" onSubmit={submit} noValidate>
          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>Имя</span>
              <input {...register('firstName')} />
              {errors.firstName && <span className="crud-form-error">{errors.firstName.message}</span>}
            </label>
            <label className="crud-form-field">
              <span>Фамилия</span>
              <input {...register('lastName')} />
              {errors.lastName && <span className="crud-form-error">{errors.lastName.message}</span>}
            </label>
          </div>

          <label className="crud-form-field">
            <span>Отчество</span>
            <input {...register('middleName')} />
          </label>

          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>Телефон</span>
              <input {...register('phone')} />
              {errors.phone && <span className="crud-form-error">{errors.phone.message}</span>}
            </label>
            <label className="crud-form-field">
              <span>Email</span>
              <input type="email" {...register('email')} />
              {errors.email && <span className="crud-form-error">{errors.email.message}</span>}
            </label>
          </div>

          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>Роль</span>
              <select {...register('role')}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="crud-form-field">
              <span>Статус</span>
              <select {...register('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="crud-form-row">
            <label className="crud-form-field">
              <span>Дата найма</span>
              <input type="date" {...register('hireDate')} />
              {errors.hireDate && <span className="crud-form-error">{errors.hireDate.message}</span>}
            </label>
            {showSalary && (
              <label className="crud-form-field">
                <span>Зарплата, TJS</span>
                <input type="number" step="0.01" {...register('salary')} />
                {errors.salary && <span className="crud-form-error">{errors.salary.message}</span>}
              </label>
            )}
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
              {staff ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
