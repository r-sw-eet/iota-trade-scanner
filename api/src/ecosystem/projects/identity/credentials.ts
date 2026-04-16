import { ProjectDefinition } from '../project.interface';

export const credentials: ProjectDefinition = {
  name: 'Credentials',
  layer: 'L1',
  category: 'Identity',
  description: 'Verifiable credentials protocol on IOTA Rebased. Issues, holds, and verifies digital credentials with on-chain trust anchors. Enables portable identity attestations across applications.',
  urls: [],
  teamId: 'if-identity',
  match: { exact: ['credentials', 'identity', 'trust'] },
};
