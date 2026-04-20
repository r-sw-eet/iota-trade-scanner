import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * One document per unique sender address observed emitting from a
 * given `(packageAddress, module)`. Replaces the old `senders: string[]`
 * array field on `ProjectSenders`, which hit MongoDB's 16 MB per-doc BSON
 * limit once a single module accumulated ~240k+ senders (observed
 * 2026-04-20 on `otterfly_1` at 210 088 senders ≈ 15 MB). Per-sender docs
 * are unbounded in aggregate; uniqueness is enforced via the compound index.
 */
@Schema({ timestamps: true, collection: 'project_sender_entries' })
export class ProjectSender extends Document {
  @Prop({ required: true })
  packageAddress: string;

  @Prop({ required: true })
  module: string;

  @Prop({ required: true })
  address: string;
}

export const ProjectSenderSchema = SchemaFactory.createForClass(ProjectSender);
ProjectSenderSchema.index({ packageAddress: 1, module: 1, address: 1 }, { unique: true });
ProjectSenderSchema.index({ packageAddress: 1, module: 1 });
