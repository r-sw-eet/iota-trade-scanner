import { Team } from '../team.interface';

export const tlip: Team = {
  id: 'tlip',
  name: 'TLIP',
  description: 'Trade and Logistics Information Pipeline — IOTA Foundation × TradeMark East Africa partnership for digital trade documents. Kenya customs deployment is the anchor integration. Ships Move primitives for electronic Bills of Lading, carrier registries, and endorsement chains.',
  urls: [
    { label: 'TLIP', href: 'https://tlip.io' },
    { label: 'Wiki', href: 'https://wiki.tlip.io' },
    { label: 'IOTA — Trade', href: 'https://www.iota.org/solutions/trade' },
  ],
  deployers: [{ address: '0xd7e2de659109e51191f733479891c5a2e1e46476ab4bafe1f663755f145d5176', network: 'mainnet' }],
  logo: '/logos/tlip.svg',
  attribution: `
Organizational-grade attestation: iota.org/solutions/trade, tlip.io, wiki.tlip.io, and the \`tmea-tlip\` GitHub org (TradeMark East Africa × IOTA partnership) all publicly surface TLIP as an IOTA-Foundation-partnered trade-digitization product. The TLIP deployer ships a single package (\`0xdeadee97bb146c273e9cc55ec26c1d2936133119acc1b2fc0b542e279007e108\` — note the deliberate vanity prefix) containing \`{ebl, carrier_registry, endorsement, interop_control, notarization}\`: an exact match for TLIP's documented business primitives. No other mainnet deployer ships the \`ebl\` module.

Promoted from the previous \`if-tlip\` id to standalone \`tlip\` after team-consolidation collapsed IF sub-product teams into \`iota-foundation\`; TLIP has its own brand (tlip.io), wiki, GitHub org, and TMEA partnership, so it stays a distinct team entry. Address-level provenance (a public document naming \`0xdeadee97bb146c273e9cc55ec26c1d2936133119acc1b2fc0b542e279007e108\` or \`0xd7e2de659109e51191f733479891c5a2e1e46476ab4bafe1f663755f145d5176\` specifically) remains gappy — TLIP's published docs predate the Move migration and their audience is governments/shipping, not Move devs — but the organizational triangulation + vanity-prefix + module fingerprint + isolated deployer is conclusive at the team level.
`.trim(),
};
