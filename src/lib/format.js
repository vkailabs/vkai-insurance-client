// Small formatting helpers shared across pages.
// Note: the API serializes Prisma Decimals as strings (e.g. "100.00"), so
// currency helpers accept strings or numbers.

export function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Renders a plan/policy name prefixed with its provider-defined catalog `key`
// (e.g. "PG2 - Premium Gold 2024"). The client NEVER generates the key — it only
// displays what the API returns. When `key` is null/absent/blank, this returns
// just the name with no prefix and no stray separator.
export function formatPlanName(key, name) {
  const trimmedKey = typeof key === 'string' ? key.trim() : '';
  return trimmedKey ? `${trimmedKey} - ${name}` : name;
}

// True when `expiryDate` is in the future but within the next 30 days.
export function isExpiringSoon(expiryDate) {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return false;
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const diff = expiry.getTime() - now.getTime();
  return diff <= thirtyDays;
}
