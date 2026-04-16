import { ProjectDefinition } from '../project.interface';

export const identityWot: ProjectDefinition = {
  name: 'Identity (WoT)',
  layer: 'L1',
  category: 'Identity',
  description: 'Web of Trust identity system on IOTA Rebased. Enables decentralized identity verification where trust relationships between entities are recorded on-chain, forming a verifiable trust graph.',
  urls: [],
  teamId: 'if-identity',
  match: { all: ['wot_identity', 'wot_trust'] },
};
