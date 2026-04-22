import { ProjectDefinition } from '../project.interface';

export const twinImmutableProof: ProjectDefinition = {
  name: 'TWIN ImmutableProof',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Framework',
  description: 'TWIN Foundation\'s generic anchoring layer on IOTA mainnet. Each call to `verifiable_storage::store_data` writes a W3C Verifiable Credential of type ImmutableProof into a Move object, giving TWIN-powered trade apps a tamper-evident on-chain timestamp plus DID-signed author attribution for any off-chain document or changeset.',
  urls: [
    { label: 'TWIN', href: 'https://www.twin.org' },
    { label: 'Schema', href: 'https://schema.twindev.org/immutable-proof/' },
  ],
  teamId: 'twin-foundation',
  match: { all: ['verifiable_storage'] },
  attribution: `
On-chain evidence: Move package with a single module \`verifiable_storage\` (function \`store_data\`, event \`StorageCreated\`). Across 747 mainnet packages scanned 2026-04-18, all 6 packages exposing this module belong to the TWIN deployer \`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\` — zero false-matches. The 1-module match is safe because \`verifiable_storage\` is a distinctive name unique to TWIN on mainnet today.

Project name uses TWIN's user-facing vocabulary (W3C VC \`type: ImmutableProof\`, per the VC payload format at \`schema.twindev.org/immutable-proof/\`) rather than the internal Move module name. Distinct from TLIP (which ships eBL + carrier_registry + endorsement business-logic primitives at \`0xdeadee97bb146c273e9cc55ec26c1d2936133119acc1b2fc0b542e279007e108\`): TLIP is a TWIN customer deployment in Kenya, while this package is the generic anchor TWIN itself exposes to all its apps.
`.trim(),
};
