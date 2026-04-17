#!/usr/bin/env node
/**
 * Ratcheting coverage guard.
 *
 * Reads api/coverage/coverage-summary.json (produced by `npm run test:cov`)
 * and compares the global totals against api/.coverage-baseline.json:
 *
 *   - If any metric fell below the baseline (minus EPSILON), exit 1.
 *   - If all metrics held or improved, pass. When any improved, overwrite
 *     the baseline file so the new high-water mark is the new floor.
 *
 * The pre-commit hook runs this after `test:cov` and, when the baseline
 * file is updated, `git add`s it so the improvement is carried forward in
 * the commit. First-run bootstrap: if no baseline exists, one is created.
 *
 * Exit codes:
 *   0 — coverage held or improved (baseline possibly updated)
 *   1 — regression (or missing summary)
 *
 * Usage (standalone):
 *   node scripts/check-coverage.js
 */

const fs = require('fs');
const path = require('path');

const API_ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(API_ROOT, '.coverage-baseline.json');
const SUMMARY_PATH = path.join(API_ROOT, 'coverage', 'coverage-summary.json');
const EPSILON = 0.01; // percentage-point tolerance for float noise
const METRICS = ['statements', 'branches', 'functions', 'lines'];

function die(msg, code = 1) {
  process.stderr.write(msg.endsWith('\n') ? msg : msg + '\n');
  process.exit(code);
}

if (!fs.existsSync(SUMMARY_PATH)) {
  die(`✗ No coverage summary at ${SUMMARY_PATH}. Run "npm run test:cov" first.`);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
const current = {};
for (const m of METRICS) current[m] = summary.total[m].pct;

if (!fs.existsSync(BASELINE_PATH)) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
  process.stdout.write(`→ No baseline yet. Wrote initial baseline:\n`);
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
  process.stderr.write('✗ Coverage regressed below baseline:\n');
  for (const r of regressions) {
    process.stderr.write(`    ${r.m}: ${r.base.toFixed(2)}% → ${r.cur.toFixed(2)}% (-${(r.base - r.cur).toFixed(2)})\n`);
  }
  process.stderr.write('\n  Add tests to restore coverage, or (last resort) edit api/.coverage-baseline.json.\n');
  process.exit(1);
}

if (improvements.length) {
  // Ratchet: persist the improved numbers as the new floor.
  const next = { ...baseline, ...current };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
  process.stdout.write('→ Coverage improved. Baseline ratcheted:\n');
  for (const i of improvements) {
    process.stdout.write(`    ${i.m}: ${i.base.toFixed(2)}% → ${i.cur.toFixed(2)}% (+${(i.cur - i.base).toFixed(2)})\n`);
  }
} else {
  process.stdout.write('✓ Coverage matches baseline:\n');
  for (const m of METRICS) process.stdout.write(`    ${m}: ${current[m].toFixed(2)}%\n`);
}
