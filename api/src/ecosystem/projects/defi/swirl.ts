import { ProjectDefinition } from '../project.interface';

export const swirl: ProjectDefinition = {
  name: 'Swirl',
  layer: 'L1',
  category: 'Liquid Staking',
  description: 'First liquid staking protocol on IOTA Rebased. Users stake IOTA and receive stIOTA, a liquid staking token that accrues staking rewards while remaining tradeable and usable as DeFi collateral (e.g., in Virtue CDPs).',
  urls: [
    { label: 'App', href: 'https://swirlstake.com' },
    { label: 'Docs', href: 'https://docs.swirlstake.com' },
  ],
  teamId: 'swirl',
  match: { exact: ['pool', 'riota'] },
};

export const swirlValidator: ProjectDefinition = {
  name: 'Swirl Validator',
  layer: 'L1',
  category: 'Liquid Staking',
  description: 'Validator pool management contracts for Swirl. Handles delegation of staked IOTA across the validator set, certificate issuance, and native pool rebalancing.',
  urls: [
    { label: 'App', href: 'https://swirlstake.com' },
  ],
  teamId: null,
  logo: '/logos/swirl.svg',
  match: { all: ['cert', 'native_pool', 'validator'] },
};
