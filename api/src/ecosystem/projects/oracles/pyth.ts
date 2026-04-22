import { ProjectDefinition } from '../project.interface';

export const pythOracle: ProjectDefinition = {
  name: 'Pyth Oracle',
  layer: 'L1',
  category: 'Oracle',
  subcategory: 'Price Feed',
  description: 'Pyth Network price feeds integrated natively into IOTA Rebased. Real-time price data for 500+ assets (crypto, commodities, equities, forex) delivered via Wormhole VAAs. Pull-oracle architecture — consumers refresh prices on-demand rather than receiving push updates.',
  urls: [
    { label: 'Website', href: 'https://pyth.network' },
    { label: 'IOTA docs', href: 'https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/iota' },
    { label: 'Contract addresses', href: 'https://docs.pyth.network/price-feeds/contract-addresses/iota' },
  ],
  teamId: 'wormhole-foundation',
  logo: '/logos/pyth.png',
  match: { all: ['batch_price_attestation'] },
  attribution: `
On-chain evidence: Move package with module \`batch_price_attestation\`.

Gold-standard attestation via Pyth Network's official IOTA deployment page (\`docs.pyth.network/price-feeds/contract-addresses/iota\`), which publishes the package address verbatim: \`0x7792c84e1f8683dac893126712f7cf3ba5fcc82450839f0a481215f60199769f\`.

On-chain, the Pyth Oracle package contains 20 modules:
\`accumulator, batch_price_attestation, contract_upgrade, data_source, deserialize, event, governance, governance_action, governance_instruction, hot_potato_vector, i64, merkle_tree, migrate, price, price_feed, price_identifier, price_info, price_status, pyth, set\`.

Textbook Pyth on-chain contract — \`batch_price_attestation\` + \`merkle_tree\` + \`price_feed\` is Pyth's pull-oracle architecture. The deployer is shared with Wormhole because Pyth's pull-oracle design broadcasts price updates via Wormhole VAAs; the Wormhole Foundation operates both on IOTA.

**Side-finding — \`pyth\` module is a false signal by itself:** CyberPerp's trading deployer publishes 4 packages each containing a module literally named \`pyth\`. Those are CyberPerp's client-side Pyth price-feed integration (trading engines embed a consumer of Pyth's oracle), not Pyth's oracle contract itself. The match rule \`{batch_price_attestation}\` correctly disambiguates — the client-side \`pyth\` modules don't carry \`batch_price_attestation\`. Loosening the rule to just \`pyth\` would false-match CyberPerp.
`.trim(),
};
