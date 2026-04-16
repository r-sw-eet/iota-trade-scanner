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
const shadeTeamless = ref(true)

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
const ecosystemError = ref('')
const mainDevOpen = ref(false)

function copyCmd(text: string) {
  navigator.clipboard.writeText(text)
}

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
    description: 'Fetch all protocols and filter for IOTA/IOTA EVM chains. This is how we get L2 EVM project data.',
    command: 'curl -s \'https://api.llama.fi/protocols\' | \\\n  python3 -c "import json,sys; [print(p[\'name\'], p[\'tvl\']) for p in json.load(sys.stdin) if any(c in p.get(\'chains\',[]) for c in [\'IOTA\',\'IOTA EVM\'])]"',
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
  const dailyInflation = s.validatorTargetReward // 767,000 IOTA
  const currentDailyTx = s.epochTransactions || 1_730_000
  const currentGasPerTx = s.gasPerTransaction || 0.00001
  const currentDailyGasBurn = s.epochGasBurned || 18

  const projectedDailyTx = currentDailyTx * rcTxMultiplier.value
  const projectedGasPerTx = currentGasPerTx * (rcGasMultiplier.value || 1)
  const projectedDailyGasBurn = projectedDailyTx * projectedGasPerTx
  const netDailyInflation = dailyInflation - projectedDailyGasBurn
  const deflationRatio = projectedDailyGasBurn / dailyInflation * 100
  const isDeflationary = netDailyInflation < 0

  // How many X more tx needed for break-even
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

const chartVisible = ref(10)
const colors = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

const allEventProjects = computed(() => {
  if (!ecosystem.value) return []
  return [...(ecosystem.value.l1 || []), ...(ecosystem.value.l2 || [])].filter((p: any) => p.events > 0).sort((a: any, b: any) => b.events - a.events)
})
const allStorageProjects = computed(() => {
  if (!ecosystem.value) return []
  return [...(ecosystem.value.l1 || []), ...(ecosystem.value.l2 || [])].filter((p: any) => p.storageIota > 0.01).sort((a: any, b: any) => b.storageIota - a.storageIota)
})

const projectEventsChartData = computed(() => {
  const sliced = allEventProjects.value.slice(0, chartVisible.value)
  if (!sliced.length) return null
  return {
    labels: sliced.map((p: any) => p.name),
    datasets: [{ label: 'Events', data: sliced.map((p: any) => p.events), backgroundColor: sliced.map((_: any, i: number) => colors[i % colors.length] + '80'), borderColor: sliced.map((_: any, i: number) => colors[i % colors.length]), borderWidth: 1 }],
  }
})
const projectEventsChartOptions = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
  scales: {
    x: { ticks: { color: '#71717a' }, grid: { color: '#2a2a3020' } },
    y: { ticks: { color: '#a1a1aa', font: { size: 11 } }, grid: { display: false } },
  },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw.toLocaleString()} events` } } },
}

const projectStorageChartData = computed(() => {
  const sliced = allStorageProjects.value.slice(0, chartVisible.value)
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
</script>

<template>
  <div class="p-6 md:p-10 max-w-7xl mx-auto">
    <div class="mb-10">
      <h1 class="text-3xl font-bold text-scanner-accent mb-1">IOTA Trade Scanner</h1>
      <p class="text-[#71717a] text-sm">Live mainnet data — what's actually happening on-chain</p>
    </div>

    <div v-if="loading" class="text-[#71717a]">Fetching live data from IOTA mainnet...</div>
    <div v-else-if="error" class="text-status-error">Failed to load data from API. Is the backend running?</div>

    <template v-else-if="snapshot">
      <!-- === NETWORK METRICS === -->
      <section class="mb-10">
        <h2 class="text-xl font-bold text-[#f4f4f5] mb-4">Network Metrics</h2>
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
      </section>

      <!-- === GAS / DEFLATION METRICS === -->
      <section class="mb-10">
        <h2 class="text-xl font-bold text-[#f4f4f5] mb-1">Gas Burn (previous epoch)</h2>
        <p class="text-[#71717a] text-sm mb-4">Gas computation fees are burned — the only real deflationary force. Storage deposits are fully refundable.</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Gas Burned" :value="`${(snapshot.epochGasBurned || 0).toFixed(2)} IOTA`" subtitle="Permanently removed" />
          <MetricCard label="Epoch Transactions" :value="formatCompact(snapshot.epochTransactions || 0)" subtitle="Previous epoch" />
          <MetricCard label="Gas per Transaction" :value="`${((snapshot.gasPerTransaction || 0) * 1_000_000).toFixed(2)} µIOTA`" subtitle="Average cost" />
          <MetricCard label="Storage Net Inflow" :value="`${(snapshot.epochStorageNetInflow || 0).toFixed(4)} IOTA`" subtitle="Temporary lock (refundable)" />
        </div>
      </section>

      <!-- === TX RATES === -->
      <section v-if="ecosystem?.txRates" class="mb-10">
        <h2 class="text-xl font-bold text-[#f4f4f5] mb-1">Transaction Rate</h2>
        <p class="text-[#71717a] text-sm mb-4">Average since mainnet launch ({{ formatCompact(ecosystem.networkTxTotal) }} total over ~332 days)</p>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="/ year" :value="formatCompact(ecosystem.txRates.perYear)" />
          <MetricCard label="/ month" :value="formatCompact(ecosystem.txRates.perMonth)" />
          <MetricCard label="/ week" :value="formatCompact(ecosystem.txRates.perWeek)" />
          <MetricCard label="/ day" :value="formatCompact(ecosystem.txRates.perDay)" />
          <MetricCard label="/ hour" :value="formatCompact(ecosystem.txRates.perHour)" />
          <MetricCard label="/ minute" :value="formatCompact(ecosystem.txRates.perMinute)" />
          <MetricCard label="/ second" :value="String(ecosystem.txRates.perSecond)" />
        </div>
      </section>

      <!-- === CHARTS === -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div class="bg-scanner-card border border-scanner-border rounded p-5">
          <h3 class="text-sm font-semibold text-[#a1a1aa] mb-4">Supply Distribution</h3>
          <div class="h-64">
            <Doughnut v-if="supplyChartData" :data="supplyChartData" :options="supplyChartOptions" />
          </div>
        </div>
        <div class="bg-scanner-card border border-scanner-border rounded p-5">
          <h3 class="text-sm font-semibold text-[#a1a1aa] mb-2">Inflation vs Deflation (log scale)</h3>
          <p class="text-xs text-[#52525b] mb-3">Daily inflation dwarfs gas burn and storage fund by orders of magnitude</p>
          <div class="h-56">
            <Bar v-if="inflationChartData" :data="inflationChartData" :options="inflationChartOptions" />
          </div>
        </div>
      </section>

      <!-- === EPOCH HISTORY CHARTS === -->
      <section class="mb-10">
        <h2 class="text-xl font-bold text-[#f4f4f5] mb-1">Historical Trends</h2>
        <p class="text-[#71717a] text-sm mb-6">Per-epoch data since mainnet launch (~332 epochs, 1 epoch = ~24h)</p>
        <EpochCharts />
      </section>

      <!-- === STORAGE PRICING === -->
      <section class="mb-10">
        <h2 class="text-xl font-bold text-[#f4f4f5] mb-4">Protocol Storage Pricing</h2>
        <div class="bg-scanner-card border border-scanner-border rounded p-5 max-w-xl">
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
          <p class="text-xs text-[#52525b] mt-3">Formula: (bytes x obj_data_cost_refundable + obj_access_cost) x storage_gas_price ({{ snapshot.storagePrice }} NANOS/unit). Storage deposits are fully refundable when objects are deleted.</p>
        </div>
      </section>

      <!-- === ECOSYSTEM === -->
      <section class="mb-10">
        <h2 class="text-xl font-bold text-[#f4f4f5] mb-1">Ecosystem — All Projects on Mainnet</h2>
        <p v-if="ecosystemLoading" class="text-[#71717a] text-sm mb-6">Loading ecosystem data (scanning all mainnet packages)...</p>
        <p v-else-if="ecosystemError" class="text-status-error text-sm mb-6">Failed to load ecosystem: {{ ecosystemError }}</p>
        <template v-else-if="ecosystem">
        <p class="text-[#71717a] text-sm mb-6">{{ ecosystem.totalProjects }} identified projects &middot; {{ ecosystem.totalEvents.toLocaleString() }} total events &middot; {{ ecosystem.totalStorageIota.toFixed(2) }} IOTA total storage</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-scanner-card border border-scanner-border rounded p-5">
            <h3 class="text-sm font-semibold text-[#a1a1aa] mb-4">Events by Project (top {{ chartVisible }})</h3>
            <div :style="{ height: projectEventsChartData ? `${Math.max(250, (projectEventsChartData.labels?.length || 0) * 28)}px` : '250px' }">
              <Bar v-if="projectEventsChartData" :data="projectEventsChartData" :options="projectEventsChartOptions" />
              <p v-else class="text-[#52525b] text-sm">Loading ecosystem data...</p>
            </div>
            <div v-if="chartVisible < allEventProjects.length" class="mt-4 text-center">
              <button @click="chartVisible += 10" class="px-3 py-1.5 text-xs text-scanner-accent border border-scanner-border rounded-xs hover:bg-scanner-elevated transition-colors">
                Show more ({{ allEventProjects.length - chartVisible }} remaining)
              </button>
            </div>
          </div>
          <div class="bg-scanner-card border border-scanner-border rounded p-5">
            <h3 class="text-sm font-semibold text-[#a1a1aa] mb-4">Storage Cost by Project (top {{ chartVisible }})</h3>
            <div class="h-72">
              <Doughnut v-if="projectStorageChartData" :data="projectStorageChartData" :options="projectStorageChartOptions" />
              <p v-else class="text-[#52525b] text-sm">Loading ecosystem data...</p>
            </div>
            <div v-if="chartVisible < allStorageProjects.length" class="mt-4 text-center">
              <button @click="chartVisible += 10" class="px-3 py-1.5 text-xs text-scanner-accent border border-scanner-border rounded-xs hover:bg-scanner-elevated transition-colors">
                Show more ({{ allStorageProjects.length - chartVisible }} remaining)
              </button>
            </div>
          </div>
        </div>

        <!-- L1 Move Projects -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="text-sm font-semibold text-scanner-accent">L1 — Move VM ({{ ecosystem.l1.length }} projects)</h3>
            <label class="flex items-center gap-2 text-xs text-[#a1a1aa] cursor-pointer select-none" title="Dim projects that are not attributed to a known team">
              <input v-model="shadeTeamless" type="checkbox" class="accent-scanner-accent" />
              Shade untagged (no team)
            </label>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-[#71717a] text-sm border-b border-scanner-border">
                  <th class="text-left pb-2 pr-4">Project</th>
                  <th class="text-left pb-2 pr-4">Team</th>
                  <th class="text-left pb-2 pr-4">Category</th>
                  <th class="text-right pb-2 pr-4">Events</th>
                  <th class="text-right pb-2 pr-4" title="Unique sender addresses across all modules">Wallets</th>
                  <th class="text-right pb-2 pr-4">Storage (IOTA)</th>
                  <th class="text-right pb-2 pr-4">TVL</th>
                  <th class="text-right pb-2 pr-4">Packages</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in ecosystem.l1.slice(0, l1Visible)" :key="p.name" class="border-t border-scanner-border-subtle hover:bg-scanner-card-hover cursor-pointer transition-opacity" :class="shadeTeamless && !p.team ? 'opacity-40' : ''" @click="navigateTo(`/project/${p.slug}`)">
                  <td class="py-3 pr-4">
                    <div class="flex items-center gap-3">
                      <ProjectLogo :name="p.name" size="sm" />
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
                  <td class="py-3 pr-4 text-right font-mono text-base" :class="p.events > 0 ? 'text-[#f4f4f5]' : 'text-[#52525b]'">{{ p.events.toLocaleString() }}{{ p.eventsCapped ? '+' : '' }}</td>
                  <td class="py-3 pr-4 text-right font-mono text-base" :class="p.uniqueSenders > 0 ? 'text-[#f4f4f5]' : 'text-[#52525b]'">{{ (p.uniqueSenders || 0).toLocaleString() }}</td>
                  <td class="py-3 pr-4 text-right font-mono text-base text-[#a1a1aa]">{{ p.storageIota.toFixed(4) }}</td>
                  <td class="py-3 pr-4 text-right font-mono text-base text-[#a1a1aa]">{{ p.tvl ? `$${formatCompact(p.tvl)}` : '—' }}</td>
                  <td class="py-3 pr-4 text-right font-mono text-base text-[#71717a]">{{ p.packages }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="l1Visible < ecosystem.l1.length" class="mt-4 text-center">
            <button @click="l1Visible += 10" class="px-4 py-2 text-sm text-scanner-accent border border-scanner-border rounded-sm hover:bg-scanner-card transition-colors">
              Show more ({{ ecosystem.l1.length - l1Visible }} remaining)
            </button>
          </div>
        </div>

        <!-- L2 EVM Projects -->
        <div v-if="ecosystem.l2.length" class="mb-8">
          <h3 class="text-sm font-semibold text-status-active mb-3">L2 — EVM ({{ ecosystem.l2.length }} projects, data from DefiLlama)</h3>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-[#71717a] text-sm border-b border-scanner-border">
                  <th class="text-left pb-2 pr-4">Project</th>
                  <th class="text-left pb-2 pr-4">Category</th>
                  <th class="text-right pb-2 pr-4">TVL</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in ecosystem.l2.slice(0, l2Visible)" :key="p.name" class="border-t border-scanner-border-subtle hover:bg-scanner-card-hover cursor-pointer" @click="navigateTo(`/project/${p.slug}`)">
                  <td class="py-3 pr-4">
                    <div class="flex items-center gap-3">
                      <ProjectLogo :name="p.name" size="sm" />
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
          <div v-if="l2Visible < ecosystem.l2.length" class="mt-4 text-center">
            <button @click="l2Visible += 10" class="px-4 py-2 text-sm text-status-active border border-scanner-border rounded-sm hover:bg-scanner-card transition-colors">
              Show more ({{ ecosystem.l2.length - l2Visible }} remaining)
            </button>
          </div>
        </div>
        </template>
      </section>

      <!-- === REALITY CHECK === -->
      <section v-if="rcData" class="mb-10">
        <h2 class="text-xl font-bold text-[#f4f4f5] mb-1">Reality Check</h2>
        <p class="text-[#71717a] text-sm mb-6">When does IOTA mainnet become deflationary? Adjust the sliders to model different adoption scenarios.</p>

        <div class="bg-scanner-card border border-scanner-border rounded p-6 mb-6">
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

            <!-- Gas per tx multiplier slider -->
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
      </section>

      <!-- === SOURCE FOR DEVELOPERS === -->
      <section class="mb-10">
        <button @click="mainDevOpen = !mainDevOpen" class="flex items-center gap-2 text-xl font-bold text-[#f4f4f5] mb-3 hover:text-scanner-accent transition-colors">
          <span :class="mainDevOpen ? 'rotate-90' : ''" class="inline-block transition-transform text-sm">&#9654;</span>
          Source for Developers
        </button>

        <div v-if="mainDevOpen" class="space-y-4">
          <p class="text-sm text-[#71717a]">All data on this dashboard is derived from public IOTA mainnet APIs. No API keys required. The commands below are ready-to-run examples.</p>

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
      </section>

      <!-- === FOOTER === -->
      <footer class="border-t border-scanner-border pt-6 mt-10">
        <p class="text-xs text-[#52525b]">Data: api.mainnet.iota.cafe (JSON-RPC), graphql.mainnet.iota.cafe (GraphQL)</p>
        <p class="text-xs text-[#52525b] mt-1">Epoch {{ snapshot.epoch }} &middot; Checkpoint {{ formatCompact(snapshot.checkpointCount) }} &middot; Updated {{ new Date(snapshot.timestamp).toLocaleString() }}</p>
        <div class="mt-3 flex gap-4">
          <NuxtLink to="/imprint" class="text-xs text-[#52525b] hover:text-scanner-accent transition-colors">Imprint</NuxtLink>
          <NuxtLink to="/privacy" class="text-xs text-[#52525b] hover:text-scanner-accent transition-colors">Privacy</NuxtLink>
        </div>
      </footer>
    </template>
  </div>
</template>
