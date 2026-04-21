# Plan: Integrate object count + unique holders per project

One scan, two (or three) metrics. Ships objects and holders together because they share a single GraphQL pagination pass. Implements TODO.md § Project metrics — objects & holders.

## Why combined

Both features need the same GraphQL walk: `objects(filter: { type }) { nodes { owner { … } } pageInfo { … } }`, paginated. Holders reads one extra field per node (`owner`) that the scan already fetches. objectCount is literally `nodes.length` summed across pages (or `totalCount` if the schema exposes it). Running them in one writer halves the cost and keeps the two numbers in sync by construction (same snapshot of chain state).

## Metrics

- **`objectCount`** — total Move objects of declared types that exist on chain for a project. Cheap; if `totalCount` works, one query per type per package. Persisted on `PackageFact.objectTypeCounts`.
- **`uniqueHolders`** — distinct owner addresses across those objects, with Kiosk unwrap. Persisted as per-address docs in a new `project_holder_entries` collection (parallel to today's `project_sender_entries`). Unbounded by design — no 16 MB BSON risk.
- **`uniqueWalletsReach`** (dashboard overview) — deduped union of senders ∪ holders computed at classify time via `$unionWith` + `$group { _id: '$address' } + $count`. This is the column the dashboard surfaces as "Wallets*".

## UI shape (locked 2026-04-21)

**Overview (L1 + Unattributed tables)** — one column, `Wallets*`, powered by `uniqueWalletsReach`. Asterisk footnote: *"Senders + holders combined as a reach indicator. Meanings vary by project category — see detail page for breakdown."* For projects without `countTypes` declared, reach == senders only (holders is null), and the column renders the same as today.

**Detail page** — full breakdown: `Senders: X | Holders: Y | Items: Z` with per-metric tooltips. Items (objectCount) lives only on the detail page, not the overview.

## Opt-in config (per project)

New field on `ProjectDefinition.match.fingerprint`: `countTypes?: string[]` — module-local paths like `'otterfly_1::Otterfly1NFT'`. Absent/empty → project doesn't participate in holders + objectCount (no Kiosk unwrap cost, no new rows in `project_holder_entries`, null in detail columns, overview reach = senders only).

First-pass opt-in: Gamifly family, Healthy Gang, Iota Punks, Lumis, Ape DAO, studio-cb69 siblings, plus object-heavy non-NFT (Salus Platform, TruvID, Car NFT, IOTA Estoicos, Carbon Credits). DeFi / infra rows stay opt-out.

## Scope decisions already made

- **Union semantics** for `uniqueWalletsReach` — deduped, not summed. Sum would double-count any wallet that both signs TXs and holds NFTs (common in gaming projects like Gamifly).
- **Kiosk unwrap** required. NFTs inside a Kiosk show `owner: ObjectOwner(<kiosk_id>)`; we fetch the Kiosk and resolve to its owner. Counting Kiosks themselves as holders would inflate by marketplaces and lie about community size.
- **Exclusions** — burn address (`0x0…0`), `Shared` owners (not a wallet), `Immutable` owners (rare, exclude for consistency).
- **Multi-type packages** (Carbon Credits: manager + token + minter_pass_nft + certificate_nft; TLIP: multiple modules) — `countTypes` lists only user-facing struct types. MintCap, admin caps, registries excluded.

## Pre-work — one-off GraphQL probe

Before any code, resolve these with a single session of ad-hoc queries against `graphql.mainnet.iota.cafe`:

1. **`ObjectConnection.totalCount`** — does the schema expose it? If yes, objectCount is 1 scalar query per type/package. If no, derive from `nodes.length` during the holders pagination (free byproduct).
2. **Owner-field shape** — schema for `owner { ... on AddressOwner { owner } ... on ObjectOwner { owner } ... on Shared { initialSharedVersion } ... on Immutable { ... } }`. Confirm fragment names.
3. **Kiosk detection** — is the indicator `owner.__typename === 'ObjectOwner'` + the owned object's `type === '0x2::kiosk::Kiosk'`? Or does IOTA use a different kiosk primitive? Same question for the `IotaObjectOwner` case on IOTA-specific marketplaces.
4. **Burn convention** — which address(es) does IOTA mainnet use for burns? `0x0…0` is one; check for ecosystem conventions.

Findings get committed to this file before any schema changes land.

## Steps (one feature, incremental commits)

1. **Schema additions**
   - `PackageFact.objectTypeCounts: [{ type: string, count: number, capped: boolean }]` on `onchain-snapshot.schema.ts` — additive, `[]` default. Back-compat via `default: []`.
   - New `ProjectHolders { packageAddress, type, cursor, nodesScanned }` schema — cursor-state per (pkg, type), parallel to `ProjectSenders`. Collection: `project_holders`.
   - New `ProjectHolderEntry { packageAddress, type, address }` schema — per-owner docs, parallel to `ProjectSender`. Explicit `collection: 'project_holder_entries'` to avoid Mongoose pluralization collisions (learned the hard way on the senders migration; see commit `c45a0d0`). Unique compound index `(packageAddress, type, address)` + lookup index `(packageAddress, type)`.

2. **Extend `ProjectDefinition`** — `projects/project.interface.ts`. Add `fingerprint.countTypes?: string[]`.

3. **Writer — `pageForwardHolders(record, pkgAddr, typeStr, maxPages)`**
   - Mirrors `pageForwardSenders` shape exactly: paginate forward from cursor, collect addresses in a Set, `insertMany({ordered: false})` with dup-key silencing on (pkg, type, address) unique index.
   - Per node: resolve `owner` to a single address string.
     - `AddressOwner` → `owner.owner`.
     - `ObjectOwner { owner: <id> }` → fetch that object's type + top-level owner; if the wrapping object is a Kiosk, use its owner. Cache per kiosk-id within the scan to dedupe requests.
     - `Shared` / `Immutable` → skip.
     - `0x0…0` → skip (burn).
   - Update `record.nodesScanned += scanned`, advance cursor, save.

4. **Capture hookup** — `fetchFull` inner per-package loop. For each module's declared countType (union the project's `countTypes` against which modules own types of that name — need to resolve `<mod>::<T>` to a concrete `<pkg>::<mod>::<T>` per package version):
   - Count objects. If `totalCount` works: one scalar query. Else: derive from pagination nodes.
   - If project has `countTypes` for this module: call `updateHoldersForType(pkg, type)` which wraps `pageForwardHolders` with the first-sight cursor-anchor logic (same pattern as `updateSendersForModule`).
   - Populate `PackageFact.objectTypeCounts` for types we counted.

5. **Backfill CLI** — new `backfill-holders.ts` paralleling `backfill-senders.ts`. Resets cursor to `null` on existing `ProjectHolders` records + drains history. Reuses `backfillAllSenders`'s snapshot-driven enumeration, but iterates over `(package, type)` pairs from the project registry × snapshot packages (types come from config, not from snapshot).

6. **Classify** — `classifyFromRaw` gets three new per-project computations:
   - `uniqueHolders` — `$match: { $or: [{pkg, type}, ...] } → $group { _id: '$address' } → $count` against `project_holder_entries`. Scalar return.
   - `objectCount` — sum `PackageFact.objectTypeCounts[t].count` across project packages for `t ∈ countTypes`.
   - `uniqueWalletsReach` — single aggregation with `$unionWith` joining `project_sender_entries` (match by project's (pkg, module) pairs) and `project_holder_entries` (match by project's (pkg, type) pairs), then `$group { _id: '$address' } → $count`. Deduped union.
   - For projects without `countTypes`: `uniqueHolders = null`, `objectCount = null`, `uniqueWalletsReach = uniqueSenders` (falls through since no holder union contribution).

7. **Growth endpoint** — scalar deltas: `objectCountDelta`, `uniqueHoldersDelta`, `uniqueWalletsReachDelta`. Subtract between snapshots. Old snapshots (pre-this-feature) have empty `objectTypeCounts` → treat as "unknown for that interval" (same convention as events before the schema carried them).

8. **Frontend**
   - `website/pages/index.vue`: L1 table column "Wallets" renamed to "Wallets*" with an amber asterisk link to a footnote below the table. Data source flips from `uniqueSenders` to `uniqueWalletsReach`. Tooltip rewritten. Unattributed table mirrors (if we decide to compute reach for unattributed clusters — flag during implementation).
   - `website/pages/project/[slug].vue`: new Holders row + Items row with per-metric tooltips. Existing Events + Wallets rows stay; Wallets becomes Senders explicitly on the detail page.
   - Sorting: one sortable `Wallets*` column on overview (same UX as today); detail page is static layout.

9. **Populate `countTypes`** — one line per eligible ProjectDefinition file. For each:
   - `projects/nft/<brand>.ts` files: add `countTypes: ['<module>::<StructName>']` to the `match.fingerprint` block.
   - RWA / object-heavy non-NFT: same pattern, pick the user-facing struct (certificate, not admin cap).
   - Multi-version packages (same team, multiple package addresses): the scanner resolves `<mod>::<T>` against each package's modules at capture time, so config stays simple.

10. **Tests**
    - Unit: `pageForwardHolders` writer (mirror the senders writer specs) — address resolution for Address vs ObjectOwner vs Shared, Kiosk unwrap via cache, burn filter, dup-key silencing, cursor advance.
    - Unit: classify reach aggregation — mock both collections, verify the `$unionWith` pipeline + deduped count.
    - Unit: classify `uniqueHolders` return, `objectCount` null-propagation when `countTypes` absent.
    - End-to-end: run a full capture with a scripted fetch returning mixed-owner nodes; assert snapshot fields + classify output.

11. **Deploy + backfill dance** (mirrors today's senders migration):
    - Push, wait for CI deploy.
    - Run `backfill-holders.ts` on prod — repopulates `project_holder_entries` from scratch.
    - Trigger `POST /ecosystem/rescan` — first post-backfill snapshot bakes in real `objectCount` and `uniqueHolders` into `moduleMetrics` / project classify output.
    - Verify: otterfly_1 should show objectCount ≈ 297 k (matches sender count roughly — game mints via gameplay so each sender = ≥1 holder), uniqueHolders ≈ somewhat lower (some wallets hold multiple NFTs).

12. **Tick TODO.md** — both bullets in § Project metrics — objects & holders; drop the "deferred: holders" caveat.

## Cost estimates (pending probe)

- **objectCount only** (if `totalCount` works, for every package, no `countTypes` gate): ~1500 scalar queries per 2 h tick (750 packages × ~2 modules × 1 type each). Negligible.
- **Holders** for ~15 opt-in projects: 1 full pagination pass each. Otterfly at 297k objects = ~6000 pages at 50/page. Across all opt-in projects, call it ~50 000 page-fetches total (first-time backfill). Steady-state is cheap (cursor-forward, only new objects).
- **Kiosk unwrap** overhead: depends on chain-wide Kiosk coverage. Sample probe during step 0 to size this.

## Open questions (resolve during probe or implementation)

- Kiosk unwrap: what fraction of NFTs live in a Kiosk today on IOTA mainnet? Shapes first-backfill runtime.
- Shared-object holders: filter entirely, or report separately? Current decision: filter (not a wallet).
- Unattributed clusters: do they get a `uniqueHoldersReach` too? The clusters don't have `countTypes` declared (they're unattributed by definition), so holders = 0 and reach = senders. Defer to implementation.
- Salus's 60 per-batch packages: `countTypes: ['nft::NFT']` on the project def — the scanner resolves this against each of the 60 package addresses at capture time, summing object counts and union-ing holder addresses across all 60. Confirm this is the desired UX (one aggregate number, not per-batch breakdown on the detail page).

## Motivating tests post-ship

- **Salus Platform** — 60 packages, 0 events, 0 wallets today. Expected post-ship: objectCount ≈ thousands (RWA certificates), uniqueHolders + reach = nonzero, project de-zeros on the overview leaderboard.
- **Gamifly — Otterfly** — 297 k senders today, shows as 297 k on Wallets*. Post-ship: senders ≈ 297 k (game participants), uniqueHolders ≈ lower (some wallets own multiple NFTs), reach ≈ 297 k (senders ⊇ holders, minus a few admin-only accounts).
- **Gamifly — Chamillion** — 293 k senders, suggests active gameplay. Holders should be a meaningful fraction of senders; reach stays close to senders.
- **Swirl** (DeFi, opt-out) — no change. uniqueHolders = null, objectCount = null, Wallets* = uniqueSenders.
- **Carbon Credits** — config decides whether `countTypes: ['certificate_nft::Certificate']` (just the user-facing cert) or all four types. Recommended: certificate only for both metrics.
