import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Persistent state for the testnet two-pipeline capture (Phase 2 of
 * `plans/plan_testnet_tutorial_filter.md`). Singleton doc per network
 * — `_id` is the network literal (`'testnet'` today, extensible for
 * devnet). Each tick runs Pipeline A (discovery: paginate newest →
 * shallow facts + tutorial flag) followed by Pipeline B (deep-probe
 * stalest non-tutorial in `packagefacts`). The cursor doc only carries
 * diagnostics now — discovery's bail conditions (freshness window /
 * genesis / deadline) and deep-probe's stalest-first aggregation are
 * stateless across ticks.
 *
 * Lightweight collection — O(1) reads and writes per cron tick. Safe to
 * drop; next tick writes fresh state.
 *
 * History:
 *   - 2026-04-25: field renamed from `backfillAfterCursor` to
 *     `backfillBeforeCursor` during the pagination-direction inversion
 *     (`plans/plan_pagination_inversion_and_gap_closing.md`).
 *   - 2026-04-26: two-pipeline refactor deleted the kind-union dispatcher
 *     and the `backfillBeforeCursor` field entirely (Pipeline B's
 *     stalest-first aggregation subsumes the work backfill used to do).
 *     `runPaginationInversionMigration` `$unset`s both legacy field
 *     names so old singletons decode cleanly.
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
   * Monotonic counter incremented once per tick. Pure diagnostic now
   * that the kind-union dispatcher is gone — every tick runs the same
   * two-pipeline flow regardless of value. Surfaced in logs so operator
   * sweeps over container logs can correlate "Nth tick since boot" with
   * outcomes.
   */
  @Prop({ type: Number, required: true, default: 0 }) tickCounter: number;

  /** Diagnostic: when the most recent tick completed (wall-clock). */
  @Prop({ type: Date, default: null }) lastTickAt: Date | null;

  /** Diagnostic: how many packages the most recent tick freshly probed. */
  @Prop({ type: Number, default: 0 }) lastTickPackagesProbed: number;
}

export const TestnetCursorSchema = SchemaFactory.createForClass(TestnetCursor);
