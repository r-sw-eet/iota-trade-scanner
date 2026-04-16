import { Team } from '../team.interface';

export const virtue: Team = {
  id: 'virtue',
  name: 'Virtue Money',
  description: 'First native stablecoin (VUSD) protocol on IOTA — CDP, stability pool, flash loans.',
  urls: [
    { label: 'App', href: 'https://virtue.money' },
    { label: 'Docs', href: 'https://docs.virtue.money' },
  ],
  deployers: ['0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0'],
  logo: '/logos/virtue.svg',
};

export const virtuePool: Team = {
  id: 'virtue-pool',
  name: 'Virtue Pool (separate deployer)',
  description: 'Virtue-pool balance/accounting module, deployed separately from the core Virtue team.',
  deployers: ['0xf67d0193e9cd65c3c8232dbfe0694eb9e14397326bdc362a4fe9d590984f5a12'],
  logo: '/logos/virtue.svg',
};
