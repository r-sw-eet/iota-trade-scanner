import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnchainSnapshot, OnchainSnapshotSchema } from './schemas/onchain-snapshot.schema';
import { ProjectSenders, ProjectSendersSchema } from './schemas/project-senders.schema';
import { ProjectSender, ProjectSenderSchema } from './schemas/project-sender.schema';
import { ProjectTxCounts, ProjectTxCountsSchema } from './schemas/project-tx-counts.schema';
import { ProjectHolders, ProjectHoldersSchema } from './schemas/project-holders.schema';
import { ProjectHolderEntry, ProjectHolderEntrySchema } from './schemas/project-holder-entry.schema';
import { EcosystemService } from './ecosystem.service';
import { EcosystemController } from './ecosystem.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OnchainSnapshot.name, schema: OnchainSnapshotSchema },
      { name: ProjectSenders.name, schema: ProjectSendersSchema },
      { name: ProjectSender.name, schema: ProjectSenderSchema },
      { name: ProjectTxCounts.name, schema: ProjectTxCountsSchema },
      { name: ProjectHolders.name, schema: ProjectHoldersSchema },
      { name: ProjectHolderEntry.name, schema: ProjectHolderEntrySchema },
    ]),
    AlertsModule,
  ],
  providers: [EcosystemService],
  controllers: [EcosystemController],
})
export class EcosystemModule {}
