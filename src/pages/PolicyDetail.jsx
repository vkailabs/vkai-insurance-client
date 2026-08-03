import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPolicy, payPremium, fileClaim, renewPolicy } from '../api/client';
import ClaimStatusBadge from '../components/ClaimStatusBadge';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency, formatDate, formatPlanName, isExpiringSoon } from '../lib/format';

export default function PolicyDetail() {
  const { id } = useParams();

  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(''); // '', 'premium', 'renew', 'claim'

  // Claim form state.
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDescription, setClaimDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPolicy(id);
      if (!data) {
        setError('Policy not found.');
      }
      setPolicy(data);
    } catch (err) {
      setError(err.message || 'Failed to load policy.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePayPremium() {
    if (!policy) return;
    setBusy('premium');
    setError('');
    setFlash('');
    try {
      const amount = Number(policy.policyCatalog?.premiumAmount) || 0;
      await payPremium(policy.id, amount);
      setFlash('Premium payment recorded.');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to pay premium.');
    } finally {
      setBusy('');
    }
  }

  async function handleRenew() {
    if (!policy) return;
    setBusy('renew');
    setError('');
    setFlash('');
    try {
      await renewPolicy(policy.id);
      setFlash('Policy renewed for another year.');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to renew policy.');
    } finally {
      setBusy('');
    }
  }

  async function handleFileClaim(e) {
    e.preventDefault();
    if (!policy) return;
    setBusy('claim');
    setError('');
    setFlash('');
    try {
      await fileClaim(policy.id, Number(claimAmount), claimDescription.trim());
      setFlash('Claim filed successfully.');
      setShowClaimForm(false);
      setClaimAmount('');
      setClaimDescription('');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to file claim.');
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Spinner label="Loading policy…" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="page">
        <ErrorMessage message={error || 'Policy not found.'} />
        <p>
          <Link to="/dashboard">← Back to dashboard</Link>
        </p>
      </div>
    );
  }

  const catalog = policy.policyCatalog || {};
  const premiums = policy.premiums || [];
  const claims = policy.claims || [];
  const isActive = policy.status === 'active';
  const expiringSoon = isExpiringSoon(policy.expiryDate);

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/dashboard">← Back to dashboard</Link>
      </p>

      <header className="page-header">
        <div>
          <h1 className="page-title">
            {formatPlanName(policy.key ?? catalog.key, catalog.name || 'Policy')}
          </h1>
          <p className="page-subtitle">
            <span className={`status-pill status-${policy.status}`}>{policy.status}</span>
            <span className="muted"> · Expires {formatDate(policy.expiryDate)}</span>
          </p>
        </div>
        <div className="header-actions">
          {isActive && (
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handlePayPremium}
              disabled={busy === 'premium'}
            >
              {busy === 'premium' ? 'Processing…' : 'Pay premium'}
            </button>
          )}
          {isActive && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setShowClaimForm((v) => !v)}
            >
              File a claim
            </button>
          )}
          {expiringSoon && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleRenew}
              disabled={busy === 'renew'}
            >
              {busy === 'renew' ? 'Renewing…' : 'Renew'}
            </button>
          )}
        </div>
      </header>

      {flash && <div className="flash-message" role="status">{flash}</div>}
      <ErrorMessage message={error} />

      {showClaimForm && (
        <form className="claim-form card" onSubmit={handleFileClaim}>
          <h3>File a claim</h3>
          <label className="field">
            <span className="field-label">Amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              rows={3}
              value={claimDescription}
              onChange={(e) => setClaimDescription(e.target.value)}
              required
            />
          </label>
          <div className="policy-card-actions">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setShowClaimForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-small" disabled={busy === 'claim'}>
              {busy === 'claim' ? 'Submitting…' : 'Submit claim'}
            </button>
          </div>
        </form>
      )}

      <section className="card">
        <h2 className="section-title">Policy details</h2>
        <dl className="detail-grid">
          <div>
            <dt>Description</dt>
            <dd>{catalog.description || '—'}</dd>
          </div>
          <div>
            <dt>Premium</dt>
            <dd>{formatCurrency(catalog.premiumAmount)}</dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>{formatCurrency(catalog.coverageAmount)}</dd>
          </div>
          <div>
            <dt>Enrolled</dt>
            <dd>{formatDate(policy.enrolledAt)}</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{formatDate(policy.expiryDate)}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="section-title">Premium payments</h2>
        {premiums.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {premiums.map((p) => (
                <tr key={p.id}>
                  <td>{formatCurrency(p.amount)}</td>
                  <td className="muted">{formatDate(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Claims</h2>
        {claims.length === 0 ? (
          <p className="muted">No claims filed yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Filed</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td>{c.description}</td>
                  <td>{formatCurrency(c.amountClaimed)}</td>
                  <td>
                    <ClaimStatusBadge status={c.status} />
                  </td>
                  <td className="muted">{formatDate(c.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
