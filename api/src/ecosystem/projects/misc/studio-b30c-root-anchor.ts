import { ProjectDefinition } from '../project.interface';

/**
 * Unknown rollup / sidechain state-root anchor. Single admin relayer posts
 * 32-byte Merkle roots keyed by `block_number` + `timestamp_ms` to a
 * singleton `RootRegistry` at ~6.6s cadence. No public documentation,
 * GitHub repo, or iotaledger reference found for the `root_anchor` module
 * as of 2026-04-22. Kept synthetic until a public claim surfaces.
 */
export const studioB30cRootAnchor: ProjectDefinition = {
  name: 'Studio 0xb30cf677 — Root Anchor',
  layer: 'L1',
  category: 'Infrastructure',
  description: 'Unknown rollup or sidechain posting state roots to IOTA Rebased L1. Single package, single `root_anchor` module, single shared `RootRegistry` object receiving sequential `store_root(block_number, root[32], timestamp_ms)` commits at ~6.6s cadence from one admin relayer wallet. No events emitted, no retail users — pure admin-driven Merkle-root stream. Shape matches an off-chain rollup / DA layer anchoring to L1 for censorship resistance + checkpoint verification, but no public project claims the deployer as of 2026-04-22.',
  addedAt: '2026-04-22',
  urls: [],
  teamId: 'studio-b30c',
  match: {
    deployerAddresses: ['0xb30cf677dde91d56aaecb8105e28941dfd5d65c50eacb1c1e47e6048619c2906'],
  },
  attribution: `
On-chain evidence: single package \`0x2fb4252a3043bcc996ba15ea5b1c5a91ad80fa4e881f2f00f78f3ca4ef89dfb2\` from anonymous deployer \`0xb30cf677dde91d56aaecb8105e28941dfd5d65c50eacb1c1e47e6048619c2906\`. Deployer owns only the \`UpgradeCap\` + gas — no other packages, no off-chain surface.

**Module shape (1 module, 2 structs, 1 entry fn, 3 views):**
- Module: \`root_anchor\`
- Structs: \`RootRegistry {key}\` (singleton shared object receiving commits); \`RootEntry {copy, drop, store}\` (per-block record with \`block_number: u64\`, \`root: vector<u8>\` 32-byte Merkle root, \`timestamp_ms: u64\`).
- Entry fn: \`store_root(SharedInput, u64, vector<u8>, u64)\` — admin-called, no auth check in the default-compiled bytecode so the \`RootRegistry\`'s owner is gated by Move's shared-object signing rules (only the owning address can mutate it).
- Views: \`get_root(block_number) -> RootEntry\`, \`owner()\`, \`size()\`.

**Activity shape.**
- Live \`RootRegistry\` at \`0xee3ec12b778a9ccd382cf29345716280569494d84fe59e4cf4a1b8b4ed74b44e\` holds 223+ sequential \`RootEntry\` records.
- Cadence: ~6.6 seconds per entry (223 entries across ~24.7 minutes of sampled wall-clock — ~10 blocks/min, consistent with a high-cadence sidechain or rollup posting every block).
- 536 TXs total captured, 0 events emitted, 0 unique senders — one admin relayer wallet, no user-facing activity.
- Sample TX \`GN233z1ysp5VpXCsKeBNhowWHf2AVj5UixF8qMWfi1a8\`: single \`MoveCallTransaction\` → \`root_anchor::store_root(...)\`. No token flow, no events.
- Published 2026-03-16.

**Interpretation: rollup / DA state-root anchor.** The \`(block_number, root, timestamp_ms)\` triple is the canonical shape of an L2 → L1 state commitment stream: the L2 sequencer periodically commits its Merkle state root to L1 so anyone can verify L2 state history against an L1 proof. Cadence (~6.6s) fits a fast sidechain or rollup. No events = admin-only, no user-facing UX = this is infrastructure, not a dApp.

**Ruled out — other L1 anchor patterns.**
- **IOTA EVM** uses modules \`anchor\` + \`assets_bag\` + \`request\` at deployer \`0x1b33a3cf…\`, not \`root_anchor\`. Different codebase, different deployer.
- **IOTA Notarization** stores per-record objects (one per notarized document), not a sequential Merkle-root stream. Different shape entirely.
- **TLIP / TWIN / Salus / ObjectID** — all shipped from different deployers with different module vocabularies.

**Ruled out — public sources.** GitHub / web / docs.iota.org / wiki.iota.org / blog.iota.org searches for \`root_anchor\` + \`RootRegistry\` + \`store_root\` returned zero IOTA-ecosystem hits (only an unrelated IANA DNS trust-anchor repo). Iotaledger orgs don't ship a \`root_anchor\` module. No announcement from any named L2/rollup project.

**Why kept as synthetic \`studio-b30c\`.** On-chain pattern is clear (DA / rollup anchor) but the operator is not publicly known. Not routed to \`iota-foundation\` because IF's own L2 anchor (IOTA EVM) uses a different module set + a different deployer. Will auto-upgrade to a named team the moment a public announcement names this deployer — meanwhile the synthetic row keeps the 536-TX stream visible on the dashboard instead of swallowed in the unattributed bucket.

\`isCollectible: false\` (default) — infrastructure, not NFTs.
`.trim(),
};
