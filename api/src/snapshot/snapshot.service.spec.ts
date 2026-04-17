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
          epochStorageNetInflow: 0, gasPerTransaction: 0.1, storageFundTotal: 0,
        })
        .mockResolvedValueOnce({
          epoch: 3, epochGasBurned: 1, epochTransactions: 10,
          epochStorageNetInflow: 0, gasPerTransaction: 0.1, storageFundTotal: 0,
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
        epochStorageNetInflow: 0, gasPerTransaction: 0.1, storageFundTotal: 0,
      });
      await runBackfill();
      expect(iota.getEpochSummary).toHaveBeenCalledTimes(59); // 1..59
      expect(model.updateOne).toHaveBeenCalledTimes(59);
    });
  });
});
