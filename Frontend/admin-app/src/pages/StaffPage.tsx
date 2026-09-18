import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  createStaffMember,
  dismissStaffMember,
  getStaff,
  getStaffAdmin,
  updateStaffMember,
  type StaffFormValues,
  type StaffMember,
} from '../api/staffApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import { StaffFormModal } from './StaffFormModal';
import './crud.css';
import './StaffPage.css';

const STAFF_QUERY_KEY = ['staff-members'];

const ROLE_LABEL: Record<number, string> = {
  1: 'Администратор',
  2: 'Управляющий',
  3: 'Официант',
  4: 'Кассир',
  5: 'Кухня',
};

const STATUS_META: Record<number, { label: string; tone: 'good' | 'warn' | 'cancel' }> = {
  1: { label: 'Активен', tone: 'good' },
  2: { label: 'В отпуске', tone: 'warn' },
  3: { label: 'Отстранён', tone: 'warn' },
  4: { label: 'Уволен', tone: 'cancel' },
};

const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

export function StaffPage() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes('Admin');

  const [search, setSearch] = useState('');
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [dismissTarget, setDismissTarget] = useState<StaffMember | null>(null);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const staffQuery = useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: () => (isAdmin ? getStaffAdmin({ pageSize: 100 }) : getStaff({ pageSize: 100 })),
  });

  const staffList = useMemo(() => staffQuery.data?.items ?? [], [staffQuery.data]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staffList;
    return staffList.filter(
      (s) => s.fullName.toLowerCase().includes(term) || (s.email ?? '').toLowerCase().includes(term),
    );
  }, [staffList, search]);

  const createMutation = useMutation({
    mutationFn: (values: StaffFormValues) => createStaffMember(values),
    onSuccess: () => {
      setShowCreateForm(false);
      setFormServerError(null);
      void queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      pushToast('Сотрудник добавлен.');
    },
    onError: (error) => setFormServerError(errorMessage(error, 'Не удалось добавить сотрудника.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: StaffFormValues }) => updateStaffMember(id, values),
    onSuccess: () => {
      setEditingStaff(null);
      setFormServerError(null);
      void queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      pushToast('Изменения сохранены.');
    },
    onError: (error) => setFormServerError(errorMessage(error, 'Не удалось сохранить изменения.')),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => dismissStaffMember(id),
    onSuccess: () => {
      setDismissTarget(null);
      void queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      pushToast('Сотрудник уволен.');
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось уволить сотрудника.'), { variant: 'error' }),
  });

  if (staffQuery.isLoading) {
    return (
      <div className="staff-page">
        <Skeleton height={44} />
        <Skeleton height={280} />
      </div>
    );
  }

  if (staffQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить сотрудников." onRetry={() => staffQuery.refetch()} />;
  }

  return (
    <div className="staff-page">
      <div className="crud-toolbar">
        <input
          className="crud-search"
          placeholder="Поиск по имени или email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isAdmin && (
          <button type="button" className="crud-add-btn" onClick={() => setShowCreateForm(true)}>
            + Добавить сотрудника
          </button>
        )}
      </div>

      {/* Note: this creates only the HR record (StaffMember). It does not create a login —
          that's AuthController.Register (Admin-only, requires an existing Admin session)
          and is a separate concern this screen doesn't touch. */}
      {!isAdmin && (
        <p className="dashboard-empty">
          Только администратор может добавлять, редактировать и увольнять сотрудников — вам доступен только просмотр.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="dashboard-empty">Сотрудников не найдено.</p>
      ) : (
        <div className="staff-table">
          <div className="staff-table-head">
            <span>Сотрудник</span>
            <span>Роль</span>
            <span>Статус</span>
            <span>Заказов</span>
            <span>Чаевые</span>
            {isAdmin && <span>Зарплата</span>}
            <span>Нанят</span>
            <span />
          </div>
          {filtered.map((member) => {
            const statusMeta = STATUS_META[member.status] ?? { label: '—', tone: 'good' as const };
            return (
              <div className="staff-table-row" key={member.id}>
                <span className="staff-name-cell">
                  <span className="staff-name">{member.fullName}</span>
                  <span className="staff-contact">{member.email ?? member.phone ?? '—'}</span>
                </span>
                <span>{ROLE_LABEL[member.role] ?? '—'}</span>
                <span className={`staff-status staff-status--${statusMeta.tone}`}>{statusMeta.label}</span>
                <span>{member.ordersCount}</span>
                <span>{currencyFormatter.format(member.totalTips)}</span>
                {isAdmin && <span>{member.salary != null ? currencyFormatter.format(member.salary) : '—'}</span>}
                <span>{dateFormatter.format(new Date(member.hireDate))}</span>
                <span className="staff-row-actions">
                  {isAdmin && (
                    <>
                      <button type="button" onClick={() => setEditingStaff(member)}>
                        Изменить
                      </button>
                      {member.status !== 4 && (
                        <button type="button" className="crud-danger-btn" onClick={() => setDismissTarget(member)}>
                          Уволить
                        </button>
                      )}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showCreateForm && (
        <StaffFormModal
          staff={null}
          showSalary={isAdmin}
          busy={createMutation.isPending}
          serverError={formServerError}
          onCancel={() => {
            setShowCreateForm(false);
            setFormServerError(null);
          }}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      )}

      {editingStaff && (
        <StaffFormModal
          staff={editingStaff}
          showSalary={isAdmin}
          busy={updateMutation.isPending}
          serverError={formServerError}
          onCancel={() => {
            setEditingStaff(null);
            setFormServerError(null);
          }}
          onSubmit={(values) => updateMutation.mutate({ id: editingStaff.id, values })}
        />
      )}

      {dismissTarget && (
        <ConfirmModal
          title={`Уволить «${dismissTarget.fullName}»?`}
          message="Статус сотрудника изменится на «Уволен», историю заказов и чаевых это не затронет."
          confirmLabel="Уволить"
          tone="danger"
          busy={dismissMutation.isPending}
          onCancel={() => setDismissTarget(null)}
          onConfirm={() => dismissMutation.mutate(dismissTarget.id)}
        />
      )}
    </div>
  );
}
