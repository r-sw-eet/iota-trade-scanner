import { ProjectDefinition } from '../project.interface';

export const giftDrop: ProjectDefinition = {
  name: 'Gift Drop',
  layer: 'L1',
  category: 'Social',
  subcategory: 'Airdrop',
  description: 'IOTA gift drop mechanism — claimable on-chain vouchers for distributing tokens to recipients. Used for promotional airdrops and community reward campaigns. Multiple upgrade versions shipped from Studio 0xb8b1380e\'s multi-brand deployer.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['giftdrop_iota'] },
  attribution: `
On-chain evidence: Move package with module \`giftdrop_iota\` (IOTA-flavored module name).

Multiple upgrade versions at Studio 0xb8b1380e — part of the studio's infrastructure-utility portfolio alongside \`vault\` (multiple variants with per-creator VaultManagers) and \`gas_station\`. See team attribution for context: Studio 0xb8b1380e is a multi-brand deployer shipping KrillTube (\`krill.tube\`), GiveRep (\`giverep.com\`, IOTA side), the on-chain games bundle, and shared utility infrastructure.
`.trim(),
};
