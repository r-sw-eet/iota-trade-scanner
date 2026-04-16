import { ProjectDefinition } from '../project.interface';

export const poolsFinance: ProjectDefinition = {
  name: 'Pools Finance',
  layer: 'L1',
  category: 'DEX (AMM)',
  description: 'First decentralized exchange on IOTA Rebased, built with MoveVM. Provides automated market maker swaps, liquidity pools, and token staking. Uses a constant-product AMM model optimized for low gas costs on IOTA.',
  urls: [
    { label: 'App', href: 'https://pools.finance' },
  ],
  teamId: 'pools-finance',
  match: { all: ['amm_config', 'amm_router'] },
};

export const poolsFarming: ProjectDefinition = {
  name: 'Pools Farming',
  layer: 'L1',
  category: 'Yield Farming',
  description: 'Yield farming module for Pools Finance. Liquidity providers stake their LP tokens to earn IRT rewards. Supports single and dual reward farming across multiple pools.',
  urls: [
    { label: 'App', href: 'https://pools.finance' },
  ],
  teamId: 'pools-farming',
  match: { all: ['farm', 'irt'] },
};
