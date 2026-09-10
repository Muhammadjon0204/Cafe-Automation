import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Zone, ZoneFormValues } from '../../api/tablesApi';
import '../crud.css';
import './ZoneManagerModal.css';

// Kept in sync with ZonesController's AllowedContentTypes / MaxBackgroundFileSizeBytes.
const ALLOWED_BACKGROUND_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BACKGROUND_FILE_SIZE_BYTES = 8 * 1024 * 1024;

interface ZoneManagerModalProps {
  zones: Zone[];
  busy: boolean;
  serverError: string | null;
  onCreate: (values: ZoneFormValues) => void;
  onRename: (id: number, values: ZoneFormValues) => void;
  onDelete: (zone: Zone) => void;
  backgroundBusy: boolean;
  backgroundError: string | null;
  onUploadBackground: (id: number, file: File) => void;
  onRemoveBackground: (id: number) => void;
  onClose: () => void;
}

export function ZoneManagerModal({
  zones,
  busy,
  serverError,
  onCreate,
  onRename,
  onDelete,
  backgroundBusy,
  backgroundError,
  onUploadBackground,
  onRemoveBackground,
  onClose,
}: ZoneManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [bgEditingId, setBgEditingId] = useState<number | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [bgLocalError, setBgLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local preview (spec: "превью перед сохранением") — a blob URL generated client-side
  // before any upload call, revoked whenever it's replaced or the panel closes.
  useEffect(() => {
    if (!bgFile) {
      setBgPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(bgFile);
    setBgPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bgFile]);

  const sortedZones = [...zones].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreate({ name, sortOrder: zones.length });
    setNewName('');
  };

  const startEditing = (zone: Zone) => {
    setEditingId(zone.id);
    setEditingName(zone.name);
  };

  const submitRename = (e: FormEvent, zone: Zone) => {
    e.preventDefault();
    const name = editingName.trim();
    if (!name) return;
    onRename(zone.id, { name, sortOrder: zone.sortOrder });
    setEditingId(null);
  };

  const closeBackgroundEditor = () => {
    setBgEditingId(null);
    setBgFile(null);
    setBgLocalError(null);
  };

  const toggleBackgroundEditor = (zone: Zone) => {
    if (bgEditingId === zone.id) {
      closeBackgroundEditor();
    } else {
      setBgEditingId(zone.id);
      setBgFile(null);
      setBgLocalError(null);
    }
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_BACKGROUND_TYPES.includes(file.type)) {
      setBgLocalError('Только JPEG, PNG или WebP.');
      return;
    }
    if (file.size > MAX_BACKGROUND_FILE_SIZE_BYTES) {
      setBgLocalError('Файл должен быть не больше 8 МБ.');
      return;
    }
    setBgLocalError(null);
    setBgFile(file);
  };

  const saveBackground = (zone: Zone) => {
    if (!bgFile) return;
    onUploadBackground(zone.id, bgFile);
    setBgFile(null);
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card crud-form-card zone-manager-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-title">Зоны зала</div>

        <div className="zone-manager-list">
          {sortedZones.length === 0 && <p className="dashboard-empty">Зон пока нет.</p>}
          {sortedZones.map((zone) => (
            <div key={zone.id} className="zone-manager-block">
              {editingId === zone.id ? (
                <form className="zone-manager-row" onSubmit={(e) => submitRename(e, zone)}>
                  <input
                    className="zone-manager-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="modal-btn modal-btn-primary" disabled={busy}>
                    Сохранить
                  </button>
                  <button type="button" className="modal-btn modal-btn-ghost" onClick={() => setEditingId(null)} disabled={busy}>
                    Отмена
                  </button>
                </form>
              ) : (
                <div className="zone-manager-row">
                  {zone.backgroundImageUrl ? (
                    <img src={zone.backgroundImageUrl} alt="" className="zone-manager-thumb" />
                  ) : (
                    <span className="zone-manager-thumb zone-manager-thumb-empty" aria-hidden="true" />
                  )}
                  <span className="zone-manager-name">
                    {zone.name} <span className="zone-tab-count">{zone.tablesCount}</span>
                  </span>
                  <button type="button" onClick={() => toggleBackgroundEditor(zone)} disabled={busy}>
                    Фон
                  </button>
                  <button type="button" onClick={() => startEditing(zone)} disabled={busy}>
                    Переименовать
                  </button>
                  <button type="button" className="crud-danger-btn" onClick={() => onDelete(zone)} disabled={busy}>
                    Удалить
                  </button>
                </div>
              )}

              {bgEditingId === zone.id && (
                <div className="zone-manager-bg-editor">
                  <div className="zone-manager-bg-preview">
                    {bgPreviewUrl ? (
                      <img src={bgPreviewUrl} alt="Превью фона" />
                    ) : zone.backgroundImageUrl ? (
                      <img src={zone.backgroundImageUrl} alt="Текущий фон" />
                    ) : (
                      <span className="zone-manager-bg-preview-empty">Фон не задан</span>
                    )}
                  </div>

                  <div className="zone-manager-bg-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_BACKGROUND_TYPES.join(',')}
                      className="zone-manager-file-input"
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="zone-manager-choose-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={backgroundBusy}
                    >
                      Выбрать изображение
                    </button>
                    {bgFile && (
                      <button
                        type="button"
                        className="modal-btn modal-btn-primary"
                        onClick={() => saveBackground(zone)}
                        disabled={backgroundBusy}
                      >
                        Сохранить фон
                      </button>
                    )}
                    {!bgFile && zone.backgroundImageUrl && (
                      <button
                        type="button"
                        className="crud-danger-btn"
                        onClick={() => onRemoveBackground(zone.id)}
                        disabled={backgroundBusy}
                      >
                        Убрать фон
                      </button>
                    )}
                    <button type="button" className="modal-btn modal-btn-ghost" onClick={closeBackgroundEditor} disabled={backgroundBusy}>
                      Закрыть
                    </button>
                  </div>

                  {(bgLocalError || backgroundError) && <div className="crud-form-banner">{bgLocalError ?? backgroundError}</div>}
                </div>
              )}
            </div>
          ))}
        </div>

        <form className="zone-manager-row" onSubmit={submitCreate}>
          <input
            className="zone-manager-input"
            placeholder="Название новой зоны"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="modal-btn modal-btn-primary" disabled={busy || !newName.trim()}>
            + Добавить
          </button>
        </form>

        {serverError && <div className="crud-form-banner">{serverError}</div>}

        <div className="modal-actions">
          <button type="button" className="modal-btn modal-btn-ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
