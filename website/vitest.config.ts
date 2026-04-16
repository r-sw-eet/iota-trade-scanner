import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/unit/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['composables/**/*.ts', 'components/**/*.vue', 'pages/**/*.vue'],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
  },
})
