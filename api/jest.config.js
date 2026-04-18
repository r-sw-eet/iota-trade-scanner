/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!main.ts',
    '!backfill-senders.ts',
    '!scan-unattributed-cli.ts',
    '!app.module.ts',
    '!**/*.module.ts',
    '!**/schemas/**',
    '!**/*.interface.ts',
    '!ecosystem/projects/**',
    '!ecosystem/teams/**',
  ],
  coverageDirectory: '../coverage',
};
