import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '../auth/tokenStorage';

export interface OrderChangedPayload {
  orderId: number;
  cafeTableId: number | null;
}

export interface TableChangedPayload {
  cafeTableId: number;
}

export interface RealtimeSyncOptions {
  /** Fires on any order create/item-change/status/cancel/close (see OrdersHub /
   * IRealtimeNotifier on the backend). Payload carries IDs only — refetch through
   * the normal REST endpoints to actually learn what changed. */
  onOrderChanged?: (payload: OrderChangedPayload) => void;
  /** Fires whenever a table's own status/layout changes, or a reservation flips
   * it (seated/completed/cancelled). */
  onTableChanged?: (payload: TableChangedPayload) => void;
  /** Skip connecting entirely — e.g. before the user is logged in. */
  enabled?: boolean;
}

// One hub connection per app, opened once at the shell level (not per-page) — pass
// stable-identity-agnostic callbacks; they're read from a ref each event so the
// connection itself isn't torn down and reopened on every render.
export function useRealtimeSync({ onOrderChanged, onTableChanged, enabled = true }: RealtimeSyncOptions): void {
  const orderHandlerRef = useRef(onOrderChanged);
  orderHandlerRef.current = onOrderChanged;
  const tableHandlerRef = useRef(onTableChanged);
  tableHandlerRef.current = onTableChanged;

  useEffect(() => {
    if (!enabled) return;
    if (!getAccessToken()) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/orders', { accessTokenFactory: () => getAccessToken() ?? '' })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('orderChanged', (payload: OrderChangedPayload) => orderHandlerRef.current?.(payload));
    connection.on('tableChanged', (payload: TableChangedPayload) => tableHandlerRef.current?.(payload));

    let stopped = false;
    connection.start().catch((error: unknown) => {
      // Non-fatal: every page that reads live data still has its own polling
      // refetchInterval as a fallback, so a failed/dropped hub connection
      // degrades to "a bit slower to update", not "broken".
      if (!stopped) console.warn('Realtime hub connection failed; falling back to polling.', error);
    });

    return () => {
      stopped = true;
      void connection.stop();
    };
  }, [enabled]);
}
