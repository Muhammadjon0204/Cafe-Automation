import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Category } from '../../api/menuApi';
import { CloseIcon } from '../../components/icons';
import { useDialogA11y } from '../../hooks/useDialogA11y';

function pluralDishes(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} блюдо`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${count} блюда`;
  return `${count} блюд`;
}

interface CategoryRowActionsProps {
  onRename: () => void;
  onDelete: () => void;
  disabled: boolean;
}

function CategoryRowActions({ onRename, onDelete, disabled }: CategoryRowActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="item-actions" ref={rootRef}>
      <button
        type="button"
        className="item-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Действия с категорией"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="item-actions-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="item-actions-item"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            Переименовать
          </button>
          <div className="item-actions-divider" />
          <button
            type="button"
            role="menuitem"
            className="item-actions-item item-actions-item-danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

interface CategoryManagerDrawerProps {
  categories: Category[];
  busy: boolean;
  serverError: string | null;
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onDeleteRequest: (category: Category) => void;
  onClose: () => void;
}

export function CategoryManagerDrawer({
  categories,
  busy,
  serverError,
  onCreate,
  onRename,
  onDeleteRequest,
  onClose,
}: CategoryManagerDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useDialogA11y(panelRef, true, onClose);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ru')), [categories]);
  const visibleCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedCategories;
    return sortedCategories.filter((c) => c.name.toLowerCase().includes(term));
  }, [sortedCategories, search]);

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
    requestAnimationFrame(() => renameInputRef.current?.focus());
  };

  const commitRename = (category: Category) => {
    const name = editingName.trim();
    if (name && name !== category.name) onRename(category.id, name);
    setEditingId(null);
  };

  const onRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setEditingId(null);
    }
  };

  return (
    <div className="drawer-overlay" onMouseDown={onClose}>
      <div
        className="drawer-panel drawer-panel-md"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-drawer-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title" id="category-drawer-title">
              Категории меню
            </h2>
            <p className="drawer-subtitle">
              Организуйте блюда и порядок отображения категорий · {categories.length}
            </p>
          </div>
          <button type="button" className="drawer-close" aria-label="Закрыть" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="drawer-body category-drawer-body">
          {categories.length > 8 && (
            <input
              className="menu-search category-search"
              placeholder="Поиск категорий"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Поиск категорий"
            />
          )}

          <div className="category-list">
            {visibleCategories.length === 0 && <p className="menu-empty-inline">Категорий не найдено.</p>}
            {visibleCategories.map((category) => (
              <div key={category.id} className="category-row">
                {editingId === category.id ? (
                  <form
                    className="dish-inline-row category-rename-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      commitRename(category);
                    }}
                  >
                    <input
                      ref={renameInputRef}
                      className="dish-inline-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={onRenameKeyDown}
                      aria-label={`Новое название категории «${category.name}»`}
                    />
                    <button type="submit" className="btn-primary btn-sm" disabled={busy}>
                      Сохранить
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditingId(null)} disabled={busy}>
                      Отмена
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="category-row-name">{category.name}</span>
                    <span className="category-row-count">{pluralDishes(category.dishesCount)}</span>
                    <CategoryRowActions
                      disabled={busy}
                      onRename={() => startEditing(category)}
                      onDelete={() => onDeleteRequest(category)}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="drawer-footer category-drawer-footer">
          <form className="dish-inline-row category-add-form" onSubmit={submitCreate}>
            <input
              className="dish-inline-input"
              placeholder="Название новой категории"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Название новой категории"
            />
            <button type="submit" className="btn-primary btn-sm" disabled={busy || !newName.trim()}>
              + Добавить
            </button>
          </form>
          {serverError && (
            <div className="dish-form-banner" role="alert">
              {serverError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
