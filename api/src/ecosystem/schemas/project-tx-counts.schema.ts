import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Per-package MoveCall TX-count cursor state. One document per mainnet
 * `packageAddress`. Mirrors the `ProjectSenders` cursor-model (cursor +
 * running total + forward pagination) but keyed at package level instead
 * of `(packageAddress, module)` — the `transactionBlocks(filter: { function })`
 * filter works at package granularity and every project this metric was
 * designed to rescue is single-module, so per-package halves the query
 * budget for identical data (see `plans/plan_tx_count.md § Design decision`).
 *
 * On-chain-stable keying — never references `ProjectDefinition`, so
 * attributing a new project today retroactively picks up its historical
 * TX counts at read time. Same retroactivity guarantee `ProjectSenders`
 * already carries.
 *
 * Cursor is the opaque GraphQL `endCursor` from
 * `transactionBlocks(filter: { function: <pkg> })`. First-sight anchors
 * it at end-of-history via `last: 1`; every subsequent scan forward-pages
 * from the saved cursor, advancing the watermark monotonically.
 */
@Schema({ timestamps: true, collection: 'project_tx_counts' })
export class ProjectTxCounts extends Document {
  @Prop({ required: true })
  packageAddress: string;

  /** Opaque GraphQL endCursor marking the last TX we've counted. `null` only between first-sight anchor and first successful page. */
  @Prop({ type: String, default: null })
  cursor: string | null;

  /** Running cumulative TX count. Increments by `scanned` on each forward-page call. */
  @Prop({ required: true, default: 0 })
  total: number;

  /** Diagnostic: total TX nodes scanned across all forward-page calls on this record. Mirrors `ProjectSenders.eventsScanned`. */
  @Prop({ required: true, default: 0 })
  txsScanned: number;
}

export const ProjectTxCountsSchema = SchemaFactory.createForClass(ProjectTxCounts);
ProjectTxCountsSchema.index({ packageAddress: 1 }, { unique: true });
