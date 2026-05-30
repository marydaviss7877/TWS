/**
 * API Endpoints — single source of truth.
 *
 * All API base URLs and path constants live here.
 * Import the named constants rather than inlining strings in service files.
 *
 * Production note: the app serves behind a proxy (frontend/server.js → BACKEND_URL),
 * so all paths are relative ('/api/...'). API_BASE_URL resolves to '' in production
 * and falls back to 'http://localhost:5000' in local dev without the proxy.
 */

// ── Base URL ──────────────────────────────────────────────────────────────────
export const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const AUTH_LOGIN             = '/api/auth/login';
export const AUTH_LOGOUT            = '/api/auth/logout';
export const AUTH_REFRESH           = '/api/auth/refresh';
export const AUTH_ME                = '/api/auth/me';
export const AUTH_TOKEN_INFO        = '/api/auth/token-info';
export const AUTH_SUPRA_ADMIN_LOGIN = '/api/auth/supra-admin/login';

// ── Supra Admin ───────────────────────────────────────────────────────────────
export const SUPRA_ADMIN_DASHBOARD   = '/api/supra-admin/dashboard';
export const SUPRA_ADMIN_TENANTS     = '/api/supra-admin/tenants';
export const SUPRA_ADMIN_USERS       = '/api/supra-admin/users';
export const SUPRA_ADMIN_ANALYTICS   = '/api/supra-admin/analytics';
export const SUPRA_ADMIN_BILLING     = '/api/supra-admin/billing';
export const SUPRA_ADMIN_DEPARTMENTS = '/api/supra-admin/departments';
export const SUPRA_ADMIN_HEALTH      = '/api/supra-admin/system-health';
export const SUPRA_ADMIN_MONITORING  = '/api/supra-admin/monitoring';
export const SUPRA_ADMIN_MESSAGING   = '/api/admin/messaging';

// ── Master ERP ────────────────────────────────────────────────────────────────
export const MASTER_ERP_BASE       = '/api/master-erp';
export const MASTER_ERP_INDUSTRIES = '/api/master-erp/meta/industries';
export const MASTER_ERP_STATS      = '/api/master-erp/stats/overview';
export const MASTER_ERP_TEMPLATES  = '/api/master-erp/templates';

// ── Tenant ────────────────────────────────────────────────────────────────────
export const TENANT_AUTH      = '/api/tenant-auth';
export const TENANT_DASHBOARD = '/api/tenant-dashboard';
export const TENANT_API_BASE  = '/api/tenant';

// ── Tenant Switching ──────────────────────────────────────────────────────────
export const TENANT_SWITCHING_BASE    = '/api/tenant-switching';
export const TENANT_SWITCHING_TENANTS = '/api/tenant-switching/tenants';

// ── Projects ──────────────────────────────────────────────────────────────────
export const PROJECTS_BASE    = '/api/projects';
export const PROJECT_METRICS  = '/api/projects/metrics';
export const BOARDS           = '/api/boards';
export const CARDS            = '/api/cards';
export const LISTS            = '/api/lists';
export const WORKSPACES       = '/api/workspaces';

// ── Clients ───────────────────────────────────────────────────────────────────
export const CLIENTS = '/api/clients';

// ── Attendance ────────────────────────────────────────────────────────────────
export const ATTENDANCE_CHECKIN          = '/api/attendance/checkin';
export const ATTENDANCE_CHECKOUT         = '/api/attendance/checkout';
export const ATTENDANCE_TODAY            = '/api/attendance/today';
export const ATTENDANCE_ADMIN_RECORDS    = '/api/attendance/admin/records';
export const ATTENDANCE_ADMIN_STATS      = '/api/attendance/admin/stats';
export const ATTENDANCE_ADMIN_APPROVALS  = '/api/attendance/admin/pending-approvals';
export const ATTENDANCE_ADMIN_BULK       = '/api/attendance/admin/bulk-action';
export const ATTENDANCE_ADMIN_BULK_REJ   = '/api/attendance/admin/bulk-reject';
export const ATTENDANCE_ADMIN_STATUS_UPD = '/api/attendance/admin/bulk-status-update';
export const ATTENDANCE_ADMIN_EXPORT     = '/api/attendance/admin/export';
export const ATTENDANCE_SH_STATS         = '/api/attendance/software-house/stats';
export const ATTENDANCE_SH_TEAM_ACTIVITY = '/api/attendance/software-house/team/activity';
export const ATTENDANCE_SH_SPRINT        = '/api/attendance/software-house/sprint/progress';
export const ATTENDANCE_SH_CHECKIN       = '/api/attendance/software-house/checkin';
export const ATTENDANCE_SH_CHECKOUT      = '/api/attendance/software-house/checkout';
export const ATTENDANCE_SIMPLE_CHECKIN   = '/api/attendance/simple/admin/checkin';
export const ATTENDANCE_SIMPLE_CHECKOUT  = '/api/attendance/simple/admin/checkout';
export const ATTENDANCE_TEAM_ACTIVITY    = '/api/attendance/team/activity';
export const ATTENDANCE_SPRINT_PROGRESS  = '/api/attendance/sprint/progress';
export const BIOMETRIC_VERIFY            = '/api/biometric-enrollment/verify';

// ── Notifications ─────────────────────────────────────────────────────────────
export const NOTIFICATIONS_PREFERENCES = '/api/notifications/preferences';

// ── Helper — prepend base only when base is set (local dev without proxy) ─────
export const apiUrl = (path) => `${API_BASE_URL}${path}`;
