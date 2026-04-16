import { ProjectDefinition } from '../project.interface';

export const gambling: ProjectDefinition = {
  name: 'Gambling',
  layer: 'L1',
  category: 'Gambling',
  description: 'On-chain coin flip and roulette games on IOTA Rebased. Uses verifiable randomness to ensure fair outcomes, with all bets and results recorded as transactions.',
  urls: [],
  teamId: 'gambling',
  match: { all: ['iota_flip', 'roulette'] },
};
