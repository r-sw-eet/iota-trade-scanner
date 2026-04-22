import { ProjectDefinition } from '../project.interface';

export const carbonCredits: ProjectDefinition = {
  name: 'Carbon Credits',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Application',
  industries: ['Carbon', 'Sustainability'],
  description: 'Anonymous RWA pilot for tokenized voluntary carbon credits on IOTA Rebased. Single package at `0xb8f25b82…` with 4 modules forming a textbook voluntary-carbon-market primitive: permissioned minter-pass NFT → issues CREDIT_TOKEN coins → per-record credit accounting (CarbonCreditRecord) → proof-of-consumption CertificateNFT on retirement. Current supply: 6,187 CREDIT_TOKEN units. Demo scale, placeholder art, no public web surface — dev\'s showcase of an RWA-carbon-credit design.',
  urls: [],
  teamId: 'studio-b5fc',
  match: {
    deployerAddresses: ['0xb5fca2204cfdd7541137fa247e5878ec109645893461b563a87c0aa3b36a01a0'],
  },
  attribution: `
On-chain evidence: single package from anonymous deployer \`0xb5fca2204cfdd7541137fa247e5878ec109645893461b563a87c0aa3b36a01a0\` — \`0xb8f25b829422bb0df7a405fc752c230c4dac6985dd6ae1e661fe7a13e8f4383b\`. No other packages on this deployer, so \`deployerAddresses\` catches the one package cleanly.

**4-module architecture (textbook voluntary carbon-market primitive):**

| Module                    | Role                                                                               |
|---------------------------|------------------------------------------------------------------------------------|
| \`credit_token\`            | CREDIT_TOKEN coin-type + CreditManager treasury-cap holder. 6,187 supply on-chain. |
| \`credit_carbon_manager\`   | Per-record accounting — CarbonCreditRecord tracks \`available_credit\` + \`minted_credit\`; CarbonCreditTable indexes all records. |
| \`minter_pass_nft\`         | Permissioned-minter gate — MinterPassNFT + CreditPointUpdateCap; only pass-holders can mint credits + update allocations. AppConfig stores admin (the deployer). |
| \`certificate_nft\`         | Proof-of-consumption — CertificateNFT issued to a consumer when they retire credits, so the retirement is provable on-chain.       |

Full event trail: \`CarbonCreditMinted\` / \`CarbonCreditConsumed\` (token flows), \`CreditPointUpdated\` (record allocations), \`MinterPassNFTMinted\` / \`CertificateNFTMinted\` (NFT lifecycle).

**Activity snapshot (2026-04-19):**
- 6,187 CREDIT_TOKEN coins in circulation
- 2+ CarbonCreditRecord objects (sampled: one with \`available_credit: "25"\`, \`minted_credit: "0"\` — allocated but not yet minted against)
- 1 CarbonCreditTable (size 4 — 4 records total registered)
- 2+ MinterPassNFT + 2+ CertificateNFT minted
- Placeholder art (Freepik generic NFT image for the Minter Pass, \`carbonoffsetcertification.com\` generic certificate template image)

**Operator identity:** no public-web brand surfaces. No IOTA Foundation showcase entry, no GitHub repo, no project site. Reads as a dev's single-package RWA showcase rather than a production VCM provider. Team kept as synthetic \`studio-b5fc\` until someone claims it publicly — same shape we use for Car NFT, TruvID, and Studio 0xcb6956e9.

Match rule: \`deployerAddresses\` catch-all on the one deployer (no module-name pin — the deployer only has this one package and it ships all 4 modules, so the catch-all matches cleanly and future upgrade-redeploys will automatically include new module additions).

\`isCollectible: false\` (default) — functional RWA tokenization, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

Category \`RWA / Product Authenticity\` — same class as ObjectID and Car NFT. Not strictly "product authenticity" — voluntary carbon credits are a separate RWA vertical — but the existing category covers tokenized physical-world assets generally; introducing a "VCM / Carbon" category for a single demo-scale project isn't worth it yet. Re-categorise if the VCM segment grows on IOTA.
`.trim(),
};
