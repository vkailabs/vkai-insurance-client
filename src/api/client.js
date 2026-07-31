// Single fetch-based API client for the vkai-insurance-client-api.
//
// - Base URL comes from VITE_VKAI_INSURANCE_CLIENT_API_BASE_URL.
// - Every request carries the current Firebase user's ID token as a Bearer header.
// - A 401 means the token is expired/invalid: we redirect to /login.
// - Every API response is wrapped as `{ data: ... }`; helpers unwrap and return `data`.
import { auth } from '../firebase';

const BASE_URL = import.meta.env.VITE_VKAI_INSURANCE_CLIENT_API_BASE_URL || 'http://localhost:4000';

// Error type that carries the HTTP status so callers can branch if they need to.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function request(path, { method = 'GET', body } = {}) {
  const token = await getAuthToken();

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Token expired/invalid — bounce to login. Throw so callers stop processing.
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new ApiError('Unauthorized', 401);
  }

  // 204 / empty bodies: nothing to parse.
  const text = await res.text();
  const payload = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const message = payload && payload.error ? payload.error : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return payload.data;
}

// --- Public API surface -----------------------------------------------------

export function getCatalog() {
  return request('/v1/catalog');
}

export function getPolicies() {
  return request('/v1/policies?include=premiums,claims');
}

export function getPolicy(policyId) {
  // The API has no single-policy route; fetch the list (with nested data) and
  // pick the one we need. Keeps the detail page working off the same contract.
  return getPolicies().then((policies) =>
    (policies || []).find((p) => p.id === policyId) || null,
  );
}

export function enrollInPolicy(catalogId) {
  return request('/v1/policies', {
    method: 'POST',
    body: { policy_catalog_id: catalogId },
  });
}

export function payPremium(policyId, amount) {
  return request('/v1/premiums', {
    method: 'POST',
    body: { policy_id: policyId, amount },
  });
}

export function fileClaim(policyId, amount, description) {
  return request('/v1/claims', {
    method: 'POST',
    body: { policy_id: policyId, amount_claimed: amount, description },
  });
}

export function renewPolicy(policyId) {
  return request(`/v1/policies/${policyId}/renew`, {
    method: 'POST',
    body: { extend_months: 12 },
  });
}
