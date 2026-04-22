import { ProjectDefinition } from '../project.interface';

export const tlip: ProjectDefinition = {
  name: 'TLIP',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Application',
  industries: ['Trade Documents', 'Logistics'],
  description: 'Trade and Logistics Information Pipeline — IOTA × TradeMark East Africa partnership for digital trade documents. Kenya customs deployment is the anchor integration. Handles electronic Bills of Lading (eBL), carrier registries, and endorsement chains for cross-border shipments.',
  urls: [
    { label: 'Website', href: 'https://tlip.io' },
    { label: 'Wiki', href: 'https://wiki.tlip.io' },
    { label: 'IOTA — Trade', href: 'https://www.iota.org/solutions/trade' },
  ],
  teamId: 'tlip',
  match: {
    packageAddresses: ['0xdeadee97bb146c273e9cc55ec26c1d2936133119acc1b2fc0b542e279007e108'],
    all: ['ebl'],
  },
  attribution: `
On-chain evidence:
- Hardcoded package address \`0xdeadee97bb146c273e9cc55ec26c1d2936133119acc1b2fc0b542e279007e108\` (note the deliberate vanity prefix: "dead" readable bytes).
- Package also contains a module named \`ebl\` (electronic Bill of Lading — TLIP's core primitive).

Organizational attestation: iota.org/solutions/trade, tlip.io, wiki.tlip.io, and the \`tmea-tlip\` GitHub org (TradeMark East Africa × IOTA partnership) all surface TLIP publicly. The single TLIP package contains \`{ebl, carrier_registry, endorsement, interop_control, notarization}\` — an exact match for TLIP's documented business primitives. No other mainnet deployer ships the \`ebl\` module, so the module match doubles as a sanity check on the hardcoded address. Team id was previously \`if-tlip\`; promoted to standalone \`tlip\` because TLIP has its own brand, wiki, GitHub org, and TMEA partnership independent of the broader IF product line.
`.trim(),
};
