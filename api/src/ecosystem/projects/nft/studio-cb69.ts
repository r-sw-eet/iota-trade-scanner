import { ProjectDefinition } from '../project.interface';

export const studioCb69Aggregate: ProjectDefinition = {
  name: 'Studio 0xcb6956e9',
  layer: 'L1',
  category: 'NFT',
  description: 'Deployer-level aggregate for the anonymous multi-collection NFT shop at `0xcb6956e9…3d63724c` — 33 packages mixing a handful of small hand-minted PFP collections (Healthy Gang, Ghost Lights, Tanapaz, Toma Rajadão, Tranquilidade Drops) with ~25 keyboard-mash test-deploy modules. Narrow fingerprint projects (currently just Healthy Gang) carve out labeled rows for the real collections; this aggregate catches the remainder so the activity stays visible without polluting the project list with per-deploy rows.',
  urls: [],
  teamId: 'studio-cb69',
  isCollectible: true,
  disclaimer: 'Multi-collection deployer — most matched packages are experimental test deploys with keyboard-mash module names (`fdsfsd`, `asdadas`, `jlkjlkjljlk`, …) rather than real products. Identified collections are split out into their own rows via fingerprint match; everything else falls through here.',
  splitByDeployer: true,
  match: {
    deployerAddresses: [
      '0xcb6956e9f7f2515054241b74a1c0b545b4e813d0e5e15f9bb827870b3d63724c',
    ],
  },
  attribution: `
On-chain evidence: catches every package deployed by \`0xcb6956e9f7f2515054241b74a1c0b545b4e813d0e5e15f9bb827870b3d63724c\` — 33 packages in the 2026-04 snapshot.

Match shape: \`deployerAddresses\` (sync match) + \`splitByDeployer: true\`. The split flag triggers the fingerprint-override escape hatch in \`fetchFull\` — for each package caught by this aggregate, \`matchByFingerprint\` runs and can reclassify it to a more-specific project (currently: the \`Healthy Gang\` fingerprint on \`iota_healthy_gang_::Nft\` + \`name\` prefix \`Healthy Gang #\`). Packages without a fingerprint override stay on this aggregate row.

Why the aggregate exists: the deployer's packages use per-collection / per-deploy module names (\`iota_healthy_gang_\`, \`ghost_lights\`, \`tanapaz\`, \`toma_rajadao\`, \`tranquilidade_drops\`, plus ~20+ keyboard-mash modules). The canonical \`NFT Collections\` aggregate matches \`{exact: ['nft']}\` — it doesn't catch these. Without a dedicated rule, all 33 packages sit in Unattributed. A deployer-catch-all under a synthetic \`studio-cb69\` team keeps the activity attributed while narrower fingerprint defs (\`Healthy Gang\` today, \`Ghost Lights\` / \`Tanapaz\` / \`Toma Rajadão\` / \`Tranquilidade Drops\` as follow-ups) progressively carve out labeled rows.

\`isCollectible: true\` — the whole footprint is PFP-grade collectibles (no utility logic, no RWA anchor, just pictures with IPFS media URLs). Hidden by the "Hide collectibles" dashboard toggle so users viewing real-usecase ecosystem activity aren't distracted by experimental mints.

See \`teams/misc/studios.ts\` \`studioCb69\` team for the operator-identification story (currently none — synthetic team id pending a real brand tie-in).
`.trim(),
};
