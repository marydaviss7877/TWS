/**
 * FR2: Tenant workspace URLs use path-based routing: app.nexaerp.com/<tenant-slug>/...
 * (In dev: localhost:3000/<tenant-slug>/...)
 * No /tenant/ prefix — slug is the first path segment.
 */

/**
 * Build tenant workspace path. Example: tenantPath('ahmad', 'org', 'dashboard') => '/ahmad/org/dashboard'
 * @param {string} tenantSlug
 * @param {...string} pathParts
 * @returns {string}
 */
export function tenantPath(tenantSlug, ...pathParts) {
  if (!tenantSlug) return '/';
  const cleanParts = pathParts.filter(Boolean);
  const orgIndex = cleanParts.indexOf('org');
  const workspaceParts = orgIndex >= 0 ? cleanParts.slice(orgIndex + 1) : cleanParts;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
    if (!isLocal) {
      const configuredBase = (process.env.REACT_APP_BASE_DOMAIN || 'twspms.work.gd')
        .trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const hostParts = hostname.split('.');
      const hasTenantSubdomain =
        hostParts.length > configuredBase.split('.').length &&
        !['www', 'api', 'admin', 'mail', 'smtp', 'app', 'swh', 'edu'].includes(hostParts[0]);
      if (hasTenantSubdomain) {
        return workspaceParts.length ? `/${workspaceParts.join('/')}` : '/home';
      }
    }
  }

  const rest = cleanParts.join('/');
  return rest ? `/${tenantSlug}/${rest}` : `/${tenantSlug}`;
}

/** First path segments that are NOT tenant slugs (fixed app routes) */
export const RESERVED_FIRST_SEGMENTS = new Set([
  'login', 'supra-admin', 'software-house', 'access-denied', 'debug', 'landing',
  'monitoring-status', 'register', 'signup', 'api', 'software-house-login', 'software-house-signup',
  'landing', 'tenant' // legacy; keep so old bookmarks can redirect if needed
]);

/**
 * Returns true if the current pathname is a tenant workspace route (/:slug/org/... or /:slug/dashboard).
 * @param {string} pathname - location.pathname
 * @returns {boolean}
 */
export function isTenantWorkspacePath(pathname) {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (!seg) return false;
  if (RESERVED_FIRST_SEGMENTS.has(seg)) return false;
  // Tenant routes: /:slug/dashboard or /:slug/org/*
  const second = pathname.split('/').filter(Boolean)[1];
  return second === 'org' || second === 'dashboard';
}
