import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * One document per unique owner address observed holding a Move object
 * of a given `(packageAddress, type)`. Parallel to `ProjectSender`
 * (`project_sender_entries`) but keyed by `(pkg, type, address)` instead
 * of `(pkg, module, address)` because holders are property of struct
 * types, not modules.
 *
 * Uniqueness via the compound unique index; duplicate `insertMany`
 * attempts are silenced as dup-key errors (code 11000) by
 * `pageForwardHolders`, mirroring the pattern `pageForwardSenders` uses.
 *
 * Unbounded collection — same reason `ProjectSender` exists, see commit
 * `c49a5cf`: an array field on a single cursor-state document hits the
 * 16 MB BSON ceiling once a popular struct accumulates ~240k+ holders.
 * Per-holder docs have no such limit.
 *
 * Collection explicitly pinned to `project_holder_entries` to avoid
 * Mongoose's pluralization collision with `ProjectHolders` (the
 * cursor-state schema) — see `c45a0d0`.
 */
@Schema({ timestamps: true, collection: 'project_holder_entries' })
export class ProjectHolderEntry extends Document {
  @Prop({ required: true })
  packageAddress: string;

  /** Fully-qualified Move struct type — matches the `type` field in `ProjectHolders`. */
  @Prop({ required: true })
  type: string;

  /** Lowercased `IotaAddress` of the owning wallet. */
  @Prop({ required: true })
  address: string;
}

export const ProjectHolderEntrySchema = SchemaFactory.createForClass(ProjectHolderEntry);
ProjectHolderEntrySchema.index({ packageAddress: 1, type: 1, address: 1 }, { unique: true });
ProjectHolderEntrySchema.index({ packageAddress: 1, type: 1 });
