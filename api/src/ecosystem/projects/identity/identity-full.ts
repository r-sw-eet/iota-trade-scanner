import { ProjectDefinition } from '../project.interface';

export const identityFull: ProjectDefinition = {
  name: 'Identity (full)',
  layer: 'L1',
  category: 'Identity',
  description: 'Comprehensive decentralized identity solution on IOTA featuring Web of Trust verification, encrypted file vault for document storage, and a mailbox system for secure peer-to-peer messaging between identities.',
  urls: [],
  teamId: 'if-identity',
  match: { all: ['wot_identity', 'file_vault', 'mailbox'] },
};
