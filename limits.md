# External-endpoint limits

Living doc of limits we've probed on the external systems this codebase depends on. Used for capacity planning, scheduling, and shaping the code around what's actually possible rather than what we'd like.

Every entry includes **provenance** (when/how we learned) so a future probe can verify the limit hasn't moved. Short one-liner commands preferred.

---

## IOTA GraphQL — `https://graphql.mainnet.iota.cafe`

Public endpoint, no API key, used by `EcosystemService`, `SnapshotService`, `scan-unattributed-cli.ts`, `scan-other-nets-cli.ts`, and the website's `composables/useIota.ts`.

### Connection page size is hard-capped at `first: 50`

**Applies to every paginated Connection type.** Values >50 are rejected with `BAD_USER_INPUT`:

```
"Connection's page size of N exceeds max of 50"
```

Verified against every Connection the codebase queries:

| Connection | `first: 100` result |
|---|---|
| `transactionBlocks` | REJECTED |
| `events` | REJECTED |
| `objects` | REJECTED |
| `packages` | REJECTED |
| `checkpoints` | REJECTED |

**Provenance**: probed 2026-04-21 during TX-count plan. Reproduce with:
```bash
curl -sS -X POST https://graphql.mainnet.iota.cafe \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ transactionBlocks(first: 100) { nodes { digest } } }"}'
```

**Implications for our code**: `first: 50` is the law. Every paginator in `ecosystem.service.ts` (`countEvents`, `pageForwardSenders`, `getAllPackages`, future `pageForwardTxs`) must cap at 50. To process N items you pay ⌈N/50⌉ round-trips at ~70–180 ms each — this is the dominant cost of every count/drain operation against this endpoint.

### No Connection exposes `totalCount`

**None of the Connection types have a `totalCount` field.** Every count has to be paginated; there's no shortcut scalar query.

| Connection | Fields |
|---|---|
| `TransactionBlockConnection` | `pageInfo, edges, nodes` |
| `EventConnection` | `pageInfo, edges, nodes` |
| `ObjectConnection` | `pageInfo, edges, nodes` |
| `MovePackageConnection` | `pageInfo, edges, nodes` |
| `CheckpointConnection` | `pageInfo, edges, nodes` |

**Provenance**: introspection 2026-04-21. Reproduce with:
```bash
curl -sS -X POST https://graphql.mainnet.iota.cafe \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __type(name: \"TransactionBlockConnection\") { fields { name } } }"}'
```

**Implications**: any "how many X are there?" feature inherits the `first: 50` pagination cost. Cursor-model persistent pagination (one-time drain + forward cursor on each scan) is the right pattern whenever the count is needed repeatedly — avoids re-paginating history on every read. `ProjectSenders` and the planned `ProjectTxCounts` both follow this pattern.

### Concurrency tolerance: at least 20 parallel workers

**Zero HTTP errors at concurrency=20 sustained over 4,657 requests in 118 s (~39 req/s peak).** At concurrency=10 the sustained rate was ~8 req/s with zero errors. Throughput scales roughly linearly with concurrency *until the workload runs out of parallel items* — the bottleneck above c≈20 for TX counting isn't rate-limiting, it's the serial pagination cost of the single heaviest item (see "serial within, parallel across" note below).

**Provenance**: TX-count probe 2026-04-21. c=10 (145 s) and c=20 (118 s) against 118 non-Gamifly packages, both zero-error.

**Untested**: c=30, c=50, c=100. The endpoint likely has a real ceiling somewhere; we haven't found it. Probe before setting concurrency higher than 20.

**Implications**: `backfillAllTxCounts` defaults to `concurrency = 20`. Same budget should be fine for any future bulk-read operation (object-count backfill, future indexing jobs).

### Pagination within a single connection is inherently serial

The `after:` cursor on page N+1 depends on the `endCursor` returned by page N. There is no way to fan out a single Connection's drain across parallel workers *using the cursor model alone*.

**Workaround (untested)**: the schema exposes `afterCheckpoint` and `beforeCheckpoint` on `TransactionBlockFilter`. Slicing the checkpoint range into N disjoint windows and draining each in parallel would unblock within-item parallelism for bulk historical scans. Not currently used; noted as a future optimization path for Gamifly-scale heavy drains.

**Implications**: parallelism lives *across* items (packages, modules) in worker pools. For a fleet-scale operation, this is fine — the queue of items is typically deeper than the worker count. For a single-heavy-item drain, the wall-clock floor is the total page count × per-page latency (e.g. Gamifly otterfly_1 at ~5000+ pages × 100 ms = 5-10 min).

### `TransactionBlockFilter.function` supports three granularities

Per schema docs:
> Calls can be filtered by the `package`, `package::module`, or the `package::module::name` of their function.

Means we can count TXs at any of those three levels without changing the query shape — just the filter string. Used in the TX-count plan (Option B ships at `package` level; per-module is a no-schema-change follow-up).

**Provenance**: `TransactionBlockFilter` introspection 2026-04-21.

### Unknown but worth probing before relying on

- **`scanLimit: Int`** argument on `transactionBlocks`. In Sui's GraphQL (which IOTA forked), this bounds how many TXs the server scans when the filter is unindexed. For indexed filters (`function`) it probably doesn't change behavior, but useful to confirm if we ever add a filter that hits the unindexed path.
- **Actual ceiling on `first:` parameter** — we know it's ≤50. Could be anywhere from 1 to 50. Probed values that work: 50.
- **Max `last:` value**, which we use for "anchor cursor at end-of-history" — assume same cap, unverified.
- **Whether the endpoint throttles at very high concurrency** (>30). Unprobed.

---

## IOTA mainnet — baseline facts

These aren't "limits" per se but shape every cost estimate:

- **Chain age**: ~332 days live (as of 2026-04-21). See `daysLive = 332` in `EcosystemService.captureRaw`.
- **Network lifetime TXs**: ~625M (from `checkpoint.networkTotalTransactions` query).
- **Network avg TX rate**: ~21.80 TX/s.
- **Total mainnet packages**: ~749 (growing slowly).
- **Heaviest single project (by TX count, measured)**: Gamifly at ≥225k TXs across 9 packages, floor — real number likely 2-5% of network TXs.

---

## DefiLlama — `https://api.llama.fi`

Public, no API key, used by `EcosystemService` for L2 TVL enrichment.

No limits formally probed. In practice we make one call per snapshot capture (every 2h). Known to rate-limit aggressive clients but we've never come close.

---

## Shape of this doc

- Add a new section whenever we probe and learn something about an external endpoint.
- Lead with the limit (the law), then provenance, then implications for our code.
- Keep a short one-liner probe command per limit so a future re-check takes <1 min.
- When an entry is in the "unknown but worth probing" list and someone probes it, move it up to a first-class entry with provenance.
