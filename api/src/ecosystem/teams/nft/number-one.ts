import { Team } from '../team.interface';

/**
 * Studio 0x2cd37802 — anonymous deployer of the "Number 1 Collection" FreeNFT.
 * Biggest user-facing mint campaign on IOTA Rebased by any measure: 1,045,000
 * unique senders signed their own `mint_for_free` call during a 6-week
 * February–March 2026 window, producing 1.48M emitted events and hitting the
 * snapshot's 500k-TX backfill floor (true TX count is materially higher).
 *
 * Kept synthetic because no public brand presence surfaces — no website, no
 * Twitter handle, no IOTA Foundation showcase entry, no project logo on the
 * minted NFT metadata.
 */
export const studio2cd3: Team = {
  id: 'studio-2cd3',
  name: 'Studio 0x2cd37802 (Number 1)',
  description: 'Anonymous deployer behind the "Number 1 Collection" FreeNFT — the single largest user-facing campaign on IOTA Rebased by unique-sender count (1,045,000 distinct wallets) and by raw event volume (1,484,566 `EvtMintedNFT` events). Single package, single module (`free_nft`), public `mint_for_free` function. Active 2026-02-03 through 2026-03-15 (6-week window). No public brand presence — no site, no Twitter, no showcase entry.',
  deployers: [{ address: '0x2cd378022200c182264a4f70a7c0ae0fb3007153ab68e232d51d6b0822a88e93', network: 'mainnet' }],
  attribution: `
Synthetic team id for the operator of the "Number 1 Collection" FreeNFT campaign. On-chain footprint is a single package \`0x86a84861b13936bc8f1428645743d7d2f5cf7211cec6b9e56ba079ce34444c27\` (module \`free_nft\`, struct \`FreeNFT\`, public entry \`mint_for_free\`) deployed by \`0x2cd378022200c182264a4f70a7c0ae0fb3007153ab68e232d51d6b0822a88e93\`.

**Campaign scale.** Prod capture (2026-04-22):
- **1,045,000 unique senders** — the largest single-project unique-sender figure on IOTA Rebased by more than an order of magnitude.
- **1,484,566 \`EvtMintedNFT\` events** — one per mint, so 1.48M FreeNFTs issued.
- **TX count hits the 500,000 capture floor** (the scanner's backfill ceiling) — real count is materially higher.

**Active window.** First \`EvtMintedNFT\` timestamp \`2026-02-03T09:31:08.105Z\`; most-recent event \`2026-03-15T23:47:26.589Z\` — a 6-week campaign that has since wound down.

**Mechanics — self-claim mint, not admin-sprayed airdrop.** Function \`mint_for_free\` is public and sender-signed: every \`EvtMintedNFT\` event's \`sender.address\` is a different user wallet, and each minted \`FreeNFT\` lands in the signer's own address-owner slot. Sampled: 3 distinct FreeNFT objects owned by 3 distinct non-deployer addresses (\`0xe99c7c4f…\`, \`0xfc697161…\`, \`0xa7521b78…\`). This is the canonical "user pays gas, user claims own NFT" pattern — not an admin spraying tokens to user wallets.

**NFT content.** Each minted \`FreeNFT\` carries \`name: "Number 1"\`, \`description: "Number 1 Collection"\`, and a data-URL SVG image. The SVG is a blue-cyan linear-gradient rectangle with a number rendered as white sans-serif text. Three of the earliest-sampled objects render text "\`2\`"; the SVG template has no per-object state beyond the text glyph, so the numeric value is interpolated at mint time. Interpreting as a "your-claim-number" collectible — each participant mints a FreeNFT whose visible number represents their claim order in the sequence.

**Operator identification attempts (2026-04-22):**
- Web search \`"Number 1 Collection" IOTA Rebased mint\` → no branded landing page, no project site.
- Web search \`"mint_for_free" IOTA FreeNFT free_nft 2026 claim\` → generic free-mint explainer content; no specific project.
- IOTA showcases page at \`iota.org/learn/showcases\` → not listed.
- NFT-image URL fragments checked for embedded brand identifiers → none (data URL is self-contained, no external host).
- Deployer wallet \`0x2cd378022200c182264a4f70a7c0ae0fb3007153ab68e232d51d6b0822a88e93\` owns only an IOTA \`Coin\` and the package's \`UpgradeCap\` — no branded objects.

**Why kept as synthetic:** no public-web surface links the deployer to a named brand. Consistent with the anonymous-operator shape used for \`studio-49c4\` (PandabyteTicket / KilnTicket phishing spray), \`studio-457d\` (IOTA Estoicos PFP pre-launch), \`studio-cebe\` (ctrlv AI Agents demo) — no self-attestation, no landing page, no social handles.

**Not a phishing spray, though.** The \`studio-49c4\` phishing pattern is distinctive: admin sprays NFTs carrying description strings like "Reward Event 2025 is Live at https://<impersonation-domain>" to fool recipients into visiting wallet-drainer pages. The Number 1 campaign has no such vector — description is "Number 1 Collection", image is an embedded data-URL SVG (no external URL), and users self-mint rather than receiving unsolicited airdrops. Shape is a free-claim meme collectible, not a scam.

**Scale context for dashboard narrative.** 1.04M unique senders mints is the largest such figure on IOTA Rebased to date — more than \`iotaLink\` (thousands), more than any DeFi protocol, more than any other NFT collection by a factor of ~50×. Consistent with a viral self-claim mint that spread through IOTA's retail community between February and March 2026. The dashboard row should surface this scale prominently even though attribution is synthetic.
`.trim(),
};
