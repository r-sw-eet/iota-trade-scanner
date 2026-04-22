import { ProjectDefinition } from '../project.interface';

export const notarization: ProjectDefinition = {
  name: 'Notarization',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Framework',
  description: 'On-chain document notarization service on IOTA Rebased. Supports dynamic and locked notarization modes, with timelock capabilities. Documents are anchored on-chain with cryptographic proofs of existence and timestamps.',
  urls: [
    { label: 'IOTA Foundation', href: 'https://www.iota.org/products/notarization' },
    { label: 'GitHub', href: 'https://github.com/iotaledger/notarization' },
  ],
  teamId: 'iota-foundation',
  match: { all: ['dynamic_notarization'] },
  attribution: `
On-chain evidence: Move package with module \`dynamic_notarization\`.

Gold-standard attribution via the canonical IF GitHub repo \`iotaledger/notarization\` (Move sources under \`notarization-move/\`), which defines the \`dynamic_notarization\` module exactly as it appears on-chain. IF publicly endorses the product at \`iota.org/products/notarization\`. The Notarization deployer \`0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f\` also ships two adjacent IF products tracked separately: the Identity Asset Framework (16/17-module governance primitive) and the Accreditation Registry (7-module credential registry).
`.trim(),
};
