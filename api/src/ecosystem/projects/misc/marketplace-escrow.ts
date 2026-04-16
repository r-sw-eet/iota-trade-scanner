import { ProjectDefinition } from '../project.interface';

export const marketplaceEscrow: ProjectDefinition = {
  name: 'Marketplace Escrow',
  layer: 'L1',
  category: 'Marketplace',
  description: 'Full-featured marketplace escrow system on IOTA with dispute resolution via quorum voting, milestone-based payments, reputation tracking, and mutual cancellation. Supports order and listing deposit flows.',
  urls: [],
  teamId: 'studio-0a0d',
  match: { all: ['dispute_quorum', 'escrow'] },
};
