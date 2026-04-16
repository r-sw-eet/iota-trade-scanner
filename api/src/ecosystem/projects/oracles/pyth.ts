import { ProjectDefinition } from '../project.interface';

export const pythOracle: ProjectDefinition = {
  name: 'Pyth Oracle',
  layer: 'L1',
  category: 'Oracle',
  description: 'Pyth Network price feeds integrated natively into IOTA Rebased. Provides real-time price data for 500+ assets (crypto, commodities, equities, forex) with sub-second update frequency. Used by Deepr Finance, Virtue, and CyberPerp.',
  urls: [
    { label: 'Website', href: 'https://pyth.network' },
    { label: 'IOTA Docs', href: 'https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/iota' },
  ],
  teamId: 'wormhole-foundation',
  match: { all: ['batch_price_attestation'] },
};
