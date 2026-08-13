import https from 'node:https';
import readline from 'node:readline';

const baseUrl = process.argv[2];
const tenantSlug = process.argv[3];
const directIp = process.argv[4] || null;
const knownDepartmentId = process.argv[5] || null;

if (!baseUrl || !tenantSlug) {
  console.error('Usage: node scripts/test-rbac-users.mjs <baseUrl> <tenantSlug> [directIp] [knownDepartmentId]');
  process.exit(2);
}

const input = readline.createInterface({ input: process.stdin, terminal: false });
const [accountsLine] = await new Promise((resolve) => {
  const lines = [];
  input.on('line', (line) => { lines.push(line); input.close(); });
  input.on('close', () => resolve(lines));
});

let accounts;
try { accounts = JSON.parse(accountsLine || '[]'); }
catch {
  console.error('Accounts must be supplied as one JSON array line on stdin.');
  process.exit(2);
}

function makeRequester() {
  let cookieHeader = '';
  return async function request(path, options = {}) {
    const target = new URL(path, baseUrl);
    const body = options.body ? JSON.stringify(options.body) : null;
    const raw = await new Promise((resolve, reject) => {
      let deadline;
      const req = https.request(target, {
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {})
        },
        ...(directIp ? {
          lookup: (_hostname, lookupOptions, callback) => {
            if (lookupOptions?.all) callback(null, [{ address: directIp, family: 4 }]);
            else callback(null, directIp, 4);
          }
        } : {})
      }, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve({
          status: response.statusCode,
          headers: response.headers,
          text: Buffer.concat(chunks).toString('utf8')
        }));
      });
      deadline = setTimeout(() => req.destroy(Object.assign(new Error('Request timeout'), { code: 'TIMEOUT' })), 15000);
      req.on('close', () => clearTimeout(deadline));
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
    const setCookies = Array.isArray(raw.headers['set-cookie']) ? raw.headers['set-cookie'] : [];
    if (setCookies.length) cookieHeader = setCookies.map((value) => value.split(';', 1)[0]).join('; ');
    let parsed = null;
    try { parsed = raw.text ? JSON.parse(raw.text) : null; }
    catch { parsed = { nonJson: true, length: raw.text.length }; }
    return { status: raw.status, body: parsed };
  };
}

const routeTemplates = {
  myPermissions: `/api/tenant/${tenantSlug}/organization/me/permissions`,
  usersList: `/api/tenant/${tenantSlug}/organization/users`,
  rolesList: `/api/tenant/${tenantSlug}/roles`,
  permissionsList: `/api/tenant/${tenantSlug}/permissions`,
  departmentsList: `/api/tenant/${tenantSlug}/departments`,
  departmentOverview: `/api/tenant/${tenantSlug}/departments/dashboard/overview`,
  ...(knownDepartmentId ? { knownDepartment: `/api/tenant/${tenantSlug}/departments/${knownDepartmentId}` } : {}),
  departmentAccessAdmin: `/api/tenant/${tenantSlug}/department-access`,
  myDepartmentAccess: `/api/tenant/${tenantSlug}/department-access/me`,
  audit: `/api/tenant/${tenantSlug}/audit`,
  settingsGeneral: `/api/tenant/${tenantSlug}/organization/settings/general`,
  employeesList: `/api/tenant/${tenantSlug}/organization/hr/employees`,
  payroll: `/api/tenant/${tenantSlug}/organization/hr/payroll`,
  finance: `/api/tenant/${tenantSlug}/software-house/finance`,
  projects: `/api/tenant/${tenantSlug}/organization/projects`,
  sheets: `/api/tenant/${tenantSlug}/organization/sheets`,
  portfolio: `/api/tenant/${tenantSlug}/organization/portfolio`
};

const report = [];
for (const account of accounts) {
  const request = makeRequester();
  let login;
  try {
    login = await request('/api/auth/login', {
      method: 'POST',
      // `portal` is intentionally supplied to prove whether the backend enforces it.
      body: { email: account.email, password: account.password, portal: account.testPortal || 'admin' }
    });
  } catch (error) {
    report.push({ key: account.key, login: `network-error:${error.code || error.name}` });
    continue;
  }
  account.password = undefined;
  const row = {
    key: account.key,
    requestedPortal: account.testPortal || 'admin',
    login: login.status,
    retryAfter: login.body?.retryAfter || null,
    actualRole: login.body?.data?.user?.role || null,
    routes: {},
    permissions: null
  };
  if (login.status === 200 && login.body?.success === true) {
    await Promise.all(Object.entries(routeTemplates).map(async ([name, path]) => {
      try {
        const result = await request(path);
        row.routes[name] = result.status;
        if (name === 'myPermissions' && result.status === 200) row.permissions = result.body?.data || null;
      } catch (error) {
        row.routes[name] = error.code === 'TIMEOUT' ? 'timeout' : `network-error:${error.code || error.name}`;
      }
    }));
  } else {
    row.loginMessage = login.body?.message || null;
  }
  report.push(row);
}

console.log(JSON.stringify({ testedAt: new Date().toISOString(), report }, null, 2));
