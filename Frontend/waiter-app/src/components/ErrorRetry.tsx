interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorRetry({ message = 'Не удалось загрузить данные. Проверьте соединение.', onRetry }: ErrorRetryProps) {
  return (
    <div className="error-retry">
      <span>{message}</span>
      <button type="button" className="error-retry-btn" onClick={onRetry}>
        Повторить
      </button>
    </div>
  );
}
