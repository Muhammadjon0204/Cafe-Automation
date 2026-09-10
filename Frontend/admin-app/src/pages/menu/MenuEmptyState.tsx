interface MenuEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function MenuEmptyState({ title, description, actionLabel, onAction }: MenuEmptyStateProps) {
  return (
    <div className="menu-empty-state">
      <h3 className="menu-empty-title">{title}</h3>
      <p className="menu-empty-desc">{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
