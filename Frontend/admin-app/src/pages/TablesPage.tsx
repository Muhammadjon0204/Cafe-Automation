import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { PagedData, StaffRole } from '@cafe/shared';
import { useAuth } from '../auth/AuthContext';
import { createOrder, getOrders } from '../api/ordersApi';
import { createReservation, getReservations, seatReservation, type ReservationFormValues } from '../api/reservationsApi';
import {
  createTable,
  createZone,
  deleteTable,
  deleteZone,
  getTables,
  getZones,
  removeZoneBackground,
  updateTable,
  updateTableLayout,
  updateTableStatus,
  updateZone,
  uploadZoneBackground,
  type CafeTableLayout,
  type Zone,
  type ZoneFormValues,
} from '../api/tablesApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { pushToast } from '../components/toast/toastBus';
import { errorMessage } from '../lib/errorMessage';
import { ROUTES } from '../routes/routePaths';
import { ReservationFormModal } from './ReservationFormModal';
import { EditorBanner } from './tables/EditorBanner';
import { EditorToolbar } from './tables/EditorToolbar';
import { FloorCanvas } from './tables/FloorCanvas';
import { QuickOrderFormModal } from './tables/QuickOrderFormModal';
import { StatusFilterDropdown, type StatusFilterValue } from './tables/StatusFilterDropdown';
import { StatusLegend } from './tables/StatusLegend';
import { PencilIcon } from './tables/tableIcons';
import { TableFormModal, type TableFormValues } from './tables/TableFormModal';
import { TableSidePanel } from './tables/TableSidePanel';
import { useIsDarkMode } from './tables/useIsDarkMode';
import { useIsDesktop } from './tables/useIsDesktop';
import { ZoneManagerModal } from './tables/ZoneManagerModal';
import { ZoneTabs, type ZoneTabKey } from './tables/ZoneTabs';
import './TablesPage.css';

const VIEW_ROLES: StaffRole[] = ['Admin', 'Manager', 'Waiter', 'Cashier'];
// Excludes Cashier, mirroring ReservationsPage's CANCEL_ROLES — matches the backend's
// AdminManagerWaiter authorization on POST /orders and PATCH /cafe-tables/{id}/status.
const CREATE_ROLES: StaffRole[] = ['Admin', 'Manager', 'Waiter'];
const TABLE_STATUS = { Free: 1, Occupied: 2, Reserved: 3, Cleaning: 4 } as const;
const TABLES_QUERY_KEY = ['tables'];
const ZONES_QUERY_KEY = ['zones'];

interface TableFormState {
  table: CafeTableLayout | null;
  position: { x: number; y: number };
}

function emptyStateCopy(activeTab: ZoneTabKey, zones: Zone[], editing: boolean, statusFiltered: boolean): string {
  if (statusFiltered) return 'Нет столов с выбранным статусом.';
  if (activeTab === 'all') return editing ? 'Столов пока нет. Нажмите «+ Добавить стол».' : 'Столов пока нет.';
  if (activeTab === 'unzoned') return 'Все столы закреплены за зонами.';
  const zone = zones.find((z) => z.id === activeTab);
  return zone ? `В зоне «${zone.name}» пока нет столов.` : 'В этой зоне пока нет столов.';
}

export function TablesPage() {
  const { roles, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canView = VIEW_ROLES.some((r) => roles.includes(r));
  const canCreate = CREATE_ROLES.some((r) => roles.includes(r));
  const isAdmin = roles.includes('Admin');
  const isDark = useIsDarkMode();
  const isDesktop = useIsDesktop();

  const [mode, setMode] = useState<'live' | 'editor'>('live');
  const [activeTab, setActiveTab] = useState<ZoneTabKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [addArmed, setAddArmed] = useState(false);
  const [formState, setFormState] = useState<TableFormState | null>(null);
  const [formServerError, setFormServerError] = useState<string | null>(null);
  const [deleteTableTarget, setDeleteTableTarget] = useState<CafeTableLayout | null>(null);
  const [zoneManagerOpen, setZoneManagerOpen] = useState(false);
  const [zoneFormError, setZoneFormError] = useState<string | null>(null);
  const [zoneBackgroundError, setZoneBackgroundError] = useState<string | null>(null);
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<Zone | null>(null);
  const [quickOrderTarget, setQuickOrderTarget] = useState<CafeTableLayout | null>(null);
  const [quickOrderError, setQuickOrderError] = useState<string | null>(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationFormError, setReservationFormError] = useState<string | null>(null);

  const tablesQuery = useQuery({
    queryKey: TABLES_QUERY_KEY,
    queryFn: getTables,
    enabled: canView,
    // Realtime hub (AppShell) is the primary update path now — this interval is just a
    // safety net for a dropped/reconnecting connection.
    refetchInterval: 60_000,
  });
  const zonesQuery = useQuery({ queryKey: ZONES_QUERY_KEY, queryFn: getZones, enabled: canView });

  const tables = useMemo(() => tablesQuery.data?.items ?? [], [tablesQuery.data]);
  const zones = useMemo(() => zonesQuery.data ?? [], [zonesQuery.data]);
  const selectedTable = useMemo(() => tables.find((t) => t.id === selectedTableId) ?? null, [tables, selectedTableId]);

  const isPanelOpen = mode === 'live' && selectedTable !== null;
  const ordersByTableQuery = useQuery({
    queryKey: ['orders', 'by-table', selectedTable?.id],
    queryFn: () => getOrders({ cafeTableId: selectedTable!.id, pageSize: 5 }),
    enabled: isPanelOpen && selectedTable?.status === TABLE_STATUS.Occupied,
  });
  const reservationsByTableQuery = useQuery({
    queryKey: ['reservations', 'by-table', selectedTable?.id],
    queryFn: () => getReservations({ cafeTableId: selectedTable!.id, pageSize: 5 }),
    enabled: isPanelOpen && selectedTable?.status === TABLE_STATUS.Reserved,
  });

  // At most one non-Closed/non-Cancelled order should exist per occupied table (the
  // backend's create-guard requires Free/Reserved before a new dine-in order), but filter
  // defensively rather than assume the invariant holds.
  const activeOrder = useMemo(() => {
    const items = ordersByTableQuery.data?.items ?? [];
    return items.find((o) => o.status !== 6 && o.status !== 7) ?? items[0] ?? null;
  }, [ordersByTableQuery.data]);
  const tableReservations = useMemo(() => reservationsByTableQuery.data?.items ?? [], [reservationsByTableQuery.data]);

  const visibleTables = useMemo(() => {
    let result = tables;
    if (activeTab === 'unzoned') result = result.filter((t) => t.zoneId == null);
    else if (activeTab !== 'all') result = result.filter((t) => t.zoneId === activeTab);
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);
    return result;
  }, [tables, activeTab, statusFilter]);

  // The floor illustration belongs to one zone — "Все"/"Без зоны" mix tables from
  // several (or no) zones, so there's no single coherent background to show for them.
  const activeZoneBackground = typeof activeTab === 'number' ? (zones.find((z) => z.id === activeTab)?.backgroundImageUrl ?? null) : null;

  const exitEditor = () => {
    setMode('live');
    setAddArmed(false);
    setSelectedTableId(null);
  };

  // Editor mode needs precise pointer-drag that isn't practical on a narrow/touch
  // viewport — force back to Live mode if the window shrinks below desktop width
  // while editing (e.g. a laptop window resize), rather than leaving a half-usable UI.
  useEffect(() => {
    if (!isDesktop) {
      setMode('live');
      setAddArmed(false);
      setSelectedTableId(null);
    }
  }, [isDesktop]);

  const handleEditorTableClick = (table: CafeTableLayout) => {
    setSelectedTableId(table.id);
    setAddArmed(false);
  };

  const handleLiveTableClick = (table: CafeTableLayout) => {
    setSelectedTableId(table.id);
  };

  const closeSidePanel = () => {
    setSelectedTableId(null);
    setQuickOrderTarget(null);
    setQuickOrderError(null);
    setShowReservationForm(false);
    setReservationFormError(null);
  };

  const saveTableMutation = useMutation({
    mutationFn: async ({ table, values, position }: { table: CafeTableLayout | null; values: TableFormValues; position: { x: number; y: number } }) => {
      if (table) {
        await updateTable(table.id, {
          tableNumber: values.tableNumber,
          seatsCount: values.seatsCount,
          status: table.status,
          location: table.location,
          note: table.note,
        });
        return updateTableLayout(table.id, {
          positionX: table.positionX,
          positionY: table.positionY,
          width: values.width,
          height: values.height,
          shape: values.shape,
          zoneId: values.zoneId,
        });
      }
      return createTable({
        tableNumber: values.tableNumber,
        seatsCount: values.seatsCount,
        shape: values.shape,
        width: values.width,
        height: values.height,
        zoneId: values.zoneId,
        positionX: position.x,
        positionY: position.y,
      });
    },
    onSuccess: (_data, variables) => {
      setFormState(null);
      setFormServerError(null);
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      pushToast(variables.table ? 'Изменения сохранены.' : 'Стол добавлен.');
    },
    onError: (error) => setFormServerError(errorMessage(error, 'Не удалось сохранить стол.')),
  });

  const dragLayoutMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: Parameters<typeof updateTableLayout>[1] }) => updateTableLayout(id, values),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: TABLES_QUERY_KEY });
      const previous = queryClient.getQueryData<PagedData<CafeTableLayout>>(TABLES_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<PagedData<CafeTableLayout>>(TABLES_QUERY_KEY, {
          ...previous,
          items: previous.items.map((t) => (t.id === id ? { ...t, ...values } : t)),
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TABLES_QUERY_KEY, context.previous);
      pushToast(errorMessage(error, 'Не удалось сохранить положение стола.'), { variant: 'error' });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => deleteTable(id),
    onSuccess: () => {
      setDeleteTableTarget(null);
      setSelectedTableId(null);
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      pushToast('Стол удалён.');
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось удалить стол.'), { variant: 'error' }),
  });

  const createZoneMutation = useMutation({
    mutationFn: (values: ZoneFormValues) => createZone(values),
    onSuccess: () => {
      setZoneFormError(null);
      void queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      pushToast('Зона добавлена.');
    },
    onError: (error) => setZoneFormError(errorMessage(error, 'Не удалось создать зону.')),
  });

  const renameZoneMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: ZoneFormValues }) => updateZone(id, values),
    onSuccess: () => {
      setZoneFormError(null);
      void queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      pushToast('Зона переименована.');
    },
    onError: (error) => setZoneFormError(errorMessage(error, 'Не удалось переименовать зону.')),
  });

  const uploadZoneBackgroundMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadZoneBackground(id, file),
    onSuccess: () => {
      setZoneBackgroundError(null);
      void queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      pushToast('Фон зоны обновлён.');
    },
    onError: (error) => setZoneBackgroundError(errorMessage(error, 'Не удалось загрузить изображение.')),
  });

  const removeZoneBackgroundMutation = useMutation({
    mutationFn: (id: number) => removeZoneBackground(id),
    onSuccess: () => {
      setZoneBackgroundError(null);
      void queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      pushToast('Фон зоны убран.');
    },
    onError: (error) => setZoneBackgroundError(errorMessage(error, 'Не удалось убрать фон.')),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: ({ id, force }: { id: number; force: boolean }) => deleteZone(id, force),
    onSuccess: (_data, variables) => {
      setDeleteZoneTarget(null);
      void queryClient.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      pushToast('Зона удалена.');
      setActiveTab((prev) => (prev === variables.id ? 'all' : prev));
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось удалить зону.'), { variant: 'error' }),
  });

  const createOrderMutation = useMutation({
    mutationFn: ({ table, note }: { table: CafeTableLayout; note?: string }) =>
      createOrder({
        type: 1, // OrderType.DineIn
        cafeTableId: table.id,
        waiterId: user?.staffMemberId ?? undefined,
        createdByStaffMemberId: user?.staffMemberId ?? undefined,
        note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      pushToast('Заказ создан.');
      closeSidePanel();
    },
    onError: (error) => setQuickOrderError(errorMessage(error, 'Не удалось создать заказ.')),
  });

  const createReservationMutation = useMutation({
    mutationFn: (values: ReservationFormValues) => createReservation(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      pushToast('Бронь создана.');
      closeSidePanel();
    },
    onError: (error) => setReservationFormError(errorMessage(error, 'Не удалось создать бронь.')),
  });

  const seatReservationMutation = useMutation({
    mutationFn: (id: number) => seatReservation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      pushToast('Гость отмечен как пришедший.');
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось отметить бронь.'), { variant: 'error' }),
  });

  const markFreeMutation = useMutation({
    mutationFn: (id: number) => updateTableStatus(id, TABLE_STATUS.Free),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY });
      pushToast('Стол отмечен свободным.');
    },
    onError: (error) => pushToast(errorMessage(error, 'Не удалось изменить статус стола.'), { variant: 'error' }),
  });

  if (!canView) {
    return (
      <p className="dashboard-empty">
        Карта зала доступна администраторам, управляющим, официантам и кассирам — у вашей роли нет доступа к этому
        разделу.
      </p>
    );
  }

  if (tablesQuery.isLoading || zonesQuery.isLoading) {
    return (
      <div className="tables-page">
        <Skeleton height={44} />
        <Skeleton height={600} />
      </div>
    );
  }

  if (tablesQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить столы." onRetry={() => tablesQuery.refetch()} />;
  }
  if (zonesQuery.isError) {
    return <ErrorRetry message="Не удалось загрузить зоны." onRetry={() => zonesQuery.refetch()} />;
  }

  return (
    <div className="tables-page">
      {mode === 'editor' && <EditorBanner onExit={exitEditor} />}

      <div className="tables-page-title">
        <h1>Карта зала</h1>
        <p>Живой статус столов, брони и быстрые заказы — в одном виде.</p>
      </div>

      <div className="tables-page-header">
        <ZoneTabs zones={zones} tables={tables} activeTab={activeTab} onSelect={setActiveTab} />
        <div className="tables-page-header-actions">
          <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
          {isAdmin &&
            mode === 'live' &&
            (isDesktop ? (
              <button type="button" className="tables-mode-toggle" onClick={() => setMode('editor')}>
                <PencilIcon />
                Редактировать зал
              </button>
            ) : (
              <span className="tables-mode-toggle-disabled" title="Редактирование зала доступно только на десктопе">
                Редактирование — только на десктопе
              </span>
            ))}
        </div>
      </div>

      {mode === 'editor' && (
        <EditorToolbar
          addArmed={addArmed}
          onToggleAdd={() => {
            setAddArmed((armed) => !armed);
            setSelectedTableId(null);
          }}
          onManageZones={() => setZoneManagerOpen(true)}
          selectedTable={selectedTable}
          onEditSelected={() => selectedTable && setFormState({ table: selectedTable, position: { x: 0, y: 0 } })}
          onDeleteSelected={() => selectedTable && setDeleteTableTarget(selectedTable)}
          onClearSelection={() => setSelectedTableId(null)}
        />
      )}

      {visibleTables.length === 0 ? (
        <p className="dashboard-empty">{emptyStateCopy(activeTab, zones, mode === 'editor', statusFilter !== 'all')}</p>
      ) : (
        <div className="tables-canvas-wrap">
          <FloorCanvas
            tables={visibleTables}
            isDark={isDark}
            editing={mode === 'editor'}
            selectedTableId={selectedTableId}
            onTableClick={mode === 'editor' ? handleEditorTableClick : handleLiveTableClick}
            onTableDragEnd={(table, positionX, positionY) =>
              dragLayoutMutation.mutate({
                id: table.id,
                values: { positionX, positionY, width: table.width, height: table.height, shape: table.shape, zoneId: table.zoneId },
              })
            }
            addArmed={addArmed}
            onCanvasClick={(x, y) => {
              setAddArmed(false);
              setFormState({ table: null, position: { x, y } });
            }}
            backgroundImageUrl={activeZoneBackground}
          />
          <StatusLegend isDark={isDark} />
        </div>
      )}

      {formState && (
        <TableFormModal
          table={formState.table}
          zones={zones}
          defaultZoneId={typeof activeTab === 'number' ? activeTab : null}
          busy={saveTableMutation.isPending}
          serverError={formServerError}
          onCancel={() => {
            setFormState(null);
            setFormServerError(null);
          }}
          onSubmit={(values) => saveTableMutation.mutate({ table: formState.table, values, position: formState.position })}
        />
      )}

      {zoneManagerOpen && (
        <ZoneManagerModal
          zones={zones}
          busy={createZoneMutation.isPending || renameZoneMutation.isPending}
          serverError={zoneFormError}
          onCreate={(values) => createZoneMutation.mutate(values)}
          onRename={(id, values) => renameZoneMutation.mutate({ id, values })}
          onDelete={(zone) => setDeleteZoneTarget(zone)}
          backgroundBusy={uploadZoneBackgroundMutation.isPending || removeZoneBackgroundMutation.isPending}
          backgroundError={zoneBackgroundError}
          onUploadBackground={(id, file) => uploadZoneBackgroundMutation.mutate({ id, file })}
          onRemoveBackground={(id) => removeZoneBackgroundMutation.mutate(id)}
          onClose={() => {
            setZoneManagerOpen(false);
            setZoneFormError(null);
            setZoneBackgroundError(null);
          }}
        />
      )}

      {deleteTableTarget && (
        <ConfirmModal
          title={`Удалить стол ${deleteTableTarget.tableNumber}?`}
          message="Действие нельзя отменить."
          confirmLabel="Удалить"
          tone="danger"
          busy={deleteTableMutation.isPending}
          onCancel={() => setDeleteTableTarget(null)}
          onConfirm={() => deleteTableMutation.mutate(deleteTableTarget.id)}
        />
      )}

      {deleteZoneTarget && (
        <ConfirmModal
          title={`Удалить зону «${deleteZoneTarget.name}»?`}
          message={
            deleteZoneTarget.tablesCount > 0
              ? `${deleteZoneTarget.tablesCount} стол(ов) в этой зоне станут «Без зоны».`
              : undefined
          }
          confirmLabel="Удалить"
          tone="danger"
          busy={deleteZoneMutation.isPending}
          onCancel={() => setDeleteZoneTarget(null)}
          onConfirm={() => deleteZoneMutation.mutate({ id: deleteZoneTarget.id, force: deleteZoneTarget.tablesCount > 0 })}
        />
      )}

      {isPanelOpen && selectedTable && !quickOrderTarget && !showReservationForm && (
        <TableSidePanel
          table={selectedTable}
          canCreate={canCreate}
          order={activeOrder}
          ordersLoading={ordersByTableQuery.isLoading}
          reservations={tableReservations}
          reservationsLoading={reservationsByTableQuery.isLoading}
          seatBusy={seatReservationMutation.isPending}
          markFreeBusy={markFreeMutation.isPending}
          onCreateOrder={() => setQuickOrderTarget(selectedTable)}
          onCreateReservation={() => setShowReservationForm(true)}
          onSeatReservation={(id) => seatReservationMutation.mutate(id)}
          onMarkFree={() => markFreeMutation.mutate(selectedTable.id)}
          onOpenOrders={() => navigate(ROUTES.orders)}
          onClose={closeSidePanel}
        />
      )}

      {quickOrderTarget && (
        <QuickOrderFormModal
          table={quickOrderTarget}
          busy={createOrderMutation.isPending}
          serverError={quickOrderError}
          onCancel={() => {
            setQuickOrderTarget(null);
            setQuickOrderError(null);
          }}
          onSubmit={(note) => createOrderMutation.mutate({ table: quickOrderTarget, note })}
        />
      )}

      {showReservationForm && selectedTable && (
        <ReservationFormModal
          tables={[selectedTable]}
          busy={createReservationMutation.isPending}
          serverError={reservationFormError}
          onCancel={() => {
            setShowReservationForm(false);
            setReservationFormError(null);
          }}
          onSubmit={(values) => createReservationMutation.mutate(values)}
        />
      )}
    </div>
  );
}
