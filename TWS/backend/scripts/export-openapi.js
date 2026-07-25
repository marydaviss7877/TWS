#!/usr/bin/env node

/**
 * Dumps the live swagger-jsdoc-generated OpenAPI spec to backend/swagger.json.
 * Run after adding/changing @swagger JSDoc blocks so the file on disk matches
 * what /api-docs actually serves. Useful for uploading to SwaggerHub or any
 * external OpenAPI catalog — the running server never reads this file itself.
 */

const fs = require('fs');
const path = require('path');
const { specs } = require('../src/config/swagger');

const outputPath = path.join(__dirname, '..', 'swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2) + '\n');

console.log(`✅ Exported ${Object.keys(specs.paths || {}).length} paths to ${outputPath}`);
