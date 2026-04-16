import { ProjectDefinition } from '../project.interface';

export const salus: ProjectDefinition = {
  name: 'Salus Platform',
  layer: 'L1',
  category: 'Trade Finance',
  description: 'Tokenizes physical commodities — metal ore, raw materials — as Digital Warehouse Receipts (DWRs) on IOTA mainnet. Each NFT anchors a SHA-384 hash of the off-chain document, proving authenticity without storing the file on-chain. Supports financing, marketplace listings, and title transfers of commodity-backed assets.',
  urls: [
    { label: 'Platform', href: 'https://salusplatform.com' },
    { label: 'Beta Nexus', href: 'https://nexus-beta.salusplatform.com' },
  ],
  teamId: 'salus',
  match: {
    packageAddresses: ['0xf5e4f55993ef59fe3b61da5e054ea2a060cd78e34ca47506486ac8a7c9c7a90f'],
    fingerprint: {
      type: 'nft::NFT',
      issuer: '0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225',
      tag: 'salus',
    },
  },
};
