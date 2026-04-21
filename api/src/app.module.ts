import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { IotaModule } from './iota/iota.module';
import { SnapshotModule } from './snapshot/snapshot.module';
import { EcosystemModule } from './ecosystem/ecosystem.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27019/scanner'),
    ...(process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()]),
    AlertsModule,
    IotaModule,
    SnapshotModule,
    EcosystemModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
