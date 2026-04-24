import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import {
  ModuleMetrics,
  ObjectTypeCount,
  FingerprintSampleDoc,
} from './onchain-snapshot.schema';

/**
 * Per-package fact document. Split out of `OnchainSnapshot.packages[]` to
 * escape MongoDB's 16 MiB per-document BSON ceiling — testnet captures at
 * ~9230 packages were reaching ~12 MiB per embedded snapshot doc, and
 * backfill ticks with richer per-package payloads (entryFunctions, eventTypes
 * samples) pushed over the limit on 2026-04-24. See git history for the
 * incident and the `OnchainSnapshot.packages` legacy field (kept for
 * read-time fallback on pre-split docs).
 *
 * One doc per `(snapshotId, address)`. Classification still runs at read
 * time against the current registry — `classifyFromRaw` reads the fact
 * set via `getPackages(snapshot)`. Delta queries (growth endpoint) subtract
 * two fact sets keyed by `(address, module)` exactly as before; the only
 * change is the I/O shape.
 */
@Schema({ timestamps: true, collection: 'packagefacts' })
export class PackageFactDoc extends Document {
  /** FK to the owning `onchainsnapshots._id`. Hot read path: `find({ snapshotId })`. */
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  snapshotId: Types.ObjectId;

  /** Redundant with the parent's field but carried here so single-doc reads don't need a join. */
  @Prop({ type: String, enum: ['mainnet', 'testnet', 'devnet'], required: true, index: true })
  network: string;

  // --- The following fields mirror OnchainSnapshot.PackageFact 1:1. Keep in sync. ---

  @Prop({ required: true }) address: string;
  @Prop({ type: String, default: null }) deployer: string | null;
  @Prop({ required: true, default: 0 }) storageRebateNanos: number;
  @Prop({ type: [String], default: [] }) modules: string[];
  @Prop({ type: [ModuleMetrics], default: [] }) moduleMetrics: ModuleMetrics[];
  @Prop({ required: true, default: 0 }) objectHolderCount: number;
  @Prop({ required: true, default: 0 }) objectCount: number;
  @Prop({ required: true, default: 0 }) transactions: number;
  @Prop({ required: true, default: false }) transactionsCapped: boolean;
  @Prop({ type: [ObjectTypeCount], default: [] }) objectTypeCounts: ObjectTypeCount[];
  @Prop({ type: FingerprintSampleDoc, default: null }) fingerprint: FingerprintSampleDoc | null;
  @Prop({ type: Date, default: null }) publishedAt: Date | null;
  @Prop({ type: Date, default: null }) lastProbedAt: Date | null;
}

export const PackageFactDocSchema = SchemaFactory.createForClass(PackageFactDoc);

/**
 * Compound `(snapshotId, address)` unique index — the hot read pattern
 * (`getPackages(snapshot)`) always scans by snapshotId, and no snapshot
 * should ever contain the same package address twice. Uniqueness also
 * makes a retry-insertMany safe for idempotent partial-save flows.
 */
PackageFactDocSchema.index({ snapshotId: 1, address: 1 }, { unique: true });

/**
 * Global `{ address: 1 }` index — opens the door for future "find this
 * package across every snapshot" queries (e.g. per-package history pages,
 * deploy-time audits). Cheap to add now; expensive to rebuild later.
 */
PackageFactDocSchema.index({ address: 1 });
