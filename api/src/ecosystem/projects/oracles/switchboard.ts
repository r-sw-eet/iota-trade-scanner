import { ProjectDefinition } from '../project.interface';

export const switchboardOracle: ProjectDefinition = {
  name: 'Switchboard Oracle',
  layer: 'L1',
  category: 'Oracle',
  description: 'Switchboard decentralized oracle network on IOTA Rebased. Provides customizable data feeds with configurable aggregation, guardian queues, and on-demand oracle functionality for smart contracts.',
  urls: [
    { label: 'Website', href: 'https://switchboard.xyz' },
  ],
  teamId: 'switchboard',
  match: { all: ['aggregator', 'aggregator_init_action'], minModules: 10 },
};
