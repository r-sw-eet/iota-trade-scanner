<script setup lang="ts">
const { $api } = useApi()
const route = useRoute()
const id = computed(() => String(route.params.id))

const team = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    team.value = await $api(`/ecosystem/teams/${id.value}`)
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Failed to load team'
  } finally {
    loading.value = false
  }
}

await load()
watch(id, load)
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
    <NuxtLink to="/" class="text-sm text-[#71717a] hover:text-scanner-accent transition-colors mb-6 inline-block">← Back to overview</NuxtLink>

    <div v-if="loading" class="text-[#71717a]">Loading team...</div>
    <div v-else-if="error" class="text-status-error">{{ error }}</div>

    <template v-else-if="team">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-[#f4f4f5] mb-1">{{ team.name }}</h1>
        <p class="text-xs font-mono text-[#52525b]">id: {{ team.id }}</p>
        <p v-if="team.description" class="text-[#a1a1aa] mt-3">{{ team.description }}</p>
        <div v-if="team.urls?.length" class="flex gap-3 mt-3">
          <a v-for="u in team.urls" :key="u.href" :href="u.href" target="_blank" class="text-scanner-accent text-sm hover:underline">{{ u.label }} ↗</a>
        </div>
      </div>

      <section class="mb-10">
        <h2 class="text-lg font-bold text-[#f4f4f5] mb-3">Known Deployer Addresses</h2>
        <p class="text-sm text-[#71717a] mb-3">Mainnet addresses that have published packages for this team.</p>
        <div class="bg-scanner-card border border-scanner-border rounded p-4 space-y-1">
          <div v-for="addr in team.deployers" :key="addr" class="font-mono text-xs text-[#a1a1aa] break-all">{{ addr }}</div>
          <div v-if="!team.deployers?.length" class="text-sm text-[#52525b] italic">No deployers registered for this team.</div>
        </div>
      </section>

      <section class="mb-10">
        <h2 class="text-lg font-bold text-[#f4f4f5] mb-3">Projects ({{ team.projects?.length || 0 }})</h2>
        <p v-if="!team.projects?.length" class="text-sm text-[#52525b]">No projects matched to this team in the latest scan.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-[#71717a] text-sm border-b border-scanner-border">
                <th class="text-left pb-2 pr-4">Project</th>
                <th class="text-left pb-2 pr-4">Category</th>
                <th class="text-left pb-2 pr-4">Layer</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in team.projects" :key="p.slug" class="border-t border-scanner-border-subtle hover:bg-scanner-card-hover cursor-pointer" @click="navigateTo(`/project/${p.slug}`)">
                <td class="py-3 pr-4 text-[#f4f4f5] font-medium">{{ p.name }}</td>
                <td class="py-3 pr-4 text-sm text-scanner-accent">{{ p.category }}</td>
                <td class="py-3 pr-4 text-xs font-mono text-[#a1a1aa]">{{ p.layer }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
