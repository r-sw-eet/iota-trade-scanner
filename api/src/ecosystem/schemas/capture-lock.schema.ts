import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Cross-process distributed lock for capture paths. Per-instance guards
 * (`this.capturing` and `this.capturingByNetwork`) only prevent a second
 * tick from starting **inside the same Node process** — they don't help
 * when two processes (scanner-host scheduler + a separate manual bootstrap,
 * or future HA deployments) each hold their own `EcosystemService`
 * instance and each attempt a capture of the same network.
 *
 * Singleton doc per network (`_id: 'mainnet' | 'testnet' | 'devnet'`) with
 * a TTL-style `lockedUntil`. Acquisition is atomic via `updateOne` with a
 * filter that only matches when the lock is expired or has never been
 * held. Release clears the fields in `finally`.
 *
 * TTL safety valve — a crashed lock-holder eventually releases the lock
 * when `lockedUntil` passes without needing manual intervention. Set TTL
 * generously above the capture's worst-case duration:
 *   - mainnet: 125 min hard timeout → TTL 180 min
 *   - testnet: 90 min tick budget → TTL 150 min
 */
@Schema({ timestamps: true, collection: 'capturelocks', _id: false })
export class CaptureLock extends Document<string, any, any> {
  /** Network literal — `'mainnet'` / `'testnet'` / `'devnet'`. Also the singleton `_id`. */
  @Prop({ type: String, required: true }) declare _id: string;

  /** Until-when the lock is held. Null or `< now` means available. */
  @Prop({ type: Date, default: null }) lockedUntil: Date | null;

  /** When the current holder acquired the lock. Diagnostic only; compare to lockedUntil to see TTL budget. */
  @Prop({ type: Date, default: null }) lockedAt: Date | null;

  /** Host that holds the lock (from `os.hostname()`). Diagnostic — makes "who stole my tick?" debuggable in multi-host setups. */
  @Prop({ type: String, default: null }) holderHostname: string | null;
}

export const CaptureLockSchema = SchemaFactory.createForClass(CaptureLock);
