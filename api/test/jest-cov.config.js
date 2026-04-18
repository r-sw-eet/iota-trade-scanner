// Combined coverage config: runs both unit specs and functional specs in
// one jest invocation so a single lcov report covers the full codebase.
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/test/**/*.functional-spec.ts',
  ],
  testTimeout: 30000,
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/backfill-senders.ts',
    '!src/scan-unattributed-cli.ts',
    '!src/app.module.ts',
    '!src/**/*.module.ts',
    '!src/**/schemas/**',
    '!src/**/*.interface.ts',
    '!src/ecosystem/projects/**',
    '!src/ecosystem/teams/**',
  ],
  coverageDirectory: 'coverage',
  // Emit a machine-readable summary so scripts/check-coverage.js can compare
  // the current run against api/.coverage-baseline.json (ratcheting guard).
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
