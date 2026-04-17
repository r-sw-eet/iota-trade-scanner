#!/usr/bin/env node
/**
 * Ratcheting coverage guard — shared by api/ and website/.
 *
 * Compares `<dir>/coverage/coverage-summary.json` (emitted by
 * jest/vitest when `json-summary` is in coverageReporters) against
 * `<dir>/.coverage-baseline.json`:
 *
 *   - If any metric dropped below baseline (minus EPSILON) → exit 1.
 *   - If any improved → overwrite the baseline (ratchet up).
 *   - If no baseline yet → write one and pass.
 *
 * The pre-commit hook stages an updated baseline into the same commit
 * so coverage gains travel with the code producing them.
 *
 * Usage:
 *   node scripts/check-coverage.js <dir>          # e.g. api, website
 */

const fs = require('fs');
const path = require('path');

const METRICS = ['statements', 'branches', 'functions', 'lines'];
const EPSILON = 0.01;

const rel = process.argv[2];
if (!rel) {
  process.stderr.write('usage: node scripts/check-coverage.js <dir>\n');
  process.exit(2);
}
const root = path.resolve(__dirname, '..', rel);
const BASELINE_PATH = path.join(root, '.coverage-baseline.json');
const SUMMARY_PATH = path.join(root, 'coverage', 'coverage-summary.json');

if (!fs.existsSync(SUMMARY_PATH)) {
  process.stderr.write(`✗ No coverage summary at ${SUMMARY_PATH}. Run coverage first.\n`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
const current = {};
for (const m of METRICS) current[m] = summary.total[m].pct;

if (!fs.existsSync(BASELINE_PATH)) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
  process.stdout.write(`→ [${rel}] no baseline yet — wrote initial:\n`);
  for (const m of METRICS) process.stdout.write(`    ${m}: ${current[m].toFixed(2)}%\n`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

const regressions = [];
const improvements = [];
for (const m of METRICS) {
  const cur = current[m];
  const base = baseline[m] ?? 0;
  if (cur < base - EPSILON) regressions.push({ m, base, cur });
  else if (cur > base + EPSILON) improvements.push({ m, base, cur });
}

if (regressions.length) {
  process.stderr.write(`✗ [${rel}] coverage regressed below baseline:\n`);
  for (const r of regressions) {
    process.stderr.write(`    ${r.m}: ${r.base.toFixed(2)}% → ${r.cur.toFixed(2)}% (-${(r.base - r.cur).toFixed(2)})\n`);
  }
  process.stderr.write(`\n  Add tests to restore coverage, or (last resort) edit ${rel}/.coverage-baseline.json.\n`);
  process.exit(1);
}

if (improvements.length) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({ ...baseline, ...current }, null, 2) + '\n');
  process.stdout.write(`→ [${rel}] coverage improved — baseline ratcheted:\n`);
  for (const i of improvements) {
    process.stdout.write(`    ${i.m}: ${i.base.toFixed(2)}% → ${i.cur.toFixed(2)}% (+${(i.cur - i.base).toFixed(2)})\n`);
  }
} else {
  process.stdout.write(`✓ [${rel}] coverage matches baseline:\n`);
  for (const m of METRICS) process.stdout.write(`    ${m}: ${current[m].toFixed(2)}%\n`);
}
