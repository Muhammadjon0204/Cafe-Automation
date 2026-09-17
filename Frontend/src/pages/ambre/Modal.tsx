import { useEffect, type MouseEvent, type ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  panelClassName?: string;
}

export function Modal({ onClose, children, labelledBy, panelClassName }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={['modal-card', panelClassName].filter(Boolean).join(' ')}
        onClick={stop}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <button type="button" className="modal-close" aria-label="Закрыть" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}
