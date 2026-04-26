import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SnapshotService } from './snapshot.service';
import { Snapshot } from './schemas/snapshot.schema';
import { IotaService } from '../iota/iota.service';

type ExecLike<T> = { exec: jest.Mock<Promise<T>, []>; lean?: () => ExecLike<T>; sort?: () => ExecLike<T>; select?: () => ExecLike<T> };

describe('SnapshotService', () => {
  let service: SnapshotService;
  let model: any;
  let iota: jest.Mocked<IotaService>;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    model = {
      countDocuments: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      distinct: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    };
    iota = {
      captureFullSnapshot: jest.fn(),
      getEpochSummary: jest.fn(),
    } as unknown as jest.Mocked<IotaService>;

    const module = await Test.createTestingModule({
      providers: [
        SnapshotService,
        { provide: getModelToken(Snapshot.name), useValue: model },
        { provide: IotaService, useValue: iota },
      ],
    }).compile();
    service = module.get(SnapshotService);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  // Helpers to build fluent Mongoose chains that end in `.exec()`, `.lean()`, etc.
  const chain = <T>(value: T) => {
    const c: any = {};
    c.sort = jest.fn(() => c);
    c.select = jest.fn(() => c);
    c.lean = jest.fn(() => c);
    c.exec = jest.fn(async () => value);
    // Also make chain thenable so .lean() awaited directly resolves too.
    c.then = (r: any, j: any) => Promise.resolve(value).then(r, j);
    return c;
  };

  describe('getLatest', () => {
    it('returns the highest-epoch snapshot via findOne().sort().exec()', async () => {
      const doc = { epoch: 42 };
      model.findOne.mockReturnValue(chain(doc));
      const result = await service.getLatest();
      expect(result).toEqual(doc);
      expect(model.findOne).toHaveBeenCalledWith();
    });
  });

  describe('getHistory', () => {
    it('filters snapshots to the last N days and sorts ascending', async () => {
      const docs = [{ epoch: 1 }, { epoch: 2 }];
      const c = chain(docs);
      model.find.mockReturnValue(c);
      const result = await service.getHistory(7);
      expect(result).toEqual(docs);
      const filter = model.find.mock.calls[0][0];
      expect(filter.timestamp.$gte).toBeInstanceOf(Date);
      const cutoff = filter.timestamp.$gte.getTime();
      const expected = Date.now() - 7 * 86_400_000;
      expect(Math.abs(cutoff - expected)).toBeLessThan(1000);
      expect(c.sort).toHaveBeenCalledWith({ epoch: 1 });
    });
  });

  describe('getEpochHistory', () => {
    it('filters to snapshots that have epochGasBurned set, selects only gas fields', async () => {
      const docs = [{ epoch: 5, epochGasBurned: 100 }];
      const c = chain(docs);
      model.find.mockReturnValue(c);
      const result = await service.getEpochHistory();
      expect(result).toEqual(docs);
      expect(model.find).toHaveBeenCalledWith({ epochGasBurned: { $exists: true } });
      expect(c.select).toHaveBeenCalled();
      expect(c.lean).toHaveBeenCalled();
    });
  });

  describe('capture', () => {
    const snapshotData = { epoch: 7, totalSupply: 100 };

    it('creates a new snapshot when the epoch is not yet stored', async () => {
      iota.captureFullSnapshot.mockResolvedValue(snapshotData as any);
      model.findOne.mockResolvedValue(null);
      await service.capture();
      expect(model.create).toHaveBeenCalledWith(snapshotData);
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('updates instead of creating when the epoch already exists', async () => {
      iota.captureFullSnapshot.mockResolvedValue(snapshotData as any);
      model.findOne.mockResolvedValue({ epoch: 7 });
      await service.capture();
      expect(model.updateOne).toHaveBeenCalledWith({ epoch: 7 }, snapshotData);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('swallows capture errors (logs only, does not throw)', async () => {
      iota.captureFullSnapshot.mockRejectedValue(new Error('network down'));
      await expect(service.capture()).resolves.toBeUndefined();
      expect(model.create).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('short-circuits in test env without touching the DB', async () => {
      process.env.NODE_ENV = 'test';
      await service.onModuleInit();
      expect(model.countDocuments).not.toHaveBeenCalled();
    });

    it('short-circuits when API_ROLE=serve (two-box split: web host does not capture)', async () => {
      process.env.NODE_ENV = 'development';
      process.env.API_ROLE = 'serve';
      try {
        await service.onModuleInit();
        expect(model.countDocuments).not.toHaveBeenCalled();
      } finally {
        delete process.env.API_ROLE;
      }
    });

    it('captures an initial snapshot when none exist, then schedules backfill', async () => {
      process.env.NODE_ENV = 'development';
      model.countDocuments.mockResolvedValue(0);
      const captureSpy = jest.spyOn(service, 'capture').mockResolvedValue(undefined as any);
      // Prevent actual backfill work: mimic "no missing epochs" state.
      model.findOne.mockReturnValue(chain(null));
      model.distinct.mockResolvedValue([]);
      iota.getEpochSummary.mockResolvedValue(null);

      await service.onModuleInit();
      expect(captureSpy).toHaveBeenCalledTimes(1);
    });

    it('skips initial capture when snapshots already exist', async () => {
      process.env.NODE_ENV = 'development';
      model.countDocuments.mockResolvedValue(5);
      const captureSpy = jest.spyOn(service, 'capture').mockResolvedValue(undefined as any);
      model.findOne.mockReturnValue(chain({ epoch: 5 }));
      model.distinct.mockResolvedValue([1, 2, 3, 4, 5]);

      await service.onModuleInit();
      expect(captureSpy).not.toHaveBeenCalled();
    });
  });

  describe('backfillEpochs', () => {
    // Invoke the private method directly so we can await it (onModuleInit
    // fires it as a background task via .catch() and does not await).
    const runBackfill = () => (service as any).backfillEpochs();

    it('backfills only missing epochs and uses 332 as default currentEpoch', async () => {
      model.findOne.mockReturnValue(chain(null));
      model.distinct.mockResolvedValue([]);
      iota.getEpochSummary.mockImplementation(async (id) => ({
        epoch: id,
        epochGasBurned: 1,
        epochTransactions: 10,
        epochStorageNetInflow: 0,
        epochStorageFeesIn: 0,
        epochStorageRebatesOut: 0,
        epochStakeRewards: 0,
        epochReferenceGasPrice: 0,
        epochNonRefundableBalance: 0,
        gasPerTransaction: 0.1,
        storageFundTotal: 0,
      }));

      await runBackfill();
      expect(iota.getEpochSummary).toHaveBeenCalledTimes(331);
      expect(model.updateOne).toHaveBeenCalledTimes(331);
      const firstCall = model.updateOne.mock.calls[0];
      expect(firstCall[0]).toEqual({ epoch: 1 });
      expect(firstCall[1].$set.epoch).toBe(1);
      expect(firstCall[2]).toEqual({ upsert: true });
    });

    it('skips epochs already present', async () => {
      model.findOne.mockReturnValue(chain({ epoch: 5 }));
      model.distinct.mockResolvedValue([1, 2, 3, 4]);
      await runBackfill();
      expect(iota.getEpochSummary).not.toHaveBeenCalled();
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('skips epochs when getEpochSummary returns null', async () => {
      model.findOne.mockReturnValue(chain({ epoch: 3 }));
      model.distinct.mockResolvedValue([]);
      iota.getEpochSummary.mockResolvedValue(null);
      await runBackfill();
      expect(iota.getEpochSummary).toHaveBeenCalledTimes(2); // epochs 1, 2
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it('keeps going when one epoch fetch throws', async () => {
      model.findOne.mockReturnValue(chain({ epoch: 4 }));
      model.distinct.mockResolvedValue([]);
      iota.getEpochSummary
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({
          epoch: 2, epochGasBurned: 1, epochTransactions: 10,
          epochStorageNetInflow: 0, epochStorageFeesIn: 0, epochStorageRebatesOut: 0,
          epochStakeRewards: 0, epochReferenceGasPrice: 0, epochNonRefundableBalance: 0,
          gasPerTransaction: 0.1, storageFundTotal: 0,
        })
        .mockResolvedValueOnce({
          epoch: 3, epochGasBurned: 1, epochTransactions: 10,
          epochStorageNetInflow: 0, epochStorageFeesIn: 0, epochStorageRebatesOut: 0,
          epochStakeRewards: 0, epochReferenceGasPrice: 0, epochNonRefundableBalance: 0,
          gasPerTransaction: 0.1, storageFundTotal: 0,
        });

      await runBackfill();
      expect(iota.getEpochSummary).toHaveBeenCalledTimes(3);
      expect(model.updateOne).toHaveBeenCalledTimes(2);
    });

    it('noops when a backfill is already in flight', async () => {
      (service as any).backfilling = true;
      await runBackfill();
      expect(model.findOne).not.toHaveBeenCalled();
      expect(iota.getEpochSummary).not.toHaveBeenCalled();
    });

    it('logs progress every 50 backfilled epochs', async () => {
      model.findOne.mockReturnValue(chain({ epoch: 60 }));
      model.distinct.mockResolvedValue([]);
      iota.getEpochSummary.mockResolvedValue({
        epoch: 1, epochGasBurned: 1, epochTransactions: 10,
        epochStorageNetInflow: 0, epochStorageFeesIn: 0, epochStorageRebatesOut: 0,
        epochStakeRewards: 0, epochReferenceGasPrice: 0, epochNonRefundableBalance: 0,
        gasPerTransaction: 0.1, storageFundTotal: 0,
      });
      await runBackfill();
      expect(iota.getEpochSummary).toHaveBeenCalledTimes(59); // 1..59
      expect(model.updateOne).toHaveBeenCalledTimes(59);
    });
  });

  describe('backfillEpochFees', () => {
    const richSummary = (epoch: number) => ({
      epoch,
      epochGasBurned: 16,
      epochTransactions: 1_700_000,
      epochStorageNetInflow: 6,
      epochStorageFeesIn: 224,
      epochStorageRebatesOut: 218,
      epochStakeRewards: 767000,
      epochReferenceGasPrice: 1000,
      epochNonRefundableBalance: 0,
      gasPerTransaction: 0.0001,
      storageFundTotal: 35000,
    });

    it('queries only stale snapshots (missing or zero epochStakeRewards) sorted by epoch', async () => {
      model.find.mockReturnValue(chain([{ epoch: 1 }, { epoch: 2 }]));
      iota.getEpochSummary.mockImplementation(async (id) => richSummary(id));

      const res = await service.backfillEpochFees();

      const filter = model.find.mock.calls[0][0];
      expect(filter).toEqual({
        $or: [
          { epochStakeRewards: { $exists: false } },
          { epochStakeRewards: 0 },
        ],
      });
      const c = model.find.mock.results[0].value;
      expect(c.sort).toHaveBeenCalledWith({ epoch: 1 });
      expect(c.select).toHaveBeenCalledWith('epoch');
      expect(res).toEqual({ updated: 2, skipped: 0, failed: 0 });
    });

    it('writes only the 5 new fields, never the existing fields', async () => {
      model.find.mockReturnValue(chain([{ epoch: 7 }]));
      iota.getEpochSummary.mockResolvedValue(richSummary(7));

      await service.backfillEpochFees();

      expect(model.updateOne).toHaveBeenCalledWith(
        { epoch: 7 },
        {
          $set: {
            epochStorageFeesIn: 224,
            epochStorageRebatesOut: 218,
            epochStakeRewards: 767000,
            epochReferenceGasPrice: 1000,
            epochNonRefundableBalance: 0,
          },
        },
      );
    });

    it('counts a null GraphQL response as skipped, not updated', async () => {
      model.find.mockReturnValue(chain([{ epoch: 1 }, { epoch: 2 }, { epoch: 3 }]));
      iota.getEpochSummary
        .mockResolvedValueOnce(richSummary(1))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(richSummary(3));

      const res = await service.backfillEpochFees();
      expect(res).toEqual({ updated: 2, skipped: 1, failed: 0 });
      expect(model.updateOne).toHaveBeenCalledTimes(2);
    });

    it('keeps going on individual epoch fetch errors and counts them as failed', async () => {
      model.find.mockReturnValue(chain([{ epoch: 1 }, { epoch: 2 }]));
      iota.getEpochSummary
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(richSummary(2));

      const res = await service.backfillEpochFees();
      expect(res).toEqual({ updated: 1, skipped: 0, failed: 1 });
      expect(model.updateOne).toHaveBeenCalledTimes(1);
    });

    it('invokes onProgress on each successful update with done/total counters', async () => {
      model.find.mockReturnValue(chain([{ epoch: 1 }, { epoch: 2 }]));
      iota.getEpochSummary.mockImplementation(async (id) => richSummary(id));
      const onProgress = jest.fn();

      await service.backfillEpochFees(onProgress);

      expect(onProgress).toHaveBeenNthCalledWith(1, { epoch: 1, done: 1, total: 2 });
      expect(onProgress).toHaveBeenNthCalledWith(2, { epoch: 2, done: 2, total: 2 });
    });
  });

  describe('getAggregates', () => {
    const baseSnap = (overrides: Partial<any>) => ({
      epoch: 1,
      timestamp: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01T00:30:00Z'),
      epochGasBurned: 10,
      epochTransactions: 1000,
      epochStorageNetInflow: 1,
      epochStorageFeesIn: 10,
      epochStorageRebatesOut: 9,
      epochStakeRewards: 767000,
      ...overrides,
    });

    const setupHead = (head: { epoch: number; updatedAt: Date } | null) => {
      // findOne().sort().select().lean()
      model.findOne.mockReturnValueOnce(chain(head));
    };
    const setupFull = (docs: any[]) => {
      // find().sort().lean()
      model.find.mockReturnValueOnce(chain(docs));
    };

    it('returns null when no snapshots exist', async () => {
      setupHead(null);
      const res = await service.getAggregates();
      expect(res).toBeNull();
    });

    it('builds cumulative + rolling on first call and caches the result', async () => {
      const docs = [
        baseSnap({ epoch: 1 }),
        baseSnap({ epoch: 2, epochGasBurned: 20, epochStorageFeesIn: 30, epochStorageRebatesOut: 10 }),
      ];
      const head = { epoch: 2, updatedAt: docs[1].updatedAt };
      setupHead(head);
      setupFull(docs);

      const agg = await service.getAggregates();
      expect(agg!.asOf).toEqual({ epoch: 2, capturedAt: docs[1].updatedAt });
      expect(agg!.cumulative).toEqual({
        gasBurned: 30,
        storageFeesIn: 40,
        storageRebatesOut: 19,
        storageNetLocked: 21,
        stakeRewards: 1_534_000,
        transactions: 2000,
      });
      expect(agg!.rolling.last7d.epochs).toBe(2);
      expect(agg!.rolling.last7d.avgGasBurned).toBe(15);
      expect(agg!.rolling.last30d.epochs).toBe(2);
    });

    it('reuses the cache when the head epoch and updatedAt are unchanged', async () => {
      const docs = [baseSnap({ epoch: 1 })];
      const head = { epoch: 1, updatedAt: docs[0].updatedAt };

      // First call: head + full rebuild
      setupHead(head);
      setupFull(docs);
      await service.getAggregates();

      // Second call: only head probe, no rebuild
      setupHead(head);
      const before = service['aggregates'];
      const res = await service.getAggregates();
      expect(res).toBe(before);
      expect(model.find).toHaveBeenCalledTimes(1);
    });

    it('rebuilds when the head epoch advances', async () => {
      const docs1 = [baseSnap({ epoch: 1 })];
      setupHead({ epoch: 1, updatedAt: docs1[0].updatedAt });
      setupFull(docs1);
      await service.getAggregates();

      const docs2 = [...docs1, baseSnap({ epoch: 2 })];
      setupHead({ epoch: 2, updatedAt: docs2[1].updatedAt });
      setupFull(docs2);
      const res = await service.getAggregates();

      expect(res!.asOf.epoch).toBe(2);
      expect(model.find).toHaveBeenCalledTimes(2);
    });

    it('rebuilds when the head epoch is the same but updatedAt has changed (re-write)', async () => {
      const epoch1V1 = baseSnap({ epoch: 1, epochGasBurned: 10, updatedAt: new Date('2026-01-01T00:00:00Z') });
      setupHead({ epoch: 1, updatedAt: epoch1V1.updatedAt });
      setupFull([epoch1V1]);
      const first = await service.getAggregates();
      expect(first!.cumulative.gasBurned).toBe(10);

      const epoch1V2 = baseSnap({ epoch: 1, epochGasBurned: 25, updatedAt: new Date('2026-01-01T00:30:00Z') });
      setupHead({ epoch: 1, updatedAt: epoch1V2.updatedAt });
      setupFull([epoch1V2]);
      const second = await service.getAggregates();
      expect(second!.cumulative.gasBurned).toBe(25);
      expect(model.find).toHaveBeenCalledTimes(2);
    });

    it('rolling windows clip to the available history when fewer than N epochs exist', async () => {
      const docs = [
        baseSnap({ epoch: 1, epochGasBurned: 10 }),
        baseSnap({ epoch: 2, epochGasBurned: 20 }),
        baseSnap({ epoch: 3, epochGasBurned: 30 }),
      ];
      setupHead({ epoch: 3, updatedAt: docs[2].updatedAt });
      setupFull(docs);

      const agg = await service.getAggregates();
      expect(agg!.rolling.last7d.epochs).toBe(3);
      expect(agg!.rolling.last7d.avgGasBurned).toBe(20);
      expect(agg!.rolling.last30d.epochs).toBe(3);
    });

    it('treats missing fee fields as zero (legacy snapshots)', async () => {
      const legacy = { epoch: 1, timestamp: new Date(), updatedAt: new Date('2026-01-01T00:00:00Z'), epochGasBurned: 5 };
      setupHead({ epoch: 1, updatedAt: legacy.updatedAt });
      setupFull([legacy]);

      const agg = await service.getAggregates();
      expect(agg!.cumulative.storageFeesIn).toBe(0);
      expect(agg!.cumulative.stakeRewards).toBe(0);
      expect(agg!.rolling.last7d.avgGasBurned).toBe(5);
    });
  });

  describe('capture refreshes aggregates', () => {
    it('rebuilds the aggregator after a successful create', async () => {
      iota.captureFullSnapshot.mockResolvedValue({ epoch: 5, totalSupply: 1 } as any);
      model.findOne.mockReturnValueOnce(chain(null));     // existing-check
      model.find.mockReturnValueOnce(chain([{ epoch: 5, updatedAt: new Date() }]));
      await service.capture();
      expect(model.create).toHaveBeenCalled();
      expect(model.find).toHaveBeenCalledTimes(1); // rebuildAggregates
    });

    it('rebuilds the aggregator after a successful update of an existing epoch', async () => {
      iota.captureFullSnapshot.mockResolvedValue({ epoch: 5, totalSupply: 1 } as any);
      model.findOne.mockReturnValueOnce(chain({ epoch: 5 })); // existing-check returns a doc
      model.find.mockReturnValueOnce(chain([{ epoch: 5, updatedAt: new Date() }]));
      await service.capture();
      expect(model.updateOne).toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
      expect(model.find).toHaveBeenCalledTimes(1);
    });

    it('does not rebuild when the capture itself throws', async () => {
      iota.captureFullSnapshot.mockRejectedValue(new Error('rpc down'));
      await service.capture();
      expect(model.find).not.toHaveBeenCalled();
    });
  });
});
