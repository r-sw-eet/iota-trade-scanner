import { ProjectDefinition } from '../project.interface';

export const chess: ProjectDefinition = {
  name: 'Chess',
  layer: 'L1',
  category: 'Game',
  description: 'Fully on-chain chess game where every move is recorded as a transaction on IOTA Rebased. Players compete in verifiable matches with game state stored as Move objects.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['chess'] },
};
