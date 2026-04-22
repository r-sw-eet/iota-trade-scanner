import { ProjectDefinition } from '../project.interface';

export const game2048: ProjectDefinition = {
  name: '2048 Game',
  layer: 'L1',
  category: 'Game',
  subcategory: 'On-chain',
  description: 'On-chain version of the classic 2048 puzzle game with campaign rewards. Players earn rewards for high scores, with game state and achievements stored on the IOTA ledger.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['campaign_rewards', 'game_2048'] },
  attribution: `
On-chain evidence: Move package with both \`campaign_rewards\` and \`game_2048\` modules.

Package exposes a \`RewardCapStore\` object managing campaign payouts. Studio 0xb8b1380e ships this as part of its games portfolio alongside Chess and Tic-Tac-Toe. Treasury objects are shared-object-administered by the deployer — same direct-administration pattern seen across the studio's games. See team attribution for the full KrillTube/GiveRep/games multi-brand picture.
`.trim(),
};
