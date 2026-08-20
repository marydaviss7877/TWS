#!/usr/bin/env node
/**
 * Pre-commit guard: blocks NEW raw hex colors and raw Tailwind stock-color
 * classes (indigo/purple/violet) from being introduced in staged files.
 *
 * Only checks ADDED lines in the staged diff (`git diff --cached -U0`), not
 * whole-file content — this file inventory has ~2,000 pre-existing hits
 * across the app, and this must enforce going forward without blocking
 * every future commit that merely touches one of those files. Fix: use the
 * brand token system instead — frontend/src/design/tokens.js (Layer 1) or
 * the Tailwind primary/secondary/accent classes it feeds (Layer 2).
 *
 * Files under src/design/ are exempt: tokens.js is the one place hex values
 * are legitimately hand-typed, and tokens.generated.css is generated output.
 */
const { execFileSync } = require('child_process');

const HEX_RE = /#[0-9a-fA-F]{6}\b/g;
const STOCK_COLOR_RE = /\b(indigo|purple|violet)-[0-9]{2,3}\b/g;
const EXEMPT_PATH_RE = /[\\/]src[\\/]design[\\/]/;

const files = process.argv.slice(2);
let failed = false;

for (const file of files) {
  if (EXEMPT_PATH_RE.test(file)) continue;

  let diff;
  try {
    // word-diff, not line-diff: several CSS files in this app are minified
    // to a single physical line, so line-level diffing would flag every
    // pre-existing hex sharing that line, not just what actually changed.
    // The custom regex splits on CSS declaration boundaries (;{}) so each
    // `--token:value` pair is its own diffable unit even with no whitespace.
    diff = execFileSync(
      'git', [
        'diff', '--cached', '-U0', '--no-color',
        '--word-diff=porcelain', '--word-diff-regex=[^;{}\\s]+|[;{}]',
        '--', file,
      ],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    continue; // not a tracked/diffable file (e.g. a new binary) — skip
  }

  const addedTokens = diff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'));

  const hexHits = [];
  const stockHits = [];
  for (const token of addedTokens) {
    hexHits.push(...(token.match(HEX_RE) || []));
    stockHits.push(...(token.match(STOCK_COLOR_RE) || []));
  }

  if (hexHits.length || stockHits.length) {
    failed = true;
    console.error(`\n✗ ${file}`);
    if (hexHits.length) {
      console.error(`  New raw hex color(s): ${[...new Set(hexHits)].join(', ')}`);
    }
    if (stockHits.length) {
      console.error(`  New raw Tailwind stock color(s): ${[...new Set(stockHits)].join(', ')}`);
    }
  }
}

if (failed) {
  console.error(
    '\nUse the brand token system instead of hardcoded colors:\n' +
    '  - Tailwind: bg-primary-600 / text-accent-500 / bg-secondary-500 (not indigo-/purple-/violet-)\n' +
    '  - CSS: var(--theme-primary) / var(--theme-accent) / var(--color-navy-500) etc.\n' +
    '  - New brand colors belong in frontend/src/design/tokens.js, not inline.\n'
  );
  process.exit(1);
}

process.exit(0);
