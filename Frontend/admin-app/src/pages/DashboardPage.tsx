import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { useAuth } from '../auth/AuthContext';
import {
  CloseIcon,
  MoneyIcon,
  OrdersIcon,
  ScaleIcon,
  TableIcon,
  WarningIcon,
} from '../components/icons';
import { ErrorRetry } from '../components/ErrorRetry';
import { Skeleton } from '../components/Skeleton';
import { getDashboardSummary, getRecentOrders, getTodayPayments } from '../api/dashboardApi';
import { fetchRevenueSeries, fetchWeekdayOrdersSeries, type RevenuePeriod } from './dashboardSeries';
import { ORDER_STATUS_META, minutesAgoLabel, orderItemsLabel, orderTableLabel } from '../domain/orders';
import './DashboardPage.css';

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'TJS',
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

const REVENUE_PERIODS: { id: RevenuePeriod; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
];

interface RevenueTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: string } }>;
}

function RevenueTooltip({ active, payload }: RevenueTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0];
  return (
    <div className="dashboard-chart-tooltip">
      {point.payload.label} · {formatCurrency(point.value)}
    </div>
  );
}

interface WeekdayTickProps {
  x?: number;
  y?: number;
  index?: number;
  payload?: { value: string };
  peakIndex: number;
}

function WeekdayTick({ x = 0, y = 0, index, payload, peakIndex }: WeekdayTickProps) {
  const isPeak = index === peakIndex;
  return (
    <text
      x={x}
      y={y + 14}
      textAnchor="middle"
      fontSize={11}
      fontWeight={isPeak ? 700 : 500}
      fill={isPeak ? 'var(--color-fg)' : 'var(--color-muted)'}
    >
      {payload?.value}
    </text>
  );
}

interface KpiCardProps {
  icon: ReactNode;
  iconTone: 'accent' | 'accent2' | 'accent3';
  label: string;
  value: string;
  badge: string;
  badgeTone: 'good' | 'accent' | 'warn';
}

function KpiCard({ icon, iconTone, label, value, badge, badgeTone }: KpiCardProps) {
  return (
    <div className="dashboard-kpi-card">
      <div className="dashboard-kpi-top">
        <span className={`dashboard-kpi-icon dashboard-kpi-icon--${iconTone}`}>{icon}</span>
        <span className={`dashboard-kpi-badge dashboard-kpi-badge--${badgeTone}`}>{badge}</span>
      </div>
      <div className="dashboard-kpi-value">{value}</div>
      <div className="dashboard-kpi-label">{label}</div>
    </div>
  );
}

function KpiSkeletons() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div className="dashboard-kpi-card is-loading skeleton" key={i} aria-hidden="true" />
      ))}
    </>
  );
}

export function DashboardPage() {
  const { user, roles } = useAuth();
  const isManager = roles.includes('Admin') || roles.includes('Manager');

  const [period, setPeriod] = useState<RevenuePeriod>('week');
  const [alertDismissed, setAlertDismissed] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    enabled: isManager,
    refetchInterval: 60_000,
  });
  const paymentsQuery = useQuery({
    queryKey: ['dashboard-payments-today'],
    queryFn: getTodayPayments,
    enabled: isManager,
    refetchInterval: 60_000,
  });
  const recentOrdersQuery = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () => getRecentOrders(6),
    refetchInterval: 30_000,
  });
  const revenueQuery = useQuery({
    queryKey: ['dashboard-revenue', period],
    queryFn: () => fetchRevenueSeries(period),
    enabled: isManager,
    staleTime: 60_000,
  });
  const weekdayQuery = useQuery({
    queryKey: ['dashboard-weekday-orders'],
    queryFn: fetchWeekdayOrdersSeries,
    enabled: isManager,
    staleTime: 60_000,
  });

  const summary = summaryQuery.data;
  const payments = paymentsQuery.data;
  const recentOrders = useMemo(() => recentOrdersQuery.data?.items ?? [], [recentOrdersQuery.data]);

  const today = useMemo(() => {
    const formatted = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  const revenueSeries = useMemo(() => revenueQuery.data ?? [], [revenueQuery.data]);
  const weekdaySeries = useMemo(() => weekdayQuery.data ?? [], [weekdayQuery.data]);
  const weekdayPeakIndex = useMemo(
    () => weekdaySeries.reduce((peak, day, i, arr) => (day.value > arr[peak].value ? i : peak), 0),
    [weekdaySeries],
  );

  const alerts = useMemo(() => {
    if (!summary) return [];
    const items: string[] = [];
    if (summary.cancelledOrders > 0) {
      items.push(`Сегодня отменено заказов: ${summary.cancelledOrders}`);
    }
    if (summary.totalTables > 0 && summary.freeTables === 0) {
      items.push('Все столы заняты — новых гостей рассадить некуда');
    }
    return items;
  }, [summary]);

  const kpis: KpiCardProps[] = summary
    ? [
        {
          icon: <MoneyIcon />,
          iconTone: 'accent',
          label: 'Выручка сегодня',
          value: formatCurrency(summary.totalRevenueToday),
          badge: `${summary.closedOrders} закрыто`,
          badgeTone: 'good',
        },
        {
          icon: <OrdersIcon />,
          iconTone: 'accent2',
          label: 'Заказов сегодня',
          value: String(summary.totalOrdersToday),
          badge: `${summary.activeOrders} активных`,
          badgeTone: 'accent',
        },
        {
          icon: <ScaleIcon />,
          iconTone: 'accent3',
          label: 'Средний чек',
          value: summary.closedOrders > 0 ? formatCurrency(summary.totalRevenueToday / summary.closedOrders) : '—',
          badge: summary.cancelledOrders > 0 ? `${summary.cancelledOrders} отменено` : 'без отмен',
          badgeTone: summary.cancelledOrders > 0 ? 'warn' : 'good',
        },
        {
          icon: <TableIcon />,
          iconTone: 'accent',
          label: 'Столы',
          value: `${summary.occupiedTables} / ${summary.totalTables}`,
          badge: `${summary.freeTables} свободно`,
          badgeTone: 'good',
        },
      ]
    : [];

  const paymentRows = useMemo(() => {
    if (!payments || payments.grandTotal <= 0) return [];
    return [
      { label: 'Карта', value: payments.cardTotal },
      { label: 'Наличные', value: payments.cashTotal },
      { label: 'Онлайн', value: payments.onlineTotal },
      { label: 'Смешанная', value: payments.mixedTotal },
    ]
      .filter((row) => row.value > 0)
      .map((row) => ({ ...row, pct: Math.round((row.value / payments.grandTotal) * 100) }));
  }, [payments]);

  return (
    <div className="dashboard">
      <div className="dashboard-greeting">
        <h1>Здравствуйте, {user?.fullName.split(' ')[0] ?? ''}</h1>
        <p>{today}</p>
      </div>

      {isManager && alerts.length > 0 && !alertDismissed && (
        <div className="dashboard-alert">
          <span className="dashboard-alert-icon">
            <WarningIcon />
          </span>
          <div className="dashboard-alert-body">
            <div className="dashboard-alert-title">Требует внимания</div>
            <div className="dashboard-alert-text">{alerts.join(' · ')}</div>
          </div>
          <button type="button" className="dashboard-alert-close" onClick={() => setAlertDismissed(true)} aria-label="Скрыть">
            <CloseIcon />
          </button>
        </div>
      )}

      {isManager && (
        <div className="dashboard-kpi-grid">
          {summaryQuery.isLoading ? (
            <KpiSkeletons />
          ) : summaryQuery.isError ? (
            <ErrorRetry message="Не удалось загрузить показатели." onRetry={() => summaryQuery.refetch()} />
          ) : (
            kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)
          )}
        </div>
      )}

      {isManager && (
        <div className="dashboard-charts-row">
          <div className="dashboard-card dashboard-revenue-card">
            <div className="dashboard-card-header">
              <div>
                <div className="dashboard-card-title">Выручка</div>
                <div className="dashboard-card-big-value">
                  {formatCurrency(revenueSeries.reduce((sum, point) => sum + point.value, 0))}
                </div>
              </div>
              <div className="dashboard-period-toggle">
                {REVENUE_PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={p.id === period ? 'is-active' : ''}
                    onClick={() => setPeriod(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {revenueQuery.isLoading ? (
              <Skeleton height={200} />
            ) : revenueQuery.isError ? (
              <ErrorRetry message="Не удалось загрузить выручку." onRetry={() => revenueQuery.refetch()} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueSeries} margin={{ top: 8, right: 24, left: 24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                  />
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'var(--color-border-strong)', strokeDasharray: '3 4' }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-accent)"
                    strokeWidth={2.4}
                    fill="url(#dashboardRevenueFill)"
                    dot={{ r: 2.6, fill: 'var(--color-card)', stroke: 'var(--color-accent)', strokeWidth: 2 }}
                    activeDot={{ r: 4.5, fill: 'var(--color-card)', stroke: 'var(--color-accent)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-title is-standalone">Заказы по дням недели</div>
            {weekdayQuery.isLoading ? (
              <Skeleton height={170} />
            ) : weekdayQuery.isError ? (
              <ErrorRetry message="Не удалось загрузить заказы по дням." onRetry={() => weekdayQuery.refetch()} />
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={weekdaySeries} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={<WeekdayTick peakIndex={weekdayPeakIndex} />}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {weekdaySeries.map((day, i) => (
                      <Cell key={day.label} fill="var(--color-accent)" fillOpacity={i === weekdayPeakIndex ? 1 : 0.32} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {isManager && summary && (
        <div className="dashboard-secondary-row">
          <div className="dashboard-card">
            <div className="dashboard-card-title is-standalone">Топ блюд сегодня</div>
            {summary.popularDishes.length === 0 ? (
              <p className="dashboard-empty">Сегодня ещё нет проданных блюд.</p>
            ) : (
              <div className="dashboard-dish-list">
                {summary.popularDishes.map((dish) => (
                  <div className="dashboard-dish-row" key={dish.dishId}>
                    <div className="dashboard-dish-thumb" />
                    <div className="dashboard-dish-info">
                      <div className="dashboard-dish-name">{dish.dishName}</div>
                      <div className="dashboard-dish-sold">продано {dish.totalQuantitySold} шт.</div>
                    </div>
                    <div className="dashboard-dish-revenue">{formatCurrency(dish.totalRevenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-secondary-col">
            <div className="dashboard-card">
              <div className="dashboard-card-title is-standalone">Категории меню</div>
              {/* No endpoint aggregates revenue/orders by dish category yet — GetDishDto
                  has a CategoryId but nothing joins it against order items server-side.
                  Showing a real (if unexciting) empty state beats a chart drawn from
                  numbers nobody actually sold. */}
              <p className="dashboard-empty">
                Разбивка по категориям меню пока недоступна: на бэкенде нет эндпоинта,
                агрегирующего продажи по категориям.
              </p>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-title is-standalone">Способы оплаты сегодня</div>
              {paymentsQuery.isLoading ? (
                <Skeleton height={80} />
              ) : paymentsQuery.isError ? (
                <ErrorRetry message="Не удалось загрузить способы оплаты." onRetry={() => paymentsQuery.refetch()} />
              ) : paymentRows.length === 0 ? (
                <p className="dashboard-empty">Платежей за сегодня пока нет.</p>
              ) : (
                <div className="dashboard-payment-list">
                  {paymentRows.map((row) => (
                    <div className="dashboard-payment-row" key={row.label}>
                      <div className="dashboard-payment-labels">
                        <span>{row.label}</span>
                        <span>
                          {formatCurrency(row.value)} · {row.pct}%
                        </span>
                      </div>
                      <div className="dashboard-payment-track">
                        <div className="dashboard-payment-fill" style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-card dashboard-orders-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">Последние заказы</div>
        </div>
        {recentOrdersQuery.isLoading ? (
          <Skeleton height={220} />
        ) : recentOrdersQuery.isError ? (
          <ErrorRetry message="Не удалось загрузить заказы." onRetry={() => recentOrdersQuery.refetch()} />
        ) : recentOrders.length === 0 ? (
          <p className="dashboard-empty">Заказов пока нет.</p>
        ) : (
          <div className="dashboard-orders-scroll">
            <div className="dashboard-orders-table">
              <div className="dashboard-orders-head">
                <span>№</span>
                <span>Состав</span>
                <span>Стол</span>
                <span>Статус</span>
                <span>Время</span>
              </div>
              {recentOrders.map((order) => {
                const meta = ORDER_STATUS_META[order.status] ?? { label: '—', tone: 'new' as const };
                return (
                  <div className="dashboard-orders-row" key={order.id}>
                    <span className="dashboard-orders-number">{order.orderNumber}</span>
                    <span className="dashboard-orders-items">{orderItemsLabel(order.items)}</span>
                    <span>{orderTableLabel(order)}</span>
                    <span className={`dashboard-order-status dashboard-order-status--${meta.tone}`}>
                      <span className="dashboard-order-status-dot" />
                      {meta.label}
                    </span>
                    <span className="dashboard-orders-time">{minutesAgoLabel(order.orderedAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
