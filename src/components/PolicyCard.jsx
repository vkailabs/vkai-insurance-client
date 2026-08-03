// Reusable card used on both /dashboard and /catalog.
//
// - variant="dashboard": `item` is an enrolled policy (with nested policyCatalog,
//   premiums, claims). Shows status, expiry, nested history, and a Renew button
//   when the policy is expiring soon.
// - variant="catalog": `item` is a catalog row. Shows premium/coverage amounts
//   and an Enroll button.
import { Link } from 'react-router-dom';
import ClaimStatusBadge from './ClaimStatusBadge';
import { formatCurrency, formatDate, formatPlanName, isExpiringSoon } from '../lib/format';

function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}

function DashboardCard({ policy, onRenew, renewing }) {
  const catalog = policy.policyCatalog || {};
  const premiums = policy.premiums || [];
  const claims = policy.claims || [];
  const expiringSoon = isExpiringSoon(policy.expiryDate);

  return (
    <article className="policy-card">
      <div className="policy-card-head">
        <div>
          <h3 className="policy-card-title">
            {/* Prefix the policy heading with the plan's `key` (read-through from
                the provider via the API). Nested premiums/claims below are NOT prefixed. */}
            <Link to={`/policies/${policy.id}`}>
              {formatPlanName(policy.key, catalog.name || 'Policy')}
            </Link>
          </h3>
          <p className="policy-card-meta">Expires {formatDate(policy.expiryDate)}</p>
        </div>
        <StatusPill status={policy.status} />
      </div>

      <div className="policy-card-section">
        <h4 className="policy-card-subhead">Premium payments</h4>
        {premiums.length === 0 ? (
          <p className="muted">No payments yet.</p>
        ) : (
          <ul className="history-list">
            {premiums.map((p) => (
              <li key={p.id} className="history-row">
                <span>{formatCurrency(p.amount)}</span>
                <span className="muted">{formatDate(p.paidAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="policy-card-section">
        <h4 className="policy-card-subhead">Claims</h4>
        {claims.length === 0 ? (
          <p className="muted">No claims filed.</p>
        ) : (
          <ul className="history-list">
            {claims.map((c) => (
              <li key={c.id} className="history-row">
                <span className="history-desc">{c.description}</span>
                <span className="history-right">
                  <span>{formatCurrency(c.amountClaimed)}</span>
                  <ClaimStatusBadge status={c.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="policy-card-actions">
        <Link to={`/policies/${policy.id}`} className="btn btn-secondary btn-small">
          View details
        </Link>
        {expiringSoon && (
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={() => onRenew(policy.id)}
            disabled={renewing}
          >
            {renewing ? 'Renewing…' : 'Renew'}
          </button>
        )}
      </div>
    </article>
  );
}

function CatalogCard({ item, onEnroll, enrolling }) {
  return (
    <article className="policy-card">
      <div className="policy-card-head">
        {/* Prefix the plan name with its catalog `key` (e.g. "PG2 - Premium Gold 2024"). */}
        <h3 className="policy-card-title">{formatPlanName(item.key, item.name)}</h3>
      </div>
      {item.description && <p className="policy-card-desc">{item.description}</p>}
      <dl className="policy-card-figures">
        <div>
          <dt>Premium</dt>
          <dd>{formatCurrency(item.premiumAmount)}</dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>{formatCurrency(item.coverageAmount)}</dd>
        </div>
      </dl>
      <div className="policy-card-actions">
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={() => onEnroll(item.id)}
          disabled={enrolling}
        >
          {enrolling ? 'Enrolling…' : 'Enroll'}
        </button>
      </div>
    </article>
  );
}

export default function PolicyCard({ variant, item, ...handlers }) {
  if (variant === 'catalog') {
    return <CatalogCard item={item} {...handlers} />;
  }
  return <DashboardCard policy={item} {...handlers} />;
}
