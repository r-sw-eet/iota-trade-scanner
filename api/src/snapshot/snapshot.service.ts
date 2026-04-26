import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Snapshot } from './schemas/snapshot.schema';
import { IotaService } from '../iota/iota.service';

export interface RollingWindow {
  epochs: number;
  avgGasBurned: number;
  avgStorageNetInflow: number;
  avgStorageFeesIn: number;
  avgStorageRebatesOut: number;
  avgTransactions: number;
  avgStakeRewards: number;
}

export interface SnapshotAggregates {
  asOf: { epoch: number; capturedAt: Date };
  current: any;
  cumulative: {
    gasBurned: number;
    storageFeesIn: number;
    storageRebatesOut: number;
    storageNetLocked: number;
    stakeRewards: number;
    transactions: number;
  };
  rolling: {
    last7d: RollingWindow;
    last30d: RollingWindow;
  };
}

@Injectable()
export class SnapshotService implements OnModuleInit {
  private readonly logger = new Logger(SnapshotService.name);
  private backfilling = false;
  private aggregates: SnapshotAggregates | null = null;

  constructor(
    @InjectModel(Snapshot.name) private snapshotModel: Model<Snapshot>,
    private iotaService: IotaService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;

    // Aggregator runs on every API process — both scanner (write side, folds
    // on capture) and serve (read side, freshness-checked on each call).
    this.rebuildAggregates().catch((e) =>
      this.logger.error('Aggregate rebuild failed', e),
    );

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
      .select('epoch epochGasBurned epochTransactions epochStorageNetInflow epochStorageFeesIn epochStorageRebatesOut epochStakeRewards epochReferenceGasPrice epochNonRefundableBalance gasPerTransaction storageFundTotal validatorTargetReward')
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
      } else {
        await this.snapshotModel.create(data);
        this.logger.log(`Snapshot captured for epoch ${data.epoch}`);
      }

      await this.rebuildAggregates();
    } catch (e) {
      this.logger.error('Failed to capture snapshot', e);
    }
  }

  /**
   * Returns a fresh snapshot of the in-memory aggregates, rebuilding only when
   * the head doc in Mongo (epoch + updatedAt) has changed since the cache was
   * built. Designed for the web box (serve mode) where the scanner box is the
   * one writing — the cheap freshness probe means a stale serve process picks
   * up the scanner's writes on the next request.
   */
  async getAggregates(): Promise<SnapshotAggregates | null> {
    const head = await this.snapshotModel
      .findOne()
      .sort({ epoch: -1 })
      .select('epoch updatedAt')
      .lean<{ epoch: number; updatedAt: Date }>();
    if (!head) return null;

    const stale =
      !this.aggregates ||
      this.aggregates.asOf.epoch !== head.epoch ||
      this.aggregates.asOf.capturedAt.getTime() !==
        new Date(head.updatedAt).getTime();
    if (stale) await this.rebuildAggregates();
    return this.aggregates;
  }

  private async rebuildAggregates(): Promise<void> {
    const all = await this.snapshotModel
      .find()
      .sort({ epoch: 1 })
      .lean();
    if (all.length === 0) {
      this.aggregates = null;
      return;
    }

    const cumulative = {
      gasBurned: 0,
      storageFeesIn: 0,
      storageRebatesOut: 0,
      stakeRewards: 0,
      transactions: 0,
    };
    for (const s of all) {
      cumulative.gasBurned += s.epochGasBurned ?? 0;
      cumulative.storageFeesIn += s.epochStorageFeesIn ?? 0;
      cumulative.storageRebatesOut += s.epochStorageRebatesOut ?? 0;
      cumulative.stakeRewards += s.epochStakeRewards ?? 0;
      cumulative.transactions += s.epochTransactions ?? 0;
    }

    const head = all[all.length - 1];
    this.aggregates = {
      asOf: { epoch: head.epoch, capturedAt: new Date((head as any).updatedAt) },
      current: head,
      cumulative: {
        ...cumulative,
        storageNetLocked: cumulative.storageFeesIn - cumulative.storageRebatesOut,
      },
      rolling: {
        last7d: this.computeRolling(all.slice(-7)),
        last30d: this.computeRolling(all.slice(-30)),
      },
    };
  }

  private computeRolling(slice: any[]): RollingWindow {
    const n = slice.length;
    if (n === 0) {
      return {
        epochs: 0,
        avgGasBurned: 0,
        avgStorageNetInflow: 0,
        avgStorageFeesIn: 0,
        avgStorageRebatesOut: 0,
        avgTransactions: 0,
        avgStakeRewards: 0,
      };
    }
    const sum = {
      g: 0,
      ni: 0,
      fi: 0,
      ro: 0,
      t: 0,
      sr: 0,
    };
    for (const s of slice) {
      sum.g += s.epochGasBurned ?? 0;
      sum.ni += s.epochStorageNetInflow ?? 0;
      sum.fi += s.epochStorageFeesIn ?? 0;
      sum.ro += s.epochStorageRebatesOut ?? 0;
      sum.t += s.epochTransactions ?? 0;
      sum.sr += s.epochStakeRewards ?? 0;
    }
    return {
      epochs: n,
      avgGasBurned: sum.g / n,
      avgStorageNetInflow: sum.ni / n,
      avgStorageFeesIn: sum.fi / n,
      avgStorageRebatesOut: sum.ro / n,
      avgTransactions: sum.t / n,
      avgStakeRewards: sum.sr / n,
    };
  }

  async backfillEpochFees(
    onProgress?: (info: { epoch: number; done: number; total: number }) => void,
  ): Promise<{ updated: number; skipped: number; failed: number }> {
    const stale = await this.snapshotModel
      .find({
        $or: [
          { epochStakeRewards: { $exists: false } },
          { epochStakeRewards: 0 },
        ],
      })
      .sort({ epoch: 1 })
      .select('epoch')
      .lean();

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of stale) {
      const epochId = doc.epoch;
      try {
        const summary = await this.iotaService.getEpochSummary(epochId);
        if (!summary) {
          skipped++;
          continue;
        }

        await this.snapshotModel.updateOne(
          { epoch: epochId },
          {
            $set: {
              epochStorageFeesIn: summary.epochStorageFeesIn,
              epochStorageRebatesOut: summary.epochStorageRebatesOut,
              epochStakeRewards: summary.epochStakeRewards,
              epochReferenceGasPrice: summary.epochReferenceGasPrice,
              epochNonRefundableBalance: summary.epochNonRefundableBalance,
            },
          },
        );

        updated++;
        onProgress?.({ epoch: epochId, done: updated + skipped + failed, total: stale.length });
      } catch (e) {
        failed++;
        this.logger.warn(`Failed to enrich epoch ${epochId}`, e);
      }
    }

    return { updated, skipped, failed };
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
                epochStorageFeesIn: summary.epochStorageFeesIn,
                epochStorageRebatesOut: summary.epochStorageRebatesOut,
                epochStakeRewards: summary.epochStakeRewards,
                epochReferenceGasPrice: summary.epochReferenceGasPrice,
                epochNonRefundableBalance: summary.epochNonRefundableBalance,
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
