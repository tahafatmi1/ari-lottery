export function formatCurrency(cents = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(cents || 0) / 100);
}

export function formatDate(value) {
  if (!value) return 'Pending';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return 'Pending';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function maskEmail(email = '') {
  const [name, domain] = email.split('@');

  if (!name || !domain) return 'Private user';

  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
}

export function maskIdentifier(value = '') {
  if (!value) return 'Private';
  const stringValue = String(value);

  if (stringValue.length <= 8) return stringValue;

  return `${stringValue.slice(0, 4)}...${stringValue.slice(-4)}`;
}

export function getNextDrawDate(latestDrawCreatedAt) {
  const intervalMs = 72 * 60 * 60 * 1000;
  const now = Date.now();
  let nextDraw = latestDrawCreatedAt
    ? new Date(latestDrawCreatedAt).getTime() + intervalMs
    : now + intervalMs;

  while (nextDraw <= now) {
    nextDraw += intervalMs;
  }

  return new Date(nextDraw);
}

export function getCountdownParts(targetDate) {
  const remainingMs = Math.max(new Date(targetDate).getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}
