import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StaffRole } from '@cafe/shared';
import { useAuth } from '../auth/AuthContext';
import {
  cancelReservation,
  createReservation,
  getCafeTables,
  getReservations,
  type Reservation,
  type ReservationFormValues,
} from '../api/reservationsApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import { ReservationFormModal } from './ReservationFormModal';
import './crud.css';
import './ReservationsPage.css';

const RESERVATIONS_QUERY_KEY = ['reservations'];

const STATUS_META: Record<number, { label: string; tone: 'new' | 'good' | 'warn' | 'cancel' }> = {
  1: { label: 'Ожидает', tone: 'new' },
  2: { label: 'Подтверждена', tone: 'good' },
  3: { label: 'Гости на месте', tone: 'good' },
  4: { label: 'Завершена', tone: 'good' },
  5: { label: 'Отменена', tone: 'cancel' },
  6: { label: 'Не пришли', tone: 'warn' },
};

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const VIEW_ROLES: StaffRole[] = ['Admin', 'Manager', 'Waiter', 'Cashier'];
const CANCEL_ROLES: StaffRole[] = ['Admin', 'Manager', 'Waiter'];

export function ReservationsPage() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const canView = VIEW_ROLES.some((r) => roles.includes(r));
  const canCancel = CANCEL_ROLES.some((r) => roles.includes(r));

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const tablesQuery = useQuery({ queryKey: ['cafe-tables'], queryFn: getCafeTables, enabled: canView });
  const reservationsQuery = useQuery({
    queryKey: RESERVATIONS_QUERY_KEY,
    queryFn: () => getReservations({ pageSize: 100 }),
    enabled: canView,
    refetchInterval: 30_000,
  });

  const tables = useMemo(() => tablesQuery.data?.items ?? [], [tablesQuery.data]);
  const reservations = useMemo(() => {
    const items = reservationsQuery.data?.items ?? [];
    return [...items].sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime());
  }, [reservationsQuery.data]);

  const createMutation = useMutation({
    mutationFn: (values: ReservationFormValues) => createReservation(values),
    onSuccess: () => {
      setShowCreateForm(false);
      setFormServerError(null);
      void queryClient.invalidateQueries({ queryKey: RESERVATIONS_QUERY_KEY });
      pushToast('Бронь создана.');
    },
    onError: (error) => setFormServerError(errorMessage(error, 'Не удалось создать бронь.')),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelReservation(id),
    onSuccess: () => {
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: RESERVATIONS_QUERY_KEY });
      pushToast('Бронь отменена.');
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось отменить бронь.'), { variant: 'error' }),
  });

  if (!canView) {
    return (
      <p className="dashboard-empty">
        Бронирования доступны администраторам, управляющим, официантам и кассирам — у вашей роли нет доступа к этому
        разделу.
      </p>
    );
  }

  if (reservationsQuery.isLoading || tablesQuery.isLoading) {
    return (
      <div className="reservations-page">
        <Skeleton height={44} />
        <Skeleton height={280} />
      </div>
    );
  }

  if (reservationsQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить брони." onRetry={() => reservationsQuery.refetch()} />;
  }
  if (tablesQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить столы." onRetry={() => tablesQuery.refetch()} />;
  }

  return (
    <div className="reservations-page">
      <div className="crud-toolbar">
        <div />
        <button type="button" className="crud-add-btn" onClick={() => setShowCreateForm(true)}>
          + Новая бронь
        </button>
      </div>

      {reservations.length === 0 ? (
        <p className="dashboard-empty">Броней пока нет.</p>
      ) : (
        <div className="reservations-table">
          <div className="reservations-table-head">
            <span>Гость</span>
            <span>Стол</span>
            <span>Гостей</span>
            <span>Время</span>
            <span>Статус</span>
            <span />
          </div>
          {reservations.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: '—', tone: 'new' as const };
            const cancellable = canCancel && (r.status === 1 || r.status === 2);
            return (
              <div className="reservations-table-row" key={r.id}>
                <span className="reservation-guest-cell">
                  <span className="reservation-guest-name">{r.customerName}</span>
                  {r.phone && <span className="reservation-guest-phone">{r.phone}</span>}
                </span>
                <span>Стол {r.tableNumber}</span>
                <span>{r.guestsCount}</span>
                <span>{dateTimeFormatter.format(new Date(r.reservedAt))}</span>
                <span className={`reservation-status reservation-status--${meta.tone}`}>{meta.label}</span>
                <span className="reservation-row-actions">
                  {cancellable && (
                    <button type="button" className="crud-danger-btn" onClick={() => setCancelTarget(r)}>
                      Отменить
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showCreateForm && (
        <ReservationFormModal
          tables={tables}
          busy={createMutation.isPending}
          serverError={formServerError}
          onCancel={() => {
            setShowCreateForm(false);
            setFormServerError(null);
          }}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      )}

      {cancelTarget && (
        <ConfirmModal
          title={`Отменить бронь «${cancelTarget.customerName}»?`}
          message={`Стол ${cancelTarget.tableNumber} освободится на выбранное время.`}
          confirmLabel="Отменить бронь"
          tone="danger"
          busy={cancelMutation.isPending}
          onCancel={() => setCancelTarget(null)}
          onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
        />
      )}
    </div>
  );
}
