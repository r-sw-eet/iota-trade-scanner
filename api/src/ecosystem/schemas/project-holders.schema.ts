import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Per-(package, type) holder pagination cursor state. One document per
 * `(packageAddress, type)` pair observed during capture. Mirrors the
 * `ProjectSenders` and `ProjectTxCounts` cursor-models but adds a `type`
 * dimension because `objects(filter: { type: "<pkg>::<mod>::<T>" })`
 * operates at struct-type granularity.
 *
 * On-chain-stable keying — never references `ProjectDefinition`. Capture
 * writes cursor state for every `key`-able struct type declared by every
 * package (Option C in `plans/plan_object_count.md`), not just ones a
 * project def has opted in via `countTypes`. This preserves `plan_tx_count.md`
 * invariant 2: attributing a new project today retroactively picks up
 * holder counts from history at read time.
 *
 * Collection explicitly pinned to `project_holders_state` to avoid
 * Mongoose's pluralization collision with the adjacent `ProjectHolderEntry`
 * collection (`project_holder_entries`) — learned the hard way on the
 * senders migration, see commit `c45a0d0`.
 *
 * Cursor = opaque GraphQL `endCursor` from the objects pagination.
 * First-sight anchors at end-of-history via `last: 1`; subsequent scans
 * forward-page from the saved cursor.
 */
@Schema({ timestamps: true, collection: 'project_holders_state' })
export class ProjectHolders extends Document {
  @Prop({ required: true })
  packageAddress: string;

  /** Fully-qualified Move struct type — e.g. `0x35fa…::otterfly_1::OtterFly1NFT`. */
  @Prop({ required: true })
  type: string;

  /** Opaque GraphQL endCursor marking the last object we've scanned. `null` only between first-sight anchor and first successful page. */
  @Prop({ type: String, default: null })
  cursor: string | null;

  /** Diagnostic: total object nodes scanned across all forward-page calls. Mirrors `ProjectSenders.eventsScanned`. */
  @Prop({ required: true, default: 0 })
  nodesScanned: number;

  /** Count of Parent-owned nodes observed during the most-recent drain (objects sitting inside a marketplace listing / dynamic field wrapper — not held by a wallet). Resets to 0 per drain; snapshot bakes point-in-time value into `PackageFact.objectTypeCounts`. */
  @Prop({ required: true, default: 0 })
  listedCount: number;
}

export const ProjectHoldersSchema = SchemaFactory.createForClass(ProjectHolders);
ProjectHoldersSchema.index({ packageAddress: 1, type: 1 }, { unique: true });
