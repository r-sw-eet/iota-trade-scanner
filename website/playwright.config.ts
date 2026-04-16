import { defineConfig } from '@playwright/test'

// When PLAYWRIGHT_BASE_URL is set, tests run against that URL and no webServer
// is spawned — useful for pointing at an already-running dev server on a
// non-default port during local development.
const customBaseURL = process.env.PLAYWRIGHT_BASE_URL
const baseURL = customBaseURL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL },
  webServer: customBaseURL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
