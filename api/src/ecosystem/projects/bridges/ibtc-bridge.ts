import { ProjectDefinition } from '../project.interface';

export const ibtcBridge: ProjectDefinition = {
  name: 'iBTC Bridge',
  layer: 'L1',
  category: 'Bridge',
  description: 'Bitcoin bridge to IOTA Rebased. Enables trustless transfer of BTC value onto the IOTA network as iBTC tokens, secured by a committee-based custody model with rate limiting and multi-sig treasury.',
  urls: [],
  teamId: 'ibtc',
  match: { all: ['ibtc', 'bridge'] },
};
