<script setup lang="ts">
const props = defineProps<{
  name: string
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

const logoMap: Record<string, string> = {
  'pools finance': '/logos/pools-finance.svg',
  'pools farming': '/logos/pools-finance.svg',
  'virtue': '/logos/virtue.svg',
  'virtue stability': '/logos/virtue.svg',
  'virtue pool': '/logos/virtue.svg',
  'swirl': '/logos/swirl.svg',
  'swirl validator': '/logos/swirl.svg',
  'tlip (trade)': '/logos/tlip.svg',
  'salus platform': '/logos/salus.png',
  'layerzero': '/logos/layerzero.png',
  'layerzero oft': '/logos/layerzero.png',
  'pyth oracle': '/logos/pyth.png',
  'tradeport': '/logos/tradeport.svg',
  'magicsea lb': '/logos/magicsea.png',
  'magicsea amm': '/logos/magicsea.png',
  'deepr finance': '/logos/deepr.png',
  'cyberperp': '/logos/cyberperp.svg',
  'wormhole': '/logos/wormhole.ico',
  'symmio': '/logos/symmio.svg',
  'gamma': '/logos/gamma.svg',
  'wagmi': '/logos/wagmi.svg',
  'iolend': '/logos/iolend.avif',
  'velocimeter v4': '/logos/velocimeter.webp',
  'graphene by velocimeter': '/logos/graphene.png',
  'tokenlabs': '/logos/tokenlabs.ico',
}

const logoUrl = computed(() => {
  const key = props.name.toLowerCase()
  return logoMap[key] || null
})

const initials = computed(() => {
  return props.name
    .split(/[\s()/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
})

const bgColor = computed(() => {
  let hash = 0
  for (const ch of props.name) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 40%, 25%)`
})
</script>

<template>
  <div :class="['rounded-sm overflow-hidden shrink-0 flex items-center justify-center', sizeClass]" :style="{ backgroundColor: (!logoUrl || imgError) ? bgColor : 'transparent' }">
    <img
      v-if="logoUrl && !imgError"
      :src="logoUrl"
      :alt="name"
      class="w-full h-full object-contain"
      @error="imgError = true"
    />
    <span v-else class="font-bold text-[#f4f4f5]">{{ initials }}</span>
  </div>
</template>
