import crypto from 'node:crypto';
import https from 'node:https';
import readline from 'node:readline';

const baseUrl = process.argv[2];
const tenantSlug = process.argv[3];
const directIp = process.argv[4] || null;

if (!baseUrl || !tenantSlug) {
  console.error('Usage: node scripts/create-rbac-test-users.mjs <baseUrl> <tenantSlug>');
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

let ownerCredentials;
try { ownerCredentials = JSON.parse(credentialLine || '{}'); }
catch {
  console.error('Credentials must be supplied as one JSON line on stdin.');
  process.exit(2);
}

if (!ownerCredentials.email || !ownerCredentials.password) {
  console.error('Credentials JSON requires email and password.');
  process.exit(2);
}

let cookieHeader = '';
function captureCookies(headers) {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean);
  const cookies = setCookies.map((value) => value.split(';', 1)[0]).filter(Boolean);
  if (cookies.length) cookieHeader = cookies.join('; ');
}

async function request(path, options = {}) {
  const target = new URL(path, baseUrl);
  const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(options.headers || {})
  };
  const raw = await new Promise((resolve, reject) => {
    const req = https.request(target, {
      method: options.method || 'GET',
      headers,
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
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
  captureCookies({
    getSetCookie: () => Array.isArray(raw.headers['set-cookie']) ? raw.headers['set-cookie'] : [],
    get: (name) => raw.headers[String(name).toLowerCase()] || null
  });
  const text = raw.text;
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { nonJson: true, length: text.length }; }
  return { status: raw.status, body };
}

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: ownerCredentials.email, password: ownerCredentials.password })
});
ownerCredentials.password = undefined;

if (login.status !== 200 || login.body?.success !== true) {
  console.log(JSON.stringify({ success: false, loginStatus: login.status, message: login.body?.message || null }, null, 2));
  process.exit(1);
}

const specs = [
  { key: 'admin', name: 'RBAC QA Admin', erpRole: 'admin' },
  { key: 'manager', name: 'RBAC QA Manager', erpRole: 'manager', department: 'Operations' },
  { key: 'project-manager', name: 'RBAC QA Project Manager', erpRole: 'project_manager', department: 'Project Management' },
  { key: 'hr-manager', name: 'RBAC QA HR Manager', erpRole: 'hr', hrSubRole: 'manager', department: 'Human Resources' },
  { key: 'hr-executive', name: 'RBAC QA HR Executive', erpRole: 'hr', hrSubRole: 'executive', department: 'Human Resources' },
  { key: 'hr-payroll', name: 'RBAC QA HR Payroll Officer', erpRole: 'hr', hrSubRole: 'payroll_officer', department: 'Human Resources' },
  { key: 'fin-manager', name: 'RBAC QA Finance Manager', erpRole: 'finance', financeSubRole: 'manager', department: 'Finance' },
  { key: 'fin-accountant', name: 'RBAC QA Finance Accountant', erpRole: 'finance', financeSubRole: 'accountant', department: 'Accounts & Taxation' },
  { key: 'fin-analyst', name: 'RBAC QA Finance Analyst', erpRole: 'finance', financeSubRole: 'analyst', department: 'Finance' },
  { key: 'fin-ap', name: 'RBAC QA AP Officer', erpRole: 'finance', financeSubRole: 'ap_officer', department: 'Accounts & Taxation' },
  { key: 'fin-ar', name: 'RBAC QA AR Officer', erpRole: 'finance', financeSubRole: 'ar_officer', department: 'Accounts & Taxation' },
  { key: 'employee', name: 'RBAC QA Employee', erpRole: 'employee', department: 'Software Development' },
  { key: 'contractor', name: 'RBAC QA Contractor', erpRole: 'contractor', department: 'Quality Assurance' },
  { key: 'client', name: 'RBAC QA Client', erpRole: 'client' }
];

const ledger = [];

for (const spec of specs) {
  // Gmail plus aliases are stripped by validator.normalizeEmail in createUser.
  // Distinct dotted local parts remain distinct because gmail_remove_dots is disabled.
  const email = `tws.rbac.fsmkfnlad.${spec.key}.20260813@gmail.com`;
  const password = `Qa!${crypto.randomBytes(12).toString('base64url')}7a`;
  const payload = {
    fullName: spec.name,
    email,
    password,
    erpRole: spec.erpRole,
    jobTitle: '[RBAC-AUDIT-2026-08-13]',
    ...(spec.department ? { department: spec.department } : {}),
    ...(spec.hrSubRole ? { hrSubRole: spec.hrSubRole } : {}),
    ...(spec.financeSubRole ? { financeSubRole: spec.financeSubRole } : {})
  };
  const result = await request(`/api/tenant/${tenantSlug}/organization/users`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  ledger.push({
    key: spec.key,
    email,
    password: result.status === 200 && result.body?.success === true ? password : null,
    role: spec.erpRole,
    hrSubRole: spec.hrSubRole || null,
    financeSubRole: spec.financeSubRole || null,
    departmentLabel: spec.department || null,
    status: result.status,
    created: result.status === 200 && result.body?.success === true,
    id: result.body?.data?._id || result.body?.data?.id || null,
    error: result.status === 200 && result.body?.success === true ? null : result.body?.message || null
  });
}

console.log(JSON.stringify({ success: ledger.every((row) => row.created), ledger }, null, 2));
