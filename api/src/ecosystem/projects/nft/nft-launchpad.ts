import { ProjectDefinition } from '../project.interface';

export const nftLaunchpad: ProjectDefinition = {
  name: 'NFT Launchpad',
  layer: 'L1',
  category: 'NFT',
  description: 'NFT launch platform on IOTA Rebased with mint box mechanics, pseudorandom minting for fair distribution, and signature-based whitelist verification.',
  urls: [],
  teamId: 'tradeport',
  match: { all: ['launchpad', 'mint_box'] },
};
