import { ProjectDefinition } from '../project.interface';

export const boltEarth: ProjectDefinition = {
  name: 'Bolt.Earth RealFi',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Application',
  industries: ['Energy', 'DePIN'],
  description: 'Bolt.Earth tokenizes revenue shares of real-world EV-charging stations on IOTA. Stations are registered on-chain, ownership and revenue rights are traded as shares, and proxy contracts distribute earnings to tokenholders.',
  urls: [{ label: 'Website', href: 'https://bolt.earth' }],
  teamId: 'bolt-earth',
  match: { all: ['bolt', 'station'] },
  attribution: `
On-chain evidence: Move package with both \`bolt\` and \`station\` modules.

Renamed from the registry's prior "Bolt Protocol" label to Bolt.Earth — the actual product brand — and re-categorized from generic "Protocol" to "DePIN / RWA" to reflect what the product does: tokenize revenue shares of real-world EV-charging hardware. Single-deployer team; \`bolt\` + \`station\` is the literal vocabulary from the product (stations = physical charging points onboarded to the Bolt.Earth network).
`.trim(),
};
