import { ProjectDefinition } from '../project.interface';

/**
 * Turing Certs — verifiable credentials issuance product by Turing Space. One
 * of the highest-TX real-use cases on IOTA Rebased (362k TXs observed, 4 admin
 * sender addresses = textbook B2B VC issuance).
 */
export const turingcerts: ProjectDefinition = {
  name: 'Turing Certs',
  layer: 'L1',
  category: 'Identity',
  subcategory: 'Credentials',
  description: 'W3C Verifiable Credentials issuance platform by Turing Space — IOTA Business Innovation Program partner. Three-package pipeline at deployer `0xb0c359…`: `turingcerts` (main logic), `vc_data` (VcData payload struct), `vc_envelope` (VcEnvelope holder object). Used in production to issue credentials via API — sampled `VcEnvelope` objects carry `"Issued by API request [trackingId=…]"` metadata with Q3-Q4 2025 timestamps. 362,009 TXs from 4 admin sender addresses — canonical B2B VC mass-issuance at scale. Flagship deployment: Taiwan Renewable Energy Certificate digitization (3.5M+ certs verified per IOTA blog).',
  urls: [
    { label: 'Turing Certs', href: 'https://turingcerts.com' },
    { label: 'IOTA Blog: Introducing Turing Space', href: 'https://blog.iota.org/introducing-turing-space/' },
    { label: 'IOTA Technology Showcase', href: 'https://www.iota.org/learn/showcases/turing-space' },
  ],
  teamId: 'turingcerts',
  match: {
    deployerAddresses: ['0xb0c359fa8075619cae1dc363786773c6291311cf98511f9127cb6d8f713314de'],
    any: ['turingcerts', 'vc_envelope', 'vc_data'],
  },
  attribution: `
On-chain evidence: 3 packages from deployer \`0xb0c359fa8075619cae1dc363786773c6291311cf98511f9127cb6d8f713314de\`. Module set \`{turingcerts, vc_data, vc_envelope}\` — \`turingcerts\` is literal brand self-attestation; \`vc_data\` and \`vc_envelope\` are W3C-VC vocabulary (VcData = the credential payload, VcEnvelope = the envelope wrapping the signed VC + holder binding).

Full attribution chain:
- [x] **IOTA Foundation partnership announcement** at \`blog.iota.org/introducing-turing-space/\` names Turing Space as the latest IOTA Business Innovation Program participant, focused on "secure digital credentials."
- [x] **IOTA Technology Showcase** at \`iota.org/learn/showcases/turing-space\` features the company as a partner-credential-verification platform.
- [x] **On-chain self-labelling:** the module is literally named \`turingcerts\` — no plausible alternative attribution.
- [x] **Live usage matches the product shape:** sampled \`VcEnvelope\` objects carry metadata like \`{"status":"initial","reason":"Issued by API request [trackingId=a3c0ffcb145f691eb9d3c21cbcd02c22] at 2025-09-14T07:49:20.352Z"}\` — API-driven issuance with tracking IDs, consistent with Turing Certs' API-first issuance flow.
- [x] **Volume consistent with Turing Certs' documented scale:** the Taiwan RECs deployment alone (per IOTA blog) covers 3.5M+ renewable-energy certificates. 362k TXs on Rebased matches an IOTA-specific slice of this global volume since the 2025-05-12 deployment.

**Activity snapshot (prod capture 2026-04-22):**
- 3 packages at \`0xb0c359fa…\`: \`0x706c79eb…\` (latest), \`0x3a21f41a…\` (current), with 3 successive on-chain versions
- 362,009 MoveCall TXs (not capped — real count)
- 2,414 events across 4 unique sender addresses
- Sampled VcEnvelope: \`version: "1"\`, \`vc_id\` references a per-credential \`VcData\` object
- First package deployed 2025-05-12 (7 days post-Rebased launch)

**Match rule design.** \`deployerAddresses\` pin + \`any: ['turingcerts', 'vc_envelope', 'vc_data']\` module guard. The deployer pin makes it a tight rule; the \`any\` list is belt-and-suspenders — if Turing Certs rotates deployer keys (e.g. a v4 upgrade via a new key), at least one of the three brand-specific module names would still catch the deployment via team-deployer routing when the new deployer gets added to the team's roster.

\`isCollectible: false\` — functional verifiable credentials, not PFP collectibles. Stays visible regardless of the "Hide collectibles" toggle.

Category \`Identity / Credentials\` — sibling to \`credentials\` (IF's health-lab credential variant) and \`identityFull\`/\`identityWot\` (IF's Identity stack). Turing Certs shares the W3C-VC vocabulary with IF's Identity stack but runs as a separate commercial product.

**Upgrade to [x] completed 2026-04-22.** Previous TODO triage had this at [ ] 🟠 synthetic studio team — promoted to named brand team \`turingcerts\` once the IOTA Foundation partnership announcement surfaced + the API-issuance metadata on-chain matched the product shape.
`.trim(),
};
