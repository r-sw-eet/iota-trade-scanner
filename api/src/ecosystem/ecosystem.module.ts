import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnchainSnapshot, OnchainSnapshotSchema } from './schemas/onchain-snapshot.schema';
import { ProjectSenders, ProjectSendersSchema } from './schemas/project-senders.schema';
import { ProjectSender, ProjectSenderSchema } from './schemas/project-sender.schema';
import { ProjectTxCounts, ProjectTxCountsSchema } from './schemas/project-tx-counts.schema';
import { ProjectTxDigest, ProjectTxDigestSchema } from './schemas/project-tx-digest.schema';
import { ProjectHolders, ProjectHoldersSchema } from './schemas/project-holders.schema';
import { ProjectHolderEntry, ProjectHolderEntrySchema } from './schemas/project-holder-entry.schema';
import { ClassifiedSnapshot, ClassifiedSnapshotSchema } from './schemas/classified-snapshot.schema';
import { TestnetCursor, TestnetCursorSchema } from './schemas/testnet-cursor.schema';
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
      { name: ProjectTxDigest.name, schema: ProjectTxDigestSchema },
      { name: ProjectHolders.name, schema: ProjectHoldersSchema },
      { name: ProjectHolderEntry.name, schema: ProjectHolderEntrySchema },
      { name: ClassifiedSnapshot.name, schema: ClassifiedSnapshotSchema },
      { name: TestnetCursor.name, schema: TestnetCursorSchema },
    ]),
    AlertsModule,
  ],
  providers: [EcosystemService],
  controllers: [EcosystemController],
})
export class EcosystemModule {}
