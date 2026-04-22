import { ProjectDefinition } from '../project.interface';

export const nftLaunchpad: ProjectDefinition = {
  name: 'NFT Launchpad',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Launchpad',
  description: 'NFT launch platform on IOTA Rebased with mint box mechanics, pseudorandom minting for fair distribution, and signature-based whitelist verification. Tradeport\'s launchpad product — sibling to the core Tradeport marketplace, shipped from the same deployer keys.',
  urls: [{ label: 'Website', href: 'https://tradeport.xyz' }],
  teamId: 'tradeport',
  match: { all: ['launchpad', 'mint_box'] },
  attribution: `
On-chain evidence: Move package with both \`launchpad\` and \`mint_box\` modules.

\`mint_box\` is a Tradeport-specific term for their randomized mint mechanic. The 4-module signature \`{launchpad, mint_box, pseudorandom, signature}\` is the complete NFT Launchpad product surface: pseudorandom minting + signature-based whitelist.

On-chain: 4 packages across both Tradeport deployers match this rule — 3 upgrade versions at \`0x20d666d8e759b3c0c3a094c2bac81794e437775c7e4d3d6fe33761ae063385f7\` and 1 at \`0xae24ce73cd653c8199bc24afddc0c4ddbf0e9901d504c3b41066a6a396e8bf1e\`. Kept as its own row (higher priority than the Tradeport deployer-match) so launchpad activity is legible separately from the core marketplace. No other IOTA mainnet deployer ships \`launchpad + mint_box\`.
`.trim(),
};
