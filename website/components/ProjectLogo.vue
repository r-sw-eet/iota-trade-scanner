<script setup lang="ts">
interface LogoProject {
  name: string
  logo?: string | null
  team?: { logo?: string | null } | null
}

const props = defineProps<{
  project: LogoProject
  size?: 'sm' | 'md' | 'lg'
}>()

const imgError = ref(false)

const sizeClass = computed(() => {
  switch (props.size) {
    case 'lg': return 'w-16 h-16 text-xl'
    case 'sm': return 'w-8 h-8 text-xs'
    default: return 'w-10 h-10 text-sm'
  }
})

// Last-resort fallback for L2 / EVM projects synthesized from DefiLlama at
// scan time — they have no ProjectDefinition + no team, so logo can't flow
// through the data. See TODO "Attach teams to L2 (EVM) projects".
const l2LogoMap: Record<string, string> = {
  'magicsea lb': '/logos/magicsea.png',
  'magicsea amm': '/logos/magicsea.png',
  'deepr finance': '/logos/deepr.png',
  'cyberperp': '/logos/cyberperp.svg',
  'symmio': '/logos/symmio.svg',
  'gamma': '/logos/gamma.svg',
  'wagmi': '/logos/wagmi.svg',
  'iolend': '/logos/iolend.avif',
  'velocimeter v4': '/logos/velocimeter.webp',
  'graphene by velocimeter': '/logos/graphene.png',
  'tokenlabs': '/logos/tokenlabs.ico',
}

const logoUrl = computed(() => {
  return props.project.logo
    ?? props.project.team?.logo
    ?? l2LogoMap[props.project.name.toLowerCase()]
    ?? null
})

const initials = computed(() => {
  return props.project.name
    .split(/[\s()/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
})

const bgColor = computed(() => {
  let hash = 0
  for (const ch of props.project.name) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 40%, 25%)`
})
</script>

<template>
  <div :class="['rounded-sm overflow-hidden shrink-0 flex items-center justify-center', sizeClass]" :style="{ backgroundColor: (!logoUrl || imgError) ? bgColor : 'transparent' }">
    <img
      v-if="logoUrl && !imgError"
      :src="logoUrl"
      :alt="project.name"
      class="w-full h-full object-contain"
      @error="imgError = true"
    />
    <span v-else class="font-bold text-[#f4f4f5]">{{ initials }}</span>
  </div>
</template>
