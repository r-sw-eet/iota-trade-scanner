import { Test } from '@nestjs/testing';
import { SnapshotController } from './snapshot.controller';
import { SnapshotService } from './snapshot.service';

describe('SnapshotController', () => {
  let controller: SnapshotController;
  let service: jest.Mocked<Pick<SnapshotService, 'getLatest' | 'getHistory' | 'getEpochHistory'>>;

  beforeEach(async () => {
    service = {
      getLatest: jest.fn(),
      getHistory: jest.fn(),
      getEpochHistory: jest.fn(),
    } as any;
    const module = await Test.createTestingModule({
      controllers: [SnapshotController],
      providers: [{ provide: SnapshotService, useValue: service }],
    }).compile();
    controller = module.get(SnapshotController);
  });

  it('GET /snapshots/latest delegates to service.getLatest', () => {
    const doc = { epoch: 42 } as any;
    service.getLatest.mockResolvedValue(doc);
    return expect(controller.getLatest()).resolves.toBe(doc);
  });

  describe('GET /snapshots/history', () => {
    it('parses the days query param', async () => {
      service.getHistory.mockResolvedValue([] as any);
      await controller.getHistory('7');
      expect(service.getHistory).toHaveBeenCalledWith(7);
    });

    it('defaults to 30 days when the query param is missing', async () => {
      service.getHistory.mockResolvedValue([] as any);
      await controller.getHistory(undefined);
      expect(service.getHistory).toHaveBeenCalledWith(30);
    });

    it('defaults to 30 days when the query param is non-numeric', async () => {
      service.getHistory.mockResolvedValue([] as any);
      await controller.getHistory('garbage');
      expect(service.getHistory).toHaveBeenCalledWith(30);
    });

    it('defaults to 30 days when the query param is "0"', async () => {
      service.getHistory.mockResolvedValue([] as any);
      await controller.getHistory('0');
      expect(service.getHistory).toHaveBeenCalledWith(30);
    });
  });

  it('GET /snapshots/epochs delegates to service.getEpochHistory', () => {
    const rows = [{ epoch: 3 }] as any;
    service.getEpochHistory.mockResolvedValue(rows);
    return expect(controller.getEpochHistory()).resolves.toBe(rows);
  });
});
