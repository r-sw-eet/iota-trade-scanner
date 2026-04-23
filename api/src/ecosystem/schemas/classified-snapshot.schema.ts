import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

/**
 * Precomputed classified view for an `OnchainSnapshot`. One document per raw
 * snapshot, keyed by `snapshotId`. Written at capture time after the raw doc
 * lands (see `EcosystemService.capture`), so the first read after each
 * 2h scan is a single indexed `findOne` instead of paying the ~1–2 s
 * classify cost on the hot path.
 *
 * Deterministic from `(raw snapshot, registry code)`. DefiLlama TVL and L2
 * synthesis are NOT baked in — they're merged live in `enrichWithTvl` at
 * read time so TVL updates propagate within DefiLlama's 10-min cache TTL
 * rather than every 2h cycle.
 *
 * Staleness: `registryHash` pins the value to a specific `ALL_PROJECTS` +
 * `ALL_TEAMS` + `CLASSIFIER_VERSION` tuple. On read, a mismatch triggers
 * re-classify + upsert; the doc is overwrite-in-place, never versioned.
 * When changing `classifyFromRaw` behavior without a registry edit, bump
 * `CLASSIFIER_VERSION` in the same commit so the fleet re-classifies on
 * first read after deploy.
 *
 * Safe to drop the collection at any time — readers fall back to
 * classify-on-demand, and `capture()` repopulates latest on the next cron.
 */
@Schema({ timestamps: true, collection: 'classifiedsnapshots' })
export class ClassifiedSnapshot extends Document {
  /**
   * Which IOTA network the underlying raw snapshot was captured from —
   * propagated from `OnchainSnapshot.network` at persist time, not read from
   * env. Re-classifying an old mainnet snapshot after testnet capture lands
   * still writes `mainnet` here. Docs predating this field decode with
   * `network: undefined`; readers carry a transitional `$or` filter.
   */
  @Prop({ type: String, enum: ['mainnet', 'testnet', 'devnet'], default: 'mainnet', required: true, index: true })
  network: string;

  /** References `OnchainSnapshot._id`. Unique — one classified doc per raw snapshot. */
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  snapshotId: Types.ObjectId;

  /** sha256 over `{projects: ALL_PROJECTS, teams: ALL_TEAMS, version: CLASSIFIER_VERSION}`. Mismatch → re-classify. */
  @Prop({ required: true })
  registryHash: string;

  /** When this classified view was computed. Diagnostic; not used by readers. */
  @Prop({ required: true })
  classifiedAt: Date;

  /** Wall-clock cost of the classify run. Diagnostic; tracks the metric this collection exists to eliminate. */
  @Prop({ required: true, default: 0 })
  classifyDurationMs: number;

  /**
   * The deterministic classified view — `{l1, unattributed, totalProjects,
   * totalEvents, totalStorageIota, totalUnattributedPackages, networkTxTotal,
   * txRates}`. `l2` is absent here (synthesized in `enrichWithTvl` from the
   * live DefiLlama response). Typed in the app layer via `Project` and
   * `UnattributedCluster` — `Mixed` at the Mongoose layer avoids duplicating
   * the ~50-field subschema for zero benefit.
   */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  view: any;
}

export const ClassifiedSnapshotSchema = SchemaFactory.createForClass(ClassifiedSnapshot);
ClassifiedSnapshotSchema.index({ snapshotId: 1 }, { unique: true });

/**
 * Compound index for the `findOne({ snapshotId, network })` pattern used by
 * `classifyOrLoad` and `selfHealLatestClassified`. The unique-on-`snapshotId`
 * index above already makes that lookup O(1); the compound shape keeps it so
 * once every doc carries a `network` field.
 */
ClassifiedSnapshotSchema.index({ network: 1, snapshotId: 1 });
