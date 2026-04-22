import { ProjectDefinition } from '../project.interface';

export const poolsFinance: ProjectDefinition = {
  name: 'Pools Finance',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'DEX',
  description: 'First decentralized exchange on IOTA Rebased. Constant-product AMM with pools, stable-pool math, swap routing, and LP staking — all shipped inside a single audited 10-module package.',
  urls: [{ label: 'App', href: 'https://pools.finance' }],
  teamId: 'pools-finance',
  match: { all: ['amm_config', 'amm_router'] },
  attribution: `
On-chain evidence: Move package containing both \`amm_config\` and \`amm_router\` modules — a conservative 2-of-10 subset of the Zokyo-audited Pools Finance AMM signature.

Zokyo's public audit report names the \`Pools-Finance/pools-protocol\` repo and lists ten Move source files in scope: \`amm_config, amm_entries, amm_math, amm_router, amm_stable_utils, amm_swap, amm_utils, stake, stake_config, stake_entries\`. Exactly two mainnet deployers publish packages matching this signature (both in the team deployer list); no other team reuses the \`amm_*\` module naming. The LP-staking flow lives inside this same package via the \`stake*\` modules — there is no separate "farming" package on the Pools side.
`.trim(),
};
