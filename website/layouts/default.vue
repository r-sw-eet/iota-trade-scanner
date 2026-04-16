<template>
  <div class="min-h-screen bg-scanner-bg">
    <div class="sticky top-0 z-40 bg-amber-950/95 backdrop-blur border-b border-amber-800/50 text-amber-200 text-sm px-4 py-2 text-center">
      <span class="font-semibold">Work in progress</span> — this site is under active development. Data may contain errors. If you're a developer and specifics about your team, project, or dApp are missing, please contact <a href="mailto:hello@iota-trade-scanner.net" class="underline hover:text-amber-100">hello@iota-trade-scanner.net</a>.
    </div>
    <main>
      <slot />
    </main>
  </div>
</template>
