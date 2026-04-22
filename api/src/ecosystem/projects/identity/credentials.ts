import { ProjectDefinition } from '../project.interface';

export const credentials: ProjectDefinition = {
  name: 'Credentials',
  layer: 'L1',
  category: 'Identity',
  subcategory: 'Credentials',
  description: 'Verifiable credentials primitive on IOTA Rebased — issues, holds, and verifies digital credentials with on-chain trust anchors. Portable identity attestations across applications. Exact 3-module {credentials, identity, trust} variant in the IF Identity stack.',
  urls: [
    { label: 'IOTA Foundation', href: 'https://www.iota.org/products/identity' },
    { label: 'GitHub', href: 'https://github.com/iotaledger/identity' },
  ],
  teamId: 'iota-foundation',
  match: { exact: ['credentials', 'identity', 'trust'] },
  attribution: `
On-chain evidence: Move package whose module set is exactly \`{credentials, identity, trust}\`.

2 of the 24 IOTA Identity packages at IF deployer \`0x45745c3d1ef637cb8c920e2bbc8b05ae2f8dbeb28fd6fb601aea92a31f35408f\` match this exact signature. Exact-set match differentiates it cleanly from the broader Identity (full) package (5 modules) and the specialized health-lab credential variant (\`{credentials, health_lab_simple, identity, trust}\` — 4 modules, currently uncaptured low-priority gap).

Same \`iota-foundation\` team as the rest of the Identity stack. Attested at the canonical IF repo \`github.com/iotaledger/identity\` ("Decentralized Identity standards such as DID and Verifiable Credentials by W3C for the IOTA MoveVM") — the W3C Verifiable Credentials implementation is the "Credentials" row of that product line.
`.trim(),
};
