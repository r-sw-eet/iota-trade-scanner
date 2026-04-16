import { Team } from '../team.interface';

export const tradeport: Team = {
  id: 'tradeport',
  name: 'Tradeport',
  description: 'NFT marketplace + NFT launchpad on IOTA (shared deployer).',
  urls: [{ label: 'Website', href: 'https://tradeport.xyz' }],
  deployers: [
    '0x20d666d8e759b3c0c3a094c2bac81794e437775c7e4d3d6fe33761ae063385f7',
    '0xae24ce73cd653c8199bc24afddc0c4ddbf0e9901d504c3b41066a6a396e8bf1e',
  ],
  logo: '/logos/tradeport.svg',
};
