const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || 'https://ari-lottery.onrender.com'
).replace(/\/$/, '');

async function fetchJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'The ARI Lottery API is unavailable.');
  }

  return payload;
}

export function createCheckoutSession({ quantity, userId }) {
  return fetchJson('/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({
      quantity,
      ...(userId ? { user_id: userId } : {}),
    }),
  });
}

export function getDemoDashboardData() {
  return fetchJson('/demo/dashboard');
}

export function getDemoTokens() {
  return fetchJson('/demo/tokens');
}

export function getDemoTransactions() {
  return fetchJson('/demo/transactions');
}
