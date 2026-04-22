import { ProjectDefinition } from '../project.interface';

/**
 * "Number 1 Collection" FreeNFT — biggest mint campaign on IOTA Rebased.
 * 1,045,000 unique senders, 1,484,566 events, 500k+ TXs (hits the snapshot
 * floor). Public \`mint_for_free\` function; users self-signed their own mints
 * between 2026-02-03 and 2026-03-15. No brand presence surfaces — kept as a
 * synthetic \`studio-2cd3\` team row.
 */
export const numberOneFreeNft: ProjectDefinition = {
  name: 'Number 1 Collection',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Collection',
  addedAt: '2026-04-22',
  description: 'Biggest user-facing mint campaign on IOTA Rebased by any measure: 1,045,000 unique senders each signed their own `mint_for_free` call, producing 1,484,566 `EvtMintedNFT` events over a 6-week window (2026-02-03 → 2026-03-15). Single package at `0x86a84861…` (module `free_nft`, struct `FreeNFT`), data-URL SVG art (blue-cyan gradient rectangle with a per-mint claim-number rendered as white text). No public brand surface found — synthetic `studio-2cd3` team; dashboard surfaces the scale regardless.',
  urls: [],
  teamId: 'studio-2cd3',
  isCollectible: true,
  match: {
    packageAddresses: ['0x86a84861b13936bc8f1428645743d7d2f5cf7211cec6b9e56ba079ce34444c27'],
    all: ['free_nft'],
  },
  countTypes: ['free_nft::FreeNFT'],
  attribution: `
**Scale.** Prod capture (2026-04-22) shows this single package as the largest user-facing campaign on IOTA Rebased by unique-sender count by more than an order of magnitude:

- **Unique senders:** 1,045,000 (one per participating wallet).
- **Events:** 1,484,566 \`EvtMintedNFT\` — one per successful mint.
- **Transactions:** hits the 500,000 capture floor; true count is materially higher.
- **Active window:** \`2026-02-03T09:31:08.105Z\` (first event) through \`2026-03-15T23:47:26.589Z\` (last event). 6-week campaign, since wound down.

For context, the next-largest unique-sender population on IOTA Rebased is the IOTA EVM anchor at 2,908 distinct signers — the Number 1 Collection exceeds it by ~360×. This is the single biggest on-chain retail event the network has seen to date.

**Self-claim mint.** The \`mint_for_free\` entry is public. Every sampled \`EvtMintedNFT\` event has a distinct \`sender.address\`; sampled \`FreeNFT\` objects are held by distinct non-deployer wallets (\`0xe99c7c4f…\`, \`0xfc697161…\`, \`0xa7521b78…\`). Each participant signed their own claim; this is not an admin-sprayed airdrop.

**NFT shape.** Each minted \`FreeNFT\` carries:
\`\`\`
{ name: "Number 1",
  description: "Number 1 Collection",
  url: "data:image/svg+xml;base64,<inline SVG>" }
\`\`\`

The base64-decoded SVG is a blue-cyan linear-gradient rectangle with a number rendered as white sans-serif text. Three of the earliest-sampled objects render text glyph "\`2\`"; the SVG template is self-contained (no external host), with the visible number interpolated at mint time. Interpretation: a "your-claim-number" collectible where the rendered glyph represents the claimant's position in the mint sequence.

**Operator: no brand surfaces (2026-04-22 probe).**
- Web search for "Number 1 Collection" IOTA mint → no project site, no Twitter handle, no Discord.
- Not listed in IOTA Foundation's showcase page.
- Deployer wallet \`0x2cd378022200c182264a4f70a7c0ae0fb3007153ab68e232d51d6b0822a88e93\` holds only an IOTA \`Coin\` + the package's \`UpgradeCap\` — no branded objects to identify the operator.
- NFT art is a self-contained data-URL SVG with no external URL → no brand embedded in media.

Kept under synthetic team \`studio-2cd3\` until a public claim surfaces. Attribution pattern mirrors \`studio-457d\` / \`studio-49c4\` / \`studio-cebe\` — anonymous deployer, no self-attestation.

**Not a phishing spray.** Shape differs from the \`studio-49c4\` phishing pattern (admin-sprayed NFTs with impersonation-domain links in description). Here users self-sign \`mint_for_free\`, description is benign ("Number 1 Collection"), image is embedded — no wallet-drainer vector. Best read as a viral free-claim meme collectible.

**Match rule.** \`packageAddresses\` pin on the one deployed package + \`all: ['free_nft']\` as a defence-in-depth module-name guard. If the operator ever redeploys to a new address, the module-name rule won't trigger alone (empty \`packageAddresses\` = need the pin) — a follow-up edit would need to add the new address.

\`isCollectible: true\` — pure claim-your-number PFP-style collectible (no utility, no RWA anchor). Hidden by the "Hide collectibles" toggle so the "real usecases" view isn't dominated by this single campaign. The raw numbers still surface via the team row when the filter is off.

\`countTypes: ['free_nft::FreeNFT']\` — participates in Items + Holders counts on the dashboard's detail page.
`.trim(),
};
