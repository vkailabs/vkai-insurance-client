// Simple loading spinner used consistently across API-calling pages.
export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <div className="spinner-circle" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
