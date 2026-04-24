import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Persistent record of a schema-guard trip. Written whenever the BSON
 * size guard (see `EcosystemService.safeCreate`) refuses an oversize
 * write, or a similar invariant check fires. Survives container log
 * rotation so the fact that a guard fired is still visible days later —
 * the 2026-04-24 testnet BSON overflow showed that log tailing alone
 * isn't enough to catch these before the next cron tick repeats them.
 *
 * Cheap to query, trivial to drop when stale. Not replicated to other
 * systems — local canary only.
 */
@Schema({ timestamps: true, collection: 'schemaalerts' })
export class SchemaAlert extends Document {
  /** Short kind tag for filtering. `bson-size-guard` | `invariant-violation` | ... */
  @Prop({ required: true, index: true }) kind: string;

  /** Which collection the guarded write was targeting. Named `collectionName` because `collection` shadows a base Mongoose Document field. */
  @Prop({ required: true }) collectionName: string;

  /** Which Mongoose op name — create/updateOne/insertMany/etc. */
  @Prop({ required: true }) op: string;

  /** `mainnet` | `testnet` | `devnet` | `unknown`. */
  @Prop({ type: String, default: 'unknown' }) network: string;

  /** BSON size of the refused doc in bytes. */
  @Prop({ type: Number, default: 0 }) sizeBytes: number;

  /** Ceiling the guard enforces in bytes (so later readers know the threshold at time of trip). */
  @Prop({ type: Number, default: 0 }) thresholdBytes: number;

  /** Free-form detail (e.g. sample field names, largest embedded array lengths). */
  @Prop({ type: Object, default: {} }) detail: Record<string, unknown>;

  /** Human-readable message. */
  @Prop({ required: true }) message: string;
}

export const SchemaAlertSchema = SchemaFactory.createForClass(SchemaAlert);
