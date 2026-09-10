import { getSalesReport, type SalesReport } from '../api/dashboardApi';

export type RevenuePeriod = 'week' | 'month' | 'quarter';

interface DateBucket {
  label: string;
  from: Date;
  to: Date;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

// Rolling last 7 calendar days ending today, each labelled by its actual weekday —
// used for both the revenue chart's "week" tab and the weekday-orders chart.
function buildDayBuckets(days: number): DateBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: DateBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = new Date(today);
    from.setDate(today.getDate() - i);
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    buckets.push({ label: WEEKDAY_LABELS[from.getDay()], from, to });
  }
  return buckets;
}

// 4 rolling 7-day buckets ending today.
function buildWeekBuckets(): DateBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: DateBucket[] = [];
  for (let i = 3; i >= 0; i--) {
    const to = new Date(today);
    to.setDate(today.getDate() - i * 7);
    const from = new Date(to);
    from.setDate(to.getDate() - 7);
    buckets.push({ label: `Нед ${4 - i}`, from, to });
  }
  return buckets;
}

// 3 calendar months ending with the current month.
function buildMonthBuckets(): DateBucket[] {
  const now = new Date();
  const buckets: DateBucket[] = [];
  for (let i = 2; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({ label: MONTH_LABELS[from.getMonth()], from, to });
  }
  return buckets;
}

function bucketsForPeriod(period: RevenuePeriod): DateBucket[] {
  if (period === 'week') return buildDayBuckets(7);
  if (period === 'month') return buildWeekBuckets();
  return buildMonthBuckets();
}

async function fetchBucketSeries(buckets: DateBucket[]): Promise<{ bucket: DateBucket; report: SalesReport }[]> {
  const reports = await Promise.all(buckets.map((bucket) => getSalesReport(bucket.from, bucket.to)));
  return buckets.map((bucket, i) => ({ bucket, report: reports[i] }));
}

export async function fetchRevenueSeries(period: RevenuePeriod): Promise<SeriesPoint[]> {
  const rows = await fetchBucketSeries(bucketsForPeriod(period));
  return rows.map(({ bucket, report }) => ({ label: bucket.label, value: report.totalRevenue }));
}

export async function fetchWeekdayOrdersSeries(): Promise<SeriesPoint[]> {
  const rows = await fetchBucketSeries(buildDayBuckets(7));
  return rows.map(({ bucket, report }) => ({ label: bucket.label, value: report.totalOrders }));
}
