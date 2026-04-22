import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Snapshot } from './schemas/snapshot.schema';
import { IotaService } from '../iota/iota.service';

@Injectable()
export class SnapshotService implements OnModuleInit {
  private readonly logger = new Logger(SnapshotService.name);
  private backfilling = false;

  constructor(
    @InjectModel(Snapshot.name) private snapshotModel: Model<Snapshot>,
    private iotaService: IotaService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    if (process.env.API_ROLE === 'serve') return;
    const count = await this.snapshotModel.countDocuments();
    if (count === 0) {
      this.logger.log('No snapshots found, capturing initial snapshot...');
      await this.capture();
    }
    // Backfill epoch history in background
    this.backfillEpochs().catch((e) => this.logger.error('Backfill failed', e));
  }

  async getLatest(): Promise<Snapshot | null> {
    return this.snapshotModel.findOne().sort({ epoch: -1 }).exec();
  }

  async getHistory(days: number): Promise<Snapshot[]> {
    const since = new Date(Date.now() - days * 86_400_000);
    return this.snapshotModel
      .find({ timestamp: { $gte: since } })
      .sort({ epoch: 1 })
      .exec();
  }

  async getEpochHistory(): Promise<any[]> {
    return this.snapshotModel
      .find({ epochGasBurned: { $exists: true } })
      .sort({ epoch: 1 })
      .select('epoch epochGasBurned epochTransactions epochStorageNetInflow gasPerTransaction storageFundTotal validatorTargetReward')
      .lean()
      .exec();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async capture() {
    try {
      const data = await this.iotaService.captureFullSnapshot();

      const existing = await this.snapshotModel.findOne({ epoch: data.epoch });
      if (existing) {
        this.logger.log(`Epoch ${data.epoch} already captured, updating...`);
        await this.snapshotModel.updateOne({ epoch: data.epoch }, data);
        return;
      }

      await this.snapshotModel.create(data);
      this.logger.log(`Snapshot captured for epoch ${data.epoch}`);
    } catch (e) {
      this.logger.error('Failed to capture snapshot', e);
    }
  }

  private async backfillEpochs() {
    if (this.backfilling) return;
    this.backfilling = true;

    try {
      const latest = await this.snapshotModel.findOne().sort({ epoch: -1 }).lean();
      const currentEpoch = latest?.epoch ?? 332;

      // Find which epochs we're missing
      const existing = await this.snapshotModel.distinct('epoch');
      const existingSet = new Set(existing);

      let backfilled = 0;
      // Start from epoch 1 (epoch 0 may not have complete data)
      for (let epochId = 1; epochId < currentEpoch; epochId++) {
        if (existingSet.has(epochId)) continue;

        try {
          const summary = await this.iotaService.getEpochSummary(epochId);
          if (!summary) continue;

          // Estimate timestamp: mainnet launch ~May 2025, 1 epoch = ~24h
          // Epoch 1 started roughly May 5, 2025
          const launchMs = new Date('2025-05-05T00:00:00Z').getTime();
          const epochMs = launchMs + epochId * 86_400_000;

          await this.snapshotModel.updateOne(
            { epoch: epochId },
            {
              $set: {
                epoch: epochId,
                timestamp: new Date(epochMs),
                epochGasBurned: summary.epochGasBurned,
                epochTransactions: summary.epochTransactions,
                epochStorageNetInflow: summary.epochStorageNetInflow,
                gasPerTransaction: summary.gasPerTransaction,
                storageFundTotal: summary.storageFundTotal,
                validatorTargetReward: 767000,
              },
              $setOnInsert: {
                totalSupply: 0,
                circulatingSupply: 0,
                circulatingPercentage: 0,
                totalStaked: 0,
                stakingRatio: 0,
                storageFundNonRefundable: 0,
                validatorCount: 0,
                validatorAvgApy: 0,
                weeklyInflation: 0,
                networkTotalTransactions: 0,
                referenceGasPrice: 0,
                storagePrice: 0,
                checkpointCount: 0,
              },
            },
            { upsert: true },
          );

          backfilled++;
          if (backfilled % 50 === 0) {
            this.logger.log(`Backfilled ${backfilled} epochs (at epoch ${epochId})...`);
          }
        } catch (e) {
          this.logger.warn(`Failed to backfill epoch ${epochId}`, e);
        }
      }

      this.logger.log(`Backfill complete: ${backfilled} epochs added`);
    } finally {
      this.backfilling = false;
    }
  }
}
