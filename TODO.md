# TODO

## Operational

- [ ] Add devnet support (alongside mainnet)
- [ ] Set up backups (restic → Hetzner Object Storage; enable `iota_trade_scanner_backup_enabled` once S3 creds provisioned)

## Indexing depth

Currently we index at epoch-level (332 records, ~65 KB). Deeper indexing levels for future consideration:

- [ ] **Checkpoint-level**: 125M records, ~18 GB. Would give sub-hour granularity on storage fund and gas burn. Impractical via public API (rate limited), would need a full node or dedicated indexer.
- [ ] **Transaction-level**: 594M records, ~277 GB. Per-tx gas cost, sender, effects. Requires running a full IOTA node with custom indexing.
- [ ] **Full tx + effects**: 594M records, ~1.1 TB. What a full archival node stores.
- [ ] **Object-level**: ~4.4 GB of stored object data (estimated from storage fund size). Track individual object lifetimes — when created, when deleted, how long storage deposits are actually held.

## Use case decomposition

Show grouped transactions that compose a single use case:

- [ ] Define per-project operation flows (e.g., 1 TLIP shipment = 26 tx: BL creation, carrier reg, endorsements, border events)
- [ ] Detect operation groups on-chain by analyzing linked transactions (shared objects, sequential digests from same sender within a time window)
- [ ] Display as "1 swap = N tx" breakdown per project

## L2 / EVM team model

- [ ] **Attach teams to L2 (EVM) projects** — L2 entries (MagicSea, Graphene, Symmio, Gamma, Wagmi, Iolend, Velocimeter, etc.) are synthesized from the DefiLlama `/protocols` feed at scan time and hardcoded to `team: null` (`ecosystem.service.ts:512`). They have no `ProjectDefinition`, so the whole Team/teamId lookup is skipped. Options: (a) curate L1-style `ProjectDefinition`s for each L2 project and reuse the teamId path; (b) add a lightweight name → teamId lookup table run during DefiLlama enrichment. Without either, L2 logos must stay in the frontend `logoMap` rather than inherit from their team.

## Activity metric — count TXs, not just events

- [ ] **Add MoveCall TX counting as an activity metric alongside events.** The current metric is emitted events (`packages.nodes.modules.nodes.name` → `events(filter: { emittingModule })`). Events only fire when a Move function calls `event::emit`; many useful contracts don't emit on every call. Concrete cases:
    - **TWIN ImmutableProof**: 2,448 `StorageCreated` events vs. 2,117+ `store_data` TXs across 6 package versions. Ratios differ because `store_data` can be called in ways that don't always create a new storage object (confirmation needed).
    - **Salus Platform**: 60 packages with `nft` module, event count 0 on mainnet — the contract mints objects via `object::new` without emitting custom events (normal for NFT-style contracts). TXs would show real activity.
    - **Traceability**: 6 packages, 0 events — same pattern likely.
  GraphQL query: `transactionBlocks(filter: { function: "<pkg>::<module>::<fn>" })`. Per-function, not per-module — so each project would need a function-list enumeration, or query by package-level and aggregate.
  Needed changes: extend `Project` interface with `transactions: number`; extend the per-package inner loop in `fetchFull` to also query TX counts; expose the metric on the details page + rankings. Optional: add a site-level toggle ("rank by events" vs "rank by TXs") since events are better for DeFi-style contracts and TXs are better for anchoring-style contracts.

## Attribution follow-ups

Open questions that could upgrade an attribution from circumstantial (🟡) or synthetic to confirmed. None are blocking — each team/project is already live on the site with its current best-effort `attribution` field; these are the gold-standard upgrades still available.

- [ ] **IF Testing — iotaledger GitHub grep** (api/src/ecosystem/projects/misc/if-testing.ts) — 79 packages across 3 deployers are attributed to the IOTA Foundation on circumstantial grounds (institutional-scale volume + `gas_station_*` / `transfer_test` / `regular_comparison` tag vocabulary + Salus-shared NFT schema). No public document names the 3 deployer addresses. Close via authenticated code search across `iotaledger/iota-gas-station`, `iotaledger/iota`, and adjacent IF repos — a single test-config or fixture hit on any of the 3 addresses would upgrade 🟡 → [x].
- [ ] **TLIP — address-level attestation grep** (api/src/ecosystem/teams/trade/tlip.ts) — organizational triangulation is conclusive (iota.org/solutions/trade, tlip.io, wiki.tlip.io, `tmea-tlip` GitHub org, TMEA partnership) but no public document names the specific Move deployer (`0xd7e2…5176`) or package (`0xdead…e108`) address. Close via deeper dig through `wiki.tlip.io/docs/` for a developer-facing deployment-addresses page, or ask TLIP operators directly. Gap is TLIP's (their audience is governments/shipping, not Move devs), not ours — low priority.
- [ ] **IOTA Flip — operator identification** (api/src/ecosystem/teams/games/iota-flip.ts) — product is verified (iotaflip.netlify.app + `IotaFlipHouse` struct names) but the team is deliberately pseudonymous. Close via inspecting the SvelteKit bundle or connected-wallet flow for an operator email / ToS / X or Discord handle, or the raffle contract's admin cap owner. Low-priority unless the site starts moving non-trivial volume.
- [ ] **Studio 0a0d — confirm Clawnera team id rename** (api/src/ecosystem/teams/misc/studios.ts) — operator identified as GitHub user `Moron1337`, brands surfaced as CLAWNERA / CLAW / SPEC, but the team id stays synthetic `studio-0a0d` pending confirmation that the operator wants to be surfaced under the Clawnera brand publicly on our site. Ask in IOTA Discord #speculations, or via the Moron1337 GitHub, whether to rename to `clawnera`.
- [ ] **Studio 0xb8b1380e — team ownership + optional split** (api/src/ecosystem/teams/misc/studios.ts) — KrillTube + GiveRep + games + shared infrastructure are all identified at deployer `0xb8b1…06c6`, but overall team ownership is not publicly stated (single team vs. dev shop vs. IF-adjacent contractor). Close via asking in IOTA Discord whose deployer `0xb8b1…` is, or inspecting the KrillTube operator wallet `0xba1e07…020d` for branded activity tying it back. If ownership clarifies, consider splitting into `krilltube` and `giverep` sub-teams with `studio-b8b1` retained as the games/infrastructure fallback.

## Ecosystem project-def audit

Revisit after several ecosystem snapshots (once enough data has landed post-2026-04-18 refactor):

- [ ] **TokenLabs Liquid Staking (vIOTA)** (api/src/ecosystem/projects/misc/tokenlabs-viota.ts) — uses `packageAddresses` with 2 hardcoded addresses (v1, v2) because the module signature `{cert, math, native_pool, ownership, validator_set}` false-positively matches 9 non-TokenLabs packages. When TokenLabs ships vIOTA v3, add the new address.
- [ ] **Tradeport `nft_type` package** — 1 helper package at `0xae24…bf1e` with a single `nft_type` module is currently caught by the team's deployer-match rule but not its own sub-project. Consider whether it deserves a `Tradeport NFT Type` row or stays folded into Tradeport.
- [ ] **IOTA Identity (misc)** — 2 uncaptured Identity variants at IF deployer `0x4574…408f`: the health-lab credential package `{credentials, health_lab_simple, identity, trust}` and the individual-profile WoT package `{wot_individual_profile, wot_trust}`. Low-priority fallback bucket candidate.
- [ ] **Spec Launchpad `spec_packs`** — Studio 0a0d / Clawnera ships a `spec_packs` module that the current Token Sale rule `{any: [spec_sale_multicoin, spec_sale_v2]}` misses. Widen the `any` list when we next touch this file.

## Update mechanism proposals

New projects and teams are only added by hand-editing source files and redeploying — the 6h cron only re-scans against already-curated defs. Originally unmatched packages were silently dropped; the first three items below now ship as the **Unattributed** section on the dashboard (after L2), backed by `EcosystemSnapshot.unattributed[]`.

- [x] **Unmatched-package bucket in the snapshot** — clustered by deployer at `ecosystem.service.ts` (see `UnattributedCluster`). Probes one Move object per cluster and extracts identifying string fields (`tag`, `name`, `issuer`, `url`, …) so Salus-style self-attestation in object contents is surfaced, not just module names.
- [x] **Group unmatched by deployer** — one row per deployer, sum of packages + storage, union of module names.
- [x] **Website surface** — rendered as the third section under Ecosystem → Projects, after L2. No per-package drill-down yet; deployer and latest package address link to the IOTA explorer.
- [ ] **Top-N warning log after each scan** — today we log `Unattributed: N deployer cluster(s), M package(s)`. Extend to include the top-3 deployers by package count + their module signatures, so cron logs surface new onboarding activity.
- [ ] **Enhanced anomalous-deployer warnings** — today's warning (`ecosystem.service.ts` `[${def.name}] N deployer(s) not in team …`) only fires when a matched project has an unknown deployer. Consider also logging: (a) known-team deployer publishing a package that matches *no* def (likely a new project on an existing team); (b) module signatures matching a fingerprint-only def but failing the issuer/tag check (possible fork or rename).
- [ ] **Curation diff tooling** — compare this snapshot's `unattributed[]` against the previous and print newly-appeared deployers. Turns the triage feed into a streaming signal rather than a full re-scan each time.
- [ ] **Event / unique-sender counts on unattributed clusters** — ranking is currently by package count → storage. Adding event and unique-sender totals would let a loud-but-single-package deployer rise above noisy long-tail ones; cost is one `countEvents` + `updateSendersForModule` pass per cluster, which is why it's deferred (cheap to add once the cron budget allows).

## Storage deposit lifetime analysis

- [ ] Track object creation and deletion events to measure how long storage deposits are actually held
- [ ] Chart: distribution of deposit hold times (are trade objects ever deleted?)
- [ ] Show "effectively locked" IOTA: deposits on objects that haven't been deleted in >30/90/180 days
