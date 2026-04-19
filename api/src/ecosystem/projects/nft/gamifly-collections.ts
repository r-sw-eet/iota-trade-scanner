import { ProjectDefinition } from '../project.interface';

/**
 * Gamifly's on-chain NFT surface on IOTA Rebased: in-game cosmetics / access
 * tokens for the Cricket Fly game (and adjacent Aylab-branded drops). 9
 * single-module packages at deployer `0xfe407119…` are fanned into **4
 * theme-grouped project rows** here — Aylab (3 variants), Isla (Silver + Gold,
 * Islamabad-themed), Otterfly (3 variants), Chamillion (1). The numbered
 * variants are the same conceptual drop in multiple editions; grouping keeps
 * the dashboard row count manageable without hiding the branded families.
 *
 * All four projects set `teamId: 'gamifly'` (team lives in
 * `teams/games/gamifly.ts` with the full brand chain: Aylab developer,
 * IOTA Foundation-partnered Pakistani-cricket-fans launch, press coverage,
 * GMF native token, Google Play "Cricket Fly x Gamifly" app). All four
 * are `isCollectible: true` — PFP / in-game cosmetics, hidden by the
 * "Hide collectibles" toggle.
 *
 * Match rules use `deployerAddresses` + `any: [<module names>]` — the
 * deployer pin ensures we can't accidentally catch an unrelated package
 * reusing the same module name from a different address; the `any` narrows
 * to the specific family's variant modules.
 */

const GAMIFLY_DEPLOYER = '0xfe407119a75c69efebc82764e22e99429c3f5723f9b2e19c848789d8167e2cdb';

export const gamiflyAylab: ProjectDefinition = {
  name: 'Gamifly — Aylab',
  layer: 'L1',
  category: 'NFT',
  description: 'Aylab-branded collection by Gamifly — 3 numbered variants (Aylab 1 / 2 / 3) from modules `aylab_1`, `aylab_2`, `aylab_3`. Single-module packages at the Gamifly deployer, each minting an `Aylab<N>NFT` object with art served from the `gamifly-nft` GCS bucket (`aylab_nft_{1,2,3}.png`). See the `gamifly` team for the full brand chain + IOTA Foundation launch partnership context.',
  urls: [],
  teamId: 'gamifly',
  isCollectible: true,
  match: {
    deployerAddresses: [GAMIFLY_DEPLOYER],
    any: ['aylab_1', 'aylab_2', 'aylab_3'],
  },
  attribution: `
Matches any package from Gamifly's deployer \`0xfe407119…\` whose module set contains one of \`aylab_1\` / \`aylab_2\` / \`aylab_3\` — three separate packages, one per numbered variant. Each package ships a single module with struct \`Aylab1NFT\` / \`Aylab2NFT\` / \`Aylab3NFT\` (all \`{store, key}\`) plus an \`NFTMinted\` event struct. Sampled NFTs carry \`name: "Aylab 1"\` / \`"Aylab 2"\` / \`"Aylab 3"\`, \`description: "Aylab NFT <N>"\`, and \`url.url: https://storage.googleapis.com/gamifly-nft/aylab_nft_<N>.png\` — the \`gamifly-nft\` GCS bucket is the identity-smoking-gun for the whole deployer (see team attribution).

Grouped together rather than as 3 separate rows because the numbered variants represent the same conceptual Aylab collection shipped in multiple editions. \`isCollectible: true\` — PFPs, not utility.
`.trim(),
};

export const gamiflyIsla: ProjectDefinition = {
  name: 'Gamifly — Isla',
  layer: 'L1',
  category: 'NFT',
  description: 'Islamabad-themed collection by Gamifly — 2 tiers (Isla Silver + Isla Gold) from modules `isla_silver`, `isla_gold`. Art served as `islamabad_silver.png` / `islamabad_gold.png` from the `gamifly-nft` GCS bucket — confirms "Isla" is a truncation of Islamabad, matching Gamifly\'s Pakistani cricket-fan audience per the press-covered IOTA Foundation launch partnership.',
  urls: [],
  teamId: 'gamifly',
  isCollectible: true,
  match: {
    deployerAddresses: [GAMIFLY_DEPLOYER],
    any: ['isla_silver', 'isla_gold'],
  },
  attribution: `
Matches any package from Gamifly's deployer \`0xfe407119…\` whose module set contains one of \`isla_silver\` / \`isla_gold\` — two separate packages, one per tier. Each ships a single module with struct \`IslaSilverNFT\` / \`IslaGoldNFT\` (\`{store, key}\`) + an \`NFTMinted\` event struct. Sampled NFTs: \`name: "Isla Silver"\` / \`"Isla Gold"\`, art URLs \`…/gamifly-nft/islamabad_silver.png\` and \`…/gamifly-nft/islamabad_gold.png\` — the filename reveals "Isla" = Islamabad (Pakistan's capital), matching Gamifly's Pakistani cricket-fans positioning.

Grouped together because Silver + Gold are rarity tiers of the same conceptual Islamabad collection. \`isCollectible: true\` — PFPs / cosmetics.
`.trim(),
};

export const gamiflyOtterfly: ProjectDefinition = {
  name: 'Gamifly — Otterfly',
  layer: 'L1',
  category: 'NFT',
  description: 'Otterfly character collection by Gamifly — 3 numbered variants from modules `otterfly_1`, `otterfly_2`, `otterfly_3`. Single-module packages at the Gamifly deployer; art served as `otter_fly_nft_{1,2,3}.png` from the `gamifly-nft` GCS bucket.',
  urls: [],
  teamId: 'gamifly',
  isCollectible: true,
  match: {
    deployerAddresses: [GAMIFLY_DEPLOYER],
    any: ['otterfly_1', 'otterfly_2', 'otterfly_3'],
  },
  attribution: `
Matches any package from Gamifly's deployer \`0xfe407119…\` whose module set contains one of \`otterfly_1\` / \`otterfly_2\` / \`otterfly_3\` — three separate packages, one per numbered variant. Each ships a single module with struct \`OtterFly1NFT\` / \`OtterFly2NFT\` / \`OtterFly3NFT\` (\`{store, key}\`) + an \`NFTMinted\` event struct. Sampled NFTs: \`name: "Otterfly <N>"\`, \`description: "Otterfly NFT <N>"\`, art URLs \`…/gamifly-nft/otter_fly_nft_<N>.png\`.

Grouped together because the numbered variants represent the same conceptual Otterfly collection shipped in multiple editions. \`isCollectible: true\`.
`.trim(),
};

export const gamiflyChamillion: ProjectDefinition = {
  name: 'Gamifly — Chamillion',
  layer: 'L1',
  category: 'NFT',
  description: 'Chamillion character collection by Gamifly — single package from module `chamillion`. Single-module package at the Gamifly deployer; art served as `chamillion_nft.png` from the `gamifly-nft` GCS bucket.',
  urls: [],
  teamId: 'gamifly',
  isCollectible: true,
  match: {
    deployerAddresses: [GAMIFLY_DEPLOYER],
    all: ['chamillion'],
  },
  attribution: `
Matches the single package from Gamifly's deployer \`0xfe407119…\` whose module is named \`chamillion\`. Ships struct \`ChamillionNFT\` (\`{store, key}\`) + \`NFTMinted\` event. Sampled NFT: \`name: "Chamillion"\`, \`description: "Chamillion NFT"\`, art URL \`…/gamifly-nft/chamillion_nft.png\`.

Single-module family so the match rule uses \`all: ['chamillion']\` rather than \`any\`; same net effect given the deployer pin. \`isCollectible: true\`.
`.trim(),
};
