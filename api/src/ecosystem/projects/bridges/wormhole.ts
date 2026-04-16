import { ProjectDefinition } from '../project.interface';

export const wormhole: ProjectDefinition = {
  name: 'Wormhole',
  layer: 'L1',
  category: 'Bridge',
  description: 'Wormhole cross-chain messaging protocol on IOTA Rebased. Provides generic message passing between IOTA and other blockchains, secured by a network of guardian nodes that verify and relay cross-chain attestations.',
  urls: [
    { label: 'Website', href: 'https://wormhole.com' },
  ],
  teamId: 'wormhole-foundation',
  match: { all: ['consumed_vaas', 'cursor'] },
};
