import { ProjectDefinition } from '../project.interface';

export const wormhole: ProjectDefinition = {
  name: 'Wormhole',
  layer: 'L1',
  category: 'Bridge',
  subcategory: 'Messaging',
  description: 'Wormhole cross-chain messaging protocol on IOTA Rebased. Generic message passing between IOTA and other blockchains, secured by a network of guardian nodes that verify and relay cross-chain attestations (VAAs — Verifiable Action Approvals).',
  urls: [
    { label: 'Website', href: 'https://wormhole.com' },
  ],
  teamId: 'wormhole-foundation',
  match: { all: ['consumed_vaas', 'cursor'] },
  attribution: `
On-chain evidence: Move package with both \`consumed_vaas\` and \`cursor\` modules.

Gold-standard attestation via Pyth Network's official IOTA deployment page (\`docs.pyth.network/price-feeds/contract-addresses/iota\`), which publishes the Wormhole Core package address verbatim: \`0x88b00a6f1d56966d48680ffad3b42d7a25b01c519b73732a0858e0314a960801\`. Notably, Wormhole's own contract-addresses reference page doesn't list IOTA at all (50+ other chains listed) — their IOTA integration exists but is documented on Pyth's side, because the Wormhole Foundation operates both contracts from the same deployer and Pyth's price feeds ride on top of Wormhole's VAA messaging layer.

On-chain, the Wormhole Core package contains 20 modules:
\`bytes, bytes20, bytes32, consumed_vaas, cursor, emitter, external_address, fee_collector, governance_message, guardian, guardian_set, guardian_signature, migrate, package_utils, publish_message, set, set_fee, setup, state, transfer_fee\`.

Textbook Wormhole Core — the \`guardian\`, \`guardian_set\`, \`guardian_signature\`, and \`publish_message\` modules are the defining primitives of Wormhole's guardian-based attestation protocol. The match rule's \`{consumed_vaas, cursor}\` pair is a 2-of-20 subset that uniquely identifies this package on IOTA mainnet — no other mainnet deployer ships either module.
`.trim(),
};
