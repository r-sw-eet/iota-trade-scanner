import { ProjectDefinition } from '../project.interface';

export const ticTacToe: ProjectDefinition = {
  name: 'Tic Tac Toe',
  layer: 'L1',
  category: 'Game',
  description: 'Simple on-chain tic tac toe game on IOTA Rebased. Each move is a transaction, and the game board is a shared Move object between two players.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['tic_tac_iota'] },
};
