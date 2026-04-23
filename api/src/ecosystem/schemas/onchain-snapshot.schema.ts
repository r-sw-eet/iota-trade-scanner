import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * On-chain raw facts snapshot. Stored verbatim from RPC/GraphQL — no
 * project/team/logo/description/TVL. Classification is applied at read time
 * against the current `ALL_PROJECTS`/`ALL_TEAMS` registry, so attributing a
 * new project retroactively re-labels every historical snapshot for free.
 *
 * Delta queries (events growth, storage growth, etc.) are plain subtraction
 * between two snapshots keyed by on-chain-stable `(address, module)`. See
 * `ecosystem-growth.ts` for the query path.
 *
 * Counters are **cumulative**, not deltas — every field holds the value
 * observed at capture time. That keeps any "state at time T" query O(1) in
 * snapshots and makes delta = `T2 - T1` trivially.
 *
 * Fields marked *reserved for future* have intentionally-empty slots today;
 * adding them is purely additive (old docs return `undefined`, which the
 * growth endpoint treats as "unknown for that interval", not zero):
 *   - `PackageFact.objectStorageBytes` / `.objectsLiveCount` — dynamic
 *     object-store growth (deferred; see `plans/TODO.md § Object-store growth`)
 *   - `PackageFact.firstCheckpoint` / `.latestCheckpoint` — first/last
 *     checkpoint the package was touched (derivable; deferred)
 *
 * `PackageFact.transactions` lives at package level (single `function:` filter
 * per package, cursor-model cumulative count). An earlier doc-comment reserved
 * a `ModuleMetrics.transactions` slot for per-module counting; abandoned
 * before use per `plans/plan_tx_count.md § Design decision` — every project
 * the metric rescues is single-module, so per-package halves the query budget
 * for the same data.
 */
@Schema({ _id: false })
export class ModuleMetrics {
  @Prop({ required: true }) module: string;

  /** Total events emitted from this (package, module) since package deploy. */
  @Prop({ required: true }) events: number;

  /** True if `countEvents` hit its page cap — the `events` field is a floor. */
  @Prop({ required: true, default: false }) eventsCapped: boolean;

  /**
   * Unique sender addresses seen across this (package, module). Derived at
   * capture time from the maintained `ProjectSenders` collection; stored
   * here for point-in-time delta queries without needing to rehydrate
   * every scan's `ProjectSenders` state.
   */
  @Prop({ required: true, default: 0 }) uniqueSenders: number;

  /**
   * Public entry-function names exposed by this module (filtered to
   * `visibility=PUBLIC` + `isEntry=true` at capture time). Orders of
   * magnitude more informative than the bare module name for classifying
   * logic-only packages — `swap`/`add_liquidity`/`remove_liquidity` is
   * "DEX" regardless of module name, `mint_nft`/`burn_nft` is "NFT", etc.
   *
   * Empty array on snapshots predating this field and on modules with no
   * public entry functions.
   */
  @Prop({ type: [String], default: [] }) entryFunctions: string[];

  /**
   * Short names of distinct event-struct types this module emits, sampled
   * from the first few pages of `events(filter: { emittingModule })`.
   * Complementary to `entryFunctions`:
   *   - entry fns say what a caller *can do*
   *   - event types say what actually *happened on-chain*
   * For heuristics: `Swapped` alone is nearly pathognomonic for a DEX
   * regardless of entry-function naming discipline.
   *
   * Short names (trailing `::Event` segment), not full type reprs — the
   * module name is already known from the parent record, so storing the
   * full `<pkg>::<mod>::Event` string every time is wasteful.
   *
   * Empty array on snapshots predating this field and on modules that
   * emit no events or whose event sample page failed.
   */
  @Prop({ type: [String], default: [] }) eventTypes: string[];
}

/**
 * Per-struct-type holder counts for a package. One entry per `key`-able struct
 * declared by any of the package's modules. Capture is type-agnostic — *every*
 * such struct gets an entry, not just ones a `ProjectDefinition` has opted in
 * via `countTypes`. This preserves the classification-free invariant
 * (`plan_tx_count.md` invariant 2) — adding a new NFT project to the registry
 * tomorrow retroactively populates its `objectHolderCount` / `uniqueHolders` /
 * `marketplaceListedCount` from the history already captured.
 *
 * Not all entries are user-facing: MintCaps, AdminCaps, Registries, Bag-
 * typed objects, dynamic_field wrappers will all appear here by construction.
 * `classifyFromRaw` filters to project-declared `countTypes` at read time,
 * so the UI never sees the raw dump. See `plans/plan_object_count.md`.
 */
@Schema({ _id: false })
export class ObjectTypeCount {
  /** Fully-qualified Move struct type — e.g. `0x35fa…::otterfly_1::OtterFly1NFT`. */
  @Prop({ required: true }) type: string;

  /**
   * Distinct wallet addresses currently observed holding at least one live
   * Move object of this type (`countDocuments({pkg, type})` against
   * `project_holder_entries`). The collection is append-only with dedup, so
   * this is "wallets ever caught holding one at any past scan tick" — drifts
   * slightly above true current holders as wallets transfer/burn between scans.
   * Receivers who flip out before any scan catches them aren't counted; for
   * "ever-received" semantics use `ProjectSenders` (TX initiators) instead.
   */
  @Prop({ required: true, default: 0 }) objectHolderCount: number;

  /**
   * Count of `owner.__typename === 'Parent'` observations during the holder walk —
   * objects sitting inside another object (marketplace listing dynamic_field
   * wrapper, Kiosk-like wrapper, etc.). Not held by a wallet directly; surfaced
   * on the detail page as "Listed on marketplace" so the gap between live-object
   * count and `objectHolderCount` is visible rather than silent.
   */
  @Prop({ required: true, default: 0 }) listedCount: number;

  /** True if the holder walk hit its per-scan page cap — `objectHolderCount` is then a floor. */
  @Prop({ required: true, default: false }) objectHolderCountCapped: boolean;

  /**
   * Live Move-object count for this type as of capture — total nodes returned
   * by `objects(filter: { type })` across full pagination. Mirrors `events`
   * semantics on `ModuleMetrics`: stateless re-walk every scan (object
   * populations can shrink via burns / wraps, which a forward cursor wouldn't
   * catch), capped at `countObjectsForType`'s per-scan page budget.
   *
   * Empty/undefined on snapshots predating this field — growth endpoint
   * treats as "unknown for that interval", not zero.
   */
  @Prop({ required: true, default: 0 }) objectCount: number;

  /** True if `countObjectsForType` hit its per-scan page cap — `objectCount` is then a floor (UI renders as `<n>+`). */
  @Prop({ required: true, default: false }) objectCountCapped: boolean;
}

@Schema({ _id: false })
export class FingerprintSampleDoc {
  /** Fully-qualified Move type of the probed object, for provenance. */
  @Prop({ type: String, default: null }) sampledObjectType: string | null;

  /** `key:value` pairs extracted from the sampled object (tag, name, url, …). */
  @Prop({ type: [String], default: [] }) identifiers: string[];
}

@Schema({ _id: false })
export class PackageFact {
  /** Stable on-chain identifier. Primary key for delta joins between snapshots. */
  @Prop({ required: true }) address: string;

  /** First-publisher address (lowercased). `null` for packages without a previousTransactionBlock sender (framework / legacy). */
  @Prop({ type: String, default: null }) deployer: string | null;

  /** Storage deposit set at publish; static per package (in nanos). */
  @Prop({ required: true, default: 0 }) storageRebateNanos: number;

  /** Module name list — changes only on upgrade. */
  @Prop({ type: [String], default: [] }) modules: string[];

  /** Cumulative per-module counters. One entry per currently-present module. */
  @Prop({ type: [ModuleMetrics], default: [] }) moduleMetrics: ModuleMetrics[];

  /**
   * Sum of `objectHolderCount` across this package's per-type entries — i.e.
   * total distinct (type, address) holder pairs observed for the package.
   * Cross-type wallet duplication is not removed at this layer (a wallet
   * holding both type A and type B counts twice); for project-level dedupe
   * see `project.uniqueHolders` (computed via aggregation over
   * `project_holder_entries` at classify time).
   */
  @Prop({ required: true, default: 0 }) objectHolderCount: number;

  /**
   * Sum of `objectCount` across this package's per-type entries — total live
   * Move objects of any `key`-able struct declared by this package. Stateless
   * recompute every scan (see `ObjectTypeCount.objectCount` for why a cursor
   * model wouldn't work). Empty/undefined on snapshots predating Phase 2.
   */
  @Prop({ required: true, default: 0 }) objectCount: number;

  /**
   * Cumulative MoveCall TX count addressing this package since deploy.
   * Derived at capture time from the maintained `ProjectTxCounts` collection
   * (cursor-model pagination of `transactionBlocks(filter: { function: <pkg> })`).
   * Stored here for point-in-time delta queries without rehydrating the
   * cursor state. Package-level (not per-module) per
   * `plans/plan_tx_count.md § Design decision`.
   */
  @Prop({ required: true, default: 0 }) transactions: number;

  /** True if pagination hit its per-scan page cap — the `transactions` field is a floor. */
  @Prop({ required: true, default: false }) transactionsCapped: boolean;

  /**
   * Per-type holder counts for every `key`-able struct type declared by this
   * package. One entry per struct. Populated by the Option C capture pass
   * (`plans/plan_object_count.md`). Classify-time filter against
   * `ProjectDefinition.countTypes` selects which are summed into a project's
   * `objectHolderCount` / `uniqueHolders` / `marketplaceListedCount`. Empty
   * array on old snapshots predating this field — treated as "unknown for
   * that interval" by the growth endpoint.
   */
  @Prop({ type: [ObjectTypeCount], default: [] }) objectTypeCounts: ObjectTypeCount[];

  /**
   * Raw fingerprint probe output. Stored rather than matched so classification
   * can re-run at read time against the current registry — a new fingerprint
   * rule added today retroactively classifies old snapshots.
   */
  @Prop({ type: FingerprintSampleDoc, default: null }) fingerprint: FingerprintSampleDoc | null;

  /**
   * ISO timestamp of the TX that published this package — derived from
   * `previousTransactionBlock.effects.timestamp` on the `packages` query.
   * Static per package (upgrades don't rewrite the original publish tx).
   * Enables:
   *   - "deployed N days ago" insight on each cluster
   *   - cross-cluster clustering by publish time (coordinated multi-deployer
   *     projects publish within minutes of each other)
   *   - "brand-new package" highlighting for discovery sweeps
   *
   * `null` on framework packages (`0x1`/`0x2`/`0x3`) that lack a resolvable
   * previous TX, and on snapshots predating this field — growth endpoint
   * treats as "unknown for that interval".
   */
  @Prop({ type: Date, default: null }) publishedAt: Date | null;
}

@Schema({ timestamps: true, collection: 'onchainsnapshots' })
export class OnchainSnapshot extends Document {
  /**
   * Which IOTA network this snapshot was captured from. Tagged at write time
   * so non-mainnet captures can share the `onchainsnapshots` collection
   * without ambiguity at read time. Every production read filters by
   * `network` so a later testnet capture worker is a pure additive change.
   *
   * Docs predating this field decode with `network: undefined`; readers use a
   * transitional `{ $or: [{ network }, { network: { $exists: false } }] }`
   * filter until the one-shot backfill sets `'mainnet'` on all existing rows.
   */
  @Prop({ type: String, enum: ['mainnet', 'testnet', 'devnet'], default: 'mainnet', required: true, index: true })
  network: string;

  @Prop({ type: [PackageFact], default: [] }) packages: PackageFact[];

  /** Summed storageRebateNanos across every package. Convenience for network-total queries. */
  @Prop({ required: true, default: 0 }) totalStorageRebateNanos: number;

  /** Network-level TX total (all packages + framework calls), from SnapshotModule's latest epoch. */
  @Prop({ required: true, default: 0 }) networkTxTotal: number;

  /** Per-epoch TX rate map (epoch → tx/s). Kept for continuity with the old schema. */
  @Prop({ type: Object, default: {} }) txRates: Record<string, number>;

  /**
   * Wall-clock milliseconds the `capture()` body took (from guard-acquire to
   * just before the snapshot write). Persisted so post-deploy ship-gate
   * decisions can be made from snapshot history rather than log tailing,
   * and the dashboard can render a capture-duration trend. Null on old
   * snapshots predating this field.
   *
   * Tiered log thresholds emitted around this value:
   *   - >75 min → WARN (approaching 2h cron ceiling)
   *   - >90 min → ERROR (post-TX alarm; port events/senders per shared follow-up)
   *   - >100 min → ERROR (post-Obj alarm; Obj schema work must wait)
   */
  @Prop({ type: Number, default: null }) captureDurationMs: number | null;

  createdAt?: Date;
}

export const OnchainSnapshotSchema = SchemaFactory.createForClass(OnchainSnapshot);

/**
 * Index on `createdAt` for growth-range queries (`findBetween(from, to)`).
 * The default `_id` index already orders by insertion time, but an explicit
 * `createdAt` index plays better with `$gte/$lte` windowed queries.
 */
OnchainSnapshotSchema.index({ createdAt: -1 });

/**
 * Compound index for the hot `findOne({ network }).sort({ createdAt: -1 })`
 * pattern used by `getLatest`/`getLatestRaw` and the growth endpoints. The
 * single-field `createdAt` index above covers range queries that don't filter
 * by network (legacy/transitional); this one keeps the network-filtered reads
 * O(log N) once prod docs carry the `network` field.
 */
OnchainSnapshotSchema.index({ network: 1, createdAt: -1 });
