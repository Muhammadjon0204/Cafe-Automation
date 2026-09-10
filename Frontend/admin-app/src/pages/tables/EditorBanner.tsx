interface EditorBannerProps {
  onExit: () => void;
}

// Deliberately high-contrast and always visible at the top of the canvas — so a waiter
// glancing at the screen mid-shift can immediately tell the floor is in editing mode,
// not live status, before anything gets accidentally dragged.
export function EditorBanner({ onExit }: EditorBannerProps) {
  return (
    <div className="editor-banner">
      <span className="editor-banner-label">Режим редактирования зала</span>
      <button type="button" className="editor-banner-exit" onClick={onExit}>
        Готово
      </button>
    </div>
  );
}
