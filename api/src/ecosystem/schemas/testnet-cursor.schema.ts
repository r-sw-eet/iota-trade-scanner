import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Persistent state for the priority-sharded testnet capture (Phase 4c in
 * `plans/plan_testnet_support.md`). Singleton doc per network — `_id` is
 * the network literal (`'testnet'` today, extensible for devnet). The
 * `tickCounter % 3` decides whether the next tick runs a newest pass
 * (counter % 3 === 0) or a backfill pass (1 or 2). Backfill resumes from
 * `backfillAfterCursor`; wraps to `null` on `hasNextPage: false`.
 *
 * Lightweight collection — O(1) reads and writes per cron tick. Safe to
 * drop; next tick writes fresh state.
 */
@Schema({ timestamps: true, collection: 'testnetcursors', _id: false })
export class TestnetCursor extends Document<string, any, any> {
  /**
   * Network literal — `'testnet'` today. Overloaded as the doc's `_id` so
   * the singleton pattern is enforced at the collection level rather than
   * in app code.
   */
  @Prop({ type: String, required: true }) declare _id: string;

  /**
   * Monotonic counter incremented once per tick. `tickCounter % 3`:
   *   - 0 → newest-tick (paginate from `null` cursor, stop on fresh)
   *   - 1 or 2 → backfill-tick (resume from `backfillAfterCursor`)
   * Gives backfill 66% of ticks so the initial catch-up completes in
   * 3.5–7 days depending on package count.
   */
  @Prop({ type: Number, required: true, default: 0 }) tickCounter: number;

  /**
   * Opaque GraphQL `after` cursor marking where the backfill paginator
   * left off. `null` on first use or after a wrap (paginator returned
   * `hasNextPage: false`). Newest-tick never reads or writes this field.
   */
  @Prop({ type: String, default: null }) backfillAfterCursor: string | null;

  /** Diagnostic: which mode the most recent tick ran. */
  @Prop({ type: String, enum: ['newest', 'backfill'], default: null })
  lastTickKind: 'newest' | 'backfill' | null;

  /** Diagnostic: when the most recent tick completed (wall-clock). */
  @Prop({ type: Date, default: null }) lastTickAt: Date | null;

  /** Diagnostic: how many packages the most recent tick freshly probed. */
  @Prop({ type: Number, default: 0 }) lastTickPackagesProbed: number;
}

export const TestnetCursorSchema = SchemaFactory.createForClass(TestnetCursor);
