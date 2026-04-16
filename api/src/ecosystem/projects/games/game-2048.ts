import { ProjectDefinition } from '../project.interface';

export const game2048: ProjectDefinition = {
  name: '2048 Game',
  layer: 'L1',
  category: 'Game',
  description: 'On-chain version of the classic 2048 puzzle game with campaign rewards. Players earn rewards for high scores, with game state and achievements stored on the IOTA ledger.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['campaign_rewards', 'game_2048'] },
};
