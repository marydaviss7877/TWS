import readline from 'node:readline';

const baseUrl = process.argv[2];
const tenantSlug = process.argv[3];

if (!baseUrl || !tenantSlug) {
  console.error('Usage: node scripts/live-rbac-audit.mjs <baseUrl> <tenantSlug>');
  process.exit(2);
}

const input = readline.createInterface({ input: process.stdin, terminal: false });
const [credentialLine] = await new Promise((resolve) => {
  const lines = [];
  input.on('line', (line) => {
    lines.push(line);
    input.close();
  });
  input.on('close', () => resolve(lines));
});

let credentials;
try {
  credentials = JSON.parse(credentialLine || '{}');
} catch {
  console.error('Credentials must be supplied as one JSON line on stdin.');
  process.exit(2);
}

if (!credentials.email || !credentials.password) {
  console.error('Credentials JSON requires email and password.');
  process.exit(2);
}

let cookieHeader = '';

function captureCookies(headers) {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean);
  const cookies = setCookies
    .map((value) => value.split(';', 1)[0])
    .filter(Boolean);
  if (cookies.length) cookieHeader = cookies.join('; ');
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(new URL(path, baseUrl), {
    redirect: 'manual',
    ...options,
    headers
  });
  captureCookies(response.headers);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { nonJson: true, length: text.length }; }
  return { status: response.status, body };
}

function dataOf(result) {
  return result?.body?.data ?? result?.body ?? null;
}

function arrayOf(result) {
  const data = dataOf(result);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.roles)) return data.roles;
  if (Array.isArray(data?.permissions)) return data.permissions;
  if (Array.isArray(data?.departments)) return data.departments;
  return [];
}

function safeUser(user) {
  return {
    id: user?._id || user?.id || null,
    email: user?.email || null,
    name: user?.fullName || user?.name || null,
    role: user?.role || user?.erpRole || user?.roles?.[0]?.role || null,
    status: user?.status || null,
    department: user?.department?.name || user?.department || null,
    hrSubRole: user?.hrSubRole || null,
    financeSubRole: user?.financeSubRole || null
  };
}

const unauthenticated = {};
for (const path of [
  `/api/tenant/${tenantSlug}/info`,
  `/api/tenant/${tenantSlug}/permissions/test`,
  `/api/tenant/${tenantSlug}/roles/test`,
  `/api/tenant/${tenantSlug}/permissions`,
  `/api/tenant/${tenantSlug}/roles`,
  `/api/tenant/${tenantSlug}/departments`,
  `/api/tenant/${tenantSlug}/department-access`
]) {
  try {
    const result = await request(path);
    unauthenticated[path] = result.status;
  } catch (error) {
    unauthenticated[path] = `network-error:${error.cause?.code || error.name}`;
  }
}

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: credentials.email, password: credentials.password })
});
credentials.password = undefined;

if (login.status !== 200 || login.body?.success !== true) {
  console.log(JSON.stringify({
    authenticated: false,
    loginStatus: login.status,
    loginMessage: login.body?.message || null,
    unauthenticated
  }, null, 2));
  process.exit(1);
}

const loginUser = safeUser(login.body?.data?.user);
const routes = {
  users: `/api/tenant/${tenantSlug}/organization/users`,
  permissions: `/api/tenant/${tenantSlug}/permissions`,
  permissionCatalog: `/api/tenant/${tenantSlug}/organization/permission-catalog`,
  roles: `/api/tenant/${tenantSlug}/roles`,
  roleCatalog: `/api/tenant/${tenantSlug}/organization/role-catalog`,
  departments: `/api/tenant/${tenantSlug}/departments`,
  departmentOverview: `/api/tenant/${tenantSlug}/departments/dashboard/overview`,
  departmentAccess: `/api/tenant/${tenantSlug}/department-access`,
  myDepartmentAccess: `/api/tenant/${tenantSlug}/department-access/me`,
  myPermissions: `/api/tenant/${tenantSlug}/organization/me/permissions`
};

const results = {};
for (const [name, path] of Object.entries(routes)) {
  try { results[name] = await request(path); }
  catch (error) { results[name] = { status: `network-error:${error.cause?.code || error.name}`, body: null }; }
}

const roleCatalog = dataOf(results.roleCatalog) || {};
const permissionCatalog = dataOf(results.permissionCatalog) || {};

const report = {
  authenticated: true,
  loginUser,
  unauthenticated,
  routeStatuses: Object.fromEntries(Object.entries(results).map(([name, result]) => [name, result.status])),
  users: arrayOf(results.users).map(safeUser),
  roles: arrayOf(results.roles).map((role) => ({
    id: role?._id || role?.id || null,
    name: role?.name || null,
    slug: role?.slug || null,
    active: role?.isActive ?? null,
    permissionCount: Array.isArray(role?.permissions) ? role.permissions.length : 0
  })),
  permissions: arrayOf(results.permissions).map((permission) => ({
    id: permission?._id || permission?.id || null,
    code: permission?.code || null,
    group: permission?.permissionGroup || null,
    active: permission?.isActive ?? null
  })),
  departments: arrayOf(results.departments).map((department) => ({
    id: department?._id || department?.id || null,
    name: department?.name || null,
    code: department?.code || null,
    moduleKey: department?.moduleKey || null,
    status: department?.status || null
  })),
  departmentAccessCount: arrayOf(results.departmentAccess).length,
  myDepartmentAccessCount: arrayOf(results.myDepartmentAccess).length,
  myPermissions: dataOf(results.myPermissions),
  roleCatalog: Object.fromEntries(Object.entries(roleCatalog).map(([key, section]) => [
    key,
    Array.isArray(section?.entries)
      ? section.entries.map((entry) => ({ slug: entry.catalogSlug, permissionCount: entry.permissionCount }))
      : []
  ])),
  permissionCatalogCounts: Object.fromEntries(Object.entries(permissionCatalog).map(([key, section]) => [
    key,
    Array.isArray(section?.entries) ? section.entries.length : 0
  ]))
};

console.log(JSON.stringify(report, null, 2));
