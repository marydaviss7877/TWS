const BASE_DOMAIN = process.env.REACT_APP_BASE_DOMAIN || 'tws.enterprises';

function isDev() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}

/**
 * Returns the tenant slug from the hostname subdomain, or null when on the
 * root domain or in development (no subdomains on localhost).
 * e.g. "acme.tws.enterprises" → "acme", "tws.enterprises" → null
 */
export function getSubdomainSlug() {
  if (isDev()) return null;
  const parts = window.location.hostname.split('.');
  const baseParts = BASE_DOMAIN.split('.').length; // 2 for tws.enterprises
  if (parts.length <= baseParts) return null;
  const sub = parts[0];
  // These are infrastructure subdomains, not tenant slugs
  if (['www', 'api', 'admin', 'mail', 'smtp', 'app'].includes(sub)) return null;
  return sub;
}

/** True when the current page is already on a tenant subdomain. */
export function isSubdomainContext() {
  return Boolean(getSubdomainSlug());
}

/**
 * Build a URL for the tenant workspace (paths that include the slug as first
 * path segment, e.g. /acme/org/home).
 *
 * - On localhost or when already on the tenant subdomain: returns a relative
 *   path so React Router stays in-page.
 * - On the root domain (tws.enterprises): returns a full cross-domain URL so
 *   the browser hard-navigates to the subdomain.
 *
 * Usage: getTenantWorkspaceUrl('acme', 'org', 'home')
 *   → '/acme/org/home'           (dev / already on subdomain)
 *   → 'https://acme.tws.enterprises/acme/org/home'  (root domain in prod)
 */
export function getTenantWorkspaceUrl(slug, ...pathParts) {
  const relPath = `/${[slug, ...pathParts].filter(Boolean).join('/')}`;
  if (isDev() || isSubdomainContext()) return relPath;
  return `${window.location.protocol}//${slug}.${BASE_DOMAIN}${relPath}`;
}

/**
 * Build a URL on the tenant's subdomain for NON-workspace paths
 * (e.g. /software-house-login, /invite/accept).
 *
 * Usage: getTenantSubdomainUrl('acme', '/software-house-login')
 *   → '/software-house-login'                           (dev / on subdomain)
 *   → 'https://acme.tws.enterprises/software-house-login'  (root domain)
 */
export function getTenantSubdomainUrl(slug, absolutePath) {
  if (isDev() || isSubdomainContext()) return absolutePath;
  return `${window.location.protocol}//${slug}.${BASE_DOMAIN}${absolutePath}`;
}

/**
 * Navigate helper: uses window.location.href for full URLs (cross-domain),
 * calls navigateFn for relative paths (same origin).
 */
export function navigateTo(url, navigateFn) {
  if (url.startsWith('http')) {
    window.location.href = url;
  } else {
    navigateFn(url);
  }
}
