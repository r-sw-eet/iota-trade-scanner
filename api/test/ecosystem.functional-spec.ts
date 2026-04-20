import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Model } from 'mongoose';
import { bootApp, stopApp } from './boot-app';
import { OnchainSnapshot } from '../src/ecosystem/schemas/onchain-snapshot.schema';
import { EcosystemService } from '../src/ecosystem/ecosystem.service';

/**
 * Functional coverage for the `/ecosystem/*` HTTP surface against a real Nest
 * app + in-memory Mongo. Shape-level only — deep classification semantics
 * (matchProject / fingerprint / team routing / DefiLlama enrichment) are
 * covered exhaustively in `ecosystem.service.spec.ts`. Here we verify:
 *   - The HTTP contract (status codes, JSON envelope, 404s)
 *   - The capture-invariant that `GET /ecosystem` returns an empty structure
 *     when no snapshot has been written
 *   - That a raw `OnchainSnapshot` round-trips through `classifyFromRaw` and
 *     emerges as the frontend's expected `l1`/`l2`/`unattributed`/totals envelope
 */
describe('Ecosystem (functional)', () => {
  let app: INestApplication;
  let ecoModel: Model<OnchainSnapshot>;

  beforeAll(async () => {
    app = await bootApp();
    ecoModel = app.get(getModelToken(OnchainSnapshot.name));
  });

  afterAll(() => stopApp());

  afterEach(async () => {
    await ecoModel.deleteMany({});
    // Invalidate the in-process classify cache so cross-test seeds don't
    // serve a stale classified view from the prior test's DB contents.
    app.get(EcosystemService).invalidateClassifyCache();
  });

  /**
   * Seed a minimal raw snapshot. Uses a 0x-all-zero address + non-matching
   * module names so classification produces an empty `l1`/`l2` — the goal
   * is to exercise the `getLatest → classifyFromRaw` pipeline, not to
   * assert a specific project match (that's the unit spec's job).
   */
  const seedRaw = () =>
    ecoModel.create({
      packages: [
        {
          address: '0xabc',
          deployer: '0xdeployer',
          storageRebateNanos: 1_000_000_000,
          modules: ['functional_test_module_no_real_def'],
          moduleMetrics: [
            {
              module: 'functional_test_module_no_real_def',
              events: 5,
              eventsCapped: false,
              uniqueSenders: 2,
            },
          ],
          objectCount: 0,
          fingerprint: null,
        },
      ],
      totalStorageRebateNanos: 1_000_000_000,
      networkTxTotal: 1_234_567,
      txRates: { perDay: 500 },
    });

  describe('GET /ecosystem', () => {
    it('returns an empty structure when no snapshot exists', async () => {
      const res = await request(app.getHttpServer()).get('/ecosystem').expect(200);
      expect(res.body).toMatchObject({ l1: [], l2: [], totalProjects: 0, totalEvents: 0 });
    });

    it('returns a classified envelope with top-level counters when a raw snapshot exists', async () => {
      await seedRaw();
      const res = await request(app.getHttpServer()).get('/ecosystem').expect(200);
      // The raw package didn't match any real def → it becomes an
      // unattributed cluster; totals surface the raw counters.
      expect(res.body).toMatchObject({
        l1: [],
        l2: expect.any(Array),
        networkTxTotal: 1_234_567,
        txRates: { perDay: 500 },
      });
      expect(res.body.totalUnattributedPackages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /ecosystem/teams', () => {
    it('returns an array shape regardless of snapshot state', async () => {
      const res = await request(app.getHttpServer()).get('/ecosystem/teams').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /ecosystem/teams/:id', () => {
    it('404s on unknown team id', async () => {
      await request(app.getHttpServer()).get('/ecosystem/teams/does-not-exist').expect(404);
    });
  });

  describe('GET /ecosystem/project/:slug', () => {
    it('404s when the slug is unknown', async () => {
      await seedRaw();
      await request(app.getHttpServer()).get('/ecosystem/project/ghost').expect(404);
    });

    it('404s when no ecosystem data exists at all', async () => {
      await request(app.getHttpServer()).get('/ecosystem/project/anything').expect(404);
    });
  });

  describe('GET /ecosystem/project/:slug/events', () => {
    it('404s for unknown slugs', async () => {
      await seedRaw();
      await request(app.getHttpServer()).get('/ecosystem/project/ghost/events').expect(404);
    });
  });
});
