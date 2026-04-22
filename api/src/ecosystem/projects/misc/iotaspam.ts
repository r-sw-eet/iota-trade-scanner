import { ProjectDefinition } from '../project.interface';

/**
 * Spam Club (on IOTA) — "Proof of Spam" coin-issuance product at
 * `iotaspam.io`. Brand on-site is "Spam Club"; the on-chain coin ticker +
 * module names use the shorter `SPAM` / `spam`.
 *
 * Three-layer attribution:
 *   1. **Upstream codebase:** `juzybits/polymedia-spam` — "Spam to Earn" /
 *      "Proof of Spam" on Sui, by Polymedia dev `juzybits`. 1 billion SPAM
 *      coins per Sui epoch, claimed proportional to each user's tx share.
 *   2. **IOTA port:** `trungtt198x/polymedia-spam` (the fork linked from the
 *      iotaspam.io footer, branch `dev`). 2 commits behind upstream at
 *      2026-04-22 — straightforward port rather than an independent rewrite.
 *   3. **Legal operator:** Rising Phoenix 2 Ltd (IF's BVI commercial wrapper,
 *      also operator of IOTA Names). Owns the ToS at `iotaspam.io`, provides
 *      the legal surface; NOT the codebase's author.
 *
 * On-chain footprint: 8 packages on deployer `0xd3906909…` — the shared IF
 * operational deployer that also publishes IOTA Link and the 3 LayerZero OFT
 * wrappers. Per-project routing resolves via `packageAddresses` / module-set
 * rules, so the shared deployer is handled correctly.
 */
export const iotaSpam: ProjectDefinition = {
  name: 'Spam Club',
  layer: 'L1',
  category: 'Misc',
  addedAt: '2026-04-22',
  description: '"Proof of Spam" coin-issuance product at `iotaspam.io` (brand: "Spam Club"). Port of Polymedia\'s Sui Spam (`juzybits/polymedia-spam`) to IOTA Rebased by GitHub user `trungtt198x` (fork linked from the site footer). Users send IOTA transactions → the `spam` module counts them into per-epoch `UserCounter` objects → next epoch, users claim SPAM coin proportional to their share of that epoch\'s total TX count. Legal wrapper: Rising Phoenix 2 Ltd (IF\'s BVI commercial entity, same operator as IOTA Names) — but NOT the codebase\'s author. 4M+ TXs registered, 152.8B SPAM in supply across 154 epochs.',
  urls: [
    { label: 'Spam Club', href: 'https://iotaspam.io' },
    { label: 'IOTA port (trungtt198x fork)', href: 'https://github.com/trungtt198x/polymedia-spam/tree/dev' },
    { label: 'Upstream (Polymedia / Sui)', href: 'https://github.com/juzybits/polymedia-spam' },
  ],
  // List-view icon: the pixel-invader mascot cropped out of the live site
  // wordmark (iotaspam.io/img/spam-club-logo.svg) — just the alien, no text.
  logo: '/logos/spam-club-alien.svg',
  // Landscape wordmark (full "Spam Club" lockup) for the details page.
  logoWordmark: '/logos/spam-club.svg',
  teamId: 'rising-phoenix-2',
  match: {
    deployerAddresses: ['0xd3906909a7bfc50ea9f4c0772a75bc99cd0da938c90ec05a556de1b5407bd639'],
    any: [
      'spam',
      'icon',
      'custom_metadata_registry',
      'nft',
      'airdrop',
      'rebased_nft',
      'test_nft',
      'mockcoin',
    ],
  },
  countTypes: [
    'nft::SpamNFT',
  ],
  attribution: `
**Product — "Spam Club" on IOTA, aka Proof of Spam.** Site at [\`iotaspam.io\`](https://iotaspam.io) (page title "Spam Club"). "Proof of Spam" coin-issuance protocol — users earn SPAM coin proportional to their share of on-chain transactions sent per epoch.

**Codebase lineage — three-layer attribution** (critical to get right; the first morning-review pass missed it).

**1. Upstream: juzybits / polymedia-spam (Sui).** The product was originally built on **Sui** by Polymedia dev \`juzybits\`, at [\`github.com/juzybits/polymedia-spam\`](https://github.com/juzybits/polymedia-spam). Upstream README ("Spam to Earn" / "Proof of Spam on Sui") describes the mechanic verbatim — one billion SPAM coins minted per Sui epoch, users earn SPAM simply by sending Sui transactions, the more txs you send the more SPAM you receive. "There is no proof of work, only proof of spam."

**2. IOTA port: trungtt198x / polymedia-spam (fork, \`dev\` branch).** The iotaspam.io footer links directly to [\`github.com/trungtt198x/polymedia-spam/tree/dev\`](https://github.com/trungtt198x/polymedia-spam/tree/dev) — a fork of juzybits' repo, 2 commits behind the upstream \`main\` as of 2026-04-22. Straightforward Sui→IOTA port rather than a ground-up rewrite. The porter is GitHub user \`trungtt198x\` (their only public repo activity at this name).

**3. Legal operator: Rising Phoenix 2 Ltd.** The on-site ToS names "Rising Phoenix 2 Ltd." as the provider ("we", "us") — the same BVI commercial wrapper that operates IOTA Names (see the \`rising-phoenix-2\` team attribution for the full operator chain). RP2 provides the legal surface + hosts the webapp; RP2 is NOT the code author.

**What the relationship between the three layers actually is** — unclear from public signals:
- Did RP2 commission \`trungtt198x\` to port the Polymedia codebase under a grant / contract?
- Did \`trungtt198x\` fork + port independently, and RP2 volunteered the legal wrapper?
- Is \`trungtt198x\` itself a pseudonym for an IF-adjacent developer?

No blog post, commit message, or social post ties any two of these layers together publicly. Attribution prose deliberately keeps the three layers distinct rather than implying a commission / employment relationship we can't evidence.

**On-chain footprint** — 8 packages on deployer \`0xd3906909a7bfc50ea9f4c0772a75bc99cd0da938c90ec05a556de1b5407bd639\`. Two primary components + 6 supporting-module packages.

**SPAM engine & coin (\`spam\` + \`icon\` at \`0x206501fb7068b78c2fe3c827a019a6490c9b2aa3dbcd80071b7813e7d56a05c7\`).**

| Struct | Role |
|---|---|
| \`SPAM\` | OTW coin witness — \`CoinMetadata<…::spam::SPAM>\` (name "SPAM", symbol "SPAM", 4 decimals, description "Proof of Spam now on IOTA", hot-pink pixelated data-URL icon). |
| \`Director\` | Shared root object — holds \`tx_count\`, \`paused\` flag, treasury (with \`TreasuryCap\`), \`epoch_counters\` bag, \`total_epoch_reward\` (10^10 base units = \`1e10\`, matching the Sui-version doc's "one billion per day" at 4 decimals). |
| \`EpochCounter\` | Per-epoch accounting — 154 epochs registered. |
| \`UserCounter\` | Per-user-per-epoch counter: \`{epoch, tx_count, registered: bool}\` — users register next-epoch then claim. |
| \`Stats\` / \`EpochStats\` | Snapshot-style stats views surfaced on the \`/stats\` page. |
| \`AdminCap\` | Operator capability. |

Live state (2026-04-22 probe of the \`Director\` shared object):

\`\`\`
{ tx_count: "4026995",
  paused: false,
  treasury: { total_supply: { value: "1528160287173" } },
  epoch_counters: { size: "154" },
  total_epoch_reward: "10000000000" }
\`\`\`

4,026,995 transactions registered as valid spam work; 152.8B SPAM in circulation; 154 epochs counted. The ToS-documented user flow:

> *"Register your counter the day after you use it for spamming via SPAM; failure to do so may prevent you from claiming SPAM."*

**SpamNFT PFP collection (\`custom_metadata_registry\` + \`nft\` at \`0xc76cfa070e7d78b247514f6b8180fe46edeb6a180d0357cb1b2cdea1c0bd5d3d\`).** Struct set: \`SpamNFT\` + \`SpamNFTManager\` + \`CustomMetadata\` + \`CustomMetadataRegistry\` + event trail (\`EventMint\`, \`EventBurn\`, \`EventRedeem\`, \`EventWithdraw\`). Sampled objects:

\`\`\`
{ token_id: "1837",
  base_image_url: "https://images.iotaspam.io",
  dna: "042a4f6ea66369cd1e761b5a262be8ecf708e0da",
  attributes: [
    { trait_type: "Background", value: "Serpentine" },
    { trait_type: "Skin", value: "Gray" },
    { trait_type: "Clothes", value: "Tattoo" },
    { trait_type: "Tusks", value: "Light" },
    { trait_type: "Mouth", value: "Lollipop" },
    { trait_type: "Eyes", value: "Visor" },
    { trait_type: "Head", value: "Kitty" } ] }
\`\`\`

7-trait PFP art with on-chain DNA hashes; token IDs in the thousands (samples: 1837, 2148, 1702, 699). Rendered by \`images.iotaspam.io\` per-DNA.

**Supporting modules** (6 packages): \`airdrop\` (distribution scaffolding), \`mockcoin\` ×3 (OTW coin-type templates, likely dev utilities), \`rebased_nft\` (Rebased-era NFT scaffolding), \`test_nft\` (test-mint utility). Grouped together under this one row rather than per-module defs — individual activity is demo-scale and the thematic unit ("Spam Club's on-chain surface") is what the dashboard wants to surface.

**Mechanical framing — no "help the network" justification on Rebased.** The Sui version's README is silent on *why* users should be rewarded for spamming (it just offers SPAM as a claim-by-spamming coin). The Rebased port inherits the mechanic verbatim. The parallel to IOTA's Chrysalis-era "Spam Fund" is only superficial — that program paid users to spam because the Tangle's tip-selection consensus actually needed ongoing TX volume to confirm. Rebased uses validator-driven DPoS with mempool + fees; extra traffic doesn't help confirmations, it just burns gas. Treat Spam Club on its own terms: an incentivized-spamming coin game, not a network-security tool.

**Implication for this scanner's numbers.** At 4,026,995 SPAM-registered TXs vs. 8,289,793 total mainnet TXs captured (2026-04-22 prod), **~49 % of all IOTA Rebased TX volume is Spam-Club-farmed activity, not organic usage.** Any "top TXs" ranking that includes this row will show it dominating even though the work is nothing-burger spam. See the \`disclaimer\` field on the \`iotaFramework\` project for the parallel disclaimer pattern for chain primitives; consider adding a similar one here before the default-sort flip from events→transactions (TODO-tracked).

**Match rule.** \`deployerAddresses\` pin on \`0xd3906909…\` (the shared IF deployer) + \`any\` list of the 8 module names. The list excludes:
- \`iotalink\` — caught by the narrower \`iotaLink\` project def (\`packageAddresses\` pin at \`0x1badcfaf…\`) earlier in \`ALL_PROJECTS\`.
- LayerZero OFT modules (\`oft\`, \`oft_impl\`, \`pausable\`, \`rate_limiter\`, …) — caught by the \`layerZeroOft\` aggregate earlier in \`ALL_PROJECTS\`.

Per \`projects/index.ts\` ordering discipline, this def must live AFTER \`iotaLink\` and \`layerZeroOft\` so the narrower rules win their packages first.

**Category \`Experimental\`.** The ToS explicitly frames the product as *"an experimental product … developed outside of a professional software development environment … provided in good faith."* Dashboard label reflects that.

\`isCollectible: false\` — the cluster *contains* a PFP (SpamNFT), but the project as a whole is a coin-issuing protocol + supporting scaffolding, not a pure collectible. Stays visible when the "Hide collectibles" toggle is on.

\`countTypes: ['nft::SpamNFT']\` — surfaces the SpamNFT PFP's Items + Holders counts on the project detail page.

**Attribution confidence: gold-standard** ([x]). Product name, codebase lineage, fork URL, upstream URL, operator legal entity, on-chain state — all directly self-attested via the live site, the linked GitHub fork + upstream repo, the ToS, and on-chain object state.
`.trim(),
};
