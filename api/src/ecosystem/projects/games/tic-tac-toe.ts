import { ProjectDefinition } from '../project.interface';

export const ticTacToe: ProjectDefinition = {
  name: 'Tic Tac Toe',
  layer: 'L1',
  category: 'Game',
  subcategory: 'On-chain',
  description: 'Simple on-chain tic tac toe game on IOTA Rebased. Each move is a transaction, and the game board is a shared Move object between two players.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['tic_tac_iota'] },
  attribution: `
On-chain evidence: Move package with module \`tic_tac_iota\` (IOTA-flavored pun on the game).

3 upgrade versions at Studio 0xb8b1380e. Package exposes \`AdminCap\`, \`Treasury\`, \`Game\`, and \`Trophy\` structs. \`tic_tac_iota::AdminCap\` is held directly by the deployer address \`0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6\` — strongest single signal in the studio that the deployer itself administrates the games, supporting the single-team-behind-KrillTube/GiveRep/games reading over the dev-shop interpretation.
`.trim(),
};
