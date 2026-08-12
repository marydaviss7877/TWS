// Single source of truth for money formatting. Currency defaults to 'USD' only as a
// last-resort fallback — callers should pass the tenant's configured currency (see
// shared/hooks/useTenantCurrency) so figures match what was set in Org Settings.

export const formatCurrency = (amount, currency = 'USD', opts = {}) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    ...opts
  }).format(amount || 0);
};

export const formatCompactCurrency = (amount, currency = 'USD') => {
  return formatCurrency(amount, currency, { notation: 'compact' });
};

// Returns pre-signed text and a semantic className instead of letting callers prepend
// their own '+'/'-' — Intl already renders a leading '-' for negative amounts, so
// concatenating a manual sign on top double-signs negative values.
export const formatSignedCurrency = (amount, currency = 'USD') => {
  const value = amount || 0;
  const isNegative = value < 0;
  return {
    text: `${isNegative ? '' : '+'}${formatCurrency(value, currency)}`,
    isNegative,
    className: isNegative
      ? 'text-red-600 dark:text-red-400'
      : 'text-green-600 dark:text-green-400'
  };
};
