export const BASE_DOMAIN = (process.env.REACT_APP_BASE_DOMAIN || 'twspms.work.gd')
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

function isDev() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}

/**
 * Returns the tenant slug from the hostname subdomain, or null when on the
 * root domain or in development (no subdomains on localhost).
 * e.g. "acme.twspms.work.gd" → "acme", "twspms.work.gd" → null
 */
export function getSubdomainSlug() {
  if (isDev()) return null;
  const parts = window.location.hostname.split('.');
  const baseParts = BASE_DOMAIN.split('.').length; // e.g. 3 for twspms.work.gd
  if (parts.length <= baseParts) return null;
  const sub = parts[0];
  // These are infrastructure subdomains, not tenant slugs
  if (['www', 'api', 'admin', 'mail', 'smtp', 'app', 'swh', 'edu'].includes(sub)) return null;
  return sub;
}

/** True when the current page is already on a tenant subdomain. */
export function isSubdomainContext() {
  return Boolean(getSubdomainSlug());
}

/**
 * Build a URL for the tenant workspace using CLEAN paths (no slug or /org/ in
 * the path — the slug lives only in the subdomain).
 *
 * Callers pass the legacy parts (slug, 'org', 'home') — this function strips
 * the slug and 'org' so the resulting path is just '/home'.
 *
 * Usage: getTenantWorkspaceUrl('acme', 'org', 'home')
 *   prod root domain  → 'https://acme.twspms.work.gd/home'
 *   prod on subdomain → '/home'
 *   dev (localhost)   → '/acme/org/home'   (keeps legacy path for dev)
 */
export function getTenantWorkspaceUrl(slug, ...pathParts) {
  if (isDev()) {
    // Dev has no subdomains — keep the old path-based format
    const devPath = `/${[slug, ...pathParts].filter(Boolean).join('/')}`;
    return devPath;
  }

  // Production: strip the slug and any leading 'org' segment so the path
  // is just the page name, e.g. 'home', 'users', 'projects'
  const cleanParts = pathParts.filter(p => p && p !== 'org');
  const cleanPath = cleanParts.length ? `/${cleanParts.join('/')}` : '/home';

  if (isSubdomainContext()) {
    // Already on the right subdomain — relative path is fine
    return cleanPath;
  }

  // Root domain → full cross-subdomain URL
  return `${window.location.protocol}//${slug}.${BASE_DOMAIN}${cleanPath}`;
}

/**
 * Build a URL on the tenant's subdomain for NON-workspace paths
 * (e.g. /software-house-login, /invite/accept).
 *
 * Usage: getTenantSubdomainUrl('acme', '/software-house-login')
 *   → '/software-house-login'                           (dev / on subdomain)
 *   → 'https://acme.twspms.work.gd/software-house-login'  (root domain)
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
