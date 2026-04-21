# Plan: Integrate object count per project

Implements TODO.md § Project metrics — objects & holders, object-side only. Holders is deferred (Kiosk unwrap + burn filter + shared-object owner are separate problems).

## Scope — first pass

Only projects where objects ARE the activity metric:

- NFT-category rows: Gamifly family, Healthy Gang, Iota Punks, Lumis, Ape DAO, studio-cb69 siblings, etc.
- Object-heavy non-NFT: Salus Platform, TruvID, Car NFT, IOTA Estoicos, Carbon Credits.

DeFi / infra rows (Swirl, Virtue, DeepBook, …) stay `objectCount: null` — no one is asking "how many `Pool` objects does Swirl have"; their activity is TXs + events.

Per TODO.md:65 — mostly a one-line change per project def (copy `fingerprint.type` into `countTypes`), plus NFT-vs-MintCap disambiguation where the package has multiple struct types.

## Design tension — decide first

Capture is type-agnostic by construction (2026-04-20 refactor: `raw on-chain facts only`, so adding a `ProjectDefinition` today re-labels every historical snapshot). That invariant conflicts with "count objects of type X" where X comes from the project registry.

Three options, in order of cost:

- **A. Count at read time only.** `classifyFromRaw` does live GraphQL per matched project's `countTypes`. Clean invariant, but the growth endpoint can't delta per-type (no persisted history).
- **B. Count the probed type at capture, per package.** Reuse `probeIdentityFields`'s `sampledObjectType` — store its object count. Type-agnostic: works for every package without registry lookup. Downside: the probed type may not be the one we want to count (e.g. samples `MintCap` instead of `NFT`).
- **C. Count all struct types per package at capture, capped.** Enumerate structs via GraphQL (`moveModule { structs { nodes { name } } }`), count each. Preserves invariant, supports multi-type projects, costs ~2–4 extra queries/package.

**Recommendation: C** — ~1500–3000 extra queries per 2h tick (negligible next to today's ~750×`countEvents`), persists history for growth deltas, keeps capture pure.

## Pre-work — one-off probe

Before any code changes, resolve the open question flagged at TODO.md:54 and :44:

- **Does GraphQL expose `ObjectConnection.totalCount`?** One test query:
  ```graphql
  { objects(filter: { type: "<pkg>::<mod>::NFT" }) { totalCount } }
  ```
  - If yes → 1 query/type/package. Whole feature is cheap.
  - If no → paginate like `countEvents` (10k-page × 50 safety cap + `capped` flag).

This gates the cost math for everything below.

## Steps (assuming Option C + `totalCount` works)

1. **Schema additive change** — `api/src/ecosystem/schemas/onchain-snapshot.schema.ts`.
   Add `PackageFact.objectTypeCounts: [{ type: string, count: number, capped: boolean }]`. Keep existing scalar `objectCount` as the sum across entries (back-compat for any reader treating it as a package-level total). Old docs decode with `[]` — no migration.

2. **Enumerate struct types per package** — extend `fetchFull`'s inner loop (`ecosystem.service.ts:1060`). One GraphQL call returning each module's struct names; union into `types: string[]`. Skip structs without `key` ability — only owned objects count.

3. **Count per type** — new `countObjects(type: string)` helper mirroring `countEvents`. If `totalCount` lands: single query returning scalar. If not: paginate with 10k×50 safety cap + `capped` flag.

4. **Persist at capture** — inside the per-package loop (after the module-metrics loop), populate `objectTypeCounts`. Sum into the scalar `objectCount`.

5. **Add `countTypes` to `ProjectDefinition.match.fingerprint`** — `api/src/ecosystem/projects/project.interface.ts`.
   Optional `countTypes?: string[]` — module-local paths like `'nft::NFT'`. Explicit opt-in; absent/empty → `null` in UI.

6. **Surface on `Project` at classify time** — `classifyFromRaw` filters each fact's `objectTypeCounts` to the project's `countTypes` and sums across the project's packages. New fields on the `Project` read shape:
   - `objectCount: number | null` (null when `countTypes` absent/empty)
   - `objectCountCapped: boolean` (for UI honesty — render `≥N` when capped)

7. **Growth endpoint** — delta math is trivial: subtract per-`(address, type)` between two snapshots. Old snapshots return `undefined` → treat as "unknown for that interval" (same convention as existing reserved fields).

8. **Wire into frontend** — `website/`. New column on the dashboard + details page. `null` → `—`. Capped → `≥N`.

9. **Populate `countTypes`** — one line per file in `projects/nft/*` + the handful of object-heavy RWA / Trade rows from scope. Per TODO.md:65 mostly "copy `fingerprint.type` into `countTypes`". For packages with both `NFT` and `MintCap`, only include `NFT`.

10. **Backfill policy** — new field → old snapshots have empty `objectTypeCounts`. Decide:
    - Live with the gap (growth endpoint returns `undefined` until next capture) — probably fine, next 2h cron tick fills fresh data.
    - One-shot backfill CLI over the last N snapshots — only if the UI needs historical trend immediately.

11. **Update TODO.md** — tick the object-count bullet, leave the holders bullet open with the existing gotchas (Kiosk unwrap, `0x0` burn filter, struct-type filter, etc.) intact.

## Open questions

- `totalCount` availability (step 0 probe) — shapes cost model.
- Cap `objectTypeCounts` per package (e.g. top-10 structs by count) — some packages may have dozens of structs. Probably unnecessary at today's scale.
- Kiosk-held NFTs: counting works regardless (the NFT object still exists); punt to the holders work.
- Salus's 60 per-batch packages: `countTypes: ['nft::NFT']` on the project def sums across all 60 — confirm that's the desired behavior vs. per-package breakdown.

## Motivating examples (for regression-testing after landing)

- **Salus Platform** — 60 packages, 0 events, currently ranks at 0. Object count should de-zero it.
- **Gamifly** — thousands of NFTs on-chain, dashboard currently shows 0 wallets. Object count should reflect real footprint.
- **Carbon Credits** — 4 modules (manager + token + minter_pass_nft + certificate_nft); decide whether `countTypes` counts all NFT-shaped types or just the user-facing certificate.
