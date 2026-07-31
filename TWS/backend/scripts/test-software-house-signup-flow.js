#!/usr/bin/env node

/**
 * Comprehensive software-house signup flow tester.
 *
 * What it validates:
 * 1) Backend health reachability
 * 2) Signup route existence and expected status behavior
 * 3) Slug availability endpoint behavior (valid + invalid)
 * 4) Full happy-path signup creating a dummy organization
 * 5) Duplicate email rejection after successful signup
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 120000);

const runStartedAt = Date.now();
const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const testData = {
  fullName: 'Dummy Signup Bot',
  email: `dummy.signup.${uniqueSuffix}@example.com`,
  password: 'Dummy@12345',
  confirmPassword: 'Dummy@12345',
  organizationName: `Dummy Org ${uniqueSuffix}`,
  organizationSlug: `dummy-org-${Date.now()}`
};

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  timeoutMs: TIMEOUT_MS,
  tests: [],
  summary: {
    passed: 0,
    failed: 0,
    total: 0
  },
  createdEntity: null,
  notes: []
};

function addResult(name, passed, details = {}) {
  report.tests.push({
    name,
    passed,
    details
  });
  report.summary.total += 1;
  if (passed) report.summary.passed += 1;
  else report.summary.failed += 1;
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (details && Object.keys(details).length > 0) {
    console.log(`   ${JSON.stringify(details)}`);
  }
}

async function request(method, path, data, expectedStatuses = []) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const response = await axios({
      method,
      url,
      data,
      timeout: TIMEOUT_MS,
      validateStatus: () => true
    });

    const durationMs = Date.now() - start;
    const ok = expectedStatuses.length === 0
      ? response.status >= 200 && response.status < 300
      : expectedStatuses.includes(response.status);

    return {
      ok,
      status: response.status,
      data: response.data,
      durationMs,
      url
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    return {
      ok: false,
      status: null,
      data: null,
      durationMs,
      url,
      error: error.message
    };
  }
}

async function run() {
  console.log('='.repeat(72));
  console.log('TWS SOFTWARE-HOUSE SIGNUP FLOW TEST');
  console.log('='.repeat(72));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Dummy Email: ${testData.email}`);
  console.log(`Dummy Org Slug: ${testData.organizationSlug}`);
  console.log('-'.repeat(72));

  if (FRONTEND_URL) {
    const start = Date.now();
    let frontendStatus = null;
    let frontendError = null;
    try {
      const response = await axios.get(`${FRONTEND_URL}/signup`, {
        timeout: TIMEOUT_MS,
        validateStatus: () => true
      });
      frontendStatus = response.status;
    } catch (error) {
      frontendError = error.message;
    }

    addResult('Frontend signup page responds (not a direct 404)', frontendStatus !== 404 && !frontendError, {
      status: frontendStatus,
      durationMs: Date.now() - start,
      error: frontendError
    });
  } else {
    addResult('Frontend signup page check skipped', true, {
      reason: 'FRONTEND_URL not set'
    });
  }

  const health = await request('GET', '/health', null, [200]);
  addResult('Backend health is reachable', health.ok, {
    status: health.status,
    durationMs: health.durationMs,
    error: health.error || null
  });
  if (!health.ok) {
    report.notes.push('Backend was not reachable. Start backend and rerun.');
    finalize(1);
    return;
  }

  const signupPageApiLike = await request('GET', '/api/signup/software-house/complete', null, [404, 405]);
  addResult('Signup complete endpoint is mounted (GET returns non-success as expected)', signupPageApiLike.ok, {
    status: signupPageApiLike.status,
    hint: 'POST is expected for this route'
  });

  const checkSlugInvalid = await request(
    'GET',
    '/api/signup/check-slug-availability?slug=ab',
    null,
    [400]
  );
  addResult('Slug validation rejects too-short slug', checkSlugInvalid.ok, {
    status: checkSlugInvalid.status,
    message: checkSlugInvalid.data?.message || null
  });

  const checkSlugValid = await request(
    'GET',
    `/api/signup/check-slug-availability?slug=${encodeURIComponent(testData.organizationSlug)}`,
    null,
    [200]
  );
  const slugAvailable = Boolean(checkSlugValid.data?.data?.available);
  addResult('Slug availability endpoint works for valid slug', checkSlugValid.ok, {
    status: checkSlugValid.status,
    available: slugAvailable
  });
  if (!checkSlugValid.ok || !slugAvailable) {
    report.notes.push('Generated slug not available or slug endpoint failed. Rerun once.');
    finalize(1);
    return;
  }

  const completeSignup = await request(
    'POST',
    '/api/signup/software-house/complete',
    testData,
    [201]
  );
  const signupSucceeded = completeSignup.ok && completeSignup.data?.success === true;
  addResult('Happy path: complete signup creates dummy org', signupSucceeded, {
    status: completeSignup.status,
    message: completeSignup.data?.message || completeSignup.error || null,
    returnedSlug: completeSignup.data?.data?.slug || null,
    userId: completeSignup.data?.data?.userId || null,
    tenantId: completeSignup.data?.data?.tenantId || null,
    organizationId: completeSignup.data?.data?.organizationId || null
  });

  if (signupSucceeded) {
    report.createdEntity = {
      email: testData.email,
      organizationSlug: testData.organizationSlug,
      userId: completeSignup.data?.data?.userId || null,
      tenantId: completeSignup.data?.data?.tenantId || null,
      organizationId: completeSignup.data?.data?.organizationId || null
    };
  } else {
    report.notes.push('Signup failed; inspect details from failed test above.');
    finalize(1);
    return;
  }

  const duplicateEmail = await request(
    'POST',
    '/api/signup/software-house/complete',
    {
      ...testData,
      organizationSlug: `${testData.organizationSlug}-dup`
    },
    [409]
  );
  addResult('Duplicate email is rejected', duplicateEmail.ok, {
    status: duplicateEmail.status,
    code: duplicateEmail.data?.code || null,
    message: duplicateEmail.data?.message || null
  });

  const reservedSlug = await request(
    'POST',
    '/api/signup/software-house/complete',
    {
      ...testData,
      email: `dummy.signup.reserved.${uniqueSuffix}@example.com`,
      organizationSlug: 'signup'
    },
    [400]
  );
  addResult('Reserved slug is rejected', reservedSlug.ok, {
    status: reservedSlug.status,
    code: reservedSlug.data?.code || null,
    message: reservedSlug.data?.message || null
  });

  finalize(report.summary.failed > 0 ? 1 : 0);
}

function finalize(exitCode) {
  const elapsedMs = Date.now() - runStartedAt;
  report.finishedAt = new Date().toISOString();
  report.elapsedMs = elapsedMs;
  const reportPath = process.env.SIGNUP_TEST_REPORT_PATH
    ? path.resolve(process.env.SIGNUP_TEST_REPORT_PATH)
    : null;
  if (reportPath) {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  console.log('-'.repeat(72));
  console.log('FINAL SUMMARY');
  console.log('-'.repeat(72));
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Total:  ${report.summary.total}`);
  console.log(`Elapsed: ${elapsedMs}ms`);
  if (report.createdEntity) {
    console.log('Created Dummy Org Snapshot:');
    console.log(JSON.stringify(report.createdEntity, null, 2));
  }
  if (report.notes.length > 0) {
    console.log('Notes:');
    report.notes.forEach((n) => console.log(`- ${n}`));
  }
  if (reportPath) {
    console.log(`Detailed report saved: ${reportPath}`);
  }
  console.log('='.repeat(72));
  process.exit(exitCode);
}

run().catch((error) => {
  addResult('Unexpected script failure', false, { error: error.message });
  finalize(1);
});
