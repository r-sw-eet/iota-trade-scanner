# TODO

## Operational

- [ ] **Dedupe probe logic between `EcosystemService`, `scan-unattributed-cli.ts`, and `scan-other-nets-cli.ts`.** Three files now carry their own copy of `probeIdentityFields` (and the first two also duplicate `probeTxEffects`, `matchProject`, `matchByFingerprint`) — kept in sync by hand. The CLIs bypass Nest/Mongo bootstrap so they can run via plain `ts-node` for local dev seeding (~5 min vs full app boot), which is why they diverged. Right fix: extract the pure logic into `api/src/ecosystem/probes/` (no Nest/Mongo dependencies) and have all three consumers import. Until then, *every change to one must be mirrored to the others* — keep this in mind when touching probe behavior.
- [ ] **Add devnet / testnet support (alongside mainnet).** Discovery pass now exists as `api/src/scan-other-nets-cli.ts` — ad-hoc ts-node CLI that pages recent packages, clusters by deployer, and probes identifiers for the top N. Not yet integrated: no Mongo persistence, no cron, no website surface, no diffing against previous runs. Next step toward full support is deciding whether to (a) persist `TestnetSnapshot` / `DevnetSnapshot` collections mirroring `EcosystemSnapshot` so the dashboard can show pre-mainnet leads, or (b) keep it CLI-only as an operator triage tool.
- [ ] Set up backups (restic → Hetzner Object Storage; enable `iota_trade_scanner_backup_enabled` once S3 creds provisioned)
- [ ] **Raise or remove the 100k package safety cap in `getAllPackages` (`api/src/ecosystem/ecosystem.service.ts:150`).** Currently caps at 2000 pages × 50 = 100k packages. Mainnet sits at ~750 today (0.7% of cap), so not urgent — but if it's ever hit we only log a `warn` and silently truncate the scan, which would degrade attribution coverage without a loud failure. Either bump to 1M, page until exhaustion with no cap, or escalate the warn to an alert/error. Mirror the same change in `api/src/scan-unattributed-cli.ts:139` (also caps at 2000 pages).

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

  **Query shape** — `transactionBlocks(filter: { function: "<pkgAddress>" })` works at *package* prefix (already in use at `ecosystem.service.ts:526` and `scan-unattributed-cli.ts:157`). No per-function enumeration needed; one query path per package. Per-function only matters if we later want to exclude utility/read calls — for the manifesto-thesis chart the looser package-level count is what we want.

  **Efficiency plan** — reuse the `ProjectSenders` cursor pattern (`ecosystem.service.ts:204+`): on first sight of a package, anchor a `lastTxCursor` at end-of-history + persist `txCountTotal: 0`; on each cron tick fetch only new pages and increment. Steady-state cost ≈ Σ(new txs since last scan) ÷ 50 queries across all ~750 mainnet packages — small next to the existing event/sender pass. First-time backfill per package paginates same as `countEvents` (10k-page cap).

  **Open question before implementing** — probe whether `TransactionBlockConnection` exposes `totalCount` in IOTA's GraphQL schema. If yes, replace pagination with 1 query/package and skip the cursor model entirely. The existing `countEvents` doesn't try it, so it's untested.

  **Needed changes** — new `ProjectTxCounts` collection (mirrors `ProjectSenders`) keyed by `packageAddress`; extend `Project` interface with `transactions: number`; extend the per-package inner loop in `fetchFull` to update + read it; expose the metric on the details page + rankings. Optional: add a site-level toggle ("rank by events" vs "rank by TXs") since events are better for DeFi-style contracts and TXs are better for anchoring-style contracts.

## Categorical TX-mix chart (manifesto thesis check)

- [ ] **Per-category TX call counts over time, on one chart.** IOTA's manifesto positions global trade as the dominant on-chain use case. To see when (or whether) that thesis plays out, plot TX counts per category on a shared timeline so we can watch the lines cross. Categories: `trade/rwa`, `defi`, `nft`, `gaming`, `infrastructure/identity`, `system` (epoch change + consensus prologue), `staking`, `native-transfer` (PaySui / TransferObjects with no Move call), `unattributed-movecall`. Source: GraphQL `transactionBlocks` filtered by `function` (per ProjectDefinition) for ecosystem-attributed buckets; `kind` filter for system/native/staking; everything else falls into unattributed. Depends on the MoveCall TX-counting work above (single shared per-package TX query feeds both). Display on dashboard as a stacked-area or multi-line chart with a category toggle. Crossing of `trade/rwa` over `defi` or `nft` is the headline signal.

## Attribution follow-ups

Open questions that could upgrade an attribution from circumstantial (🟡) or synthetic to confirmed. None are blocking — each team/project is already live on the site with its current best-effort `attribution` field; these are the gold-standard upgrades still available.

- [ ] **IF Testing — iotaledger GitHub grep** (api/src/ecosystem/projects/misc/if-testing.ts) — 79 packages across 3 deployers are attributed to the IOTA Foundation on circumstantial grounds (institutional-scale volume + `gas_station_*` / `transfer_test` / `regular_comparison` tag vocabulary + Salus-shared NFT schema). No public document names the 3 deployer addresses. Close via authenticated code search across `iotaledger/iota-gas-station`, `iotaledger/iota`, and adjacent IF repos — a single test-config or fixture hit on any of the 3 addresses would upgrade 🟡 → [x].
- [ ] **TLIP — address-level attestation grep** (api/src/ecosystem/teams/trade/tlip.ts) — organizational triangulation is conclusive (iota.org/solutions/trade, tlip.io, wiki.tlip.io, `tmea-tlip` GitHub org, TMEA partnership) but no public document names the specific Move deployer (`0xd7e2…5176`) or package (`0xdead…e108`) address. Close via deeper dig through `wiki.tlip.io/docs/` for a developer-facing deployment-addresses page, or ask TLIP operators directly. Gap is TLIP's (their audience is governments/shipping, not Move devs), not ours — low priority.
- [ ] **IOTA Flip — operator identification** (api/src/ecosystem/teams/games/iota-flip.ts) — product is verified (iotaflip.netlify.app + `IotaFlipHouse` struct names) but the team is deliberately pseudonymous. Close via inspecting the SvelteKit bundle or connected-wallet flow for an operator email / ToS / X or Discord handle, or the raffle contract's admin cap owner. Low-priority unless the site starts moving non-trivial volume.
- [ ] **Studio 0a0d — confirm Clawnera team id rename** (api/src/ecosystem/teams/misc/studios.ts) — operator identified as GitHub user `Moron1337`, brands surfaced as CLAWNERA / CLAW / SPEC, but the team id stays synthetic `studio-0a0d` pending confirmation that the operator wants to be surfaced under the Clawnera brand publicly on our site. Ask in IOTA Discord #speculations, or via the Moron1337 GitHub, whether to rename to `clawnera`.
- [ ] **Studio 0xb8b1380e — team ownership + optional split** (api/src/ecosystem/teams/misc/studios.ts) — KrillTube + GiveRep + games + shared infrastructure are all identified at deployer `0xb8b1…06c6`, but overall team ownership is not publicly stated (single team vs. dev shop vs. IF-adjacent contractor). Close via asking in IOTA Discord whose deployer `0xb8b1…` is, or inspecting the KrillTube operator wallet `0xba1e07…020d` for branded activity tying it back. If ownership clarifies, consider splitting into `krilltube` and `giverep` sub-teams with `studio-b8b1` retained as the games/infrastructure fallback.

## Unattributed → ProjectDefinitions (first pass)

With the `fields` fingerprint primitive now live, turn the 16 unattributed clusters that have `sampleIdentifiers` into real `ProjectDefinition` entries. Latest snapshot (2026-04-18) shows 8–10 real brands in the set; the rest is test/noise and should be skipped.

- [ ] **Write defs for the real brands.** Per cluster — write one file in `api/src/ecosystem/projects/<category>/` (and matching `teams/` entry where ownership is known). Use the new `fields` matchers rather than hardcoded `packageAddresses` where the fingerprint is stable. Mark pure-PFP NFT collections with `isCollectible: true` so the "Hide collectibles" toggle filters them out of the real-usecases view; RWA / utility NFTs (doc proofs, carbon credits, car titles, membership tickets) stay `isCollectible: false`. Candidates from the live snapshot:
    - [x] Healthy Gang NFT (deployer `0xcb69…724c`, `iota_healthy_gang_::Nft`, `fields.name prefix "Healthy Gang #"`) — landed as `healthyGang` project under the `studio-cb69` team + deployer-catch-all aggregate for the remaining packages on the same deployer, all marked `isCollectible: true`.
    - [x] Ghost Lights / Tanapaz / Toma Rajadão / Tranquilidade Drops (same `studio-cb69` deployer) — all four landed as narrow `exact: [<module>]` module-rule projects in `projects/nft/studio-cb69-siblings.ts`, ordered before the aggregate so the specific rule wins sync match. Fingerprint was unusable because no NFTs have been minted from these packages on mainnet yet (2026-04 probe: zero `::<module>::Nft` objects). If mints ever happen, activity auto-attributes via the module rule.
    - Isla Silver NFT collection (deployer `0xfe40…2cdb`, 9 pkgs, `type=…::isla_silver::IslaSilverNFT`, `fields.name="Isla Silver"`) — PFP, `isCollectible: true`.
    - IOTA Estoicos (deployer `0x457d…8a38`, 7 pkgs, `type=…::estoicos::EstoicosNFT`) — PFP, `isCollectible: true`.
    - ctrlv AI Agents (deployer `0xceb…999a`, 3 pkgs, `type=…::ctrlv_agent::AgentNFT`) — PFP tier (AI-agent themed), default `isCollectible: true` unless the agents have on-chain utility logic.
    - Car NFTs (deployer `0x545…c8a9`, 3 pkgs, `type=…::car_nft::CarNFT`, `fields.brand/model/vin present:true`) — RWA (vehicle title). `isCollectible: false`.
    - [x] TruvID (deployer `0x295ee21b…559a`, 7 pkgs, `type=…::nft_minter2::NFT`) — landed as `TruvID` project under synthetic team `studio-295e` (`Studio 0x295ee21b`) in `teams/misc/studios.ts`. Category `Notarization`, deployer-based match, `isCollectible: false`, no outbound URLs on the project or team. The investigation trail (2026-04-19) — probed TruvID-* candidate domains, ruled out Truv (US fintech) / Truvid-video-ads / TrueID / TruVideo, found the French-language PWA at `truvid.vercel.app` → source at `github.com/oio7764/Truvid` (single commit, frontend-only, zero IOTA code in HTML, no wallet / mint / fetch), noted same dev `oio7764` has a Bitcoin-via-OpenTimestamps sibling `fideo-web` — lives in the team's `attribution` prose as named findings rather than as clickable links. Kept as a studio team because the public frontend has no on-chain wiring: the alignment with the Vercel app is circumstantial (name + URL scheme in NFT fields + conceptual fit) but not provable from public artifacts alone. Upgrade to a named-brand team if direct evidence surfaces (a commit wiring the frontend to IOTA, or a social post by `oio7764` claiming the deployer key).
    - PANDABYTE Tickets (deployer `0x49c4…dbbf`, 3 pkgs, `type=…::voucher::PandabyteTicket`) — event/membership tickets. Default `isCollectible: false` (utility voucher), re-evaluate once the product surface is clearer.
    - Lil' Ape (deployer `0x03ce…419b`, 2 pkgs, `type=…::lilape_nft::LilApeNFT`, `fields.name prefix "Lil' Ape #"`) — PFP, `isCollectible: true`.
    - Carbon Credit Manager (deployer `0xb5fc…01a0`, 1 pkg, `type=…::credit_carbon_manager::CarbonCreditRecord`) — RWA (carbon credit). `isCollectible: false`.
  Skip as noise: `nft_minter::Nft` ("WalletStd2 / testrun123"), `iota_super::Nft` ("Token3"), `tung_tung_tung_tung_sahur_limited::Nft` ("Token2"), `nft_minter::SimpleNFT` ("My First IOTA NFT") — all look like first-mint experiments with no organizational footprint.
- [ ] **Audit existing NFT projects for `isCollectible` classification.** New flag (2026-04-19) needs a pass over the existing NFT-category projects: `nftCollections` aggregate (pure-PFP catch-all → almost certainly `isCollectible: true`), `nftLaunchpad` (Tradeport launchpad product → `false`, it's infrastructure not a collection), `tradeport` (marketplace → `false`). Decide per-project and apply.
- [ ] **Studio 0xcb6956e9 — identify "Droppzz" operator and (optionally) consolidate gibberish deploys.** One of the deployer's modules is `droppzz_test_iota` — possible operator handle but not findable via public web search (2026-04). Ask in IOTA Discord / community channels; if confirmed, rename `studio-cb69` team to `droppzz` (same pattern as Clawnera for `studio-0a0d`). Separately, the deployer has ~25 keyboard-mash test-deploy modules that currently all surface under the single studio aggregate row — once the five real collections are carved out, consider whether to additionally suppress the gibberish from the dashboard (marked as "aggregate / not a project", counted only in team totals).
- [ ] **Suggest-fingerprint CLI** (`api/src/suggest-fingerprints.ts`) — reads the latest `EcosystemSnapshot.unattributed`, emits candidate `ProjectDefinition` TS stubs per cluster that has `sampleIdentifiers` (name, teamId=null placeholder, match={fingerprint:{type, fields:{…}}}). Human reviews, keeps, commits. Build this once the first by-hand pass proves the `fields` schema actually fits the real clusters.

## Fingerprint matchers — future widening

The `fingerprint` schema (`api/src/ecosystem/projects/project.interface.ts`) supports `type`, `issuer`, `tag`, and a generic `fields` map with `exact`, `prefix`, `suffix`, and `present: true` matchers. Deliberately skipped until real data demands them:

- [ ] **Regex field matchers** — e.g. `fields: { name: { regex: '^Lil..Ape #\\d+$' } }`. Needed only if a project minted with inconsistent naming that can't be expressed as prefix+suffix.
- [ ] **Array / OR matchers** — e.g. `fields: { tag: ['salus', 'salus-dev'] }`. Needed only when one deployer uses two parallel tag vocabularies for the same brand.
- [ ] **Numeric / typed matchers** — `fields.version: { gte: 2 }`. Needed only if numeric Move fields become load-bearing for attribution.

Current justification (2026-04-18): eyeballed 16 clusters with sampled identifiers in the latest snapshot — every one was uniquely identifiable by `type` alone, or by `type + exact/prefix/suffix/present`. None required regex, OR, or numeric matchers. Revisit when a real unattributed cluster can't be pinned down with the current primitives.

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
