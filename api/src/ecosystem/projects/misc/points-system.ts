import { ProjectDefinition } from '../project.interface';

export const pointsSystem: ProjectDefinition = {
  name: 'Points System',
  layer: 'L1',
  category: 'Loyalty',
  description: 'On-chain points and profile system on IOTA Rebased. Tracks user engagement across the ecosystem with verifiable point balances and profile metadata stored as Move objects.',
  urls: [],
  teamId: 'points-system',
  match: { exact: ['constant', 'event', 'point', 'profile'] },
};
