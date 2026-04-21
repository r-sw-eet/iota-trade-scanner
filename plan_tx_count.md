# Plan: Integrate TX count per project

Implements TODO.md § Activity metric — count TXs, not just events. Fills the schema slot already reserved at `api/src/ecosystem/schemas/onchain-snapshot.schema.ts:21-22`.

## Pre-work — resolved (2026-04-21)

Task 1 of this plan (probe `TransactionBlockConnection.totalCount`) ran. Findings:

- **`totalCount` does not exist.** Schema introspection confirms `TransactionBlockConnection` exposes only `{ pageInfo, edges, nodes }`. Cursor-model pagination is the only path. No optimistic single-query shortcut.
- **Filter granularity is richer than TODO assumed.** `TransactionBlockFilter.function` supports three forms per the schema docs: `package`, `package::module`, or `package::module::function_name`. Opens the per-module-vs-per-package design choice below.
- **Pagination mechanics validated** on 5 real packages (Salus, TWIN verifiable_storage, Gamifly Otterfly, IOTA Identity WoT, Virtue). Per-page latency 70–180 ms. `hasNextPage` + `endCursor` work exactly like the events connection — the existing `ProjectSenders` cursor pattern ports 1:1.

Real-world TX distribution (deep dive on Salus / TLIP / TWIN / Gamifly):

| Project | Pkgs | Non-zero pkgs | Top-pkg TXs | Project total |
|---|---|---|---|---|
| TLIP | 1 | 1 | 13 | 13 |
| Salus | 60 | 30 | 3 | 73 |
| TWIN ImmutableProof | 6 | 2 | 2,328 | 2,493 |
| **Gamifly** | **9** | **9** | **≥25,000 (cap hit)** | **≥225,000 (floor)** |

Three distinct shapes to plan for:

- **TWIN-shape** (upgrade trail): 93% of TXs on one of six packages. Sampling any single package returns the wrong answer. **Summing across matched packages is a correctness requirement**, not an optimization — the existing `classifyFromRaw` projectMap aggregation already does this for events; TX count plugs into the same summation.
- **Salus-shape** (one-shot deployments): 60 packages, 30 non-zero, all with 1–3 TXs. The "packages" count looks impressive; real activity is modest. De-zero case: 0 events → 73 TXs.
- **Gamifly-shape** (heavy, evenly distributed across active packages): 9 packages, ALL active, every one hit my 25k-TX probe cap. Real total is well north of 225k. This is the case that changes backfill cost estimates below.

## Design decision — per-package vs. per-module

`TransactionBlockFilter.function` accepts both granularities. Two options:

- **A. Per-module** — field on `ModuleMetrics.transactions`, state keyed by `(packageAddress, module)` like `ProjectSenders`. ~1500 queries/scan (~750 pkgs × avg 2 modules). Enables per-module breakdown on details page.
- **B. Per-package** — field on `PackageFact.transactions`, state keyed by `packageAddress`. ~750 queries/scan. No per-module breakdown.

**Recommendation: B.** Reasons:

1. Every project this metric is meant to rescue (Salus 60×single-mod, TWIN 6×single-mod, TLIP 1×single-mod, Gamifly family all single-mod) is single-module. A and B produce identical data and cost for them.
2. For multi-module packages (Virtue, IOTA Identity), the manifesto-thesis chart wants package-level aggregation anyway.
3. Halves steady-state query budget.
4. Per-module is an additive follow-up if the details page ever needs it — no schema rewrite required.

If per-module breakdown on details-page turns out to matter more than expected, flip to A before Task 2 lands. Writing the plan around B.

## Scope

| Item | In/Out | Reason |
|---|---|---|
| Schema: `PackageFact.transactions: number` + `PackageFact.transactionsCapped: boolean` | IN | Core additive change; `transactions` renames the reserved `ModuleMetrics.transactions` slot to the package level |
| `ProjectTxCounts` collection: `(packageAddress)` unique, `cursor`, `total`, `txsScanned` | IN | Mirror `ProjectSenders` shape minus the per-module key |
| `updateTxCountForPackage(packageAddress)` + `pageForwardTxs` helpers | IN | Mirror `updateSendersForModule` + `pageForwardSenders` |
| Capture-path plumbing in `captureRaw` per-package loop | IN | Core feature |
| `backfillTxCountsForPackage` + `backfillAllTxCounts` + `npm run backfill:txcounts` CLI | IN | Historical drain; same precedent as `backfill:senders` ran on prod (commit `b96c165`) |
| Extend `Project` interface: `transactions: number`, `transactionsCapped: boolean` | IN | Consumer contract |
| Sum across packages in `classifyFromRaw` attributed projects | IN | Correctness requirement — see TWIN 93%-on-one-pkg finding |
| Sum across packages in `classifyFromRaw` unattributed clusters (`UnattributedCluster.transactions`) | IN (symmetric with attributed) | Required so unattributed triage leaderboard shows TX signal too — same de-zero goal |
| Extend `computeGrowth`: `transactionsDelta` at network + package level | IN | Plain subtraction, same pattern as `eventsDelta` |
| Extend `growthRanking`: `transactions` + `transactionsDelta` on both attributed AND unattributed branches | IN | Both leaderboards need symmetric columns |
| Optional `sortBy=transactionsDelta` query param on growth-ranking | IN (tiny) | Default stays `eventsDelta`; avoids a future breaking API shift |
| Dashboard column "TXs" on main list + triage/unattributed table + project details page | IN | Core goal — without it the data is invisible |
| Dashboard default-sort toggle (events ↔ TXs) | **OUT (follow-up)** | Ship raw column first; decide default after seeing real `transactionsCapped` rates on prod |
| TX/event ratio column or derived metric | OUT | Let users eyeball both columns before layering derived metrics |
| Per-function TX enumeration (exclude utility/read calls) | OUT | Package-level is what the manifesto-thesis chart wants; per-function is a future possibility the schema already supports |
| Per-module granularity (Option A above) | OUT (reversible) | Rejected for cost + no de-zero benefit; flip before Task 2 if details-page UX demands |

## Invariants (worth writing into doc-comments)

1. **On-chain-stable keying.** `ProjectTxCounts` is keyed by `packageAddress`, never references `ProjectDefinition`. Adding/renaming a project today retroactively picks up its historical TX counts for free — same retroactivity guarantee we already have for `ProjectSenders` and for events/storage in the raw snapshot. Put this on the schema file, mirroring `ecosystem.service.ts:679-681`.
2. **Capture is classification-free.** TX counts go on `PackageFact` (raw on-chain facts), not on classified output. The capture loop MUST NOT consult `ALL_PROJECTS` to decide whether to count a package's TXs — every mainnet package gets a count.
3. **Cursor = watermark, never regresses.** Once saved, `ProjectTxCounts.cursor` only moves forward. The `last: 1` first-sight anchor is a one-time operation per package; all subsequent scans `after: <saved_cursor>`.

## Steps

1. **Schema additive change** — `api/src/ecosystem/schemas/onchain-snapshot.schema.ts`.
   Add `PackageFact.transactions: number` (default 0) + `PackageFact.transactionsCapped: boolean` (default false). Update schema doc-comment: remove the "reserved for future — `ModuleMetrics.transactions`" line. Note: we're choosing `PackageFact`-level over the originally-reserved `ModuleMetrics.transactions` per Option B above; leave the `ModuleMetrics` slot unused (document it as deprecated-before-use in the schema doc). Old snapshots decode with `transactions: 0` + `transactionsCapped: false`. No migration.

2. **`ProjectTxCounts` schema + index** — new `api/src/ecosystem/schemas/project-tx-counts.schema.ts`. Shape mirrors `ProjectSenders` (`api/src/ecosystem/schemas/project-senders.schema.ts`) minus the `module` field:
   ```ts
   packageAddress: string   // unique index
   cursor: string | null    // GraphQL endCursor watermark
   total: number            // running count
   txsScanned: number       // diagnostics, mirrors senders' eventsScanned
   ```
   Register in `EcosystemModule.forFeature`.

3. **`pageForwardTxs(record, maxPages)` helper** — mirrors `pageForwardSenders` (`ecosystem.service.ts:705`). Queries `transactionBlocks(filter: { function: record.packageAddress }, first: 50, after: cursor)`, counts nodes, updates cursor + total + txsScanned. Returns scanned count. Safety-cap check matches `countEvents`.

4. **`updateTxCountForPackage(packageAddress): number`** — mirrors `updateSendersForModule` (`ecosystem.service.ts:601`):
   - First sight → `transactionBlocks(filter, last: 1)` to anchor cursor at end-of-history, persist `total: 0`. Return 0.
   - Subsequent sights → `pageForwardTxs(record, 100)`, return updated `total`.

5. **Wire into `captureRaw`** (`ecosystem.service.ts:1060` area). Inside the per-package loop (after the module-metrics loop), call `updateTxCountForPackage(pkg.address)`. Write result to `PackageFact.transactions` + capped flag. Keep the existing event/sender pass intact — this is a sibling loop, not a replacement.

6. **`backfillTxCountsForPackage(packageAddress)`** — mirrors `backfillSendersForModule` (`ecosystem.service.ts:639`). Reset cursor to null, drain all historical TXs in 100-page batches. Resumable + idempotent.

7. **`backfillAllTxCounts(onProgress?)`** — mirrors `backfillAllSenders` (`ecosystem.service.ts:670`). Iterates every package in the latest snapshot (classification-free, just reads `packages[].address`). Returns `{ totalPackages, totalTxs }`.

8. **CLI entrypoint** — new `api/src/backfill-tx-counts.ts` (mirrors the existing senders CLI, whichever file exposes `backfill:senders`). Add `"backfill:txcounts": "node dist/backfill-tx-counts"` to `api/package.json`. Document in CLAUDE.md § API commands.

9. **Extend `Project` interface** — `api/src/ecosystem/projects/project.interface.ts`. Add `transactions: number` + `transactionsCapped: boolean`. Sum per-package values in `classifyFromRaw` (`ecosystem.service.ts:1141+`). Zero if all matched facts have `transactions: 0`.

10. **Extend `UnattributedCluster`** — `api/src/ecosystem/ecosystem.service.ts:62-79`. Add `transactions: number` + `transactionsCapped: boolean`. Sum across the cluster's packages in `classifyFromRaw`'s unattributed-bucket pass. **Load-bearing** — without this, unattributed triage leaderboard stays blind to the de-zero rescue.

11. **Extend `computeGrowth`** — `ecosystem.service.ts:350+`. Add `transactionsDelta` at network, package level (mirrors `eventsDelta` at line 404–451). Plain subtraction; old snapshots with `transactions: undefined` treat as 0 (same convention as other reserved fields).

12. **Extend `growthRanking`** — `ecosystem.service.ts:225+`. Add `transactions` + `transactionsDelta` to the items shape. Populate on BOTH `scope === 'attributed'` and `scope === 'unattributed'` branches (lines 276–318). Add optional `sortBy: 'eventsDelta' | 'transactionsDelta'` param; default stays `eventsDelta`; sort interleaves both scopes when `scope === 'all'`.

13. **Controller wiring** — expose the new `sortBy` query param at `api/src/ecosystem/ecosystem.controller.ts` on the growth-ranking endpoint. Default preserved.

14. **Dashboard UI** — `website/`:
    - Main list (`pages/index.vue` or the dashboard component): add "TXs" column next to "Events", with capped indicator matching `eventsCapped` treatment.
    - Triage / unattributed leaderboard: same column added symmetrically.
    - Project details page (`pages/project/[slug].vue`): show TX count prominently. If a single-module package: display alone; if multi-module: display package-level total (no per-module breakdown — Option B).
    - **Do not flip default sort yet.** Leave events as default sort so the change is additive.

15. **Tests**:
    - `api/src/ecosystem/ecosystem.service.spec.ts` — unit test `updateTxCountForPackage` cursor-anchor + forward-page behavior with mocked `graphql`.
    - `api/src/ecosystem/ecosystem.service.spec.ts` — unit test `classifyFromRaw` sums `transactions` across a project's packages + across an unattributed cluster's packages.
    - `api/test/*.functional-spec.ts` — functional test: capture a snapshot, assert `packages[0].transactions` is a finite number; assert the `/ecosystem/latest` response includes non-zero `transactions` for a seeded project.
    - Controller test: `growthRanking?sortBy=transactionsDelta` returns items sorted by that field.
    - `make ready` passes (typecheck + lint + unit + functional).

16. **Update `TODO.md`** — tick the § Activity metric checkbox. Add a one-line follow-up entry for the default-sort toggle if we want to track it explicitly.

17. **Deploy + production backfill** — deploy via CI (main → `scripts/deploy.sh`). Once live, SSH to prod and run `docker exec iota-trade-scanner-api npm run backfill:txcounts` (exact command follows the `backfill:senders` precedent in commit `b96c165`). Monitor GraphQL error rates; pause the 2h capture cron if the backfill collides (senders backfill was resumable, this should be too).

## Cost estimates (grounded in deep-dive data)

Measured against 4 projects spanning 76 packages; Gamifly's cap-hit result reshaped the upper-bound math.

- **Steady-state scan** (per 2h cron): ~750 packages × 1 GraphQL call per scan = ~60–180 ms × 750 ≈ **45–135 s added per capture** for cold/idle packages. Hot packages need forward pagination; a per-call page budget of `maxPages = 100` (mirrors `pageForwardSenders`) handles up to 5,000 new TXs per package per scan. Gamifly's amortized rate — 225k TXs over months of activity — works out to ~600 TXs/2h window, fits comfortably. Bursty traffic (a drop event generating 50k TXs in a day) will lag the cursor for a few scan cycles and catch up during quieter windows — acceptable, but worth surfacing in the UI as "last updated N scans ago" on package-detail views.
- **First-time backfill** — highly project-dependent:
  - Salus (60 pkgs × 1-3 TXs each): **~2 s**
  - TLIP (1 pkg × 13 TXs): **<1 s**
  - TWIN (6 pkgs, hot one = 2,328 TXs): **~5 s**
  - Gamifly (9 pkgs × ≥25k TXs each, real number likely 10× higher): **~5 min measured, up to 2–3 hours** if true per-package volume is ~500k
  - Other unknown heavy hitters (Virtue, DeepBook, Swirl, other active games): **unknown — likely comparable to Gamifly**
  - **Whole-fleet backfill: assume several hours, schedule as overnight/maintenance-window operation.** Resumable + idempotent (via `ProjectTxCounts` unique index) makes interruption safe.
- **Per-scan safety cap during live capture**: set `pageForwardTxs(record, maxPages: 100)` = up to 5,000 TXs per package per scan. Packages with sustained steady-state >5,000 TXs/2h (≈ 0.7 TX/sec) will see persistent cursor lag. Detectable via `txsScanned` diagnostics; if observed in prod, raise the budget or add a dedicated "catch-up" pass for lagging packages.
- **GraphQL rate-limit exposure**: endpoint is public (no API key). The existing per-call `try/catch` swallow (`pageForwardSenders`, `ecosystem.service.ts:727`) handles transient errors. Gamifly-scale backfill (hundreds of thousands of pages) needs monitoring — add log lines on 429-style errors and exponential-backoff the pagination loop if they appear.

## Risks & assumptions

- **Cursor opacity**: cursors look like `eyJjIjox...` (base64'd `{checkpoint, tx_seq}` per my decoding glance). Treating them as opaque strings is safe — don't parse. Schema change in cursor format would break us; low risk historically.
- **Hot-spot imbalance within a project**: 93% of TWIN TXs on one of six packages means one package gets almost all the pagination work for TWIN. Per-package cursor isolation keeps this contained — quiet packages remain cheap.
- **Hot project backfill cost (Gamifly-shape)**: at 225k+ TXs (floor) for a single project across 9 packages, the probe took 5 min. True volumes are likely higher. Full-fleet first-scan backfill is an overnight operation, not a minutes-scale one. Matches `backfill:senders`'s actual prod cost after migration to `ProjectSender` collection (also hours).
- **Per-scan cursor lag on sustained-hot packages**: with `maxPages = 100` per call (5,000 TX budget), a package generating >5,000 TXs/2h will accumulate cursor lag each scan. Detectable via `txsScanned` watermark vs elapsed-time comparison; fix by raising `maxPages` or adding a separate catch-up job if ever observed.
- **"First-sight gap"**: `last: 1` anchor misses TXs landing between the anchor query and cursor save. Same known gap `ProjectSenders` has today. Closed by the backfill CLI for packages where complete history matters.
- **Default-sort shift**: if we later flip default sort to TXs without a toggle, some projects' rankings will swap visibly. Hold default on events until the toggle lands.
- **Field name collision**: the original schema reserved `ModuleMetrics.transactions`; Option B instead lands the field on `PackageFact`. The reserved slot goes unused. Document the switch in the schema doc-comment so future readers know.

## Cut list (explicitly out)

- Per-module granularity (Option A) — reversible if needed, but ships as package-level.
- Default-sort toggle — follow-up.
- TX/event ratio — premature.
- Per-function TX filtering — future possibility, not this plan.
- Network-level TX rate recomputation — `networkTxTotal` already exists independently.

## Open questions

1. **Option A vs. B** — per-module or per-package? Plan is written around B; see Design decision section above. Decide before Step 1 ships.
2. **Ship order vs. object count** — TODO's cross-reference notes "whichever lands first de-zeros Salus." Both Salus + TWIN are de-zeroed by TX count alone (this plan). Object count (`plan_object_count.md`) is broader (Gamifly, Healthy Gang, Iota Punks) but requires per-project `countTypes` config. Plausible order: ship TX count (one backfill, zero per-project config), then object count (bigger scope).
3. **Backfill cadence coexistence** — if a full TX-count backfill takes >2 h and overlaps the capture cron, what breaks? Senders backfill handled it via resumable + idempotent writes; same property should hold here (`ProjectTxCounts` unique index on `packageAddress` prevents duplicate rows). Test with one package on staging before prod.
