import { ProjectDefinition } from '../project.interface';

/**
 * Four sibling PFP collections shipped from the same `studio-cb69` deployer
 * as `Healthy Gang`. All share a single module-per-package footprint —
 * `<collection>::Nft` struct + the all-caps OTW sibling, no minted objects
 * on mainnet as of the 2026-04 probe (packages published, nothing actually
 * minted yet). Fingerprint probes therefore can't match, so each uses a
 * module-name sync rule; they sit BEFORE the Studio aggregate in
 * `ALL_PROJECTS` so the narrower rule wins.
 *
 * Portuguese-language module signature (`toma_rajadao`, `tranquilidade_drops`,
 * `tanapaz`) + the `droppzz_test_iota` module in the same deployer's
 * footprint suggest a Brazil / Lusophone-community operator under an unconfirmed
 * "Droppzz" handle — left as a TODO.
 *
 * Each def sets `isCollectible: true` — pure PFPs with no utility / RWA
 * anchor; hidden by the dashboard's "Hide collectibles" toggle.
 */

const SHARED_STUDIO = 'studio-cb69';

function sharedAttribution(module: string, pkg: string, translation?: string): string {
  const trans = translation ? ` Module name ${translation}.` : '';
  return `
On-chain evidence: single-module package \`${pkg}\` (module \`${module}\`, OTW type \`${module.toUpperCase()}\` + NFT struct \`Nft\`) deployed by \`0xcb6956e9f7f2515054241b74a1c0b545b4e813d0e5e15f9bb827870b3d63724c\` — the same deployer as \`Healthy Gang\` and the other \`studio-cb69\` siblings.${trans}

Match rule: \`exact: ['${module}']\` — module-name sync match. A fingerprint on \`${module}::Nft\` is redundant at present because no NFTs have been minted from this package on mainnet yet (probed 2026-04; zero \`::${module}::Nft\` objects). If/when minting starts, the existing Studio-aggregate \`splitByDeployer\` override would still route fresh mints here via this rule first.

No public website, social presence, or marketplace listing found for this collection. Team attribution is the synthetic \`studio-cb69\` pending operator identification (see \`teams/misc/studios.ts\` \`studioCb69\`).

\`isCollectible: true\` — pure PFP. Hidden by the dashboard's "Hide collectibles" toggle.
  `.trim();
}

export const ghostLights: ProjectDefinition = {
  name: 'Ghost Lights',
  layer: 'L1',
  category: 'NFT',
  description: 'Small hand-minted PFP collection on IOTA Rebased from the `studio-cb69` deployer (sibling to Healthy Gang / Tanapaz / Toma Rajadão / Tranquilidade Drops). Package deployed, no NFTs minted on mainnet yet as of 2026-04. Pure collectible — `isCollectible: true` so the dashboard\'s "Hide collectibles" toggle can keep it out of the real-usecases view.',
  urls: [],
  teamId: SHARED_STUDIO,
  isCollectible: true,
  match: { exact: ['ghost_lights'] },
  countTypes: ['ghost_lights::Nft'],
  attribution: sharedAttribution('ghost_lights', '0xd4750b15d032e321ef07a39131a33cec65dd43ac2e93f2134d1839b887bcd743'),
};

export const tanapaz: ProjectDefinition = {
  name: 'Tanapaz',
  layer: 'L1',
  category: 'NFT',
  description: 'Small hand-minted PFP collection on IOTA Rebased from the `studio-cb69` deployer — Brazilian-Portuguese slug (`tá na paz` = "it\'s chill / all peaceful"). Package deployed, no NFTs minted on mainnet yet as of 2026-04. `isCollectible: true`.',
  urls: [],
  teamId: SHARED_STUDIO,
  isCollectible: true,
  match: { exact: ['tanapaz'] },
  countTypes: ['tanapaz::Nft'],
  attribution: sharedAttribution(
    'tanapaz',
    '0xcbf7c2ab0c21fd03d1fa7d35db570b0f24ea45370b8a5e48f11527014d505515',
    'resolves to Brazilian-Portuguese "tá na paz" (literal: "is in peace" — idiom for "it\'s all chill / all good")',
  ),
};

export const tomaRajadao: ProjectDefinition = {
  name: 'Toma Rajadão',
  layer: 'L1',
  category: 'NFT',
  description: 'Small hand-minted PFP collection on IOTA Rebased from the `studio-cb69` deployer — Brazilian-Portuguese slang (`toma rajadão` = "take a big hit / get rekt"). Package deployed, no NFTs minted on mainnet yet as of 2026-04. `isCollectible: true`.',
  urls: [],
  teamId: SHARED_STUDIO,
  isCollectible: true,
  match: { exact: ['toma_rajadao'] },
  countTypes: ['toma_rajadao::Nft'],
  attribution: sharedAttribution(
    'toma_rajadao',
    '0xa66e3b6d0a5d7e812b622484a2a0402605808d217e6e9f3c937c2024887c5400',
    'is Brazilian-Portuguese slang ("toma rajadão" ≈ "take a big hit / get rekt")',
  ),
};

export const tranquilidadeDrops: ProjectDefinition = {
  name: 'Tranquilidade Drops',
  layer: 'L1',
  category: 'NFT',
  description: 'Small hand-minted PFP collection on IOTA Rebased from the `studio-cb69` deployer — Portuguese slug ("tranquility drops"). Package deployed, no NFTs minted on mainnet yet as of 2026-04. `isCollectible: true`.',
  urls: [],
  teamId: SHARED_STUDIO,
  isCollectible: true,
  match: { exact: ['tranquilidade_drops'] },
  countTypes: ['tranquilidade_drops::Nft'],
  attribution: sharedAttribution(
    'tranquilidade_drops',
    '0x9ee45268d778b3b8d80fcd93f0b004716156d7e84aac42d0f973867e524005f4',
    'is Portuguese for "tranquility drops"',
  ),
};
