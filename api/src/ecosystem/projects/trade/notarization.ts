import { ProjectDefinition } from '../project.interface';

export const notarization: ProjectDefinition = {
  name: 'Notarization',
  layer: 'L1',
  category: 'Notarization',
  description: 'On-chain document notarization service on IOTA Rebased. Supports dynamic and locked notarization modes, with timelock capabilities. Documents are anchored on-chain with cryptographic proofs of existence and timestamps.',
  urls: [],
  teamId: 'if-notarization',
  match: { all: ['dynamic_notarization'] },
};
