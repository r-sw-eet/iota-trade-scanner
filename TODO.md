# TODO

## Operational

- [ ] Add devnet support (alongside mainnet)
- [ ] Set up backups (restic → Hetzner Object Storage; enable `iota_trade_scanner_backup_enabled` once S3 creds provisioned)
- [ ] Add tests (API unit/integration, website component tests)

## Scanner coverage gaps

- [ ] **Native staking on `0x3::iota_system`** — thousands of delegator wallets are currently invisible. Add a dedicated tracker (separate from the ecosystem table) counting unique senders of `StakingRequestEvent` and similar. Likely dwarfs everything we show today.
- [ ] **`0x2::iota_framework` events** — kiosk trades, display updates, coin-level events. Currently ignored because no `ProjectDefinition` targets the framework. Medium priority.
- [ ] **Events-per-module ceiling** — `countEvents` caps at 50,000 events per module (`maxPages = 1000` × 50). Top today is Virtue Pool at ~43k and climbing. When it hits 50k the count will silently stop advancing with `eventsCapped: true` set but no loud alarm. Raise the cap or page without a hard ceiling; at minimum surface the flag visibly in the UI.

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

## Ecosystem project-def audit

Revisit after several ecosystem snapshots (to confirm the packages don't reappear post-matcher fixes):

- [ ] **`swirlValidator`** (api/src/ecosystem/projects/defi/swirl.ts:16) — matches 0 packages on mainnet today (`all: ['cert', 'native_pool', 'validator']`). Either module names drifted, the contracts were never deployed, or the deployer renamed them. Action: verify against Swirl's latest source / confirm deployer `0x043b7d4d…` activity, then either fix the matcher or delete the def.
- [ ] **`virtueStability`** (api/src/ecosystem/projects/defi/virtue.ts:16) — matches 0 packages on mainnet today (`all: ['stability_pool', 'borrow_incentive']`). Same triage: verify modules, check if subsumed by `virtue` / `virtuePool`, fix or drop.

## Storage deposit lifetime analysis

- [ ] Track object creation and deletion events to measure how long storage deposits are actually held
- [ ] Chart: distribution of deposit hold times (are trade objects ever deleted?)
- [ ] Show "effectively locked" IOTA: deposits on objects that haven't been deleted in >30/90/180 days
