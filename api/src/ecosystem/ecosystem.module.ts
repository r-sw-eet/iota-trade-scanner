import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnchainSnapshot, OnchainSnapshotSchema } from './schemas/onchain-snapshot.schema';
import { ProjectSenders, ProjectSendersSchema } from './schemas/project-senders.schema';
import { EcosystemService } from './ecosystem.service';
import { EcosystemController } from './ecosystem.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OnchainSnapshot.name, schema: OnchainSnapshotSchema },
      { name: ProjectSenders.name, schema: ProjectSendersSchema },
    ]),
  ],
  providers: [EcosystemService],
  controllers: [EcosystemController],
})
export class EcosystemModule {}
