import { ProjectDefinition } from '../project.interface';

/**
 * Seedlot — Lake Toba Collective. Traceable-coffee RWA pilot on IOTA Rebased:
 * smallholder Arabica cooperative around Lake Toba, North Sumatra. First
 * RWA / Agriculture project on the site.
 */
export const seedlotLakeToba: ProjectDefinition = {
  name: 'Seedlot — Lake Toba Collective',
  layer: 'L1',
  category: 'RWA / Agriculture',
  description: 'Tokenized Arabica coffee supply chain for smallholder farmers around Lake Toba, North Sumatra. Single package at deployer `0x52f3cf39…` with 14 modules: cooperative registry (`collective`), per-farmer DIDs (`identity`), cupping-score certifications, harvest-lot tokens (`produce_token`), KML farm-plot polygons on IPFS, stake + audit + USDC-denominated settlement. Domain-verified IOTA DID (`did:iota:laketoba.seedlot.io`). 147 collective_lots registered, 6 farming_heads, 50,000+ coffee trees across ~320 ha per off-chain site copy.',
  addedAt: '2026-04-22',
  urls: [
    { label: 'Seedlot', href: 'https://seedlot.io' },
    { label: 'Lake Toba Collective', href: 'https://laketoba.seedlot.io' },
  ],
  teamId: 'seedlot',
  match: {
    deployerAddresses: ['0x52f3cf3925ac74c8da644016953f0a40dfa92150f5e50f62232dc51d93256746'],
  },
  attribution: `
On-chain evidence: single package \`0x6fa1ad63484171db9383511b3ab440e5c2bdd53eff792c1d2806a5345d1b5c79\` from deployer \`0x52f3cf3925ac74c8da644016953f0a40dfa92150f5e50f62232dc51d93256746\`. No other packages on this deployer — \`deployerAddresses\` catch-all cleanly pins the 14-module traceability stack.

**Decisive attribution via the live \`Collective\` object** at \`0x607de523bcedf72fa79206a4d072c85f84f504407644b3594a8843cc6cf4a57b\`:
- \`name: "Lake Toba Collective"\`
- \`domain: "laketoba.seedlot.io"\`
- \`did: "did:iota:laketoba.seedlot.io"\`
- \`domain_verified: true\` — the contract successfully resolved a domain-linkage credential, standard IOTA Identity proof that the off-chain domain controller owns the on-chain DID.
- \`region: "North Sumatra"\`, \`country: "Indonesia"\`
- \`collective_lots\` table size: 147; \`farming_heads\` table size: 6

**Module architecture (14 modules, coherent commodity-traceability stack):**

| Module              | Role                                                                                |
|---------------------|-------------------------------------------------------------------------------------|
| \`collective\`        | Cooperative registry — holds Lake Toba Collective's top-level state + membership.   |
| \`identity\`          | Per-farmer \`TrustAnchor\` DIDs; sampled \`farmer_did: "did:iota:0x…"\` on lot records. |
| \`certifications\`    | \`CuppingScore\` — coffee-quality grading (the specialty-coffee industry standard).   |
| \`produce_token\`     | \`HarvestRecord\` — tokenized harvest lots per farmer per season.                    |
| \`lot\` + \`lot_display\` | Individual lot entities + display metadata (variety, process, farm, altitude).   |
| \`registry\`          | Cross-entity lookup tables (farmer → lots, lot → certifications).                   |
| \`audit\`             | Append-only audit trail for lot state changes.                                      |
| \`stake\`             | Farmer economic alignment — stake/unstake against lots, shared with cooperative.    |
| \`usdc\`              | USDC-denominated settlement for buyers.                                             |
| \`events\`            | Lifecycle event emission.                                                           |
| \`access\`, \`admin\`, \`types\` | Access control + admin caps + shared type definitions.                        |

**GIS anchoring.** \`kml_ipfs\` field on lot records points at KML (Keyhole Markup Language, Google Earth's XML format) files pinned to IPFS — each lot carries a GPS polygon of the farm plot's boundary. Sampled CIDs: \`bafkreiduuypvcuunwykpl5k5g76y4tn5al34xfe7rgahhxvoqm42bxeqrm\`, \`bafkreidj7b3jvx35czxuvhrz32uhvlcnwhbyvp4k6bxbrbxk32z4kkjgrm\`, and ~15 more. The gateway returned empty content at time of investigation (2026-04-22) but CIDs are valid-shaped; re-probe later.

**Brand chain.**
1. On-chain \`Collective.name\` → "Lake Toba Collective"
2. On-chain \`Collective.domain\` → \`laketoba.seedlot.io\` (with \`domain_verified: true\`)
3. \`laketoba.seedlot.io\` → hosted at \`seedlot.io\` (Seedlot's main domain)
4. \`seedlot.io\` footer → "OUR TECHNOLOGY — We use IOTA to permanently record your coffee's journey from farm to cup."
5. \`seedlot.io\` legal → SEEDLOT PTE. LTD., Singapore, UEN 202437497C

**Activity snapshot (prod capture 2026-04-22):** 350 TXs (not capped), 1,050 events, 10 unique senders. Small-scale production pilot with 147 tokenized lots.

\`isCollectible: false\` (default) — functional RWA traceability, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

**Category \`RWA / Agriculture\`** — first of its kind on the site. Adjacent to Salus (Trade Finance, critical-minerals DWRs) and TruvID (Notarization) but its own vertical: tokenized agricultural commodities with per-farmer on-chain identity.
`.trim(),
};
