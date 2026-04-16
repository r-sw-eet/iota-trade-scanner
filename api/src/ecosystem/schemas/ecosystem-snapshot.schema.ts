import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class ProjectDoc {
  @Prop() slug: string;
  @Prop() name: string;
  @Prop() packageAddress: string;
  @Prop() latestPackageAddress: string;
  @Prop() layer: string;
  @Prop() category: string;
  @Prop() description: string;
  @Prop({ type: [{ label: String, href: String }] }) urls: { label: string; href: string }[];
  @Prop() packages: number;
  @Prop() storageIota: number;
  @Prop() events: number;
  @Prop() eventsCapped: boolean;
  @Prop({ type: [String] }) modules: string[];
  @Prop() tvl: number;
  @Prop() logo: string;
  @Prop({ type: Object }) team: Record<string, any> | null;
  @Prop() disclaimer: string;
  @Prop({ type: [String] }) detectedDeployers: string[];
  @Prop({ type: [String] }) anomalousDeployers: string[];
  @Prop({ default: 0 }) uniqueSenders: number;
}

@Schema({ timestamps: true })
export class EcosystemSnapshot extends Document {
  @Prop({ type: [ProjectDoc] }) l1: ProjectDoc[];
  @Prop({ type: [ProjectDoc] }) l2: ProjectDoc[];
  @Prop() totalProjects: number;
  @Prop() totalEvents: number;
  @Prop() totalStorageIota: number;
  @Prop() networkTxTotal: number;
  @Prop({ type: Object }) txRates: Record<string, number>;
}

export const EcosystemSnapshotSchema = SchemaFactory.createForClass(EcosystemSnapshot);
