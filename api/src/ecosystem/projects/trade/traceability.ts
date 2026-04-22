import { ProjectDefinition } from '../project.interface';

export const traceability: ProjectDefinition = {
  name: 'Traceability',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Application',
  industries: ['Logistics'],
  description: 'Product traceability contracts on IOTA Rebased. Designed for tracking goods through supply chains with immutable on-chain records of provenance, handling, and certification. Per-customer deployment pattern — multiple IF deployers ship the same single-module package for different enterprise pilots.',
  urls: [
    { label: 'IOTA Foundation', href: 'https://www.iota.org/products/traceability' },
  ],
  teamId: 'iota-foundation',
  match: { all: ['traceability'] },
  attribution: `
On-chain evidence: Move package with module \`traceability\`. \`traceability\` is a unique module name on IOTA mainnet — no non-IF deployer ships it.

Organizational-grade attestation: IOTA Foundation publicly endorses the product at \`iota.org/products/traceability\`. 3 IF deployers ship 6 identical single-module \`traceability\` packages — a pattern (multi-deployer, identical minimalist contract, generic module name) consistent with a coordinated per-customer deployment only IF is plausibly positioned to run. No \`iotaledger/traceability\` GitHub repo surfaces (unlike Notarization which has a canonical open-source repo); the gap is best explained by Traceability's managed-service deployment model (closer to TLIP than to a self-serve Move library).
`.trim(),
};
