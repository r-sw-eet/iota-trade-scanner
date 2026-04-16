import { Team } from '../team.interface';

export const wormholeFoundation: Team = {
  id: 'wormhole-foundation',
  name: 'Wormhole Foundation',
  description: 'Wormhole cross-chain messaging + the Pyth price-feed integration on IOTA (shared deployer).',
  urls: [
    { label: 'Wormhole', href: 'https://wormhole.com' },
    { label: 'Pyth', href: 'https://pyth.network' },
  ],
  deployers: ['0x610a7c8f0e7cb73d3c93d1b4919de1b76fc30a8efa8e967ccdbb1f7862ee6d27'],
  logo: '/logos/wormhole.ico',
};
