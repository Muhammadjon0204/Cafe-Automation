import { useEffect, useRef, useState } from 'react';
import type { Dish } from '../../api/menuApi';
import { DISH_STATUS } from './dishConstants';

interface MenuItemActionsProps {
  dish: Dish;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

/** Single discreet ⋯ menu replacing the old permanent "Изменить"/"Архивировать"
 * button pair — same outside-click pattern as StatusFilterDropdown/UserMenu.
 * Archiving is destructive (real soft-delete, see menuApi.archiveDish) and is
 * visually separated at the bottom, never styled like the other two actions. */
export function MenuItemActions({ dish, onEdit, onDuplicate, onArchive, onRestore }: MenuItemActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isArchived = dish.status === DISH_STATUS.Archived;

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className="item-actions" ref={rootRef}>
      <button
        type="button"
        className="item-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Действия с блюдом «${dish.name}»`}
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
              onEdit();
            }}
          >
            Изменить
          </button>
          <button
            type="button"
            role="menuitem"
            className="item-actions-item"
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
          >
            Дублировать
          </button>
          {isArchived ? (
            <button
              type="button"
              role="menuitem"
              className="item-actions-item"
              onClick={() => {
                setOpen(false);
                onRestore();
              }}
            >
              Восстановить
            </button>
          ) : (
            <>
              <div className="item-actions-divider" />
              <button
                type="button"
                role="menuitem"
                className="item-actions-item item-actions-item-danger"
                onClick={() => {
                  setOpen(false);
                  onArchive();
                }}
              >
                Архивировать
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
