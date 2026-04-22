<script setup lang="ts">
const route = useRoute()
const { $api } = useApi()
const { formatCompact, explorerAddress, explorerObject } = useIota()

const slug = route.params.slug as string
const project = ref<any>(null)
const loading = ref(true)
const error = ref('')
const devOpen = ref(false)
const events = ref<any[]>([])
const eventsModule = ref('')
const eventsLoading = ref(false)
const eventsError = ref('')
const expandedEvent = ref<number | null>(null)

onMounted(async () => {
  try {
    project.value = await $api(`/ecosystem/project/${slug}`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Project not found'
  } finally {
    loading.value = false
  }
  if (!error.value) {
    eventsLoading.value = true
    try {
      const res = await $api<any>(`/ecosystem/project/${slug}/events?limit=20`)
      events.value = res.events || []
      eventsModule.value = res.module || ''
      if (res.error) eventsError.value = res.error
    } catch {
      eventsError.value = 'Failed to load events'
    } finally {
      eventsLoading.value = false
    }
  }
})

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 16) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

// Only project-specific curl examples
const curlExamples = computed(() => {
  if (!project.value) return []
  const p = project.value
  const examples: { label: string; command: string; description: string }[] = []

  if (p.layer === 'L1' && p.packageAddress) {
    examples.push({
      label: 'Get package info',
      description: `Fetch this project's Move package metadata and modules.`,
      command: `curl -s -X POST https://graphql.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{ package(address: \\"${p.packageAddress}\\") { address storageRebate modules { nodes { name } } } }"}'`,
    })

    if (p.modules?.length) {
      const mod = p.modules[0]
      examples.push({
        label: `Get recent events (${mod})`,
        description: `Fetch the last 20 events from this project's ${mod} module with full data.`,
        command: `curl -s -X POST https://graphql.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{ events(filter: { emittingModule: \\"${p.packageAddress}::${mod}\\" }, last: 20) { nodes { timestamp type { repr } json sender { address } } } }"}'`,
      })

      examples.push({
        label: `Count all events (${mod})`,
        description: `Paginate through all events. Use endCursor for next page.`,
        command: `curl -s -X POST https://graphql.mainnet.iota.cafe \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{ events(filter: { emittingModule: \\"${p.packageAddress}::${mod}\\" }, first: 50) { nodes { __typename } pageInfo { hasNextPage endCursor } } }"}'`,
      })
    }
  }

  if (p.layer === 'L2' || p.tvl || p.tvlShared) {
    const llamaSlug = p.slug?.replace(/^evm-/, '') || p.name.toLowerCase().replace(/\s+/g, '-')
    examples.push({
      label: 'Get TVL from DefiLlama',
      description: `Fetch ${p.name}'s current and historical TVL data.`,
      command: `curl -s 'https://api.llama.fi/protocol/${llamaSlug}'`,
    })
  }

  return examples
})

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="p-6 md:p-10 max-w-5xl mx-auto">
    <NuxtLink to="/" class="text-scanner-accent text-sm hover:underline mb-6 inline-block">&larr; Back to Dashboard</NuxtLink>

    <div v-if="loading" class="text-[#71717a]">Loading...</div>
    <div v-else-if="error" class="text-status-error">{{ error }}</div>

    <template v-else-if="project">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-2">
          <ProjectLogo :project="project" size="lg" wordmark />
          <div>
            <div class="flex items-center gap-3">
              <!-- Hide the duplicated brand name when the wordmark logo already includes it. -->
              <h1 v-if="!(project.logoWordmark || project.team?.logoWordmark)" class="text-3xl font-bold text-[#f4f4f5]">{{ project.name }}</h1>
              <span class="text-xs font-mono px-2 py-0.5 rounded-xs" :class="project.layer === 'L1' ? 'bg-scanner-accent/10 text-scanner-accent' : 'bg-status-active/10 text-status-active'">
                {{ project.layer }}
              </span>
            </div>
          </div>
        </div>
        <p class="text-[#a1a1aa]">{{ project.description }}</p>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
          <NuxtLink v-if="project.team" :to="`/team/${project.team.id}`" class="text-sm text-[#a1a1aa] hover:text-scanner-accent transition-colors">
            Built by <span class="text-scanner-accent underline">{{ project.team.name }}</span> →
          </NuxtLink>
          <span v-else-if="project.layer === 'L1'" class="text-sm text-[#52525b] italic">Team unattributed</span>
          <a v-for="u in (project.urls || [])" :key="u.href" :href="u.href" target="_blank" class="text-scanner-accent text-sm hover:underline">{{ u.label }}</a>
        </div>
      </div>

      <!-- Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Category" :value="project.category" />
        <MetricCard label="Events" :value="`${formatCompact(project.events)}${project.eventsCapped ? '+' : ''}`" :subtitle="project.eventsCapped ? 'Capped at pagination limit' : 'Total on-chain events'" />
        <MetricCard v-if="project.layer === 'L1'" label="TXs" :value="`${formatCompact(project.transactions ?? 0)}${project.transactionsCapped ? '+' : ''}`" :subtitle="project.transactionsCapped ? 'Capped at pagination limit' : 'MoveCall transactions (includes calls that don\'t emit events)'" />
        <MetricCard v-if="project.layer === 'L1'" label="Senders" :value="formatCompact(project.uniqueSenders ?? 0)" subtitle="Distinct wallets that signed a transaction emitting events from this project's modules" />
        <MetricCard v-if="project.layer === 'L1' && project.uniqueHolders !== null" label="Holders" :value="formatCompact(project.uniqueHolders)" subtitle="Distinct wallets that currently hold an NFT / object of this project's declared types (marketplace-listed objects excluded — see Listed)" />
        <MetricCard v-if="project.layer === 'L1' && project.objectCount !== null" label="Items" :value="`${formatCompact(project.objectCount)}${project.objectCountCapped ? '+' : ''}`" :subtitle="project.objectCountCapped ? 'Live Move objects of this project\'s declared types — capped at the scanner\'s per-type page budget (true count is higher; raised on next backfill)' : 'Total live Move objects of this project\'s declared types (NFTs minted, RWA certificates, game items, etc.)'" />
        <MetricCard v-if="project.layer === 'L1' && project.marketplaceListedCount !== null && project.marketplaceListedCount > 0" label="Listed" :value="formatCompact(project.marketplaceListedCount)" subtitle="Objects currently wrapped by a marketplace contract (seller not directly reachable)" />
        <MetricCard v-if="project.layer === 'L1'" label="Storage" :value="`${project.storageIota.toFixed(4)} IOTA`" subtitle="Package storage deposits" />
        <MetricCard v-if="project.tvl" label="TVL" :value="`$${formatCompact(project.tvl)}`" subtitle="From DefiLlama" />
        <MetricCard v-else-if="project.tvlShared" label="TVL" :value="`($${formatCompact(project.tvlShared)})`" :subtitle="`Shared with ${project.tvlSharedWith} — same DefiLlama protocol`" />
        <MetricCard v-if="project.layer === 'L1'" label="Package Versions" :value="String(project.packages)" subtitle="Deployed on mainnet" />
        <a v-if="project.packageAddress" :href="explorerObject(project.packageAddress)" target="_blank" rel="noopener" class="block hover:ring-1 hover:ring-scanner-accent/40 rounded transition-shadow" :title="`Open ${project.packageAddress} in IOTA Explorer`">
          <MetricCard label="Package ↗" :value="`${project.packageAddress.slice(0, 10)}...`" :subtitle="project.packageAddress" />
        </a>
      </div>

      <!-- Activity Charts -->
      <ProjectCharts :project="project" />

      <!-- Modules (L1 only) -->
      <section v-if="project.modules?.length" class="mb-8">
        <h2 class="text-lg font-bold text-[#f4f4f5] mb-3">Move Modules</h2>
        <div class="bg-scanner-card border border-scanner-border rounded p-5">
          <div class="flex flex-wrap gap-2">
            <span v-for="mod in project.modules" :key="mod" class="text-xs font-mono px-2.5 py-1 rounded-xs bg-scanner-elevated text-[#a1a1aa] border border-scanner-border-subtle">
              {{ mod }}
            </span>
          </div>
        </div>
      </section>

      <!-- Aggregate disclaimer (rendered separately so it stays visible without the team table) -->
      <div v-if="project.disclaimer" class="mb-6 p-3 bg-amber-950/30 border border-amber-900/50 rounded text-sm text-amber-200 flex gap-2">
        <svg class="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div><span class="font-semibold">Aggregate bucket:</span> {{ project.disclaimer }}</div>
      </div>

      <!-- Attribution: how we arrived at the project's name and team -->
      <section v-if="project.attribution || project.team?.attribution" class="mb-8">
        <h2 class="text-lg font-bold text-[#f4f4f5] mb-3">Why we call this {{ project.name }}</h2>
        <div class="bg-scanner-card border border-scanner-border rounded p-5 space-y-4">
          <div v-if="project.attribution">
            <h3 class="text-sm font-semibold text-[#e4e4e7] mb-2">Project attribution</h3>
            <AttributionText :text="project.attribution" />
          </div>
          <div v-if="project.team?.attribution">
            <h3 class="text-sm font-semibold text-[#e4e4e7] mb-2">Team attribution — {{ project.team.name }}</h3>
            <AttributionText :text="project.team.attribution" />
          </div>
          <p class="text-xs text-[#52525b] pt-2 border-t border-scanner-border-subtle">
            These are our best-effort attributions, not on-chain facts. The chain gives us module names, package addresses, and deployer addresses; the mapping from those to branded project names is human research. See <a href="https://github.com/r-sw-eet/iota-trade-scanner/blob/main/project-mapping.md" target="_blank" rel="noopener" class="text-scanner-accent hover:underline">project-mapping.md</a> for the full methodology.
          </p>
        </div>
      </section>

      <!-- Project-specific identification (deployers detected on-chain) -->
      <section v-if="project.layer === 'L1' && project.detectedDeployers?.length" class="mb-8">
        <h2 class="text-lg font-bold text-[#f4f4f5] mb-3">Identification</h2>
        <div class="bg-scanner-card border border-scanner-border rounded p-4">
          <p class="text-sm text-[#71717a] mb-2">Addresses observed publishing this project's matched packages:</p>
          <div class="space-y-1">
            <div v-for="addr in project.detectedDeployers" :key="addr" class="font-mono text-xs break-all">
              <a :href="explorerAddress(addr)" target="_blank" rel="noopener" class="hover:underline transition-colors" :class="project.anomalousDeployers?.includes(addr) ? 'text-amber-400' : 'text-[#a1a1aa] hover:text-scanner-accent'" :title="`Open ${addr} in IOTA Explorer`">
                {{ addr }} <span class="text-[#52525b]">↗</span>
              </a>
              <span v-if="project.anomalousDeployers?.includes(addr)" class="ml-2 text-[10px] uppercase tracking-wider text-amber-400">⚠ anomaly</span>
            </div>
          </div>
          <p v-if="project.anomalousDeployers?.length && project.team" class="text-xs text-amber-400/80 mt-3">
            {{ project.anomalousDeployers.length }} address(es) above are not in
            <NuxtLink :to="`/team/${project.team.id}`" class="underline">{{ project.team.name }}</NuxtLink>'s known deployer list.
          </p>
        </div>
      </section>

      <!-- Recent Events -->
      <section class="mb-8">
        <h2 class="text-lg font-bold text-[#f4f4f5] mb-1">Recent Events</h2>
        <p v-if="eventsModule" class="text-xs text-[#52525b] mb-3 font-mono">{{ eventsModule }}</p>

        <div v-if="eventsLoading" class="text-[#71717a] text-sm">Loading events...</div>
        <div v-else-if="eventsError" class="text-[#52525b] text-sm">{{ eventsError }}</div>
        <div v-else-if="!events.length" class="text-[#52525b] text-sm">No events found for this project.</div>

        <div v-else class="space-y-2">
          <div
            v-for="(evt, i) in events"
            :key="i"
            class="bg-scanner-card border border-scanner-border rounded overflow-hidden"
          >
            <div
              class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-scanner-card-hover transition-colors"
              @click="expandedEvent = expandedEvent === i ? null : i"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-xs font-mono px-2 py-0.5 rounded-xs bg-scanner-accent/10 text-scanner-accent shrink-0">
                  {{ evt.type }}
                </span>
                <span class="text-xs text-[#71717a] shrink-0">{{ relativeTime(evt.timestamp) }}</span>
                <a v-if="evt.sender" :href="explorerAddress(evt.sender)" target="_blank" rel="noopener" class="text-xs text-[#52525b] font-mono truncate hover:text-scanner-accent transition-colors" :title="`Open ${evt.sender} in IOTA Explorer`" @click.stop>{{ shortAddr(evt.sender) }}</a>
              </div>
              <span class="text-[#52525b] text-xs shrink-0 ml-2" :class="expandedEvent === i ? 'rotate-90' : ''" style="transition: transform 0.15s">&#9654;</span>
            </div>

            <div v-if="expandedEvent === i" class="border-t border-scanner-border-subtle px-4 py-3">
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                <div>
                  <span class="text-[#52525b]">Timestamp</span>
                  <p class="text-[#a1a1aa] font-mono">{{ new Date(evt.timestamp).toLocaleString() }}</p>
                </div>
                <div>
                  <span class="text-[#52525b]">Sender</span>
                  <p class="font-mono break-all">
                    <a :href="explorerAddress(evt.sender)" target="_blank" rel="noopener" class="text-[#a1a1aa] hover:text-scanner-accent transition-colors" :title="`Open ${evt.sender} in IOTA Explorer`">
                      {{ evt.sender }} <span class="text-[#52525b]">↗</span>
                    </a>
                  </p>
                </div>
                <div class="col-span-2">
                  <span class="text-[#52525b]">Event Type</span>
                  <p class="text-[#a1a1aa] font-mono break-all">{{ evt.typeFull }}</p>
                </div>
              </div>
              <div>
                <span class="text-[#52525b] text-xs">Event Data</span>
                <pre class="mt-1 text-xs font-mono text-[#a1a1aa] bg-scanner-bg rounded p-3 overflow-x-auto max-h-64">{{ JSON.stringify(evt.data, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Layer info -->
      <section class="mb-8">
        <h2 class="text-lg font-bold text-[#f4f4f5] mb-3">Network Layer</h2>
        <div class="bg-scanner-card border border-scanner-border rounded p-5">
          <div v-if="project.layer === 'L1'" class="text-sm text-[#a1a1aa] space-y-2">
            <p>This project runs on <span class="text-scanner-accent font-medium">IOTA L1 (Move VM)</span>.</p>
            <p>Transactions on L1 directly burn gas fees (deflationary) and storage deposits are locked in the protocol storage fund (refundable when objects are deleted).</p>
          </div>
          <div v-else class="text-sm text-[#a1a1aa] space-y-2">
            <p>This project runs on <span class="text-status-active font-medium">IOTA L2 (EVM)</span>.</p>
            <p>The IOTA EVM chain settles to L1, so its activity indirectly contributes to L1 gas burn and network security. Individual EVM transactions are not visible in the Move package registry.</p>
          </div>
        </div>
      </section>

      <!-- Developer Source -->
      <section v-if="curlExamples.length" class="mb-8">
        <button
          @click="devOpen = !devOpen"
          class="flex items-center gap-2 text-lg font-bold text-[#f4f4f5] mb-3 hover:text-scanner-accent transition-colors"
        >
          <span :class="devOpen ? 'rotate-90' : ''" class="inline-block transition-transform text-sm">&#9654;</span>
          Source for Developers
        </button>

        <div v-if="devOpen" class="space-y-4">
          <p class="text-sm text-[#71717a]">
            Exact queries used to gather this project's data from public IOTA mainnet APIs.
          </p>

          <div v-for="(ex, i) in curlExamples" :key="i" class="bg-scanner-card border border-scanner-border rounded overflow-hidden">
            <div class="px-4 py-3 border-b border-scanner-border-subtle flex items-center justify-between">
              <div>
                <h4 class="text-sm font-medium text-[#f4f4f5]">{{ ex.label }}</h4>
                <p class="text-xs text-[#71717a] mt-0.5">{{ ex.description }}</p>
              </div>
              <button
                @click.stop="copyToClipboard(ex.command)"
                class="text-xs text-scanner-accent hover:text-scanner-accent-secondary px-2 py-1 border border-scanner-border rounded-xs hover:bg-scanner-elevated transition-colors shrink-0 ml-4"
              >
                Copy
              </button>
            </div>
            <pre class="px-4 py-3 text-xs font-mono text-[#a1a1aa] overflow-x-auto whitespace-pre-wrap break-all">{{ ex.command }}</pre>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
