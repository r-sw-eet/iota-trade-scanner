import { ProjectDefinition } from '../project.interface';

export const tradeport: ProjectDefinition = {
  name: 'Tradeport',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Marketplace',
  description: 'NFT marketplace on IOTA Rebased. Supports bidding, direct listings, kiosk-based trades, and transfer-policy rules (royalty / floor / kiosk-lock). Part of the multi-chain Tradeport NFT platform. Launchpad is a sibling product under the same team.',
  urls: [{ label: 'Website', href: 'https://tradeport.xyz' }],
  teamId: 'tradeport',
  match: { deployerAddresses: [
    '0x20d666d8e759b3c0c3a094c2bac81794e437775c7e4d3d6fe33761ae063385f7',
    '0xae24ce73cd653c8199bc24afddc0c4ddbf0e9901d504c3b41066a6a396e8bf1e',
    // Deployer C — kiosk-rules republish. Identical 6-module kiosk
    // transfer-policy set (floor_price_rule / kiosk_lock_rule /
    // personal_kiosk / personal_kiosk_rule / royalty_rule / witness_rule)
    // to Deployer B's `0x78eedf…`, wired into Tradeport's live marketplace
    // flow. Added 2026-04-22.
    '0x4ecf96a1cc095f0feac25b5a8e09aaa79dcc9e5728668f14ea5068bd6fe6dfbd',
  ] },
  attribution: `
On-chain evidence: deployer-match rule pinned to Tradeport's two mainnet deployers. All 15 packages at these deployers — bidding, kiosk listings, kiosk transfers, standalone listings, transfer-policy rules (6-module royalty/floor/kiosk-lock set), NFT type helpers, and the NFT Launchpad — are Tradeport components.

Previously matched only via \`{all: [tradeport_biddings]}\` (the "NFT Launchpad" row separately matched \`{all: [launchpad, mint_box]}\`), together catching 8 of 15 packages. The 7 uncaptured packages were kiosk-based trades and the transfer-policy rules — a meaningful share of Tradeport activity that now surfaces correctly. Single row covers the marketplace product suite; the Launchpad keeps its own row for clarity.
`.trim(),
};
