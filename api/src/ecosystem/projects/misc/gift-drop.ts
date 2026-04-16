import { ProjectDefinition } from '../project.interface';

export const giftDrop: ProjectDefinition = {
  name: 'Gift Drop',
  layer: 'L1',
  category: 'Airdrop',
  description: 'IOTA gift drop mechanism for distributing tokens to recipients via claimable on-chain vouchers. Used for promotional airdrops and community reward campaigns.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['giftdrop_iota'] },
};
