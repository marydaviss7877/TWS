#!/usr/bin/env node
/**
 * Generates frontend/src/design/tokens.generated.css from tokens.js.
 *
 * This script has no design logic of its own — it only formats tokens.js as
 * CSS custom properties. tokens.js is the single hand-maintained source; this
 * output is regenerated on every `npm start`/`npm run build` (see
 * prestart/prebuild in package.json) so it can never drift from it.
 */
const fs = require('fs');
const path = require('path');
const { brand } = require('./tokens');

const lines = [
  '/**',
  ' * GENERATED FILE — do not edit by hand.',
  ' * Source: frontend/src/design/tokens.js',
  ' * Regenerate: npm run tokens',
  ' */',
  ':root {',
];

const ramp = (name, scale) => {
  Object.keys(scale).forEach((shade) => {
    lines.push(`  --color-${name}-${shade}: ${scale[shade]};`);
  });
};

ramp('navy', brand.navy);
ramp('orange', brand.orange);
ramp('green', brand.green);
lines.push(`  --color-ink: ${brand.ink};`);
lines.push(`  --color-mist: ${brand.mist};`);
lines.push('}');
lines.push('');

const outPath = path.join(__dirname, 'tokens.generated.css');
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`[tokens] wrote ${path.relative(process.cwd(), outPath)}`);
