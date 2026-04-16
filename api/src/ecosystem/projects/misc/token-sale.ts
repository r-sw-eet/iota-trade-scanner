import { ProjectDefinition } from '../project.interface';

export const tokenSale: ProjectDefinition = {
  name: 'Token Sale',
  layer: 'L1',
  category: 'Token Sale',
  description: 'Token sale and launchpad platform on IOTA Rebased. Supports multi-coin purchases with configurable sale parameters for project token distribution events.',
  urls: [],
  teamId: 'studio-0a0d',
  match: { any: ['spec_sale_multicoin', 'spec_sale_v2'] },
};
