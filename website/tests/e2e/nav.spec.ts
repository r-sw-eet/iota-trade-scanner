import { test, expect } from '@playwright/test'

const snapshot = {
  epoch: 346,
  totalSupply: 4_870_000_000,
  circulatingSupply: 4_400_000_000,
  totalStaked: 2_440_000_000,
  circulatingPercentage: 90.34,
  stakingRatio: 50.14,
  validatorCount: 72,
  validatorAvgApy: 10.28,
  storageFundTotal: 35_400,
  validatorTargetReward: 767_000,
  networkTotalTransactions: 618_380_000,
  checkpointCount: 131_040_000,
  epochGasBurned: 13.82,
  epochTransactions: 1_700_000,
  gasPerTransaction: 0.00000812,
  epochStorageNetInflow: 3.6467,
  storagePrice: 76,
  timestamp: new Date('2026-04-16T11:00:00Z').toISOString(),
}

const ecosystem = {
  totalProjects: 2,
  totalEvents: 50_000,
  totalStorageIota: 1.5,
  networkTxTotal: 618_170_000,
  txRates: { perYear: 679_620_000, perMonth: 55_860_000, perWeek: 13_030_000, perDay: 1_860_000, perHour: 77_600, perMinute: 1_300, perSecond: 21.55 },
  l1: [
    {
      name: 'Virtue Pool',
      slug: '6b4112-virtue-pool',
      category: 'Stability Pool',
      description: 'Virtue stability pool module',
      events: 43_874,
      eventsCapped: false,
      uniqueSenders: 0,
      storageIota: 0.4361,
      tvl: 3_680_000,
      packages: 7,
      layer: 'L1',
      packageAddress: '0x6b41121305e1e63bcbdf43e8335d19038c13707818d7dabef65d3d35732a6ed4',
      team: { id: 'virtue-pool', name: 'Virtue Pool (separate deployer)' },
    },
    {
      name: 'Orphan Project',
      slug: 'abc-orphan',
      category: 'Unknown',
      description: 'No attributed team',
      events: 100,
      eventsCapped: false,
      uniqueSenders: 0,
      storageIota: 0.01,
      tvl: null,
      packages: 1,
      layer: 'L1',
      packageAddress: '0xabc',
      team: null,
    },
  ],
  l2: [],
}

const team = {
  id: 'virtue-pool',
  name: 'Virtue Pool (separate deployer)',
  description: 'Balance tracking and accounting module for Virtue stability pool',
  deployers: ['0xf67d0193e9cd65c3c8232dbfe0694eb9e14397326bdc362a4fe9d590984f5a12'],
  projects: [{ slug: '6b4112-virtue-pool', name: 'Virtue Pool', category: 'Stability Pool', layer: 'L1' }],
}

test.describe('dashboard nav', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/snapshots/latest', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }),
    )
    await page.route('**/api/v1/snapshots/epochs', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    )
    await page.route('**/api/v1/ecosystem', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ecosystem) }),
    )
    await page.route('**/api/v1/ecosystem/teams/virtue-pool', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(team) }),
    )
  })

  test('sticky nav exposes all five buckets', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav').first()
    await expect(nav.getByRole('button', { name: 'Network' })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Economics' })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Ecosystem' })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'How it works' })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Developers' })).toBeVisible()
  })

  test('ecosystem sub-tier is hidden until ecosystem is active', async ({ page }) => {
    await page.goto('/')
    const teamsBtn = page.locator('nav button', { hasText: 'Teams' })
    await expect(teamsBtn).toBeHidden()

    await page.locator('nav').first().getByRole('button', { name: 'Ecosystem' }).click()
    await expect(teamsBtn).toBeVisible()
    await expect(page.locator('nav button', { hasText: 'Projects' })).toBeVisible()
  })

  test('teams tab renders the teams table and row click routes to /team/<id>', async ({ page }) => {
    await page.goto('/')
    await page.locator('nav').first().getByRole('button', { name: 'Ecosystem' }).click()
    await page.locator('nav button', { hasText: 'Teams' }).click()

    const teamsTable = page.locator('#ecosystem-teams table')
    await expect(teamsTable).toBeVisible()
    await expect(teamsTable.getByText('Virtue Pool (separate deployer)')).toBeVisible()

    await teamsTable.locator('tbody tr').first().click()
    await expect(page).toHaveURL(/\/team\/virtue-pool$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Virtue Pool (separate deployer)' })).toBeVisible()
  })

  test('useful ecosystem links are rendered at the bottom of Developers', async ({ page }) => {
    await page.goto('/')
    await page.locator('nav').first().getByRole('button', { name: 'Developers' }).click()
    const explorerLink = page.getByRole('link', { name: /IOTA Explorer/ })
    await expect(explorerLink).toBeVisible()
    await expect(explorerLink).toHaveAttribute('href', /explorer\.iota\.org/)
  })
})
