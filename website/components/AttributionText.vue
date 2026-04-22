<script setup lang="ts">
import { Marked } from 'marked'

const props = defineProps<{ text: string }>()

const { explorerObject, explorerTx } = useIota()

// IOTA mainnet address = `0x` + 64 lowercase hex (covers packages, deployers,
// object IDs; system packages `0x0…02`/`0x0…03` are zero-padded to 64 too).
// IOTA tx digest = 43–44 base58 chars (no 0/O/I/l).
const TOKEN_RE = /(0x[0-9a-f]{64})|(\b[1-9A-HJ-NP-Za-km-z]{43,44}\b)/g

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ESC[c])
}

function linkify(text: string, inCode: boolean): string {
  let out = ''
  let last = 0
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m.index! > last) out += escapeHtml(text.slice(last, m.index))
    const val = m[0]
    const isAddr = !!m[1]
    const href = isAddr ? explorerObject(val) : explorerTx(val)
    const extra = inCode ? ' bg-scanner-elevated px-1 rounded-xs' : ''
    out += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="font-mono text-scanner-accent hover:underline break-all${extra}" title="Open ${escapeHtml(val)} in IOTA Explorer">${escapeHtml(val)}</a>`
    last = m.index! + val.length
  }
  if (last < text.length) out += escapeHtml(text.slice(last))
  return out
}

const html = computed(() => {
  const marked = new Marked({
    renderer: {
      text(token: any): string {
        if (token.tokens) return this.parser.parseInline(token.tokens)
        return linkify(token.text, false)
      },
      codespan(token: any): string {
        return `<code class="font-mono text-[#d4d4d8] bg-scanner-elevated px-1 rounded-xs">${linkify(token.text, true)}</code>`
      },
      code(token: any): string {
        return `<pre class="font-mono text-xs text-[#d4d4d8] bg-scanner-elevated border border-scanner-border rounded p-3 overflow-x-auto my-2"><code>${linkify(token.text, false)}</code></pre>`
      },
      link(token: any): string {
        const href = escapeHtml(token.href)
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
        return `<a href="${href}" target="_blank" rel="noopener" class="text-scanner-accent hover:underline"${title}>${this.parser.parseInline(token.tokens)}</a>`
      },
    },
  })
  return marked.parse(props.text) as string
})
</script>

<template>
  <div class="attribution-md text-sm text-[#a1a1aa] leading-relaxed break-words" v-html="html" />
</template>

<style>
.attribution-md > :first-child { margin-top: 0; }
.attribution-md > :last-child { margin-bottom: 0; }
.attribution-md p { margin: 0.5rem 0; }
.attribution-md strong { color: #f4f4f5; font-weight: 600; }
.attribution-md em { font-style: italic; }
.attribution-md ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0; }
.attribution-md ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5rem 0; }
.attribution-md li { margin: 0.125rem 0; }
.attribution-md li > p { margin: 0; }
.attribution-md h1, .attribution-md h2, .attribution-md h3, .attribution-md h4 { font-weight: 600; color: #e4e4e7; margin: 0.75rem 0 0.5rem; }
.attribution-md h1 { font-size: 1rem; }
.attribution-md h2 { font-size: 0.95rem; }
.attribution-md h3, .attribution-md h4 { font-size: 0.9rem; }
.attribution-md blockquote { border-left: 2px solid #3f3f46; padding-left: 0.75rem; color: #71717a; margin: 0.5rem 0; }
.attribution-md hr { border: 0; border-top: 1px solid #27272a; margin: 1rem 0; }
.attribution-md pre { margin: 0.5rem 0; }
</style>
