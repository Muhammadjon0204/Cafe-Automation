import type { CafeTableLayout } from '../../api/tablesApi';

interface EditorToolbarProps {
  addArmed: boolean;
  onToggleAdd: () => void;
  onManageZones: () => void;
  selectedTable: CafeTableLayout | null;
  onEditSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export function EditorToolbar({
  addArmed,
  onToggleAdd,
  onManageZones,
  selectedTable,
  onEditSelected,
  onDeleteSelected,
  onClearSelection,
}: EditorToolbarProps) {
  return (
    <div className="editor-toolbar">
      <button type="button" className={`editor-toolbar-btn ${addArmed ? 'is-active' : ''}`} onClick={onToggleAdd}>
        {addArmed ? 'Кликните на карту, чтобы поставить стол' : '+ Добавить стол'}
      </button>
      <button type="button" className="editor-toolbar-btn" onClick={onManageZones}>
        Зоны
      </button>

      {selectedTable && (
        <div className="editor-selection-bar">
          <span>Стол {selectedTable.tableNumber}</span>
          <button type="button" onClick={onEditSelected}>
            Изменить
          </button>
          <button type="button" className="crud-danger-btn" onClick={onDeleteSelected}>
            Удалить
          </button>
          <button type="button" onClick={onClearSelection} aria-label="Снять выделение">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
