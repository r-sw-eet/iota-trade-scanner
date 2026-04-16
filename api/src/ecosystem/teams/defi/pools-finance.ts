import { Team } from '../team.interface';

export const poolsFinance: Team = {
  id: 'pools-finance',
  name: 'Pools Finance',
  description: 'DEX + farming on IOTA Rebased. AMM router, pools, and farming contracts.',
  urls: [{ label: 'Website', href: 'https://pools.finance' }],
  deployers: [
    '0x519ebf6b900943042259f34bb17a6782061c5b6997d6c545c95a03271956800c',
    '0xeadab2493d7aff3ac3951e545e9c61bef93dee1915e18aff50414d72067f88e7',
  ],
  logo: '/logos/pools-finance.svg',
};

export const poolsFarming: Team = {
  id: 'pools-farming',
  name: 'Pools Farming',
  description: 'Farming contracts — separate deployer from Pools Finance core.',
  deployers: ['0x21303d10b1369c414f297a6297e48d6bce07bec58f251ea842c7b33779283542'],
  logo: '/logos/pools-finance.svg',
};
