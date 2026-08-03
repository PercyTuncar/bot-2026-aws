export function formatCoins(amount) {
  if (amount === undefined || amount === null) return '$0 RC';
  return `$${Math.round(Number(amount)).toLocaleString('en-US')} RC`;
}
