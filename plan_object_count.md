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

## Pre-work — GraphQL probe (resolved 2026-04-21)

Session of ad-hoc queries against `graphql.mainnet.iota.cafe`:

1. **`ObjectConnection.totalCount`** — **does not exist.** Fields are exactly `{ pageInfo, edges, nodes }`. Same shape as `TransactionBlockConnection`. objectCount must come from pagination — either `nodes.length` summed page-by-page or a dedicated `countObjects(type)` helper mirroring `countEvents` (10k-page × 50 safety cap + `capped` flag).

2. **Owner union shape** — the union is called **`ObjectOwner`** (confusingly — that's the top-level union, not a member type). Members are:
   - `AddressOwner { owner: Owner }` → `owner.address` gives the wallet (type `IotaAddress`). Direct case.
   - `Parent { parent: Object }` → wrapped/owned by another object. Parent's `address`, `owner` (recursive `ObjectOwner`), and `asMoveObject.contents.type.repr` (for type-based disambiguation) are all reachable.
   - `Shared { initialSharedVersion }` → not a wallet. Exclude.
   - `Immutable` → not a wallet. Exclude.

3. **Kiosk detection — there IS no first-class Kiosk in IOTA's schema.** Grep for `Kiosk` in `__schema.types` returns nothing. The actual wrapper pattern observed on-chain is **marketplace listings via `dynamic_field::Field<dynamic_object_field::Wrapper<NftDfKey>, ID>`** pointing into a marketplace contract like `0xc03304c6…::listings`. Discovered by sampling IotaPunks NFTs — **35/50 (70%) of IotaPunks objects are Parent-owned by a dynamic-field wrapper tied to this listings contract**, not by any wallet. Otterfly's game-NFT sample by contrast was 50/50 AddressOwner (no marketplace listings). So Parent-owned frequency is **highly category-dependent** — PFP collections see heavy marketplace activity, gaming NFTs stay with players.

4. **Parent unwrap strategy** — the real seller of a marketplace-listed NFT lives *inside* the dynamic_field's Wrapper (one more lookup) or in a sibling listing object. **There is no clean one-hop Parent → wallet traversal** for the marketplace case. Walking `Parent.parent.owner` up the chain lands on the marketplace contract's shared admin, which is not the seller.

5. **Burn convention** — IOTA's zero-address `0x0…0` (32 zero bytes) is the conventional burn sink. Not explicitly probed but consistent with Sui heritage; confirm empirically during backfill when we see owner addresses.

6. **Latency** — 50-node page with owner-union breakdown: **~230 ms** (3-run average, Otterfly 297k-object type). Consistent with TX-count probe findings.

### Implications for the implementation plan

- **`countObjects` helper** must paginate (no totalCount). 10k-page × 50 safety cap.
- **`uniqueHolders` unwrap policy**: simple pragmatic rule. For each object node:
  - `owner.__typename === 'AddressOwner'` → count `owner.owner.address`.
  - `owner.__typename === 'Parent'` → **skip** (undercount of marketplace-listed NFTs is known and accepted, see below).
  - `Shared` / `Immutable` → skip.
  - `address === 0x0…0` → skip (burn).
- **Why skipping Parent is acceptable**: a wallet that listed an NFT on a marketplace has already generated *sender* events for the listing transaction (and earlier for the mint/buy). Those senders are captured in `project_sender_entries` — the reach column's `$unionWith` picks them up on the sender side. The marketplace-listed NFT's current holder stays uncountable via holders, but the *wallet* who listed it is still reachable via senders. For reach semantics this is a wash: same wallet, different collection.
- **Separately report** a `marketplaceListedCount` per project on the detail page (count of `Parent`-owned nodes) so the UI can render "184 000 holders + 45 000 marketplace-listed" instead of hiding the gap. Future work could integrate per-marketplace adapters (resolve listings contract's internal seller field) to convert these into real holders.
- **No first-class Kiosk on IOTA** simplifies detection (no special-case) and complicates semantics (marketplace contracts each have their own wrapping pattern). The plan's earlier "Kiosk unwrap" framing is retired — replaced with "Parent skip + marketplace counter".

### Package internals confirmed

- `MovePackage.modules.nodes.datatypes.nodes.name` — the query path to enumerate struct names per module. `datatypes`, not `structs`. Important for `countTypes` resolution.
- Confirmed otterfly_1's real struct is `OtterFly1NFT` (camelCase, not `Otterfly1NFT`). `countTypes` entries must match exactly.

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
