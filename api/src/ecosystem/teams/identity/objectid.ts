import { Team } from '../team.interface';

export const objectid: Team = {
  id: 'objectid',
  name: 'ObjectID',
  description: 'Blockchain-based product-authenticity platform on IOTA Rebased — "Trust Redefined". Assigns tamper-proof digital twins to physical products using IOTA Identity DIDs + Move smart contracts. QR-scan → DID-verify → on-chain event anchoring. Multi-tenant framework, GS1-integration-capable. Patent filed with the European Patent Office. Launch partner: Lizard Medical Italy.',
  urls: [
    { label: 'Website', href: 'https://objectid.io' },
    { label: 'IOTA Showcase', href: 'https://www.iota.org/learn/showcases/objectID' },
  ],
  deployers: [
    { address: '0x59dadd46e10bc3d890a0d20aa3fd1a460110eab5d368922ac1db02883434cc43', network: 'mainnet' },
    { address: '0xbca71c7ae4b8f78e8ac038c4c8aca89d74432a6def0d6395cc5b5c898c66b596', network: 'mainnet' },
  ],
  logo: '/logos/objectid.png',
  attribution: `
Previously registered as "OID Identity" — a placeholder based on the \`oid_*\` module prefix. Resolved 2026-04-17 by applying the ControllerCap probe technique.

Decisive evidence: sampling \`oid_identity::ControllerCap\` objects revealed each instance carries a \`linked_domain\` field identifying the tenant organization. Across the 4 core packages:

| Tenant domain                | ControllerCaps | Role                                                          |
|------------------------------|----------------|---------------------------------------------------------------|
| \`https://nxc.technology/\`    | 9              | Power user (multiple IDs, multi-package usage)                |
| \`https://lizardmed.it/\`      | 2              | **Lizard Medical Italy — ObjectID's featured launch partner** |
| \`https://fomofox.info/\`      | 1              | Tenant                                                        |
| \`https://royalprotocol.org/\` | 1              | Tenant                                                        |
| \`https://www.opentia.com/\`   | 1              | Tenant                                                        |
| \`https://icoy.it/\`           | 1              | Tenant                                                        |

The domain \`lizardmed.it\` is the smoking gun — Bitget News "IOTA Advances Real-World Adoption as ObjectID Launches Onchain-Verified Product" explicitly names Lizard Medical Italy as ObjectID's first onchain-verified product launch partner: *"ObjectID shared the linked dApp page that displays details for a specific ObjectID, a unique cryptographic hash, produced by Lizard Medical Italy."*

Per \`objectid.io\` and the IOTA showcase at \`iota.org/learn/showcases/objectID\`:
- **Product category:** "Digital twins for authentic and transparent products" — anti-counterfeiting + supply-chain provenance.
- **Architecture:** QR on a physical product → opens the dApp → verifies creator's W3C DID tied to the issuer's domain (via the ControllerCap \`linked_domain\` field visible on-chain) → product events (creation, maintenance, certification, ownership transfer) recorded as \`OIDEvent\` objects using VCs + Move contracts.
- **Multi-tenant:** each customer organization gets their own ControllerCap(s) linked to their verified domain.
- **Patent:** ObjectID filed with the European Patent Office for their decentralized product-ID system on IOTA mainnet.
- **IOTA Foundation endorsement:** official Technology Showcase page, plus blog coverage at Bitget, cryptonews.net, bitcoinethereumnews.com, crypto-news-flash. Also "Can IOTA and ObjectID Eliminate the $450B Counterfeiting Problem?" — positioning as anti-counterfeiting infrastructure.

"OID" = **Object ID**. Not Original Issue Discount, not a generic identity protocol — literally short for ObjectID. Module prefixes (\`oid_credit\`, \`oid_identity\`, \`oid_object\`, \`oid_document\`) follow \`<product>_<primitive>\`. \`OIDGs1IHub\` is the GS1 integration hub — ObjectID's bridge to existing supply-chain identifiers (barcodes, GTINs, GLNs, SSCCs, EPC, GS1 Digital Link).

**On-chain product inventory (12 packages across 2 deployers):**
- **Core identity** (\`{oid_credit, oid_identity, oid_object}\`) × 4 versions — product DIDs, object registry, credit/reputation.
- **Documents** (\`oid_document\`) × 3 versions — signed-document workflow (creator/editor/approver/publisher roles, approval flags).
- **Config** (\`oid_config\`) × 2 versions — framework-wide settings, registered official packages, JSON config.
- **Transfer policy** (\`allowlist_rule\`) — Move Kiosk allowlist rule for transfer-restricted assets.
- **Utility** (\`utils\`) — shared helpers.
- **GS1 Integration Hub** (\`OIDGs1IHub\`) — GS1 registry (\`by_gs1\`, \`by_alt\`, \`by_id\` indexes).

Core struct set from introspection:
\`\`\`
module oid_object:
  structs: OIDCounter, OIDEvent, OIDMessage, OIDObject
OIDObject fields: {object_type, object_did, creator_did, owner_did, agent_did, creation_date, description}
OIDEvent fields:  {event_type, timestamp, creator_did, immutable_metadata, mutable_metadata}
OIDDocument fields: {creator_did, editors_dids, approvers_dids, publisher_did, owner_did, approval_flags}
\`\`\`

Triangulation:
- [x] Framework's public-facing name and patent match what's on-chain (ObjectID / OID / "object identity").
- [x] ControllerCap \`linked_domain\` fields reveal multi-tenant customer organizations; \`lizardmed.it\` matches press coverage as ObjectID's featured launch partner.
- [x] IOTA Foundation Technology Showcase page endorses ObjectID as an IOTA ecosystem partner.
- [x] Architecture (QR → DID → on-chain event) matches on-chain evidence.
- [x] Multi-tenant pattern visible in both marketing material and on-chain ControllerCap distribution.

Tenants list (not separate registry teams — customers of ObjectID using the same framework): Lizard Medical Italy (medical-product provenance), NXC Technology (largest tenant), FomoFox, Royal Protocol, Opentia, Icoy.
`.trim(),
};
