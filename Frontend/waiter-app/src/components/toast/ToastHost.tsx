import { useEffect, useState } from 'react';
import { dismissToast, subscribeToasts, type ToastMessage } from './toastBus';
import './toast.css';

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.variant}`} role="alert">
          <span className="toast-text">{toast.text}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.onAction!();
                dismissToast(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button type="button" className="toast-close" aria-label="Закрыть" onClick={() => dismissToast(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
