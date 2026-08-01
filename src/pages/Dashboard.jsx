import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getPolicies, renewPolicy } from '../api/client';
import PolicyCard from '../components/PolicyCard';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renewingId, setRenewingId] = useState(null);
  // One-time success banner passed via navigation state (e.g. after enrolling).
  const [flash, setFlash] = useState(location.state?.flash || '');

  // Clear the flash from history so it doesn't reappear on refresh/back.
  useEffect(() => {
    if (location.state?.flash) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPolicies();
      setPolicies(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load your policies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRenew(policyId) {
    setRenewingId(policyId);
    setError('');
    try {
      await renewPolicy(policyId);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to renew policy.');
    } finally {
      setRenewingId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Your policies</h1>
        <Link to="/catalog" className="btn btn-primary btn-small">
          Browse catalog
        </Link>
      </header>

      {flash && (
        <div className="flash-message" role="status">
          {flash}
          <button type="button" className="flash-close" onClick={() => setFlash('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {loading && <Spinner label="Loading your policies…" />}
      {!loading && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && policies.length === 0 && (
        <div className="empty-state">
          <h2>No policies yet</h2>
          <p>You haven&apos;t enrolled in any policies. Browse the catalog to get started.</p>
          <Link to="/catalog" className="btn btn-primary">
            Browse the catalog
          </Link>
        </div>
      )}

      {!loading && policies.length > 0 && (
        <div className="card-grid">
          {policies.map((policy) => (
            <PolicyCard
              key={policy.id}
              variant="dashboard"
              item={policy}
              onRenew={handleRenew}
              renewing={renewingId === policy.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
