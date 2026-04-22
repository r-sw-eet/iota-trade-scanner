import { ProjectDefinition } from '../project.interface';

/**
 * Studio 0a0d (Moron1337 / Clawnera) sibling row — CLAW token package +
 * SPEC Packs game + additional commerce-lane modules that the existing
 * rules (`clawnera`, `clawSwapGateway`, `tokenSale`) don't catch.
 *
 * Rationale for bundling rather than one row per module: activity across
 * these packages is low-to-mid (2.4k TXs, 89 senders total) and the
 * modules ship from the same operator under related product brands, so
 * one sibling row is proportionate. Split into per-module defs later if
 * volume justifies surfacing each as its own dashboard row.
 */
export const studio0a0dExtras: ProjectDefinition = {
  name: 'Studio 0a0d — CLAW Token & SPEC Packs',
  layer: 'L1',
  category: 'Token / Game',
  description: 'Catch-all sibling row for Studio 0a0d (Moron1337 / Clawnera ecosystem) modules not yet carved into dedicated rows: the `claw_coin` token-type package (the CLAW meme coin itself — OTW witness + CoinMetadata), the `spec_packs` SPEC lootbox / pack-opening mini-game (observed struct `spec_packs::Global<SPEC_COIN>` + `spec_packs::Pack`), and `onchain_asset_lane_manager` + `order_payment_assets` + `payment_assets` commerce-lane modules iterated on the deployer. 8 packages, 2,423 TXs, 89 unique senders. Siblings to the existing `clawnera` marketplace, `clawSwapGateway`, and `tokenSale` (SPEC launchpad) rows.',
  urls: [
    { label: 'Clawnera', href: 'https://clawnera.com' },
    { label: 'CLAW sale', href: 'https://buy.claw-coin.com' },
    { label: 'SPEC sale', href: 'https://buy.spec-coin.cc' },
    { label: 'GitHub (Moron1337)', href: 'https://github.com/Moron1337' },
  ],
  teamId: 'studio-0a0d',
  match: {
    deployerAddresses: [
      '0x0a0d4c9a9f935dac9f9bee55ca0632c187077a04d0dffcc479402f2de9a82140',
      '0x4468c8ddb42728fd1194033c1dd14ffd015f0d81e4b5329ddc11793c989f3f39',
    ],
    any: [
      'spec_packs',
      'claw_coin',
      'onchain_asset_lane_manager',
      'order_payment_assets',
      'payment_assets',
    ],
  },
  attribution: `
On-chain evidence: 8 packages on Studio 0a0d's two deployers (\`0x0a0d4c9a…\` + \`0x4468c8dd…\`, both registered to the \`studio-0a0d\` and \`clawnera\` sibling teams) shipping modules \`{claw_coin, spec_packs, errors, onchain_asset_lane_manager, order_payment_assets, payment_assets}\`.

**Module breakdown:**

- **\`claw_coin\`** — CLAW meme-coin OTW witness + \`CoinMetadata<CLAW_COIN>\`. Live package at \`0x7a38b9af32e37eb55133ec6755fa18418b10f39a86f51618883aa5f466e828b6\` (the type reference \`0x7a38b9af…::claw_coin::CLAW_COIN\` is the exact type embedded in the [\`clawnera-bot-market\` README](https://www.npmjs.com/package/clawnera-bot-market) — decisive attribution signal referenced in both the \`clawnera\` team's and \`studio-0a0d\` team's attribution prose). Previously left unattributed because the existing \`clawnera\` rule requires \`dispute_quorum + escrow\` (marketplace shape), not \`claw_coin\`.

- **\`spec_packs\`** — SPEC-based lootbox / pack-opening game. Sampled object type on mainnet: \`0xb93c47812b67ffc7ccda0e36ef085f0bd17b987ebb1db71035cb878ec25f4e54::spec_packs::Global<0xcb9bb938865bdfbb3b9b841279eab1ba793ef8846de68d30fb45c32ef5b78ab4::spec_coin::SPEC_COIN>\`. Struct set: \`Global\` (shared singleton config), \`Pack\` (individual pack object). Type parameter binds to \`SPEC_COIN\`, so pack purchases / openings settle in SPEC — makes this a meme-coin-denominated game using SPEC as the settlement asset. Distinct from \`tokenSale\` (SPEC launchpad, matches \`spec_sale_*\`) which is the primary-market sale contract.

- **\`onchain_asset_lane_manager\` / \`order_payment_assets\` / \`payment_assets\`** — commerce-lane helpers iterated on the deployer. \`payment_assets\` already appears in the Clawnera marketplace's 16-module signature, so these could be helper / upgrade deploys for the marketplace stack — but since they don't ship alongside \`dispute_quorum + escrow\` in the same package, the current marketplace rule doesn't catch them. This sibling row catches them as Studio 0a0d overflow until someone triages each individually.

**Why one aggregate row, not one row per module:**
- (a) Total volume is 2.4k TXs + 89 senders across all 8 packages — not per-product dashboard-worthy on its own.
- (b) All modules share the same operator (Moron1337 / Clawnera-ecosystem), so splitting would create many near-empty rows with identical team / urls.
- (c) Once one of these modules sees notable standalone volume (e.g. SPEC Packs gets promoted as a real game and does 10k+ TXs), split that one out into its own def.

**Match rule design.** \`deployerAddresses\` pin (both Studio 0a0d deployer keys) + \`any\` list of the modules we specifically want to catch. \`errors\` is deliberately *not* in the \`any\` list — it's a generic module name that could false-positive against unrelated deployers, and excluding it doesn't harm coverage because packages with \`errors\` alongside one of the other modules still match through the \`any\` check.

**Match-order note** — this def MUST be declared after \`clawnera\`, \`clawSwapGateway\`, and \`tokenSale\` in \`projects/index.ts\` so more-specific rules keep priority. Concretely:
- Packages with \`dispute_quorum + escrow\` (full marketplace) → \`clawnera\` row.
- Packages with \`claw_swap_gateway\` → \`clawSwapGateway\` row.
- Packages with \`spec_sale_multicoin\` or \`spec_sale_v2\` → \`tokenSale\` row.
- Everything else on these two deployers matching the \`any\` list → this row.

**Not IF, not IF-family.** Team \`studio-0a0d\` inherits: meme-coin / small-community operator. \`isIotaFoundationFamily\` unset.

\`isCollectible: false\` — token + mini-game, not pure PFP. SPEC Packs produces \`Pack\` objects that could be argued as collectibles, but the Pack objects are functional lootboxes consumed in the game loop, not standalone PFPs. Stays visible in the "real usecases" view.

Category \`Token / Game\` — hybrid. Split further if / when one module gets promoted.
`.trim(),
};
