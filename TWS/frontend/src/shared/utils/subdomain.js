export const BASE_DOMAIN = (process.env.REACT_APP_BASE_DOMAIN || 'housesbase.com')
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
 * e.g. "acme.housesbase.com" → "acme", "housesbase.com" → null
 */
export function getSubdomainSlug() {
  if (isDev()) return null;
  const parts = window.location.hostname.split('.');
  const baseParts = BASE_DOMAIN.split('.').length; // e.g. 2 for housesbase.com
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
 * True when the current page is the Software House Admin host
 * (admin.housesbase.com). Distinct from a tenant subdomain — 'admin' is
 * already reserved as an infra subdomain in getSubdomainSlug() above.
 */
export function isAdminHost() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.split('.')[0] === 'admin';
}

/**
 * Build a URL for the tenant workspace using CLEAN paths (no slug or /org/ in
 * the path — the slug lives only in the subdomain).
 *
 * Callers pass the legacy parts (slug, 'org', 'home') — this function strips
 * the slug and 'org' so the resulting path is just '/home'.
 *
 * Usage: getTenantWorkspaceUrl('acme', 'org', 'home')
 *   prod root domain  → 'https://acme.housesbase.com/home'
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
 * Like getTenantWorkspaceUrl, but always builds a URL for `slug` explicitly
 * — never assumes the current subdomain already matches. Use this whenever
 * redirecting to a DIFFERENT tenant than whatever subdomain is currently
 * loaded (e.g. correcting a cross-tenant session/subdomain mismatch).
 * getTenantWorkspaceUrl's "already on a subdomain → relative path" shortcut
 * would be wrong there — it would return a same-origin path on the WRONG
 * tenant's subdomain instead of crossing over to the right one.
 *
 * Usage: getForeignTenantWorkspaceUrl('acme', 'home')
 *   prod  → 'https://acme.housesbase.com/home', always, regardless of current host
 *   dev   → '/acme/home'   (keeps legacy path for dev, no real subdomains there)
 */
export function getForeignTenantWorkspaceUrl(slug, ...pathParts) {
  if (isDev()) {
    return `/${[slug, ...pathParts].filter(Boolean).join('/')}`;
  }
  const cleanParts = pathParts.filter(p => p && p !== 'org');
  const cleanPath = cleanParts.length ? `/${cleanParts.join('/')}` : '/home';
  return `${window.location.protocol}//${slug}.${BASE_DOMAIN}${cleanPath}`;
}

/**
 * Build a URL on the tenant's subdomain for NON-workspace paths
 * (e.g. /login, /invite/accept).
 *
 * Usage: getTenantSubdomainUrl('acme', '/login')
 *   → '/login'                           (dev / on subdomain)
 *   → 'https://acme.housesbase.com/login'  (root domain)
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
