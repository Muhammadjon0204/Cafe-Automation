import { useState } from 'react';
import type { CafeTableLayout } from '../../api/tablesApi';
import '../crud.css';

interface QuickOrderFormModalProps {
  table: CafeTableLayout;
  busy: boolean;
  serverError: string | null;
  onSubmit: (note?: string) => void;
  onCancel: () => void;
}

// Every other field (Type=DineIn, CafeTableId, WaiterId/CreatedByStaffMemberId) is fixed
// by the click context (see TablesPage), so this isn't a full CRUD form — just an
// optional note, kept as plain local state rather than react-hook-form+zod overhead.
export function QuickOrderFormModal({ table, busy, serverError, onCancel, onSubmit }: QuickOrderFormModalProps) {
  const [note, setNote] = useState('');

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal-card crud-form-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">Заказ — стол {table.tableNumber}</div>

        <form
          className="crud-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(note.trim() || undefined);
          }}
        >
          <label className="crud-form-field">
            <span>Заметка (опционально)</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </label>

          {serverError && <div className="crud-form-banner">{serverError}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn-ghost" onClick={onCancel} disabled={busy}>
              Отмена
            </button>
            <button type="submit" className="modal-btn modal-btn-primary" disabled={busy}>
              Создать заказ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
