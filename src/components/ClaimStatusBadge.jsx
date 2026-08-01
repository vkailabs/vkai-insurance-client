// Color-coded badge for a claim's status.
// Statuses match the API: Submitted | Under Review | Approved | Rejected | Paid.
const STATUS_CLASS = {
  Submitted: 'badge-submitted',
  'Under Review': 'badge-under-review',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected',
  Paid: 'badge-paid',
};

export default function ClaimStatusBadge({ status }) {
  const className = STATUS_CLASS[status] || 'badge-default';
  return <span className={`claim-badge ${className}`}>{status}</span>;
}
