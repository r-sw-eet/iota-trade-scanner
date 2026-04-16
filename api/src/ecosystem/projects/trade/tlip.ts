import { ProjectDefinition } from '../project.interface';

export const tlip: ProjectDefinition = {
  name: 'TLIP (Trade)',
  layer: 'L1',
  category: 'Trade Finance',
  description: 'Trade Logistics Information Pipeline — the IOTA Foundation\'s flagship trade digitization project. Handles electronic Bills of Lading (eBL), carrier registries, and endorsement chains for cross-border shipments. Part of the ADAPT initiative in Kenya, Ghana, and Rwanda.',
  urls: [
    { label: 'Website', href: 'https://tlip.io' },
    { label: 'IOTA Foundation', href: 'https://www.iota.org/solutions/trade' },
  ],
  teamId: 'if-tlip',
  match: { all: ['ebl'] },
};
