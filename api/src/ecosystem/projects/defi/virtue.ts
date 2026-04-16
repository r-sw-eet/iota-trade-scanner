import { ProjectDefinition } from '../project.interface';

export const virtue: ProjectDefinition = {
  name: 'Virtue',
  layer: 'L1',
  category: 'Stablecoin / CDP',
  description: 'First native stablecoin protocol on IOTA Rebased. Users mint VUSD (USD-pegged stablecoin) by locking wIOTA or stIOTA as collateral in Collateralized Debt Positions. Features fixed-rate borrowing, a unified stability pool, flash loans, and flash minting.',
  urls: [
    { label: 'App', href: 'https://virtue.money' },
    { label: 'Docs', href: 'https://docs.virtue.money' },
  ],
  teamId: 'virtue',
  match: { all: ['liquidity_pool', 'delegates'] },
};

export const virtueStability: ProjectDefinition = {
  name: 'Virtue Stability',
  layer: 'L1',
  category: 'Stability Pool',
  description: 'Stability pool and borrow incentives for the Virtue protocol. Depositors provide VUSD to absorb liquidations and earn collateral rewards. Part of the Virtue CDP system.',
  urls: [
    { label: 'App', href: 'https://virtue.money' },
  ],
  teamId: null,
  match: { all: ['stability_pool', 'borrow_incentive'] },
};

export const virtuePool: ProjectDefinition = {
  name: 'Virtue Pool',
  layer: 'L1',
  category: 'Stability Pool',
  description: 'Balance tracking and accounting module for Virtue stability pools. Manages the internal ledger of depositor shares and liquidation gains across the protocol.',
  urls: [
    { label: 'App', href: 'https://virtue.money' },
  ],
  teamId: 'virtue-pool',
  match: { all: ['balance_number', 'stability_pool'] },
};
