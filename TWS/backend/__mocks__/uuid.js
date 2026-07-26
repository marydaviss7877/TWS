/**
 * Jest-only manual mock for the `uuid` package.
 *
 * exceljs bundles its own nested `uuid@8.3.2` (backend/frontend declare other uuid versions;
 * npm can't dedupe across the conflicting semver ranges). That nested copy's package.json
 * `exports` map resolves to an ESM-only build under Jest's resolver specifically — Node's own
 * `require()` (i.e. the actual running app) resolves the same package to the correct CJS build
 * without issue; this is purely a Jest module-resolution quirk with nested conditional exports,
 * first hit when xlsxConverter.service.js's tests required `exceljs` (nothing in this repo's
 * test suite required exceljs before). Placing a manual mock at <rootDir>/__mocks__/uuid.js
 * makes Jest use this for every `require('uuid')` in the test run, at any nesting depth —
 * Node's built-in `crypto.randomUUID()` sidesteps the broken exports resolution entirely.
 * Never loaded outside `jest`; production code is unaffected.
 */
const crypto = require('crypto');

module.exports = {
  v1: () => crypto.randomUUID(),
  v4: () => crypto.randomUUID(),
  v5: () => crypto.randomUUID(),
  validate: (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str),
};
