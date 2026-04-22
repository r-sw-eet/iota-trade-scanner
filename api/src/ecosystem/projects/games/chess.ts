import { ProjectDefinition } from '../project.interface';

export const chess: ProjectDefinition = {
  name: 'Chess',
  layer: 'L1',
  category: 'Game',
  subcategory: 'On-chain',
  description: 'Fully on-chain chess game where every move is recorded as a transaction on IOTA Rebased. Players compete in verifiable matches with game state stored as Move objects.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { all: ['chess'] },
  attribution: `
On-chain evidence: Move package with module \`chess\`.

3 upgrade versions at deployer \`0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6\` (Studio 0xb8b1380e). \`chess::AdminCap\` and Treasury objects are shared-object-administered by the deployer itself (not handed off to third parties), suggesting the deployer directly operates the game. Same deployer that ships Tic-Tac-Toe, 2048, Gift Drop, Vault, plus the KrillTube and GiveRep infrastructure — multi-brand dev-shop pattern. See team attribution for the KrillTube/GiveRep identification.
`.trim(),
};
