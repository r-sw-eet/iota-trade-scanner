import { Team } from '../team.interface';

/**
 * Seedlot (SEEDLOT PTE. LTD., Singapore) — third-party startup building
 * traceable-coffee RWA on IOTA Rebased. First pilot is the Lake Toba
 * Collective (North Sumatra, Indonesia): smallholder Arabica cooperative
 * with tokenized harvest lots, per-farmer DIDs, and GIS-polygon (KML)
 * farm-plot boundaries pinned to IPFS. IOTA is described on their site as
 * "our technology" — not IF-operated, not an IF partnership announcement.
 */
export const seedlot: Team = {
  id: 'seedlot',
  name: 'Seedlot',
  description: 'SEEDLOT PTE. LTD. (Singapore, UEN 202437497C) — traceable-coffee RWA platform on IOTA Rebased. Operates the Lake Toba Collective, a smallholder Arabica cooperative in North Sumatra, Indonesia: 50,000+ coffee trees across ~320 ha, 200+ farmer families, Typica + Sigarar Utang varietals at 1,200m+ altitude. On-chain: domain-verified IOTA DID (`did:iota:laketoba.seedlot.io`), per-farmer DIDs, tokenized harvest lots, KML farm-plot polygons pinned to IPFS.',
  urls: [
    { label: 'Website', href: 'https://seedlot.io' },
    { label: 'Lake Toba Collective', href: 'https://laketoba.seedlot.io' },
    { label: 'X / Twitter', href: 'https://x.com/seed_lot' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/seedlot' },
  ],
  deployers: ['0x52f3cf3925ac74c8da644016953f0a40dfa92150f5e50f62232dc51d93256746'],
  attribution: `
Gold-standard attestation — on-chain \`Collective\` object self-identifies as "Lake Toba Collective" + domain-verified IOTA DID linkage + seedlot.io publicly names IOTA as its chain of record.

**1. On-chain self-attestation (decisive).** Live \`Collective\` object at \`0x607de523bcedf72fa79206a4d072c85f84f504407644b3594a8843cc6cf4a57b\` carries verbatim fields:
\`\`\`
name:              "Lake Toba Collective"
domain:            "laketoba.seedlot.io"
did:               "did:iota:laketoba.seedlot.io"
domain_verified:   true
region:            "North Sumatra"
country:           "Indonesia"
collective_lots:   (size 147)
farming_heads:     (size 6)
\`\`\`
The \`domain_verified: true\` flag means the contract successfully resolved a domain-linkage credential between the on-chain DID and the hosted site — the standard IOTA Identity attestation that the off-chain domain controller is the same entity that owns the on-chain DID. Conclusive for deployer↔brand mapping.

**2. Off-chain confirmation (seedlot.io).** Homepage footer verbatim: *"OUR TECHNOLOGY — We use IOTA to permanently record your coffee's journey from farm to cup. Each lot is represented by a unique record verified on the blockchain, ensuring full transparency and traceability."* Legal entity: SEEDLOT PTE. LTD., 101 Cecil Street, #14-05, Tong Eng Building, Singapore 069533 (UEN 202437497C). No IOTA Foundation partnership language — this is a third-party startup using IOTA as infrastructure, not an IF pilot.

**3. Off-chain confirmation (laketoba.seedlot.io).** Page self-brands as "LAKE TOBA COLLECTIVE / Verified on IOTA" with the self-reported scale above. "Est. 2024 Seedlot Partnership." Typica + Sigarar Utang varietals are both authentic North Sumatran Arabica cultivars — use-case fit is consistent with the contract's shape.

**4. Module set fits the pitch.** \`collective::Collective\` (cooperative registry), \`certifications::CuppingScore\` (coffee-quality grading), \`produce_token::HarvestRecord\` (tokenized harvest lots), \`identity::TrustAnchor\` (DID trust root), plus \`access\`, \`admin\`, \`audit\`, \`events\`, \`lot\`, \`lot_display\`, \`registry\`, \`stake\`, \`types\`, \`usdc\` — coherent traceable-commodity stack with stake (farmer economic alignment), audit trail, and USDC-denominated settlement.

**5. Scale signals.** 350 TXs + 1,050 events + 10 distinct sender addresses on IOTA mainnet as of 2026-04-22. Small-scale pilot — consistent with a 147-lot single-cooperative deployment, not a mass-market rollout. Still, this is real on-chain production use (not a demo), with per-farmer DIDs issued and KML polygon boundaries pinned.

**Not an IF partnership.** Neither seedlot.io nor laketoba.seedlot.io reference the IOTA Foundation, IOTA Business Innovation Program, IOTA Grants, or any IF partnership program. IOTA is named only as "our technology." \`isIotaFoundationFamily\` unset — independent third-party build.

**Category RWA / Agriculture.** Adjacent to Salus (Trade Finance, critical-minerals DWRs) and TruvID (Notarization, document proofs) but its own vertical — tokenized agricultural commodities with per-farmer identity. First RWA / Agriculture project on the site.
`.trim(),
};
