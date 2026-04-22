import { ProjectDefinition } from '../project.interface';

/**
 * Studio 0xb8b1380e — demo / educational extras. The existing `game2048`
 * project matches only the full `{campaign_rewards, game_2048}` pair; the
 * studio's additional demo-grade packages (bare `game_2048` variants,
 * `gas_station` wrappers, `demo_coin` / `demo_krill_coin` token-type OTW
 * scaffolds) ship without `campaign_rewards` and fall through. This sibling
 * row catches them as one "demo content" bucket for the studio.
 */
export const studioB8b1Demos: ProjectDefinition = {
  name: 'Studio 0xb8b1380e — Demos',
  layer: 'L1',
  category: 'Demo / Developer Content',
  description: 'Catch-all sibling row for Studio 0xb8b1380e\'s demo / educational packages: a stripped-down `game_2048` (without `campaign_rewards`), a standalone `gas_station` wrapper, and two OTW-template token types (`demo_coin`, `demo_krill_coin`). 12 packages total on the deployer, 178 TXs + 9 senders — studio-internal dev / playground footprint alongside the production KrillTube / GiveRep / games portfolio.',
  urls: [],
  teamId: 'studio-b8b1',
  match: {
    deployerAddresses: ['0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6'],
    any: ['demo_coin', 'demo_krill_coin', 'gas_station', 'game_2048'],
  },
  attribution: `
On-chain evidence: the Studio 0xb8b1380e deployer publishes 12 packages in this cluster whose modules are one (or more) of \`demo_coin\`, \`demo_krill_coin\`, \`gas_station\`, \`game_2048\` — but without the \`campaign_rewards\` module that the production \`game2048\` project requires. So they fall through the existing game rule and cluster as unattributed.

**Module breakdown** (from prod snapshot's \`modules\` field on the cluster):
- \`game_2048\` — bare puzzle module without the rewards campaign wrapper. Same 2048 game idea as the production \`game2048\` row, but without the reward/treasury plumbing.
- \`gas_station\` — standalone Gas Station wrapper (the IOTA Foundation has a public Gas Station product at \`blog.iota.org/iota-gas-station-alpha\`; this is a studio-internal demo of the same interface).
- \`demo_coin\` / \`demo_krill_coin\` — OTW token-type templates (KrillTube's \`demo_krill_coin\` is referenced in the team's attribution as a KrillTube-branded demo coin).

**Why a sibling project rather than widening \`game2048\`'s rule:** the production \`game2048\` def specifically matches the \`{campaign_rewards + game_2048}\` pair because that pair is the deployed "2048 with rewards" game. Widening to bare \`game_2048\` would conflate the production row (2 packages, 681 events, 677 TXs, real treasury) with the stripped-down demo variants (low single-digit activity each). A sibling keeps the separation clean.

**Category \`Demo / Developer Content\`** — new category on the dashboard, intentionally distinct from \`Game\` / \`Infrastructure\`. Sets the expectation that this row represents in-studio playground work rather than a shipped product. Similar shape we've used for \`ifTesting\` (IF's internal test campaigns).

**Volume** (prod capture 2026-04-22): 12 packages, 343 events, 178 TXs, 9 unique senders — firmly studio-dev-scale, not end-user-facing.

\`isCollectible: false\` — not a collectible. Won't participate in the "Hide collectibles" filter.

**Match order note:** this def must be declared *after* \`game2048\` in \`projects/index.ts\` so the more-specific \`{campaign_rewards + game_2048}\` two-module rule wins for the production game package. The \`any\` list here is broad by design — it catches the leftovers.

**Not affected by IOTA Foundation filter** — team \`studio-b8b1\` does not have \`isIotaFoundationFamily\`. Confirmed by Studio 0xb8b1380e team attribution: "evidence leans (1) single team, multiple products. Not conclusive." Further follow-up is open in TODO.md — if confirmed IF-adjacent or split into KrillTube + GiveRep sub-teams, re-evaluate this row's team assignment alongside.
`.trim(),
};
