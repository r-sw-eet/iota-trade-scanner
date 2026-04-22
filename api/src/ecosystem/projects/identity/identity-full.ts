import { ProjectDefinition } from '../project.interface';

export const identityFull: ProjectDefinition = {
  name: 'Identity (full)',
  layer: 'L1',
  category: 'Identity',
  subcategory: 'Framework',
  description: 'Comprehensive IOTA Identity deployment featuring Web of Trust verification, encrypted file vault for document storage, mailbox system for secure peer-to-peer messaging, and a WoT identity registry. The full-stack variant of the IF Identity product line.',
  urls: [
    { label: 'IOTA Foundation', href: 'https://www.iota.org/products/identity' },
    { label: 'GitHub', href: 'https://github.com/iotaledger/identity' },
  ],
  teamId: 'iota-foundation',
  match: { all: ['wot_identity', 'file_vault', 'mailbox'] },
  attribution: `
On-chain evidence: Move package containing \`wot_identity\`, \`file_vault\`, and \`mailbox\` modules simultaneously.

Gold-standard attestation via the canonical IF GitHub org \`iotaledger\` — Identity lives at \`github.com/iotaledger/identity\` ("Implementation of the Decentralized Identity standards such as DID and Verifiable Credentials by W3C for the IOTA MoveVM"). IF also publishes the product at \`iota.org/products/identity\`.

The full-stack variant matches 2 latest upgrade versions at deployer \`0x45745c3d1ef637cb8c920e2bbc8b05ae2f8dbeb28fd6fb601aea92a31f35408f\` — packages with the 5-module set \`{file_vault, mailbox, wot_identity, wot_identity_registry, wot_trust}\`. The 3-module match \`{wot_identity, file_vault, mailbox}\` is tight enough to uniquely identify these over the WoT-only variants.

The deployer ships 24 packages across the Identity product family — this row (full stack), \`Identity (WoT)\` (6+4+4+6 versions covering the \`{wot_identity, wot_trust}\`-bearing variants), and \`Credentials\` (exact \`{credentials, identity, trust}\` pair). Two minor variants (\`{credentials, health_lab_simple, identity, trust}\` and \`{wot_individual_profile, wot_trust}\`) remain uncaptured — low-priority misc bucket candidates.
`.trim(),
};
