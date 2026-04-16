import { ProjectDefinition } from '../project.interface';

export const vault: ProjectDefinition = {
  name: 'Vault',
  layer: 'L1',
  category: 'Vault',
  description: 'Token vault contracts on IOTA Rebased. Provides secure custody and controlled access to pooled tokens, used as building blocks by other DeFi protocols.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { exact: ['vault'] },
};
