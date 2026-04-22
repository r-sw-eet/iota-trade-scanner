import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AttributionText from '~/components/AttributionText.vue'

const ADDR = '0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe'
const TX = 'GJ6arrpFMqA3Noh7AkgRmA3czQnTbjA2aiL2nT1GMhEc'

describe('AttributionText', () => {
  it('linkifies a 64-hex address to the object explorer', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: `TWIN deployer ${ADDR}.` } })
    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe(`https://explorer.iota.org/object/${ADDR}?network=mainnet`)
    expect(a.text()).toBe(ADDR)
  })

  it('linkifies a 44-char base58 tx digest to the txblock explorer', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: `first tx ${TX} anchors it` } })
    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe(`https://explorer.iota.org/txblock/${TX}?network=mainnet`)
    expect(a.text()).toBe(TX)
  })

  it('still linkifies addresses inside backtick code spans', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: `deployer \`${ADDR}\` ships things` } })
    const a = wrapper.get('a')
    expect(a.attributes('href')).toContain(ADDR)
    expect(a.text()).toBe(ADDR)
  })

  it('renders non-address backtick spans as code', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: 'module `verifiable_storage` is unique' } })
    expect(wrapper.find('code').exists()).toBe(true)
    expect(wrapper.get('code').text()).toBe('verifiable_storage')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('leaves ordinary prose as plain text', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: 'no addresses here, just words.' } })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('code').exists()).toBe(false)
    expect(wrapper.text()).toContain('no addresses here, just words.')
  })

  it('does not match a truncated ellipsis address', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: 'shortened 0x164625aa…19abe here' } })
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('renders leading text inside a code span as <code>', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: `coin type \`deployer ${ADDR}\`` } })
    const code = wrapper.findAll('code')
    expect(code.length).toBeGreaterThan(0)
    expect(code[0].text()).toContain('deployer')
    expect(wrapper.get('a').text()).toBe(ADDR)
  })

  it('tolerates text starting with a backtick span (empty leading split)', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: `\`${ADDR}\` is the deployer` } })
    expect(wrapper.get('a').text()).toBe(ADDR)
    expect(wrapper.text()).toContain('is the deployer')
  })

  it('renders **bold** as <strong>', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: 'this is **important** evidence' } })
    expect(wrapper.get('strong').text()).toBe('important')
  })

  it('linkifies addresses inside bold runs', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: `**deployer ${ADDR} matters**` } })
    const a = wrapper.get('strong a')
    expect(a.attributes('href')).toContain(ADDR)
    expect(a.text()).toBe(ADDR)
  })

  it('renders dash-prefixed lines as a bullet list', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: '- first item\n- second item' } })
    const items = wrapper.findAll('ul li')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('first item')
    expect(items[1].text()).toContain('second item')
  })

  it('renders fenced code blocks as <pre><code> and linkifies addresses inside', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: `\`\`\`\nissuer: ${ADDR}\n\`\`\`` } })
    const pre = wrapper.get('pre')
    expect(pre.find('a').attributes('href')).toContain(ADDR)
    expect(pre.find('a').text()).toBe(ADDR)
  })

  it('renders markdown links with target=_blank', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: 'see [the showcase](https://iota.org/learn/showcases/salus) for details' } })
    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe('https://iota.org/learn/showcases/salus')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.text()).toBe('the showcase')
  })

  it('propagates the title attribute from a titled markdown link', async () => {
    const wrapper = await mountSuspended(AttributionText, { props: { text: 'see [the showcase](https://iota.org/x "IOTA Showcase") now' } })
    const a = wrapper.get('a')
    expect(a.attributes('title')).toBe('IOTA Showcase')
  })
})
