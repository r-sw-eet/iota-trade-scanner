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
   * Live Move-object count currently owned/emitted under this package's
   * types. Point-in-time (not cumulative). Used alongside `storageRebateNanos`
   * to compute per-package storage amplification over time.
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
   * Raw fingerprint probe output. Stored rather than matched so classification
   * can re-run at read time against the current registry — a new fingerprint
   * rule added today retroactively classifies old snapshots.
   */
  @Prop({ type: FingerprintSampleDoc, default: null }) fingerprint: FingerprintSampleDoc | null;
}

@Schema({ timestamps: true, collection: 'onchainsnapshots' })
export class OnchainSnapshot extends Document {
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
