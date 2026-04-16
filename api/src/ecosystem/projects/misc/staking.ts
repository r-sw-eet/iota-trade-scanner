import { ProjectDefinition } from '../project.interface';

export const staking: ProjectDefinition = {
  name: 'Staking',
  layer: 'L1',
  category: 'Staking',
  description: 'Custom staking contracts on IOTA Rebased with configurable parameters. Enables projects to offer their own staking programs with custom reward schedules and entry/exit conditions.',
  urls: [],
  teamId: 'staking-generic',
  match: { all: ['stake', 'stake_config'] },
};
