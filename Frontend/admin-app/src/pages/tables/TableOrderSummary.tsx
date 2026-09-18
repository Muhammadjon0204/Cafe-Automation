import type { Order } from '../../api/ordersApi';
import type { CafeTableLayout } from '../../api/tablesApi';
import { Skeleton } from '../../components/Skeleton';
import { minutesAgoLabel, orderItemsLabel, orderStatusLabel } from '../../domain/orders';

const currencyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'TJS', maximumFractionDigits: 0 });

interface TableOrderSummaryProps {
  table: CafeTableLayout;
  order: Order | null;
  isLoading: boolean;
  onOpenOrders: () => void;
}

export function TableOrderSummary({ order, isLoading, onOpenOrders }: TableOrderSummaryProps) {
  if (isLoading) {
    return (
      <div className="table-panel-section">
        <Skeleton height={18} />
        <Skeleton height={60} />
      </div>
    );
  }

  if (!order) {
    // Covers both "no active order" and GET /orders' row-level Waiter scoping hiding a
    // colleague's order (Backend/src/Application/Services/OrderService.cs) — the UI can't
    // tell these apart, so it gives one honest, non-alarming message either way.
    return <p className="dashboard-empty">Активный заказ не найден — возможно, он закреплён за другим официантом.</p>;
  }

  return (
    <div className="table-panel-section">
      <div className="table-panel-row">
        <span className="table-panel-label">Заказ</span>
        <span>{order.orderNumber}</span>
      </div>
      <div className="table-panel-row">
        <span className="table-panel-label">Статус</span>
        <span>{orderStatusLabel(order.status)}</span>
      </div>
      <div className="table-panel-row">
        <span className="table-panel-label">Занят</span>
        <span>{minutesAgoLabel(order.orderedAt)}</span>
      </div>
      {order.waiterName && (
        <div className="table-panel-row">
          <span className="table-panel-label">Официант</span>
          <span>{order.waiterName}</span>
        </div>
      )}
      <p className="table-panel-items">{orderItemsLabel(order.items)}</p>
      <div className="table-panel-row table-panel-total">
        <span className="table-panel-label">Итого</span>
        <span>{currencyFormatter.format(order.totalAmount)}</span>
      </div>
      <div className="table-panel-actions">
        <button type="button" className="modal-btn modal-btn-primary" onClick={onOpenOrders}>
          Открыть в заказах
        </button>
      </div>
    </div>
  );
}
