import { Team } from '../team.interface';

/**
 * Turing Space (operating Turing Certs) — digital-credentials platform. IOTA
 * Business Innovation Program partner; operates a W3C Verifiable Credentials
 * issuance + verification stack. Headquartered in Den Haag (Netherlands) with
 * additional offices in Taiwan, Japan, and the United States. Self-reported
 * scale (March 2025 site copy): 6M+ credentials issued, 550+ trusted issuers,
 * 40+ government / institutional adoptions across 12+ countries.
 *
 * On-chain footprint is a 3-package W3C Verifiable Credentials issuance
 * pipeline: `turingcerts` + `vc_data` + `vc_envelope` — see the `turingcerts`
 * project def for per-module detail.
 */
export const turingcerts: Team = {
  id: 'turingcerts',
  name: 'Turing Space (Turing Certs)',
  description: 'Digital-credentials platform in the IOTA Business Innovation Program. HQ Den Haag (Netherlands); offices in Taiwan, Japan, and the US. Operates the Turing Certs verifiable-credentials product — W3C VC / DID / OpenID4VC stack, ISO 27001 / 27701 / GDPR-compliant. Public flagship: digitized 3.5M+ Taiwan Renewable Energy Certificates. IOTA-partnered, not IF-operated.',
  urls: [
    { label: 'Turing Certs', href: 'https://turingcerts.com' },
    { label: 'IOTA Blog: Introducing Turing Space', href: 'https://blog.iota.org/introducing-turing-space/' },
    { label: 'IOTA Technology Showcase', href: 'https://www.iota.org/learn/showcases/turing-space' },
    { label: 'UNDP Digital X Solution', href: 'https://digitalx.undp.org/Turingcerts_dx3.html' },
  ],
  deployers: ['0xb0c359fa8075619cae1dc363786773c6291311cf98511f9127cb6d8f713314de'],
  attribution: `
Gold-standard triangulation via official IOTA Foundation partnership announcement + on-chain self-labelling + use-case-fit metrics.

**1. IOTA-side confirmation (decisive).** IOTA Foundation's own blog published "Introducing Turing Space" at \`blog.iota.org/introducing-turing-space/\` announcing the IOTA Business Innovation Program partnership. IOTA further features Turing Space in its [Technology Showcase](https://www.iota.org/learn/showcases/turing-space) as a partner credential-verification platform. Partnership framing is consistent with Gamifly, Salus, TruvID — IOTA-partnered, not IF-operated.

**2. On-chain self-labelling (decisive for deployer attribution).** Module name on every package this deployer ships is literally \`turingcerts\`. No plausible non-Turing-Certs deployer would name their Move module after a specific brand; this is direct self-attestation in the on-chain bytecode.

**3. On-chain architecture maps to the product.** Three-package pipeline: \`turingcerts\` (main logic), \`vc_data\` (the W3C-VC payload struct \`VcData\`), \`vc_envelope\` (the issuable \`VcEnvelope\` object returned to the credential holder). This is textbook W3C Verifiable Credentials shape — Turing Certs describes their product on the landing page as "a verifiable credential platform built on blockchain and global standards like OpenID4VC."

**4. Usage pattern fits B2B VC issuance.** Prod capture (2026-04-22) reports 362,009 TXs + 2,414 events from only 4 unique sender addresses — canonical B2B VC mass-issuance (a handful of admin keys minting credentials at scale for end-users who never touch a wallet). Sampled \`VcEnvelope\` objects confirm: metadata reads \`{"status":"initial","reason":"Issued by API request [trackingId=…] at 2025-09-14T07:49:20.352Z"}\` — "Issued by API request" is Turing Certs' documented issuance path ("API-driven credential minting with tracking IDs"). Timestamps span Q3–Q4 2025, consistent with a production service steadily issuing credentials.

**5. Early Rebased adoption.** First package deployed 2025-05-12 — seven days after the Rebased mainnet launch on 2025-05-05. Consistent with an IOTA Business Innovation Program partner being ready for day-one mainnet use.

**6. Real-world scale (off-chain, Turing Certs site).** Turing Certs self-reports 6M+ credentials issued, 550+ trusted issuers, 40+ government/institutional adoptions, 12+ countries (figures as of March 2025 from \`turingcerts.com\`). The Taiwan Renewable Energy Certificate pilot alone covers 4.8M certificates per IF partnership copy (3.5M+ on-chain-verified per IOTA-side blog). The on-chain TX count is consistent with an early-days IOTA-specific slice of this global credentialing volume.

**Verified — upgrade to [x].** Attribution was [ ] 🟠 in the earlier triage note. Combining (1) + (2) alone would already be strong; with (3)/(4)/(5) layered on, this is a named-brand attribution with no plausible alternative.

**Not IF, not IF-family.** Turing Space operates a separate commercial product with its own offices, own ISO certifications, own GitHub, own web presence. It leverages IOTA infrastructure (IOTA Notarization, Gas Station, identity framework) as described in the partnership announcement, but is not an IF subsidiary. Flagged accordingly — \`isIotaFoundationFamily\` unset, so the "Hide IOTA Foundation" filter does NOT hide this team.

**Leadership / legal entity.** Not harvested to the team record — the landing page names an address in Den Haag but no named executives; a later audit can enrich with corporate-registry lookups (KvK for NL entity, local registries for Taiwan/Japan/US branches) if we want sharper metadata.
`.trim(),
};
