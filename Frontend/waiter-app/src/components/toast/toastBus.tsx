export type ToastVariant = 'info' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

export interface PushToastOptions {
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit(): void {
  for (const listener of listeners) listener(toasts);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners = [...listeners, listener];
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function pushToast(text: string, options: PushToastOptions = {}): void {
  const id = nextId++;
  toasts = [...toasts, { id, text, variant: options.variant ?? 'info', actionLabel: options.actionLabel, onAction: options.onAction }];
  emit();
  setTimeout(() => dismissToast(id), options.durationMs ?? 7000);
}
