import { ProjectDefinition } from '../project.interface';

export const boltProtocol: ProjectDefinition = {
  name: 'Bolt Protocol',
  layer: 'L1',
  category: 'Protocol',
  description: 'Bolt network protocol on IOTA Rebased. Manages station registries, share tokenization, and proxy contracts for a decentralized network of service nodes.',
  urls: [],
  teamId: 'bolt-protocol',
  match: { all: ['bolt', 'station'] },
};
