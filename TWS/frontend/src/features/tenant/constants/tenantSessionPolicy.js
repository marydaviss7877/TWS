/**
 * Tenant portal session & security policy — single source of truth for:
 * - IdleSessionGuard behaviour
 * - Org rule book page copy
 *
 * Access-token lifetime is enforced by the API (default 15m); keep in sync with backend JWT_EXPIRE when documenting.
 */
export const TENANT_IDLE_LOGOUT_MINUTES = 30;
export const TENANT_IDLE_WARNING_MINUTES = 2;
/** Typical access JWT lifetime (informational; actual value from server env JWT_EXPIRE). */
export const TENANT_ACCESS_TOKEN_MINUTES = 15;
/** Typical refresh session window (informational; server JWT_REFRESH_EXPIRE / cookies). */
export const TENANT_REFRESH_SESSION_DAYS = 7;

export const IDLE_LIMIT_MS = TENANT_IDLE_LOGOUT_MINUTES * 60 * 1000;
export const WARNING_BEFORE_LOGOUT_MS = TENANT_IDLE_WARNING_MINUTES * 60 * 1000;
/** When remaining idle time drops below this, show the warning modal. */
export const IDLE_WARNING_THRESHOLD_MS = IDLE_LIMIT_MS - WARNING_BEFORE_LOGOUT_MS;
