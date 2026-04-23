import { Team } from '../team.interface';

export const wormholeFoundation: Team = {
  id: 'wormhole-foundation',
  name: 'Wormhole Foundation',
  description: 'Operates the Wormhole core cross-chain messaging contract and the Pyth Network price-feed integration on IOTA from a single shared deployer. Pyth\'s pull-oracle design broadcasts price updates via Wormhole VAAs, so the same team runs both.',
  urls: [
    { label: 'Wormhole', href: 'https://wormhole.com' },
    { label: 'Pyth', href: 'https://pyth.network' },
  ],
  deployers: [{ address: '0x610a7c8f0e7cb73d3c93d1b4919de1b76fc30a8efa8e967ccdbb1f7862ee6d27', network: 'mainnet' }],
  logo: '/logos/wormhole.ico',
  attribution: `
Gold-standard attribution via Pyth Network's official IOTA deployment page (\`docs.pyth.network/price-feeds/contract-addresses/iota\`), which publishes both IOTA mainnet package addresses verbatim:

- **Wormhole Package ID** (Move package): \`0x88b00a6f1d56966d48680ffad3b42d7a25b01c519b73732a0858e0314a960801\`
- **Wormhole State ID** (shared Move object): \`0xd43b448afc9dd01deb18273ec39d8f27ddd4dd46b0922383874331771b70df73\`
- **Pyth Package ID** (Move package): \`0x7792c84e1f8683dac893126712f7cf3ba5fcc82450839f0a481215f60199769f\`
- **Pyth State ID** (shared Move object): \`0x6bc33855c7675e006f55609f61eebb1c8a104d8973a698ee9efd3127c210b37f\`

Notably, Wormhole's own main contract-addresses reference page (\`wormhole.com/docs/products/reference/contract-addresses\`) does not list IOTA at all (50+ other chains listed). Their IOTA integration exists but is documented on Pyth's side — the Wormhole Foundation runs both contracts from the same deployer because Pyth's price feeds ride on top of Wormhole's VAA messaging layer.

On-chain: deployer \`0x610a7c8f0e7cb73d3c93d1b4919de1b76fc30a8efa8e967ccdbb1f7862ee6d27\` publishes exactly 2 packages (no upgrade versions yet):

- \`0x88b00a6f1d56966d48680ffad3b42d7a25b01c519b73732a0858e0314a960801\` — **Wormhole Core**, 20 modules: \`bytes, bytes20, bytes32, consumed_vaas, cursor, emitter, external_address, fee_collector, governance_message, guardian, guardian_set, guardian_signature, migrate, package_utils, publish_message, set, set_fee, setup, state, transfer_fee\`. The \`guardian\`, \`guardian_set\`, \`guardian_signature\`, and \`publish_message\` modules are the defining primitives of Wormhole's guardian-based attestation protocol.
- \`0x7792c84e1f8683dac893126712f7cf3ba5fcc82450839f0a481215f60199769f\` — **Pyth Oracle**, 20 modules: \`accumulator, batch_price_attestation, contract_upgrade, data_source, deserialize, event, governance, governance_action, governance_instruction, hot_potato_vector, i64, merkle_tree, migrate, price, price_feed, price_identifier, price_info, price_status, pyth, set\`. \`batch_price_attestation\` + \`merkle_tree\` + \`price_feed\` is Pyth's pull-oracle architecture.

Both package addresses exactly match Pyth's official docs.

Side-finding: CyberPerp's trading deployer (\`0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0\`) publishes 4 packages each containing a module literally named \`pyth\`. Those are CyberPerp's **client-side Pyth price-feed integration** (trading engines embed a consumer of Pyth's oracle), not Pyth's oracle contract itself. The Pyth match rule \`{all: [batch_price_attestation]}\` correctly disambiguates.

Triangulation:
- [x] Pyth's official docs publish both package addresses verbatim.
- [x] On-chain scan confirms both packages exist at deployer \`0x610a7c8f0e7cb73d3c93d1b4919de1b76fc30a8efa8e967ccdbb1f7862ee6d27\`.
- [x] Module signatures are unambiguous (guardian-based cross-chain messaging for Wormhole, merkle-tree batch price attestation for Pyth).
- [x] Shared deployer is architecturally expected: Pyth broadcasts via Wormhole VAAs.
- [x] No other deployer on mainnet ships either module signature.
`.trim(),
};
