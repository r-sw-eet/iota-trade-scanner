import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProjectLogo from '~/components/ProjectLogo.vue'

describe('ProjectLogo', () => {
  it('uses project.logo when set (direct project override)', async () => {
    const wrapper = await mountSuspended(ProjectLogo, {
      props: { project: { name: 'Pyth Oracle', logo: '/logos/pyth.png', team: { logo: '/logos/wormhole.ico' } } },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/logos/pyth.png')
  })

  it('falls back to team.logo when project has no logo of its own', async () => {
    const wrapper = await mountSuspended(ProjectLogo, {
      props: { project: { name: 'Virtue Stability', logo: null, team: { logo: '/logos/virtue.svg' } } },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/logos/virtue.svg')
  })

  it('falls back to the L2 logo map for DefiLlama-synthesized projects', async () => {
    const wrapper = await mountSuspended(ProjectLogo, {
      props: { project: { name: 'MagicSea LB', team: null } },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/logos/magicsea.png')
  })

  it('falls back to initials when no logo can be resolved', async () => {
    const wrapper = await mountSuspended(ProjectLogo, {
      props: { project: { name: 'Unknown Project', team: null } },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('UP')
  })

  it('builds initials from first letters of up to two words, skipping separators', async () => {
    const wrapper = await mountSuspended(ProjectLogo, {
      props: { project: { name: 'foo (bar)/baz', team: null } },
    })
    expect(wrapper.text()).toBe('FB')
  })

  it('applies the lg size class when size=lg', async () => {
    const wrapper = await mountSuspended(ProjectLogo, {
      props: { project: { name: 'X', team: null }, size: 'lg' },
    })
    expect(wrapper.html()).toContain('w-16 h-16')
  })

  it('applies the sm size class when size=sm', async () => {
    const wrapper = await mountSuspended(ProjectLogo, {
      props: { project: { name: 'X', team: null }, size: 'sm' },
    })
    expect(wrapper.html()).toContain('w-8 h-8')
  })
})
