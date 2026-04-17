import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)
mockNuxtImport('useRuntimeConfig', () => () => ({
  public: { apiBase: 'https://scanner.test/api/v1' },
}))

describe('useApi', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('prefixes the path with apiBase and returns the response', async () => {
    fetchMock.mockResolvedValueOnce({ status: 'ok' })
    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()
    const result = await $api<{ status: string }>('/health')
    expect(result).toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://scanner.test/api/v1/health',
      {},
    )
  })

  it('forwards caller-supplied fetch options', async () => {
    fetchMock.mockResolvedValueOnce([])
    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()
    await $api('/ecosystem', { query: { layer: 'L1' }, method: 'GET' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://scanner.test/api/v1/ecosystem',
      { query: { layer: 'L1' }, method: 'GET' },
    )
  })

  it('propagates fetch errors to the caller', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    const { useApi } = await import('~/composables/useApi')
    const { $api } = useApi()
    await expect($api('/health')).rejects.toThrow('network down')
  })
})
