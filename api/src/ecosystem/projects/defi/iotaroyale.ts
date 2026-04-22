import { ProjectDefinition } from '../project.interface';

export const iotaroyale: ProjectDefinition = {
  name: 'IotaRoyale',
  layer: 'L1',
  category: 'Game',
  subcategory: 'GambleFi',
  description: 'Parchís and board-games platform on IOTA Rebased. Players compete in PvP matches; the product ships its own $IRT reward token plus farms that pair IRT with TLN and with Pools Finance LP tokens.',
  urls: [{ label: 'Website', href: 'https://iotaroyale.com' }],
  teamId: 'iotaroyale',
  match: { deployerAddresses: ['0x21303d10b1369c414f297a6297e48d6bce07bec58f251ea842c7b33779283542'] },
  attribution: `
On-chain evidence: deployer-match rule pinned to IotaRoyale's single deployer. All 5 packages are farming/reward contracts: v1 \`{farm, farm_dual, irt}\`, v2+ \`{farm, farm_dual, farm_yield, irt}\`.

Gold-standard attribution comes from IOTA on-chain metadata itself: \`iotax_getCoinMetadata\` on \`0x95690908e995c79033b9d392680cfb43f39fc344e79a6c6845dc23334bb3ebd2::irt::IRT\` returns \`name: "IotaRoyale Token"\` with an iconUrl pointing at \`iotaroyale.com/logo.png\`. Backed by IotaRoyale's public launch video (YouTube Feb 2026) and GeckoTerminal's "IRT/vIOTA - IotaRoyale Token Price on Pools Finance" pool listing.
`.trim(),
};
