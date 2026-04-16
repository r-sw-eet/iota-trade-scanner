import { describe, it, expect } from 'vitest'
import { useIota } from '~/composables/useIota'

describe('useIota', () => {
  const { formatIota, formatCompact, formatPercent, explorerAddress, explorerObject, explorerTx, shortAddr } = useIota()

  describe('formatIota', () => {
    it('returns em-dash for null/undefined/NaN', () => {
      expect(formatIota(null)).toBe('—')
      expect(formatIota(undefined)).toBe('—')
      expect(formatIota(NaN)).toBe('—')
    })

    it('formats integers with thousands separators', () => {
      expect(formatIota(1234567)).toBe('1,234,567')
    })

    it('respects the decimals argument', () => {
      expect(formatIota(1234.5678, 2)).toBe('1,234.57')
    })
  })

  describe('formatCompact', () => {
    it('returns em-dash for null/NaN', () => {
      expect(formatCompact(null)).toBe('—')
      expect(formatCompact(NaN)).toBe('—')
    })

    it('uses B suffix at >=1e9', () => {
      expect(formatCompact(1_500_000_000)).toBe('1.50B')
    })

    it('uses M suffix at >=1e6', () => {
      expect(formatCompact(2_500_000)).toBe('2.50M')
    })

    it('uses K suffix at >=1e3', () => {
      expect(formatCompact(1234)).toBe('1.2K')
    })

    it('drops decimals below 1000', () => {
      expect(formatCompact(42.7)).toBe('43')
    })
  })

  describe('formatPercent', () => {
    it('returns em-dash for null/NaN', () => {
      expect(formatPercent(null)).toBe('—')
      expect(formatPercent(NaN)).toBe('—')
    })

    it('formats with 2 decimals by default', () => {
      expect(formatPercent(12.345)).toBe('12.35%')
    })

    it('respects the decimals argument', () => {
      expect(formatPercent(12.345, 0)).toBe('12%')
    })
  })

  describe('explorer URL builders', () => {
    const addr = '0x6b41121305e1e63bcbdf43e8335d19038c13707818d7dabef65d3d35732a6ed4'

    it('explorerAddress targets the /address path with mainnet', () => {
      expect(explorerAddress(addr)).toBe(`https://explorer.iota.org/address/${addr}?network=mainnet`)
    })

    it('explorerObject targets the /object path with mainnet', () => {
      expect(explorerObject(addr)).toBe(`https://explorer.iota.org/object/${addr}?network=mainnet`)
    })

    it('explorerTx targets the /txblock path with mainnet', () => {
      const digest = 'ABC123digest'
      expect(explorerTx(digest)).toBe(`https://explorer.iota.org/txblock/${digest}?network=mainnet`)
    })
  })

  describe('shortAddr', () => {
    it('returns empty string for null/undefined', () => {
      expect(shortAddr(null)).toBe('')
      expect(shortAddr(undefined)).toBe('')
    })

    it('leaves short addresses untouched', () => {
      expect(shortAddr('0xabcd')).toBe('0xabcd')
    })

    it('truncates long addresses with the default 8+6 window', () => {
      const addr = '0x6b41121305e1e63bcbdf43e8335d19038c13707818d7dabef65d3d35732a6ed4'
      expect(shortAddr(addr)).toBe('0x6b4112…2a6ed4')
    })

    it('respects custom head/tail sizes', () => {
      expect(shortAddr('0x1234567890abcdef', 4, 4)).toBe('0x12…cdef')
    })
  })
})
