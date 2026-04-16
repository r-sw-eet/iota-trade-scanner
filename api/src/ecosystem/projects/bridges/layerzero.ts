import { ProjectDefinition } from '../project.interface';

export const layerZero: ProjectDefinition = {
  name: 'LayerZero',
  layer: 'L1',
  category: 'Bridge',
  description: 'LayerZero omnichain interoperability protocol on IOTA Rebased. Enables cross-chain messaging and asset transfers between IOTA and 150+ connected blockchains via a decentralized messaging layer.',
  urls: [
    { label: 'Website', href: 'https://layerzero.network' },
  ],
  teamId: 'layerzero',
  match: { any: ['endpoint_quote', 'lz_compose'] },
};

export const layerZeroOft: ProjectDefinition = {
  name: 'LayerZero OFT',
  layer: 'L1',
  category: 'Bridge (OFT)',
  description: 'LayerZero Omnichain Fungible Token standard on IOTA. Allows tokens to exist natively on multiple chains simultaneously with unified supply, enabling seamless cross-chain token transfers.',
  urls: [
    { label: 'Website', href: 'https://layerzero.network' },
  ],
  teamId: null,
  logo: '/logos/layerzero.png',
  disclaimer: "Aggregate bucket split by deployer — each sub-project represents all OFT packages published by a single address (a token-wrapper), identified by a short hash of that deployer. Known deployers (e.g., Virtue) are routed to their team via the registry.",
  splitByDeployer: true,
  match: { all: ['oft', 'oft_impl'] },
};
