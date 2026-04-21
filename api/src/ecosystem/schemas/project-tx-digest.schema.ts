import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * One document per unique TX digest observed for a package. Mirrors
 * `ProjectSender` / `ProjectHolderEntry` — uses the unique compound index
 * to dedup re-scans, with `insertMany({ordered:false})` silencing dup-key
 * errors (code 11000).
 *
 * Replaces the running-total pattern previously kept on `ProjectTxCounts`
 * (see commit that added this file). The old pattern anchored a cursor at
 * end-of-history via `last: 1` and tried to page forward, which is broken
 * against IOTA's GraphQL semantics — the `last: 1` cursor is a permanent
 * past-end sentinel, so forward pagination returns 0 forever. The new
 * pattern paginates backward from `last: 50` + `before: <prev-startCursor>`
 * and stops when a full page is all dup-keys (caught up). `total` becomes
 * `countDocuments({packageAddress})` — always accurate regardless of how
 * many times we re-scan.
 *
 * Storage estimate: ~80 bytes per doc × low millions of TXs across ~750
 * packages ≈ low GBs. Bounded by actual on-chain TX count.
 */
@Schema({ timestamps: true, collection: 'project_tx_digests' })
export class ProjectTxDigest extends Document {
  @Prop({ required: true })
  packageAddress: string;

  @Prop({ required: true })
  digest: string;
}

export const ProjectTxDigestSchema = SchemaFactory.createForClass(ProjectTxDigest);
ProjectTxDigestSchema.index({ packageAddress: 1, digest: 1 }, { unique: true });
ProjectTxDigestSchema.index({ packageAddress: 1 });
