import { ProjectDefinition } from '../project.interface';

export const tradeport: ProjectDefinition = {
  name: 'Tradeport',
  layer: 'L1',
  category: 'NFT Marketplace',
  description: 'NFT marketplace on IOTA Rebased supporting bidding, listings, and trading of digital collectibles. Part of the broader Tradeport multi-chain NFT platform.',
  urls: [
    { label: 'Website', href: 'https://tradeport.xyz' },
  ],
  teamId: 'tradeport',
  match: { all: ['tradeport_biddings'] },
};
