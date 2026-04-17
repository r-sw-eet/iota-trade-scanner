import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/unit/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Pages are exercised by Playwright e2e (tests/e2e), not Vitest — e2e
      // runs don't feed Vitest coverage, so including them here would just
      // drag the reported numbers down with false uncovered lines.
      // ProjectCharts is a thin Chart.js wrapper with no branching logic
      // worth unit-testing; e2e covers its rendering.
      include: ['composables/**/*.ts', 'components/**/*.vue'],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        'components/ProjectCharts.vue',
      ],
    },
  },
})
