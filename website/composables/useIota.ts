export function useIota() {
  function formatIota(value: number | null | undefined, decimals = 0): string {
    if (value == null || !Number.isFinite(value)) return '—'
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  function formatCompact(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '—'
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return value.toFixed(0)
  }

  function formatPercent(value: number | null | undefined, decimals = 2): string {
    if (value == null || !Number.isFinite(value)) return '—'
    return `${value.toFixed(decimals)}%`
  }

  return { formatIota, formatCompact, formatPercent }
}
