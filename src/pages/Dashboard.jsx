import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getPolicies, renewPolicy, cancelPolicy } from '../api/client';
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
  const [cancellingId, setCancellingId] = useState(null);
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

  // Derive Active/Pending counts client-side from the already-loaded policy data
  // (GET /v1/policies). Status values come back lowercase (e.g. "active",
  // "pending") even though the UI displays them capitalized, so we match on the
  // lowercased status. No extra API call is made.
  const activeCount = policies.filter(
    (p) => (p.status || '').toLowerCase() === 'active'
  ).length;
  const pendingCount = policies.filter(
    (p) => (p.status || '').toLowerCase() === 'pending'
  ).length;

  // Split the loaded policies into two buckets for the dashboard sections,
  // reusing the same lowercased-status matching as the summary counts above.
  // "Pending" = status === "pending". "Active" = every non-pending, non-cancelled
  // status (active plus e.g. expired). `cancelled` is a terminal status that the
  // customer hides from view: it is deliberately excluded from BOTH sections (and
  // is already excluded from both summary counts, which only match active/pending),
  // so a cancelled policy disappears from the dashboard entirely.
  const pendingPolicies = policies.filter(
    (p) => (p.status || '').toLowerCase() === 'pending'
  );
  const activePolicies = policies.filter((p) => {
    const status = (p.status || '').toLowerCase();
    return status !== 'pending' && status !== 'cancelled';
  });

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

  // Cancel a still-pending policy. Requires an explicit confirmation before
  // acting; on confirm, calls POST /v1/policies/:id/cancel then refetches so the
  // now-`cancelled` policy drops out of the dashboard (it is hidden from both
  // sections and both counts).
  async function handleCancel(policyId) {
    const confirmed = window.confirm(
      'Cancel this pending policy? This cannot be undone.'
    );
    if (!confirmed) return;
    setCancellingId(policyId);
    setError('');
    try {
      await cancelPolicy(policyId);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to cancel policy.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="page">
      {!loading && !error && (
        <div className="policy-summary">
          <div className="summary-box">
            <span className="summary-count">{activeCount}</span>
            <span className="summary-label">Active</span>
          </div>
          <div className="summary-box">
            <span className="summary-count">{pendingCount}</span>
            <span className="summary-label">Pending</span>
          </div>
        </div>
      )}

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

      {!loading && !error && policies.length > 0 && (
        <>
          <section className="policy-section">
            <h2 className="section-title">Your Active Policies</h2>
            {activePolicies.length > 0 ? (
              <div className="card-grid">
                {activePolicies.map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    variant="dashboard"
                    item={policy}
                    onRenew={handleRenew}
                    renewing={renewingId === policy.id}
                  />
                ))}
              </div>
            ) : (
              <p className="policy-section-empty">No active policies.</p>
            )}
          </section>

          <section className="policy-section">
            <h2 className="section-title">Your Pending Policies</h2>
            {pendingPolicies.length > 0 ? (
              <div className="card-grid">
                {pendingPolicies.map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    variant="dashboard"
                    item={policy}
                    onRenew={handleRenew}
                    renewing={renewingId === policy.id}
                    onCancel={handleCancel}
                    cancelling={cancellingId === policy.id}
                  />
                ))}
              </div>
            ) : (
              <p className="policy-section-empty">No pending policies.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
