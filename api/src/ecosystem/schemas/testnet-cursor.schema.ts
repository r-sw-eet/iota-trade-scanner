import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Persistent state for the priority-sharded testnet capture (Phase 4c in
 * `plans/plan_testnet_support.md`). Singleton doc per network — `_id` is
 * the network literal (`'testnet'` today, extensible for devnet). The
 * `tickCounter % 3` decides whether the next tick runs a newest pass
 * (counter % 3 === 0) or a backfill pass (1 or 2). Backfill resumes from
 * `backfillBeforeCursor`; wraps to `null` on `hasPreviousPage: false` (we've
 * reached genesis and start over from the newest end next cycle).
 *
 * Lightweight collection — O(1) reads and writes per cron tick. Safe to
 * drop; next tick writes fresh state.
 *
 * Field renamed 2026-04-25 from `backfillAfterCursor` during the pagination
 * direction inversion (`plans/plan_pagination_inversion_and_gap_closing.md`).
 * A one-shot migration in `onModuleInit` `$unset`s the old field on deploy.
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
   *   - 0 → newest-tick (paginate from `null` cursor = newest end, stop on fresh)
   *   - 1 or 2 → backfill-tick (resume from `backfillBeforeCursor`, walk backward into the past)
   * Gives backfill 66% of ticks so the initial catch-up completes in
   * 3.5–7 days depending on package count.
   */
  @Prop({ type: Number, required: true, default: 0 }) tickCounter: number;

  /**
   * Opaque GraphQL `before` cursor marking where the backfill paginator
   * left off (walks newest→oldest). `null` on first use or after a wrap
   * (paginator returned `hasPreviousPage: false`, reached genesis).
   * Newest-tick never reads or writes this field.
   */
  @Prop({ type: String, default: null }) backfillBeforeCursor: string | null;

  /** Diagnostic: which mode the most recent tick ran. */
  @Prop({ type: String, enum: ['newest', 'backfill'], default: null })
  lastTickKind: 'newest' | 'backfill' | null;

  /** Diagnostic: when the most recent tick completed (wall-clock). */
  @Prop({ type: Date, default: null }) lastTickAt: Date | null;

  /** Diagnostic: how many packages the most recent tick freshly probed. */
  @Prop({ type: Number, default: 0 }) lastTickPackagesProbed: number;
}

export const TestnetCursorSchema = SchemaFactory.createForClass(TestnetCursor);
