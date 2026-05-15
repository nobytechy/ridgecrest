export function formatMoney({ amount, currency }) {
  const v = Number(amount) || 0;
  const symbol = currency === 'USD' ? 'US$' : 'ZWL ';
  return `${symbol}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso);
  const now = new Date();
  return Math.floor((target - now) / (24 * 60 * 60 * 1000));
}

/** Convert a numeric mark to a Zim-style grade (A-U). */
export function gradeOf(mark) {
  const n = Number(mark);
  if (Number.isNaN(n) || n == null) return '—';
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  if (n >= 50) return 'D';
  if (n >= 40) return 'E';
  return 'U';
}
