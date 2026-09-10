import { useEffect } from 'react';
import './modal.css';

export interface ConfirmModalProps {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  /** For informational dialogs with a single acknowledgement action (e.g. "this
   * category can't be deleted yet") — hides the cancel button since there's
   * nothing distinct to cancel. */
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Reused across the admin app for any destructive/irreversible action that needs a
// second confirmation — logout, archiving a dish, cancelling a reservation, etc.
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Отмена',
  tone = 'default',
  busy = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-title" id="confirm-modal-title">
          {title}
        </div>
        {message && <p className="modal-message">{message}</p>}
        <div className="modal-actions">
          {!hideCancel && (
            <button type="button" className="modal-btn modal-btn-ghost" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`modal-btn ${tone === 'danger' ? 'modal-btn-danger' : 'modal-btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
