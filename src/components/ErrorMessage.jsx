// Consistent error banner used across API-calling pages.
export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-message" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-small" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
