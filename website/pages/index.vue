<script setup lang="ts">
import { Bar, Doughnut } from 'vue-chartjs'

const { $api } = useApi()
const { formatCompact, formatPercent, formatIota } = useIota()

const snapshot = ref<any>(null)
const ecosystem = ref<any>(null)
const loading = ref(true)
const error = ref(false)

const ecosystemLoading = ref(true)
const l1Visible = ref(10)
const l2Visible = ref(10)
const teamsVisible = ref(10)
const unattributedVisible = ref(20)
const l1EventsChartVisible = ref(10)
const l1StorageChartVisible = ref(10)
const l2TvlChartVisible = ref(10)
const shadeTeamless = ref(true)
const hideIotaFoundation = ref(true)
const hideCollectibles = ref(true)

/**
 * Activity time-window selector. `all` = lifetime event counters from the
 * current snapshot (default, preserves pre-2026-04-20 dashboard behaviour).
 * Anything else fetches `/ecosystem/growth-ranking?window=X` and re-renders
 * the Events columns as deltas over that window — attributed project rows
 * and unattributed deployer clusters both re-sort. Single dropdown replaces
 * separate "leaderboard" views / toggles.
 */
type ActivityWindow = 'all' | '24h' | '7d' | '30d'
const activityWindow = ref<ActivityWindow>('all')
const ranking = ref<{ items: Array<{ scope: string; key: string; eventsDelta: number; transactionsDelta: number; uniqueSendersDelta: number; uniqueWalletsReachDelta: number; packagesDelta: number; eventsCapped: boolean; transactionsCapped: boolean }> } | null>(null)
const rankingLoading = ref(false)

/** Lookup: row key (project slug for attributed, deployer address for unattributed) → eventsDelta. Empty when window=all. */
const eventsDeltaByKey = computed<Map<string, number>>(() => {
  if (!ranking.value) return new Map()
  const m = new Map<string, number>()
  for (const item of ranking.value.items) m.set(item.key, item.eventsDelta)
  return m
})

/** Lookup: row key → transactionsDelta. Empty when window=all. */
const transactionsDeltaByKey = computed<Map<string, number>>(() => {
  if (!ranking.value) return new Map()
  const m = new Map<string, number>()
  for (const item of ranking.value.items) m.set(item.key, item.transactionsDelta ?? 0)
  return m
})

/**
 * True when the user picked a window (24h/7d/30d) but we don't yet have a
 * snapshot older than that window — so the backend's "null baseline → deltas
 * equal absolute values" path kicks in and the numbers under the `(<window> Δ)`
 * column header are actually lifetime totals, not deltas. Transient: resolves
 * on its own once enough history accumulates (14h+ for 24h, 7d for 7d, etc.).
 * Shown as an inline banner so users don't mistake lifetime totals for deltas.
 */
const windowHasNoBaseline = computed(() => {
  return activityWindow.value !== 'all' && ranking.value !== null && (ranking.value as any).baseline === null
})
const uniqueSendersDeltaByKey = computed<Map<string, number>>(() => {
  if (!ranking.value) return new Map()
  const m = new Map<string, number>()
  for (const item of ranking.value.items) m.set(item.key, item.uniqueSendersDelta)
  return m
})
/**
 * Lookup: row key → `uniqueWalletsReachDelta`. Powers the `Wallets*` column's
 * windowed delta. Reach = |senders ∪ holders|; falls back to
 * `uniqueSendersDelta` when the project has no `countTypes` (absent field).
 */
const uniqueWalletsReachDeltaByKey = computed<Map<string, number>>(() => {
  if (!ranking.value) return new Map()
  const m = new Map<string, number>()
  for (const item of ranking.value.items) {
    m.set(item.key, item.uniqueWalletsReachDelta ?? item.uniqueSendersDelta ?? 0)
  }
  return m
})

watch(activityWindow, async (w) => {
  if (w === 'all') { ranking.value = null; return }
  rankingLoading.value = true
  try {
    ranking.value = await $api<any>(`/ecosystem/growth-ranking?window=${w}&scope=all`)
  } catch (e) {
    ranking.value = null
  } finally {
    rankingLoading.value = false
  }
})

/** Row key used by the ranking lookups. Attributed rows key on `slug`; unattributed clusters key on `deployer`. */
function rowKey(row: any): string {
  return row.slug ?? row.deployer ?? ''
}
/** Displayed events value — either the lifetime total (window=all) or the windowed delta. */
function rowEvents(row: any): number {
  if (activityWindow.value === 'all') return row.events ?? 0
  return eventsDeltaByKey.value.get(rowKey(row)) ?? 0
}
/**
 * Displayed `Wallets*` reach count — `|senders ∪ holders|` deduped at classify
 * time (`plans/plan_object_count.md`). Falls back to `uniqueSenders` for
 * projects without `countTypes` declared. Window delta uses
 * `uniqueWalletsReachDelta`; API always populates both fields.
 */
function rowUniqueSenders(row: any): number {
  if (activityWindow.value === 'all') return row.uniqueWalletsReach ?? row.uniqueSenders ?? 0
  return uniqueWalletsReachDeltaByKey.value.get(rowKey(row)) ?? 0
}
/**
 * Displayed TX count — lifetime total on `window=all`, windowed delta otherwise.
 * Rescues Salus-shape (object-mint) and TWIN-shape (anchoring) projects whose
 * real activity under-reports as `events`. See `plans/plan_tx_count.md`.
 */
function rowTransactions(row: any): number {
  if (activityWindow.value === 'all') return row.transactions ?? 0
  return transactionsDeltaByKey.value.get(rowKey(row)) ?? 0
}

function isIotaFoundation(p: any): boolean {
  // Narrow "Hide IOTA Foundation" filter: hides only the team flagged as
  // IF proper. TLIP (IF × TMEA partnership), TWIN Foundation (IF-co-founded
  // Swiss sibling), and IF Testing remain visible — they're IF-adjacent
  // but not the same entity, and users typically want to see that
  // ecosystem activity even when they hide IF's own product rows.
  return p?.team?.isIotaFoundationFamily === true
}

const l1Filtered = computed(() => {
  if (!ecosystem.value) return []
  let rows = ecosystem.value.l1 as any[]
  if (hideIotaFoundation.value) rows = rows.filter((p: any) => !isIotaFoundation(p))
  if (hideCollectibles.value) rows = rows.filter((p: any) => !p.isCollectible)
  return rows
})

// --- Sorting ---
type SortDir = 'asc' | 'desc'
type L1Key = 'name' | 'team' | 'category' | 'events' | 'transactions' | 'uniqueSenders' | 'storageIota' | 'tvl' | 'packages'
type L2Key = 'name' | 'category' | 'tvl'
type TeamsKey = 'name' | 'categories' | 'projectCount' | 'events' | 'storageIota' | 'tvl'
type UnattributedKey = 'deployer' | 'packages' | 'storageIota' | 'events' | 'transactions'

const l1Sort = ref<{ key: L1Key | null; dir: SortDir }>({ key: 'events', dir: 'desc' })
const l2Sort = ref<{ key: L2Key | null; dir: SortDir }>({ key: 'tvl', dir: 'desc' })
const teamsSort = ref<{ key: TeamsKey | null; dir: SortDir }>({ key: 'events', dir: 'desc' })
const unattributedSort = ref<{ key: UnattributedKey | null; dir: SortDir }>({ key: 'packages', dir: 'desc' })

function toggleL1Sort(key: L1Key) {
  l1Sort.value = l1Sort.value.key === key
    ? { key, dir: l1Sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: 'desc' }
}
function toggleL2Sort(key: L2Key) {
  l2Sort.value = l2Sort.value.key === key
    ? { key, dir: l2Sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: 'desc' }
}
function toggleTeamsSort(key: TeamsKey) {
  teamsSort.value = teamsSort.value.key === key
    ? { key, dir: teamsSort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: 'desc' }
}
function toggleUnattributedSort(key: UnattributedKey) {
  unattributedSort.value = unattributedSort.value.key === key
    ? { key, dir: unattributedSort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: 'desc' }
}

function formatSyncTime(ts: string | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function sortValue(p: any, key: string): any {
  if (key === 'team') return (p.team?.name || '').toLowerCase()
  if (key === 'name' || key === 'category' || key === 'categories') return (p[key] || '').toLowerCase()
  // For TVL, shared-slug siblings carry the same numeric value as their primary via
  // `tvlShared`. Fall back to it so siblings sort alongside the primary rather than
  // dropping to zero. The primary-above-sibling tie-break is applied in sortRows.
  if (key === 'tvl') return p.tvl ?? p.tvlShared ?? 0
  // When a time-window is active, sorting by `events` / `uniqueSenders`
  // operates on the delta, not the lifetime total — this is what turns the
  // existing tables into time-windowed leaderboards without any new views.
  if (key === 'events') return rowEvents(p)
  if (key === 'transactions') return rowTransactions(p)
  if (key === 'uniqueSenders') return rowUniqueSenders(p)
  return p[key] ?? 0
}
function sortRows(rows: any[], sort: { key: string | null; dir: SortDir }) {
  if (!sort.key) return rows
  const { key, dir } = sort
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key), bv = sortValue(b, key)
    if (av < bv) return -1 * sign
    if (av > bv) return 1 * sign
    if (key === 'tvl') {
      // At equal TVL amounts, a naked TVL (primary) always ranks above a parenthesized
      // TVL (shared-slug sibling), regardless of sort direction. This keeps the
      // canonical row pinned above its overlapping neighbours when sorting by TVL.
      const aIsPrimary = a.tvl != null ? 1 : 0
      const bIsPrimary = b.tvl != null ? 1 : 0
      return bIsPrimary - aIsPrimary
    }
    return 0
  })
}
function sortGlyph(current: { key: string | null; dir: SortDir }, key: string): string {
  if (current.key !== key) return '⇅'
  return current.dir === 'asc' ? '↑' : '↓'
}
function sortActive(current: { key: string | null; dir: SortDir }, key: string): boolean {
  return current.key === key
}

const l1Sorted = computed(() => sortRows(l1Filtered.value, l1Sort.value))
const l2Sorted = computed(() => sortRows(ecosystem.value?.l2 ?? [], l2Sort.value))
const unattributedSorted = computed(() => sortRows(ecosystem.value?.unattributed ?? [], unattributedSort.value))

function shortAddr(addr: string): string {
  if (!addr || addr.length < 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
const ecosystemError = ref('')

// --- Nav state ---
const activeSection = ref('network') // nav state
const activeEcoTab = ref<'projects' | 'teams'>('projects')
let observer: IntersectionObserver | null = null

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (['network', 'economics', 'ecosystem', 'architecture', 'sources'].includes(id)) {
    activeSection.value = id
  }
  // Ecosystem section has an extra sub-tier row in the sticky nav, so reserve more space
  const offset = id === 'ecosystem' || id === 'ecosystem-projects' || id === 'ecosystem-teams' ? 112 : 72
  const y = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: y, behavior: 'smooth' })
}

function goToEcoTab(tab: 'projects' | 'teams') {
  activeEcoTab.value = tab
  nextTick(() => {
    const el = document.getElementById('ecosystem')
    if (!el) return
    const rect = el.getBoundingClientRect()
    const needsScroll = rect.top > 200 || rect.bottom < 200
    if (needsScroll) {
      activeSection.value = 'ecosystem'
      window.scrollTo({ top: rect.top + window.scrollY - 112, behavior: 'smooth' })
    }
  })
}

function copyCmd(text: string) {
  navigator.clipboard.writeText(text)
}

const navItems = [
  { id: 'network', label: 'Network' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'economics', label: 'Economics' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'sources', label: 'Sources' },
]

const ecosystemLinks = [
  { label: 'IOTA Explorer', description: 'Official block explorer for IOTA Rebased mainnet — packages, objects, addresses, transactions.', href: 'https://explorer.iota.org/?network=mainnet' },
  { label: 'IOTAscan', description: 'Alternative community explorer for IOTA mainnet.', href: 'https://iotascan.com/' },
  { label: 'IOTA Documentation', description: 'Developer docs for the IOTA protocol, Move VM, and tooling.', href: 'https://docs.iota.org/' },
  { label: 'IOTA Foundation', description: 'Foundation website — governance, news, ecosystem programs.', href: 'https://www.iota.org/' },
  { label: 'IOTA JSON-RPC', description: 'Public mainnet JSON-RPC endpoint used by this dashboard.', href: 'https://api.mainnet.iota.cafe' },
  { label: 'IOTA GraphQL', description: 'Public mainnet GraphQL endpoint — events, packages, epochs.', href: 'https://graphql.mainnet.iota.cafe' },
  { label: 'DefiLlama — IOTA', description: 'TVL and protocol data for IOTA L1 + IOTA EVM chains.', href: 'https://defillama.com/chain/IOTA' },
  { label: 'IOTA on GitHub', description: 'Source code for the IOTA node, SDKs, and ecosystem tools.', href: 'https://github.com/iotaledger' },
]

const mainCurlExamples = [
  {
    label: 'Get network system state',
    description: 'Total supply, staking, storage fund, validators, epoch — the main system overview.',
    command: `curl -s -X POST https://api.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"iotax_getLatestIotaSystemState","params":[]}'`,
  },
  {
    label: 'Get circulating supply',
    description: 'Circulating supply with percentage and checkpoint reference.',
    command: `curl -s -X POST https://api.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"iotax_getCirculatingSupply","params":[]}'`,
  },
  {
    label: 'Get protocol config (storage pricing, gas, inflation)',
    description: 'Storage pricing (storage_gas_price, obj_data_cost_refundable), validator_target_reward (daily inflation), gas model.',
    command: `curl -s -X POST https://api.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"iota_getProtocolConfig","params":[]}'`,
  },
  {
    label: 'Get epoch gas burn and storage fund flow',
    description: 'Gas fees burned, storage fund inflows/outflows, and transaction count for a specific epoch. Change the epoch ID to query different days.',
    command: `curl -s -X POST https://graphql.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{ epoch(id: 331) { epochId totalGasFees totalTransactions fundSize fundInflow fundOutflow netInflow } }"}'`,
  },
  {
    label: 'Get validator APYs',
    description: 'Current APY for all validators on the network.',
    command: `curl -s -X POST https://api.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"iotax_getValidatorsApy","params":[]}'`,
  },
  {
    label: 'Discover all Move packages (projects)',
    description: 'Paginate through all deployed packages. Each package has an address and a list of Move modules, written as package::module — used as the GraphQL `emittingModule` filter when querying events.',
    command: `curl -s -X POST https://graphql.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{ packages(first: 50) { nodes { address storageRebate modules { nodes { name } } } pageInfo { hasNextPage endCursor } } }"}'`,
  },
  {
    label: 'Count events for a specific module',
    description: 'Example: query events emitted by a package::module. Replace the address and module name with any package discovered above. Use endCursor for pagination.',
    command: `curl -s -X POST https://graphql.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{ events(filter: { emittingModule: \\"0x6b41121305e1e63bcbdf43e8335d19038c13707818d7dabef65d3d35732a6ed4::stability_pool\\" }, first: 50) { nodes { timestamp type { repr } json sender { address } } pageInfo { hasNextPage endCursor } } }"}'`,
  },
  {
    label: 'Get DefiLlama TVL for all IOTA protocols',
    description: 'Fetch all protocols and filter for IOTA/IOTA EVM chains, printing only the IOTA-chain slice (not the cross-chain total). This is how we populate L1 TVL and L2 EVM project data.',
    command: 'curl -s \'https://api.llama.fi/protocols\' | \\\n  python3 -c "import json,sys; [print(p[\'name\'], p.get(\'chainTvls\',{}).get(\'IOTA EVM\', p.get(\'chainTvls\',{}).get(\'IOTA\', 0))) for p in json.load(sys.stdin) if any(c in p.get(\'chains\',[]) for c in [\'IOTA\',\'IOTA EVM\'])]"',
  },
]

onMounted(async () => {
  try {
    snapshot.value = await $api('/snapshots/latest')
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
  // Ecosystem loads independently
  try {
    const res = await fetch(`${useRuntimeConfig().public.apiBase}/ecosystem`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    ecosystem.value = await res.json()
  } catch (e: any) {
    ecosystemError.value = e?.message || 'Unknown error'
  } finally {
    ecosystemLoading.value = false
  }

  // Track which section is in view for active-nav highlighting
  await nextTick()
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length) {
        activeSection.value = visible[0].target.id
        nextTick(() => {
          const btn = document.querySelector(`nav button[data-section="${visible[0].target.id}"]`)
          btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        })
      }
    },
    { rootMargin: '-72px 0px -60% 0px', threshold: 0 },
  )
  navItems.forEach(({ id }) => {
    const el = document.getElementById(id)
    if (el) observer!.observe(el)
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

// --- Reality Check interactive state ---
// Sliders use 0-100 linear range, mapped to exponential multipliers
const rcTxSlider = ref(0)
const rcGasSlider = ref(0)
// 0→1x, 50→~316x, 100→100000x (logarithmic feel)
const rcTxMultiplier = computed(() => Math.round(Math.pow(10, rcTxSlider.value / 20)))
// 0→1x, 50→10x, 100→100x
const rcGasMultiplier = computed(() => Math.round(Math.pow(10, rcGasSlider.value / 50) * 10) / 10)

const rcData = computed(() => {
  if (!snapshot.value) return null
  const s = snapshot.value
  const dailyInflation = s.validatorTargetReward
  const currentDailyTx = s.epochTransactions || 1_730_000
  const currentGasPerTx = s.gasPerTransaction || 0.00001
  const currentDailyGasBurn = s.epochGasBurned || 18

  const projectedDailyTx = currentDailyTx * rcTxMultiplier.value
  const projectedGasPerTx = currentGasPerTx * (rcGasMultiplier.value || 1)
  const projectedDailyGasBurn = projectedDailyTx * projectedGasPerTx
  const netDailyInflation = dailyInflation - projectedDailyGasBurn
  const deflationRatio = projectedDailyGasBurn / dailyInflation * 100
  const isDeflationary = netDailyInflation < 0

  const breakEvenMultiplier = currentDailyGasBurn > 0
    ? dailyInflation / currentDailyGasBurn
    : Infinity

  return {
    dailyInflation,
    currentDailyTx,
    currentGasPerTx,
    currentDailyGasBurn,
    projectedDailyTx,
    projectedGasPerTx,
    projectedDailyGasBurn,
    netDailyInflation,
    deflationRatio,
    isDeflationary,
    breakEvenMultiplier,
  }
})

// --- Charts ---
const supplyChartData = computed(() => {
  if (!snapshot.value) return null
  const s = snapshot.value
  return {
    labels: ['Free Circulating', 'Staked', 'Locked (non-circulating)'],
    datasets: [{ data: [s.circulatingSupply - s.totalStaked, s.totalStaked, s.totalSupply - s.circulatingSupply], backgroundColor: ['#14b8a680', '#3b82f680', '#71717a80'], borderColor: ['#14b8a6', '#3b82f6', '#71717a'], borderWidth: 1 }],
  }
})
const supplyChartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { color: '#a1a1aa', padding: 16 } },
    tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${formatCompact(ctx.raw)} IOTA (${((ctx.raw / snapshot.value.totalSupply) * 100).toFixed(1)}%)` } },
  },
}

const inflationChartData = computed(() => {
  if (!snapshot.value) return null
  return {
    labels: ['Daily Inflation (minted)', 'Daily Gas Burned', 'Storage Fund (total)'],
    datasets: [{ data: [snapshot.value.validatorTargetReward, snapshot.value.epochGasBurned || 18, snapshot.value.storageFundTotal], backgroundColor: ['#ef444480', '#22c55e80', '#3b82f680'], borderColor: ['#ef4444', '#22c55e', '#3b82f6'], borderWidth: 1 }],
  }
})
const inflationChartOptions = {
  responsive: true, maintainAspectRatio: false,
  scales: {
    x: { ticks: { color: '#a1a1aa' }, grid: { display: false } },
    y: { type: 'logarithmic' as const, ticks: { color: '#71717a', callback: (v: any) => formatCompact(Number(v)) }, grid: { color: '#2a2a3020' } },
  },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${formatIota(ctx.raw)} IOTA` } } },
}

const colors = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

const l1EventProjects = computed(() =>
  l1Filtered.value.filter((p: any) => p.events > 0).sort((a: any, b: any) => b.events - a.events),
)
const l1StorageProjects = computed(() =>
  l1Filtered.value.filter((p: any) => p.storageIota > 0.01).sort((a: any, b: any) => b.storageIota - a.storageIota),
)
const l2TvlProjects = computed(() => {
  if (!ecosystem.value) return []
  return [...(ecosystem.value.l2 || [])].filter((p: any) => (p.tvl ?? 0) > 0).sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))
})

const l1Stats = computed(() => {
  const projects = l1Filtered.value
  const teamIds = new Set<string>()
  let events = 0, storage = 0
  for (const p of projects) {
    if (p.team?.id) teamIds.add(p.team.id)
    events += p.events || 0
    storage += p.storageIota || 0
  }
  return { projects: projects.length, teams: teamIds.size, events, storage }
})

const l2Stats = computed(() => {
  const projects = ecosystem.value?.l2 || []
  let tvl = 0
  for (const p of projects) tvl += p.tvl || 0
  return { projects: projects.length, tvl }
})

// Teams view: aggregate all projects (L1+L2) by attributed team
const teamsAggregated = computed(() => {
  if (!ecosystem.value) return []
  const all = [...(ecosystem.value.l1 || []), ...(ecosystem.value.l2 || [])]
  const map = new Map<string, any>()
  for (const p of all) {
    if (!p.team?.name) continue
    const key = p.team.name
    const existing = map.get(key) || {
      name: p.team.name,
      team: p.team,
      projectCount: 0,
      events: 0,
      storageIota: 0,
      tvl: 0,
      _categories: new Set<string>(),
    }
    existing.projectCount += 1
    existing.events += p.events || 0
    existing.storageIota += p.storageIota || 0
    existing.tvl += p.tvl || 0
    if (p.category) existing._categories.add(p.category)
    map.set(key, existing)
  }
  return Array.from(map.values()).map(t => ({
    ...t,
    categories: Array.from(t._categories).join(', '),
  }))
})
const teamsSorted = computed(() => sortRows(teamsAggregated.value, teamsSort.value))

const projectEventsChartData = computed(() => {
  const sliced = l1EventProjects.value.slice(0, l1EventsChartVisible.value)
  if (!sliced.length) return null
  return {
    labels: sliced.map((p: any) => p.name),
    datasets: [{ data: sliced.map((p: any) => p.events), backgroundColor: sliced.map((_: any, i: number) => colors[i % colors.length] + '80'), borderColor: sliced.map((_: any, i: number) => colors[i % colors.length]), borderWidth: 1 }],
  }
})
const projectEventsChartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#a1a1aa', padding: 8, font: { size: 10 } } },
    tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw.toLocaleString()} events` } },
  },
}

const projectStorageChartData = computed(() => {
  const sliced = l1StorageProjects.value.slice(0, l1StorageChartVisible.value)
  if (!sliced.length) return null
  return {
    labels: sliced.map((p: any) => p.name),
    datasets: [{ data: sliced.map((p: any) => p.storageIota), backgroundColor: sliced.map((_: any, i: number) => colors[i % colors.length] + '80'), borderColor: sliced.map((_: any, i: number) => colors[i % colors.length]), borderWidth: 1 }],
  }
})
const projectStorageChartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#a1a1aa', padding: 8, font: { size: 10 } } },
    tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw.toFixed(4)} IOTA` } },
  },
}

const projectTvlChartData = computed(() => {
  const sliced = l2TvlProjects.value.slice(0, l2TvlChartVisible.value)
  if (!sliced.length) return null
  return {
    labels: sliced.map((p: any) => p.name),
    datasets: [{ data: sliced.map((p: any) => p.tvl), backgroundColor: sliced.map((_: any, i: number) => colors[i % colors.length] + '80'), borderColor: sliced.map((_: any, i: number) => colors[i % colors.length]), borderWidth: 1 }],
  }
})
const projectTvlChartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#a1a1aa', padding: 8, font: { size: 10 } } },
    tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: $${formatCompact(ctx.raw)}` } },
  },
}
</script>

<template>
  <div>
    <!-- === STICKY TOP NAV (sits below the disclaimer banner from layout) === -->
    <nav class="sticky top-0 md:top-9 z-30 bg-scanner-bg/95 backdrop-blur border-b border-scanner-border">
      <div class="max-w-7xl mx-auto px-6 md:px-10">
        <div class="overflow-x-auto scrollbar-hide h-14 flex items-center">
          <div class="flex items-center gap-1 md:gap-2 mx-auto whitespace-nowrap">
            <button
              v-for="item in navItems"
              :key="item.id"
              :data-section="item.id"
              @click="scrollToSection(item.id)"
              class="px-3 py-1.5 text-sm rounded-xs transition-colors relative shrink-0"
              :class="activeSection === item.id
                ? 'text-scanner-accent font-medium'
                : 'text-[#a1a1aa] hover:text-[#f4f4f5]'"
            >
              {{ item.label }}
              <span
                v-if="activeSection === item.id"
                class="absolute left-2 right-2 -bottom-px h-0.5 bg-scanner-accent rounded-full"
              />
            </button>
          </div>
        </div>
        <!-- Ecosystem sub-tier (visible only when Ecosystem section is active) -->
        <div
          v-show="activeSection === 'ecosystem'"
          class="flex items-center gap-2 pb-2 pt-1 border-t border-scanner-border-subtle"
        >
          <span class="text-xs text-[#52525b] mr-1">View:</span>
          <button
            @click="goToEcoTab('projects')"
            class="px-2.5 py-1 text-xs rounded-xs transition-colors border"
            :class="activeEcoTab === 'projects'
              ? 'bg-scanner-accent/10 text-scanner-accent border-scanner-accent/30'
              : 'text-[#a1a1aa] hover:text-[#f4f4f5] border-transparent'"
          >
            Projects
          </button>
          <button
            @click="goToEcoTab('teams')"
            class="px-2.5 py-1 text-xs rounded-xs transition-colors border"
            :class="activeEcoTab === 'teams'
              ? 'bg-scanner-accent/10 text-scanner-accent border-scanner-accent/30'
              : 'text-[#a1a1aa] hover:text-[#f4f4f5] border-transparent'"
          >
            Teams
          </button>
        </div>
      </div>
    </nav>

    <div class="p-6 md:p-10 max-w-7xl mx-auto">
      <div class="mb-10">
        <h1 class="text-3xl font-bold text-scanner-accent mb-1">IOTA Trade Scanner</h1>
        <p class="text-[#71717a] text-sm">Live mainnet data — what's actually happening on-chain</p>
      </div>

      <div v-if="loading" class="text-[#71717a]">Fetching live data from IOTA mainnet...</div>
      <div v-else-if="error" class="text-status-error">Failed to load data from API. Is the backend running?</div>

      <template v-else-if="snapshot">
        <!-- ==================================================== -->
        <!-- === NETWORK                                       === -->
        <!-- ==================================================== -->
        <section id="network" class="mb-20 scroll-mt-20">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-[#f4f4f5] mb-1">Network</h2>
            <p class="text-[#71717a] text-sm">The state of the chain and how busy it is.</p>
            <p class="text-[#52525b] text-xs mt-1">Last sync: {{ formatSyncTime(snapshot?.timestamp) }} · Next sync in 30 min</p>
          </div>

          <!-- Core Metrics -->
          <div class="mb-10">
            <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wide mb-4">Core Metrics</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Total Supply" :value="formatCompact(snapshot.totalSupply)" subtitle="IOTA" />
              <MetricCard label="Circulating" :value="formatCompact(snapshot.circulatingSupply)" :subtitle="formatPercent(snapshot.circulatingPercentage)" />
              <MetricCard label="Total Staked" :value="formatCompact(snapshot.totalStaked)" :subtitle="`${formatPercent(snapshot.stakingRatio)} of supply`" />
              <MetricCard label="Validators" :value="String(snapshot.validatorCount)" :subtitle="`Avg APY ${formatPercent(snapshot.validatorAvgApy)}`" />
              <MetricCard label="Storage Fund (all time)" :value="formatCompact(snapshot.storageFundTotal)" subtitle="IOTA locked as storage deposits" />
              <MetricCard label="Daily Inflation" :value="formatCompact(snapshot.validatorTargetReward)" subtitle="validator_target_reward" />
              <MetricCard label="Total Transactions" :value="formatCompact(snapshot.networkTotalTransactions)" subtitle="All time" />
              <MetricCard label="Epoch" :value="String(snapshot.epoch)" subtitle="~24h per epoch" />
            </div>
          </div>

          <!-- Supply Distribution + Transaction Rate -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div class="bg-scanner-card border border-scanner-border rounded p-5">
              <h3 class="text-sm font-semibold text-[#a1a1aa] mb-4">Supply Distribution</h3>
              <div class="h-64">
                <Doughnut v-if="supplyChartData" :data="supplyChartData" :options="supplyChartOptions" />
              </div>
            </div>
            <div v-if="ecosystem?.txRates" class="bg-scanner-card border border-scanner-border rounded p-5">
              <h3 class="text-sm font-semibold text-[#a1a1aa] mb-1">Transaction Rate</h3>
              <p class="text-[#52525b] text-xs mb-4">Avg since launch &middot; {{ formatCompact(ecosystem.networkTxTotal) }} total</p>
              <div class="grid grid-cols-2 gap-3">
                <MetricCard label="/ year" :value="formatCompact(ecosystem.txRates.perYear)" />
                <MetricCard label="/ month" :value="formatCompact(ecosystem.txRates.perMonth)" />
                <MetricCard label="/ day" :value="formatCompact(ecosystem.txRates.perDay)" />
                <MetricCard label="/ hour" :value="formatCompact(ecosystem.txRates.perHour)" />
                <MetricCard label="/ minute" :value="formatCompact(ecosystem.txRates.perMinute)" />
                <MetricCard label="/ second" :value="String(ecosystem.txRates.perSecond)" />
              </div>
            </div>
          </div>

          <!-- Historical Trends -->
          <div>
            <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wide mb-1">Historical Trends</h3>
            <p class="text-[#71717a] text-sm mb-6">Per-epoch data since mainnet launch (~332 epochs, 1 epoch = ~24h)</p>
            <EpochCharts />
          </div>
        </section>

        <!-- ==================================================== -->
        <!-- === ECOSYSTEM                                     === -->
        <!-- ==================================================== -->
        <section id="ecosystem" class="mb-20 scroll-mt-20">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-[#f4f4f5] mb-1">Ecosystem</h2>
            <p class="text-[#71717a] text-sm">Who's building on IOTA — projects deployed to mainnet and the teams behind them.</p>
            <p class="text-[#52525b] text-xs mt-1">Last sync: {{ formatSyncTime(ecosystem?.createdAt) }} · Next sync in 6 hours</p>
          </div>

          <p v-if="ecosystemLoading" class="text-[#71717a] text-sm mb-6">Loading ecosystem data (scanning all mainnet packages)...</p>
          <p v-else-if="ecosystemError" class="text-status-error text-sm mb-6">Failed to load ecosystem: {{ ecosystemError }}</p>
          <template v-else-if="ecosystem">
            <!-- ============ Projects view ============ -->
            <div id="ecosystem-projects" class="scroll-mt-28" v-show="activeEcoTab === 'projects'">
              <!-- L1 Move Projects -->
              <div class="mb-12">
                <div class="text-center mb-3">
                  <h3 class="text-sm font-semibold text-scanner-accent">L1 — Move VM ({{ l1Filtered.length }}{{ l1Filtered.length !== ecosystem.l1.length ? ` of ${ecosystem.l1.length}` : '' }} projects)</h3>
                </div>
                <div class="flex items-center justify-center gap-4 mb-4 flex-wrap">
                  <label class="flex items-center gap-2 text-xs text-[#a1a1aa] cursor-pointer select-none" title="Choose an activity window. `All-time` shows lifetime event totals; the other windows switch the Events and Wallets columns to growth deltas over that window, and re-sort all tables by delta. Both attributed projects and unattributed deployer clusters are ranked side-by-side — top of the Unattributed section becomes your triage queue.">
                    Activity:
                    <select v-model="activityWindow" class="bg-scanner-card border border-scanner-border rounded px-2 py-0.5 text-xs text-[#d4d4d8] focus:outline-none focus:border-scanner-accent">
                      <option value="all">All-time</option>
                      <option value="24h">24h</option>
                      <option value="7d">7d</option>
                      <option value="30d">30d</option>
                    </select>
                    <span v-if="rankingLoading" class="text-[#71717a]">loading…</span>
                  </label>
                  <label class="flex items-center gap-2 text-xs text-[#a1a1aa] cursor-pointer select-none" title="Dim projects that are not attributed to a known team">
                    <input v-model="shadeTeamless" type="checkbox" class="accent-scanner-accent" />
                    Shade untagged
                  </label>
                  <label class="flex items-center gap-2 text-xs text-[#a1a1aa] cursor-pointer select-none" title="Hide IOTA Foundation's own rows — the consolidated iota-foundation team (Identity, Notarization, Traceability, Asset Framework, Accreditation, chain primitives) and IF's internal test deployments. TLIP (IF × TMEA) and TWIN Foundation (IF-co-founded) stay visible — distinct entities.">
                    <input v-model="hideIotaFoundation" type="checkbox" class="accent-scanner-accent" />
                    Hide IOTA Foundation
                  </label>
                  <label class="flex items-center gap-2 text-xs text-[#a1a1aa] cursor-pointer select-none" title="Hide dumb PFP / collectible NFT projects (no utility, no RWA anchor — just pictures). RWA / utility NFTs (Salus DWRs, ObjectID authenticity tokens, TruvID document proofs, …) stay visible — only projects explicitly flagged `isCollectible` are dropped.">
                    <input v-model="hideCollectibles" type="checkbox" class="accent-scanner-accent" />
                    Hide collectibles
                  </label>
                </div>
                <p v-if="windowHasNoBaseline" class="text-center text-xs text-amber-400/80 mb-4 max-w-2xl mx-auto">
                  Not enough history for the {{ activityWindow }} window yet — Events and Wallets columns still show lifetime totals. Real deltas appear once snapshots older than the window exist (first snapshot: 2026-04-20 08:01 UTC).
                </p>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <MetricCard label="Identified projects" :value="String(l1Stats.projects)" />
                  <MetricCard label="Teams" :value="String(l1Stats.teams)" />
                  <MetricCard label="Total events" :value="formatCompact(l1Stats.events)" :subtitle="l1Stats.events.toLocaleString()" />
                  <MetricCard label="Total storage" :value="`${l1Stats.storage.toFixed(2)} IOTA`" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div class="bg-scanner-card border border-scanner-border rounded p-5">
                    <h4 class="text-sm font-semibold text-[#a1a1aa] mb-4">Events by Project (top {{ Math.min(l1EventsChartVisible, l1EventProjects.length) }})</h4>
                    <div :style="{ height: `${Math.max(288, (projectEventsChartData?.labels?.length || 0) * 22 + 40)}px` }">
                      <Doughnut v-if="projectEventsChartData" :data="projectEventsChartData" :options="projectEventsChartOptions" />
                      <p v-else class="text-[#52525b] text-sm">No event data yet.</p>
                    </div>
                    <div v-if="l1EventsChartVisible < l1EventProjects.length" class="mt-4 text-center">
                      <button @click="l1EventsChartVisible += 10" class="px-3 py-1.5 text-xs text-scanner-accent border border-scanner-border rounded-xs hover:bg-scanner-elevated transition-colors">
                        Show more ({{ l1EventProjects.length - l1EventsChartVisible }} remaining)
                      </button>
                    </div>
                  </div>
                  <div class="bg-scanner-card border border-scanner-border rounded p-5">
                    <h4 class="text-sm font-semibold text-[#a1a1aa] mb-4">Storage Cost by Project (top {{ Math.min(l1StorageChartVisible, l1StorageProjects.length) }})</h4>
                    <div :style="{ height: `${Math.max(288, (projectStorageChartData?.labels?.length || 0) * 22 + 40)}px` }">
                      <Doughnut v-if="projectStorageChartData" :data="projectStorageChartData" :options="projectStorageChartOptions" />
                      <p v-else class="text-[#52525b] text-sm">No storage data yet.</p>
                    </div>
                    <div v-if="l1StorageChartVisible < l1StorageProjects.length" class="mt-4 text-center">
                      <button @click="l1StorageChartVisible += 10" class="px-3 py-1.5 text-xs text-scanner-accent border border-scanner-border rounded-xs hover:bg-scanner-elevated transition-colors">
                        Show more ({{ l1StorageProjects.length - l1StorageChartVisible }} remaining)
                      </button>
                    </div>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="text-[#71717a] text-sm border-b border-scanner-border select-none">
                        <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleL1Sort('name')">Project<span class="ml-1" :class="sortActive(l1Sort, 'name') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'name') }}</span></th>
                        <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleL1Sort('team')">Team<span class="ml-1" :class="sortActive(l1Sort, 'team') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'team') }}</span></th>
                        <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleL1Sort('category')">Category<span class="ml-1" :class="sortActive(l1Sort, 'category') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'category') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleL1Sort('events')">Events{{ activityWindow !== 'all' ? ` (${activityWindow} Δ)` : '' }}<span class="ml-1" :class="sortActive(l1Sort, 'events') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'events') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" title="MoveCall transaction count across the project's packages — includes calls that don't emit events (rescues Salus / TWIN / Gamifly-shape activity)" @click="toggleL1Sort('transactions')">TXs{{ activityWindow !== 'all' ? ` (${activityWindow} Δ)` : '' }}<span class="ml-1" :class="sortActive(l1Sort, 'transactions') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'transactions') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" title="Wallets* — reach indicator combining senders (distinct TX signers) and holders (distinct NFT owners), deduped. For DeFi / trade projects this is essentially senders; for NFT collections it's mostly holders. See detail page for the breakdown." @click="toggleL1Sort('uniqueSenders')">Wallets*{{ activityWindow !== 'all' ? ` (${activityWindow} Δ)` : '' }}<span class="ml-1" :class="sortActive(l1Sort, 'uniqueSenders') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'uniqueSenders') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleL1Sort('storageIota')">Storage (IOTA)<span class="ml-1" :class="sortActive(l1Sort, 'storageIota') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'storageIota') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleL1Sort('tvl')">TVL<span class="ml-1" :class="sortActive(l1Sort, 'tvl') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'tvl') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleL1Sort('packages')">Packages<span class="ml-1" :class="sortActive(l1Sort, 'packages') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(l1Sort, 'packages') }}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="p in l1Sorted.slice(0, l1Visible)" :key="p.name" class="border-t border-scanner-border-subtle hover:bg-scanner-card-hover cursor-pointer transition-opacity" :class="shadeTeamless && !p.team ? 'opacity-40' : ''" @click="navigateTo(`/project/${p.slug}`)">
                        <td class="py-3 pr-4">
                          <div class="flex items-center gap-3">
                            <ProjectLogo :project="p" size="sm" />
                            <div>
                              <div class="flex items-center gap-2">
                                <span class="text-[#f4f4f5] font-medium text-base">{{ p.name }}</span>
                                <span v-if="p.disclaimer" class="group relative inline-flex" @click.stop>
                                  <svg class="w-4 h-4 text-amber-400 cursor-help" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span class="pointer-events-none invisible group-hover:visible absolute z-20 left-0 top-full mt-2 w-72 p-3 text-xs bg-scanner-card border border-scanner-border rounded text-[#d4d4d8] leading-relaxed shadow-lg normal-case">
                                    <span class="font-semibold text-amber-400 block mb-1">Aggregate bucket</span>
                                    {{ p.disclaimer }}
                                  </span>
                                </span>
                              </div>
                              <p class="text-sm text-[#71717a] truncate max-w-sm">{{ p.description.split('.')[0] }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 pr-4 text-sm" :class="p.team ? 'text-[#d4d4d8]' : 'text-[#52525b]'">{{ p.team?.name || '—' }}</td>
                        <td class="py-3 pr-4 text-sm text-scanner-accent">{{ p.category }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base" :class="rowEvents(p) > 0 ? 'text-[#f4f4f5]' : (rowEvents(p) < 0 ? 'text-[#ef4444]' : 'text-[#52525b]')">{{ activityWindow !== 'all' && rowEvents(p) > 0 ? '+' : '' }}{{ rowEvents(p).toLocaleString() }}{{ p.eventsCapped && activityWindow === 'all' ? '+' : '' }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base" :class="rowTransactions(p) > 0 ? 'text-[#f4f4f5]' : (rowTransactions(p) < 0 ? 'text-[#ef4444]' : 'text-[#52525b]')">{{ activityWindow !== 'all' && rowTransactions(p) > 0 ? '+' : '' }}{{ rowTransactions(p).toLocaleString() }}{{ p.transactionsCapped && activityWindow === 'all' ? '+' : '' }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base" :class="rowUniqueSenders(p) > 0 ? 'text-[#f4f4f5]' : (rowUniqueSenders(p) < 0 ? 'text-[#ef4444]' : 'text-[#52525b]')">{{ activityWindow !== 'all' && rowUniqueSenders(p) > 0 ? '+' : '' }}{{ rowUniqueSenders(p).toLocaleString() }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base text-[#a1a1aa]">{{ p.storageIota.toFixed(4) }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base" :class="p.tvl != null ? 'text-[#a1a1aa]' : (p.tvlShared != null ? 'text-[#71717a]' : 'text-[#52525b]')">
                          <template v-if="p.tvl != null">${{ formatCompact(p.tvl) }}</template>
                          <template v-else-if="p.tvlShared != null">
                            <span :title="`Shared with ${p.tvlSharedWith} — same DefiLlama protocol`">(${{ formatCompact(p.tvlShared) }})</span>
                          </template>
                          <template v-else>—</template>
                        </td>
                        <td class="py-3 pr-4 text-right font-mono text-base text-[#71717a]">{{ p.packages }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="l1Visible < l1Sorted.length" class="mt-4 text-center">
                  <button @click="l1Visible += 10" class="px-4 py-2 text-sm text-scanner-accent border border-scanner-border rounded-sm hover:bg-scanner-card transition-colors">
                    Show more ({{ l1Sorted.length - l1Visible }} remaining)
                  </button>
                </div>
                <p class="mt-3 text-xs text-[#52525b] italic">
                  * <strong>Wallets</strong> combines distinct transaction signers and NFT holders into a deduplicated reach number. Meanings vary by project category — DeFi / trade rows are dominated by signers; NFT collections are dominated by holders. See each project's detail page for the breakdown.
                </p>
              </div>

              <!-- L2 EVM Projects -->
              <div v-if="ecosystem.l2.length" class="mb-8">
                <h3 class="text-sm font-semibold text-status-active text-center mb-4">L2 — EVM ({{ ecosystem.l2.length }} projects, data from DefiLlama)</h3>

                <div class="md:flex md:justify-center mb-6">
                  <div class="grid grid-cols-2 gap-4 w-full md:w-[calc(50%-12px)]">
                    <MetricCard label="Identified projects" :value="String(l2Stats.projects)" />
                    <MetricCard label="Total TVL" :value="`$${formatCompact(l2Stats.tvl)}`" />
                  </div>
                </div>

                <div class="md:flex md:justify-center mb-6">
                  <div class="bg-scanner-card border border-scanner-border rounded p-5 w-full md:w-[calc(50%-12px)]">
                    <h4 class="text-sm font-semibold text-[#a1a1aa] mb-4">TVL by Project (top {{ Math.min(l2TvlChartVisible, l2TvlProjects.length) }})</h4>
                    <div :style="{ height: `${Math.max(288, (projectTvlChartData?.labels?.length || 0) * 22 + 40)}px` }">
                      <Doughnut v-if="projectTvlChartData" :data="projectTvlChartData" :options="projectTvlChartOptions" />
                      <p v-else class="text-[#52525b] text-sm">No TVL data yet.</p>
                    </div>
                    <div v-if="l2TvlChartVisible < l2TvlProjects.length" class="mt-4 text-center">
                      <button @click="l2TvlChartVisible += 10" class="px-3 py-1.5 text-xs text-status-active border border-scanner-border rounded-xs hover:bg-scanner-elevated transition-colors">
                        Show more ({{ l2TvlProjects.length - l2TvlChartVisible }} remaining)
                      </button>
                    </div>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="text-[#71717a] text-sm border-b border-scanner-border select-none">
                        <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" @click="toggleL2Sort('name')">Project<span class="ml-1" :class="sortActive(l2Sort, 'name') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(l2Sort, 'name') }}</span></th>
                        <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" @click="toggleL2Sort('category')">Category<span class="ml-1" :class="sortActive(l2Sort, 'category') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(l2Sort, 'category') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" @click="toggleL2Sort('tvl')">TVL<span class="ml-1" :class="sortActive(l2Sort, 'tvl') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(l2Sort, 'tvl') }}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="p in l2Sorted.slice(0, l2Visible)" :key="p.name" class="border-t border-scanner-border-subtle hover:bg-scanner-card-hover cursor-pointer" @click="navigateTo(`/project/${p.slug}`)">
                        <td class="py-3 pr-4">
                          <div class="flex items-center gap-3">
                            <ProjectLogo :project="p" size="sm" />
                            <div>
                              <span class="text-[#f4f4f5] font-medium text-base">{{ p.name }}</span>
                              <p class="text-sm text-[#71717a] truncate max-w-sm">{{ p.description.split('.')[0] }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 pr-4 text-sm text-status-active">{{ p.category }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base text-[#f4f4f5]">{{ p.tvl ? `$${formatCompact(p.tvl)}` : '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="l2Visible < l2Sorted.length" class="mt-4 text-center">
                  <button @click="l2Visible += 10" class="px-4 py-2 text-sm text-status-active border border-scanner-border rounded-sm hover:bg-scanner-card transition-colors">
                    Show more ({{ l2Sorted.length - l2Visible }} remaining)
                  </button>
                </div>
              </div>

              <!-- Unattributed — deployers whose packages don't match any known project -->
              <div v-if="ecosystem.unattributed?.length" class="mb-8">
                <h3 class="text-sm font-semibold text-status-active text-center mb-2">
                  Unattributed ({{ ecosystem.unattributed.length }} deployer{{ ecosystem.unattributed.length === 1 ? '' : 's' }},
                  {{ ecosystem.totalUnattributedPackages }} package{{ ecosystem.totalUnattributedPackages === 1 ? '' : 's' }})
                </h3>
                <p class="text-xs text-[#71717a] text-center max-w-2xl mx-auto mb-6">
                  Packages published on mainnet that no current project definition claims. Clustered by deployer; sample identifiers are string fields extracted from one Move object per cluster — these are discovery leads, not attributions.
                </p>

                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="text-[#71717a] text-sm border-b border-scanner-border select-none">
                        <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" @click="toggleUnattributedSort('deployer')">Deployer<span class="ml-1" :class="sortActive(unattributedSort, 'deployer') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(unattributedSort, 'deployer') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" @click="toggleUnattributedSort('packages')">Packages<span class="ml-1" :class="sortActive(unattributedSort, 'packages') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(unattributedSort, 'packages') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" @click="toggleUnattributedSort('events')">Events{{ activityWindow !== 'all' ? ` (${activityWindow} Δ)` : '' }}<span class="ml-1" :class="sortActive(unattributedSort, 'events') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(unattributedSort, 'events') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" title="MoveCall transaction count across the cluster's packages — rescues 0-events-but-real-activity deployers from the discovery queue bottom" @click="toggleUnattributedSort('transactions')">TXs{{ activityWindow !== 'all' ? ` (${activityWindow} Δ)` : '' }}<span class="ml-1" :class="sortActive(unattributedSort, 'transactions') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(unattributedSort, 'transactions') }}</span></th>
                        <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-status-active" @click="toggleUnattributedSort('storageIota')">Storage (IOTA)<span class="ml-1" :class="sortActive(unattributedSort, 'storageIota') ? 'text-status-active' : 'text-[#3f3f46]'">{{ sortGlyph(unattributedSort, 'storageIota') }}</span></th>
                        <th class="text-left pb-2 pr-4 whitespace-nowrap">Modules</th>
                        <th class="text-left pb-2 pr-4">Sample identifiers</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="c in unattributedSorted.slice(0, unattributedVisible)" :key="c.deployer + c.latestPackageAddress" class="border-t border-scanner-border-subtle align-top">
                        <td class="py-3 pr-4">
                          <a v-if="c.deployer !== 'unknown'" :href="`https://explorer.iota.org/address/${c.deployer}?network=mainnet`" target="_blank" rel="noopener" class="font-mono text-sm text-status-active hover:underline" :title="c.deployer">{{ shortAddr(c.deployer) }}</a>
                          <span v-else class="font-mono text-sm text-[#71717a]">unknown</span>
                          <div class="text-xs text-[#52525b] mt-1">
                            latest:
                            <a :href="`https://explorer.iota.org/object/${c.latestPackageAddress}?network=mainnet`" target="_blank" rel="noopener" class="font-mono hover:text-status-active" :title="c.latestPackageAddress">{{ shortAddr(c.latestPackageAddress) }}</a>
                          </div>
                        </td>
                        <td class="py-3 pr-4 text-right font-mono text-base text-[#f4f4f5]">{{ c.packages }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base" :class="rowEvents(c) > 0 ? 'text-[#f4f4f5]' : (rowEvents(c) < 0 ? 'text-[#ef4444]' : 'text-[#52525b]')">{{ activityWindow !== 'all' && rowEvents(c) > 0 ? '+' : '' }}{{ rowEvents(c).toLocaleString() }}{{ c.eventsCapped && activityWindow === 'all' ? '+' : '' }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base" :class="rowTransactions(c) > 0 ? 'text-[#f4f4f5]' : (rowTransactions(c) < 0 ? 'text-[#ef4444]' : 'text-[#52525b]')">{{ activityWindow !== 'all' && rowTransactions(c) > 0 ? '+' : '' }}{{ rowTransactions(c).toLocaleString() }}{{ c.transactionsCapped && activityWindow === 'all' ? '+' : '' }}</td>
                        <td class="py-3 pr-4 text-right font-mono text-base text-[#f4f4f5]">{{ c.storageIota.toFixed(2) }}</td>
                        <td class="py-3 pr-4">
                          <div class="flex flex-wrap gap-1 max-w-xs">
                            <span v-for="m in c.modules.slice(0, 6)" :key="m" class="px-1.5 py-0.5 text-xs font-mono bg-scanner-elevated text-[#a1a1aa] rounded-xs">{{ m }}</span>
                            <span v-if="c.modules.length > 6" class="px-1.5 py-0.5 text-xs text-[#52525b]">+{{ c.modules.length - 6 }}</span>
                          </div>
                        </td>
                        <td class="py-3 pr-4">
                          <div v-if="c.sampleIdentifiers?.length" class="flex flex-wrap gap-1 max-w-md">
                            <span v-for="(id, i) in c.sampleIdentifiers.slice(0, 6)" :key="i" class="px-1.5 py-0.5 text-xs font-mono bg-scanner-elevated text-[#e4e4e7] rounded-xs" :title="id">{{ id.length > 40 ? id.slice(0, 40) + '…' : id }}</span>
                            <span v-if="c.sampleIdentifiers.length > 6" class="px-1.5 py-0.5 text-xs text-[#52525b]">+{{ c.sampleIdentifiers.length - 6 }}</span>
                          </div>
                          <span v-else class="text-xs text-[#52525b]">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="unattributedVisible < unattributedSorted.length" class="mt-4 text-center">
                  <button @click="unattributedVisible += 20" class="px-4 py-2 text-sm text-status-active border border-scanner-border rounded-sm hover:bg-scanner-card transition-colors">
                    Show more ({{ unattributedSorted.length - unattributedVisible }} remaining)
                  </button>
                </div>
              </div>
            </div>

            <!-- ============ Teams view ============ -->
            <div id="ecosystem-teams" class="scroll-mt-28" v-show="activeEcoTab === 'teams'">
              <div class="mb-4">
                <h3 class="text-sm font-semibold text-scanner-accent">Teams ({{ teamsAggregated.length }})</h3>
                <p class="text-xs text-[#71717a] mt-1">Projects aggregated by attributed team. Untagged projects are excluded.</p>
              </div>
              <div v-if="!teamsAggregated.length" class="text-[#71717a] text-sm py-6">No teams attributed yet.</div>
              <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="text-[#71717a] text-sm border-b border-scanner-border select-none">
                      <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleTeamsSort('name')">Team<span class="ml-1" :class="sortActive(teamsSort, 'name') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(teamsSort, 'name') }}</span></th>
                      <th class="text-left pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleTeamsSort('categories')">Categories<span class="ml-1" :class="sortActive(teamsSort, 'categories') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(teamsSort, 'categories') }}</span></th>
                      <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleTeamsSort('projectCount')">Projects<span class="ml-1" :class="sortActive(teamsSort, 'projectCount') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(teamsSort, 'projectCount') }}</span></th>
                      <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleTeamsSort('events')">Events<span class="ml-1" :class="sortActive(teamsSort, 'events') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(teamsSort, 'events') }}</span></th>
                      <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleTeamsSort('storageIota')">Storage (IOTA)<span class="ml-1" :class="sortActive(teamsSort, 'storageIota') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(teamsSort, 'storageIota') }}</span></th>
                      <th class="text-right pb-2 pr-4 cursor-pointer whitespace-nowrap hover:text-scanner-accent" @click="toggleTeamsSort('tvl')">TVL<span class="ml-1" :class="sortActive(teamsSort, 'tvl') ? 'text-scanner-accent' : 'text-[#3f3f46]'">{{ sortGlyph(teamsSort, 'tvl') }}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in teamsSorted.slice(0, teamsVisible)" :key="t.name" class="border-t border-scanner-border-subtle hover:bg-scanner-card-hover cursor-pointer" @click="t.team?.id && navigateTo(`/team/${t.team.id}`)">
                      <td class="py-3 pr-4">
                        <div class="flex items-center gap-3">
                          <ProjectLogo :project="{ name: t.name, logo: t.team?.logo, team: t.team }" size="sm" />
                          <div>
                            <span class="text-[#f4f4f5] font-medium text-base">{{ t.name }}</span>
                            <p v-if="t.team?.description" class="text-sm text-[#71717a] truncate max-w-md">{{ t.team.description.split('.')[0] }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-3 pr-4 text-sm text-scanner-accent">{{ t.categories }}</td>
                      <td class="py-3 pr-4 text-right font-mono text-base text-[#f4f4f5]">{{ t.projectCount }}</td>
                      <td class="py-3 pr-4 text-right font-mono text-base" :class="t.events > 0 ? 'text-[#f4f4f5]' : 'text-[#52525b]'">{{ t.events.toLocaleString() }}</td>
                      <td class="py-3 pr-4 text-right font-mono text-base text-[#a1a1aa]">{{ t.storageIota.toFixed(4) }}</td>
                      <td class="py-3 pr-4 text-right font-mono text-base text-[#a1a1aa]">{{ t.tvl ? `$${formatCompact(t.tvl)}` : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="teamsVisible < teamsSorted.length" class="mt-4 text-center">
                <button @click="teamsVisible += 10" class="px-4 py-2 text-sm text-scanner-accent border border-scanner-border rounded-sm hover:bg-scanner-card transition-colors">
                  Show more ({{ teamsSorted.length - teamsVisible }} remaining)
                </button>
              </div>
            </div>
          </template>
        </section>

        <!-- ==================================================== -->
        <!-- === ECONOMICS                                     === -->
        <!-- ==================================================== -->
        <section id="economics" class="mb-20 scroll-mt-20">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-[#f4f4f5] mb-1">Economics</h2>
            <p class="text-[#71717a] text-sm">Does the tokenomics work? Gas burn, storage pricing, and a reality check.</p>
          </div>

          <!-- Gas Burn -->
          <div class="mb-10">
            <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wide mb-1">Gas Burn (previous epoch)</h3>
            <p class="text-[#71717a] text-sm mb-4">Gas computation fees are burned — the only real deflationary force. Storage deposits are fully refundable.</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Gas Burned" :value="`${(snapshot.epochGasBurned || 0).toFixed(2)} IOTA`" subtitle="Permanently removed" />
              <MetricCard label="Epoch Transactions" :value="formatCompact(snapshot.epochTransactions || 0)" subtitle="Previous epoch" />
              <MetricCard label="Gas per Transaction" :value="`${((snapshot.gasPerTransaction || 0) * 1_000_000).toFixed(2)} µIOTA`" subtitle="Average cost" />
              <MetricCard label="Storage Net Inflow" :value="`${(snapshot.epochStorageNetInflow || 0).toFixed(4)} IOTA`" subtitle="Temporary lock (refundable)" />
            </div>
          </div>

          <!-- Inflation chart + Storage Pricing -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div class="bg-scanner-card border border-scanner-border rounded p-5">
              <h3 class="text-sm font-semibold text-[#a1a1aa] mb-2">Inflation vs Deflation (log scale)</h3>
              <p class="text-xs text-[#52525b] mb-3">Daily inflation dwarfs gas burn and storage fund by orders of magnitude</p>
              <div class="h-56">
                <Bar v-if="inflationChartData" :data="inflationChartData" :options="inflationChartOptions" />
              </div>
            </div>
            <div class="bg-scanner-card border border-scanner-border rounded p-5">
              <h3 class="text-sm font-semibold text-[#a1a1aa] mb-4">Protocol Storage Pricing</h3>
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-[#71717a] text-xs">
                    <th class="text-left pb-2">Object Size</th>
                    <th class="text-right pb-2">Cost (NANOS)</th>
                    <th class="text-right pb-2">Cost (IOTA)</th>
                  </tr>
                </thead>
                <tbody class="font-mono text-[#a1a1aa]">
                  <tr v-for="size in [100, 500, 1000, 2000, 10000]" :key="size" class="border-t border-scanner-border-subtle">
                    <td class="py-1.5">{{ size }} bytes</td>
                    <td class="text-right">{{ (size * 100 * snapshot.storagePrice + 40 * snapshot.storagePrice).toLocaleString() }}</td>
                    <td class="text-right">{{ ((size * 100 * snapshot.storagePrice + 40 * snapshot.storagePrice) / 1_000_000_000).toFixed(6) }}</td>
                  </tr>
                </tbody>
              </table>
              <p class="text-xs text-[#52525b] mt-3">Formula: (bytes x obj_data_cost_refundable + obj_access_cost) x storage_gas_price ({{ snapshot.storagePrice }} NANOS/unit). Storage deposits are fully refundable.</p>
            </div>
          </div>

          <!-- Reality Check -->
          <div v-if="rcData">
            <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wide mb-1">Reality Check</h3>
            <p class="text-[#71717a] text-sm mb-6">When does IOTA mainnet become deflationary? Adjust the sliders to model different adoption scenarios.</p>

            <div class="bg-scanner-card border border-scanner-border rounded p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <!-- TX multiplier slider -->
                <div>
                  <label class="text-sm text-[#a1a1aa] block mb-2">
                    Transaction volume: <span class="text-scanner-accent font-mono">{{ formatCompact(rcTxMultiplier) }}x</span> current
                    <span class="text-[#52525b]">({{ formatCompact(rcData.projectedDailyTx) }} tx/day)</span>
                  </label>
                  <input type="range" :value="rcTxSlider" @input="rcTxSlider = Number(($event.target as HTMLInputElement).value)" min="0" max="100" step="1" class="w-full accent-scanner-accent" />
                  <div class="flex justify-between text-xs text-[#52525b] mt-1">
                    <span>1x</span>
                    <span>100,000x</span>
                  </div>
                </div>

                <!-- Gas per tx slider -->
                <div>
                  <label class="text-sm text-[#a1a1aa] block mb-2">
                    Gas cost per tx: <span class="text-scanner-accent font-mono">{{ rcGasMultiplier }}x</span> current
                    <span class="text-[#52525b]">({{ (rcData.projectedGasPerTx * 1_000_000).toFixed(1) }} µIOTA)</span>
                  </label>
                  <input type="range" :value="rcGasSlider" @input="rcGasSlider = Number(($event.target as HTMLInputElement).value)" min="0" max="100" step="1" class="w-full accent-scanner-accent" />
                  <div class="flex justify-between text-xs text-[#52525b] mt-1">
                    <span>1x</span>
                    <span>100x</span>
                  </div>
                </div>
              </div>

              <!-- Results -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-scanner-bg rounded p-4">
                  <p class="text-xs text-[#71717a] mb-1">Daily Inflation</p>
                  <p class="text-lg font-bold font-mono text-claimed">+{{ formatCompact(rcData.dailyInflation) }} IOTA</p>
                </div>
                <div class="bg-scanner-bg rounded p-4">
                  <p class="text-xs text-[#71717a] mb-1">Projected Daily Gas Burn</p>
                  <p class="text-lg font-bold font-mono text-reality">-{{ formatCompact(rcData.projectedDailyGasBurn) }} IOTA</p>
                </div>
                <div class="bg-scanner-bg rounded p-4">
                  <p class="text-xs text-[#71717a] mb-1">Net Daily Change</p>
                  <p class="text-lg font-bold font-mono" :class="rcData.isDeflationary ? 'text-reality' : 'text-claimed'">
                    {{ rcData.isDeflationary ? '' : '+' }}{{ formatCompact(rcData.netDailyInflation) }} IOTA
                  </p>
                </div>
                <div class="bg-scanner-bg rounded p-4">
                  <p class="text-xs text-[#71717a] mb-1">Deflation Coverage</p>
                  <p class="text-lg font-bold font-mono" :class="rcData.deflationRatio >= 100 ? 'text-reality' : 'text-[#a1a1aa]'">
                    {{ rcData.deflationRatio.toFixed(rcData.deflationRatio < 1 ? 4 : 1) }}%
                  </p>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="mb-4">
                <div class="flex justify-between text-xs text-[#71717a] mb-1">
                  <span>Gas burn vs inflation</span>
                  <span>{{ Math.min(rcData.deflationRatio, 100).toFixed(2) }}% of break-even</span>
                </div>
                <div class="w-full h-3 bg-scanner-bg rounded-xs overflow-hidden">
                  <div
                    class="h-full rounded-xs transition-all duration-300"
                    :class="rcData.deflationRatio >= 100 ? 'bg-reality' : 'bg-scanner-accent'"
                    :style="{ width: `${Math.min(rcData.deflationRatio, 100)}%` }"
                  />
                </div>
              </div>

              <!-- Verdict -->
              <div class="border-t border-scanner-border-subtle pt-4">
                <p v-if="rcTxSlider === 0 && rcGasSlider === 0" class="text-sm text-[#a1a1aa]">
                  At current usage: gas burn covers <span class="text-scanner-accent font-mono">{{ rcData.deflationRatio.toFixed(4) }}%</span> of daily inflation.
                  Break-even requires <span class="text-scanner-accent font-mono">{{ formatCompact(rcData.breakEvenMultiplier) }}x</span> more transaction volume
                  ({{ formatCompact(rcData.currentDailyTx * rcData.breakEvenMultiplier) }} tx/day vs current {{ formatCompact(rcData.currentDailyTx) }}).
                </p>
                <p v-else-if="rcData.isDeflationary" class="text-sm text-reality">
                  Deflationary at this scenario. Net {{ formatCompact(Math.abs(rcData.netDailyInflation)) }} IOTA removed from circulation per day.
                </p>
                <p v-else class="text-sm text-[#a1a1aa]">
                  Still inflationary. {{ formatCompact(rcData.netDailyInflation) }} IOTA net added per day.
                  Need {{ formatCompact(rcData.dailyInflation / rcData.projectedGasPerTx) }} tx/day to reach break-even at this gas cost.
                </p>

                <div class="mt-3 text-xs text-[#52525b] space-y-1">
                  <p>How it works: Validators mint {{ formatCompact(rcData.dailyInflation) }} new IOTA per epoch (validator_target_reward). Every transaction burns its gas computation fee permanently. Storage deposits are fully refundable and do not contribute to deflation.</p>
                  <p>Sources: iota_getProtocolConfig, GraphQL epoch.totalGasFees, epoch.netInflow</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ==================================================== -->
        <!-- === HOW IT WORKS                                  === -->
        <!-- ==================================================== -->
        <section id="architecture" class="mb-16 scroll-mt-20">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-[#f4f4f5] mb-1">Architecture</h2>
            <p class="text-[#71717a] text-sm">What we mean by "package", "module", "object", and "event" — and how a single user action on-chain turns into the numbers on this page.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <figure class="bg-scanner-card border border-scanner-border rounded p-4 m-0">
              <img src="/architecture-simple.png" alt="IOTA on-chain concepts in plain English" class="w-full h-auto" loading="lazy" />
              <figcaption class="text-xs text-[#71717a] mt-3">IOTA on-chain concepts, in plain English.</figcaption>
            </figure>
            <figure class="bg-scanner-card border border-scanner-border rounded p-4 m-0">
              <img src="/architecture-process.png" alt="How one NFT sale flows through the chain and into our scanner" class="w-full h-auto" loading="lazy" />
              <figcaption class="text-xs text-[#71717a] mt-3">A concrete NFT sale: one user transaction can create and destroy multiple objects and emit multiple events in a single step.</figcaption>
            </figure>
          </div>

          <p class="text-xs text-[#71717a]">
            Want the full technical schema (registry → package matching → team attribution)?
            <a href="https://github.com/r-sw-eet/iota-trade-scanner#architecture" target="_blank" rel="noopener" class="text-scanner-accent hover:text-scanner-accent-secondary">See the detailed diagram on GitHub ↗</a>
          </p>
        </section>

        <!-- ==================================================== -->
        <!-- === SOURCES                                       === -->
        <!-- ==================================================== -->
        <section id="sources" class="mb-16 scroll-mt-20">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-[#f4f4f5] mb-1">Sources</h2>
            <p class="text-[#71717a] text-sm">All data on this dashboard is derived from public IOTA mainnet APIs. No API keys required — the commands below are ready to run.</p>
          </div>

          <div class="space-y-4 mb-12">
            <div v-for="(ex, i) in mainCurlExamples" :key="i" class="bg-scanner-card border border-scanner-border rounded overflow-hidden">
              <div class="px-4 py-3 border-b border-scanner-border-subtle flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-medium text-[#f4f4f5]">{{ ex.label }}</h4>
                  <p class="text-xs text-[#71717a] mt-0.5">{{ ex.description }}</p>
                </div>
                <button @click.stop="copyCmd(ex.command)" class="text-xs text-scanner-accent hover:text-scanner-accent-secondary px-2 py-1 border border-scanner-border rounded-xs hover:bg-scanner-elevated transition-colors shrink-0 ml-4">Copy</button>
              </div>
              <pre class="px-4 py-3 text-xs font-mono text-[#a1a1aa] overflow-x-auto whitespace-pre-wrap break-all">{{ ex.command }}</pre>
            </div>
          </div>

          <!-- Useful ecosystem links -->
          <div>
            <h3 class="text-xs font-semibold text-[#71717a] uppercase tracking-wide mb-1">Useful IOTA Ecosystem Links</h3>
            <p class="text-[#71717a] text-sm mb-4">Explorers, docs, and data sources referenced by this dashboard.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a v-for="link in ecosystemLinks" :key="link.href" :href="link.href" target="_blank" rel="noopener" class="group bg-scanner-card border border-scanner-border rounded p-4 hover:border-scanner-accent/50 transition-colors">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="text-sm font-medium text-[#f4f4f5] group-hover:text-scanner-accent transition-colors">{{ link.label }} <span class="text-[#52525b] group-hover:text-scanner-accent">↗</span></h4>
                    <p class="text-xs text-[#71717a] mt-0.5">{{ link.description }}</p>
                    <p class="text-xs font-mono text-[#52525b] mt-1 truncate">{{ link.href.replace(/^https?:\/\//, '') }}</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        <!-- === FOOTER === -->
        <footer class="border-t border-scanner-border pt-6 mt-10">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p class="text-xs text-[#52525b]">Data: api.mainnet.iota.cafe (JSON-RPC), graphql.mainnet.iota.cafe (GraphQL)</p>
              <p class="text-xs text-[#52525b] mt-1">Epoch {{ snapshot.epoch }} &middot; Checkpoint {{ formatCompact(snapshot.checkpointCount) }} &middot; Updated {{ new Date(snapshot.timestamp).toLocaleString() }}</p>
            </div>
            <div class="flex items-center gap-4">
              <a href="https://github.com/r-sw-eet/iota-trade-scanner" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-sm text-[#52525b] hover:text-scanner-accent transition-colors">
                <FontAwesomeIcon :icon="['fab', 'github']" class="w-4 h-4" aria-hidden="true" />
                GitHub
              </a>
              <NuxtLink to="/imprint" class="text-sm text-[#52525b] hover:text-scanner-accent transition-colors">Imprint</NuxtLink>
              <NuxtLink to="/privacy" class="text-sm text-[#52525b] hover:text-scanner-accent transition-colors">Privacy</NuxtLink>
            </div>
          </div>
        </footer>
      </template>
    </div>
  </div>
</template>
