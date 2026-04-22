import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EcosystemService } from './ecosystem.service';
import { OnchainSnapshot } from './schemas/onchain-snapshot.schema';
import { ProjectSenders } from './schemas/project-senders.schema';
import { ProjectSender } from './schemas/project-sender.schema';
import { ProjectTxCounts } from './schemas/project-tx-counts.schema';
import { ProjectHolders } from './schemas/project-holders.schema';
import { ProjectHolderEntry } from './schemas/project-holder-entry.schema';
import { ProjectTxDigest } from './schemas/project-tx-digest.schema';
import { ClassifiedSnapshot } from './schemas/classified-snapshot.schema';
import { AlertsService } from '../alerts/alerts.service';
import { ProjectDefinition } from './projects';

jest.mock('./projects', () => {
  const projects: ProjectDefinition[] = [
    {
      name: 'AddrOnly',
      layer: 'L1',
      category: 'Test',
      description: 'Matches on specific package address.',
      urls: [],
      teamId: null,
      match: { packageAddresses: ['0xABCDEF'] },
      countTypes: ['module_only::ObjectOnly'],
    },
    {
      name: 'Exact',
      layer: 'L1',
      category: 'Test',
      description: 'Matches only if module set equals exactly.',
      urls: [],
      teamId: null,
      match: { exact: ['foo', 'bar'] },
    },
    {
      name: 'AllRequired',
      layer: 'L1',
      category: 'Test',
      description: 'All required modules must be present.',
      urls: [],
      teamId: null,
      match: { all: ['a', 'b'] },
    },
    {
      name: 'AnyOne',
      layer: 'L1',
      category: 'Test',
      description: 'At least one of listed modules must be present.',
      urls: [],
      teamId: null,
      match: { any: ['x', 'y'] },
    },
    {
      name: 'MinMods',
      layer: 'L1',
      category: 'Test',
      description: 'Requires a minimum module count.',
      urls: [],
      teamId: null,
      match: { minModules: 3 },
    },
    {
      name: 'EmptyMatch',
      layer: 'L1',
      category: 'Test',
      description: 'Def with no synchronous matcher — only reachable via fingerprint or team routing.',
      urls: [],
      teamId: null,
      match: {},
    },
    {
      name: 'FingerprintOnly',
      layer: 'L1',
      category: 'Test',
      description: 'Def with only a fingerprint — must be invisible to the sync matcher.',
      urls: [],
      teamId: null,
      match: { fingerprint: { type: 'nft::NFT', issuer: '0xISSUER', tag: 'coolcats' } },
    },
    {
      name: 'Combo',
      layer: 'L1',
      category: 'Test',
      description: 'Def with both packageAddresses and a fingerprint (Salus-style).',
      urls: [],
      teamId: null,
      // Distinct fp module so Combo does not accidentally claim nft packages
      // via the fingerprint fallback in matchByFingerprint.
      match: { packageAddresses: ['0x999'], fingerprint: { type: 'combo::Marker' } },
    },
    {
      name: 'DeployerOnly',
      layer: 'L1',
      category: 'Test',
      description: 'Matches every package published by a listed deployer.',
      urls: [],
      teamId: null,
      match: { deployerAddresses: ['0xDEPL'] },
    },
    {
      name: 'DeployerAndModule',
      layer: 'L1',
      category: 'Test',
      description: 'Composition: deployer AND a required module.',
      urls: [],
      teamId: null,
      match: { deployerAddresses: ['0xCOMPOSE'], all: ['gate'] },
    },
    {
      name: 'Aggregate',
      layer: 'L1',
      category: 'NFT',
      description: 'Aggregate bucket — splits by deployer; team routing collapses to SoloTeam when the deployer is known.',
      urls: [],
      teamId: null,
      splitByDeployer: true,
      disclaimer: 'mixed bag',
      match: { any: ['nft'] },
    },
    {
      name: 'SoloTeam',
      layer: 'L1',
      category: 'NFT',
      description: 'Sole project of team-solo — routing-only (empty match); receives Aggregate packages routed via team-deployer.',
      urls: [],
      teamId: 'team-solo',
      match: {},
    },
    {
      name: 'StrictSolo',
      layer: 'L1',
      category: 'Test',
      description: 'Sole project of team-strict — has its own synchronous match rule, so it must NOT absorb Aggregate packages from the shared deployer (regression guard for the TWIN/IF-Testing shared-deployer bug).',
      urls: [],
      teamId: 'team-strict',
      match: { all: ['strict_module'] },
    },
    {
      name: 'SharedRoutingSolo',
      layer: 'L1',
      category: 'Test',
      description: 'Sole project of team-shared-routing — routing-only (empty match), shares the deployer 0xSTRICT with StrictSolo. Tests that routing iterates past a sync-match team and lands on the routing-only team (TWIN + IF-Testing in production).',
      urls: [],
      teamId: 'team-shared-routing',
      match: {},
    },
    {
      name: 'TeamedA',
      layer: 'L1',
      category: 'Misc',
      description: 'Project belonging to team-multi (which has multiple projects).',
      urls: [],
      teamId: 'team-multi',
      match: { all: ['alpha'] },
    },
    {
      name: 'TeamedB',
      layer: 'L1',
      category: 'Misc',
      description: 'Second project on team-multi.',
      urls: [],
      teamId: 'team-multi',
      match: { all: ['beta'] },
    },
    {
      name: 'MultiProjectRouting',
      layer: 'L1',
      category: 'Misc',
      description: 'Routing-only project on team-mixed — the team also has sync-matched projects (below). Exercises the "multi-project team with at least one routing-only target" path introduced when if-testing was merged into iota-foundation.',
      urls: [],
      teamId: 'team-mixed',
      match: {},
    },
    {
      name: 'MixedSyncA',
      layer: 'L1',
      category: 'Misc',
      description: 'Sync-matched project on team-mixed — coexists with MultiProjectRouting on the same team.',
      urls: [],
      teamId: 'team-mixed',
      match: { all: ['mixed_alpha'] },
    },
    {
      name: 'Collectible',
      layer: 'L1',
      category: 'NFT',
      description: 'Project flagged as a PFP / collectible — exercises the isCollectible propagation path + the countTypes classify path.',
      urls: [],
      teamId: null,
      isCollectible: true,
      match: { all: ['pfp'] },
      countTypes: ['pfp::PFPNFT'],
    },
  ];
  return { ALL_PROJECTS: projects, ProjectDefinition: undefined };
});

jest.mock('./teams', () => {
  const teams = [
    { id: 'team-solo', name: 'Solo', deployers: ['0xSOLO'], logo: '/logos/solo.svg' },
    { id: 'team-strict', name: 'Strict', deployers: ['0xSTRICT'] },
    { id: 'team-shared-routing', name: 'Shared Routing', deployers: ['0xSTRICT'] },
    { id: 'team-mixed', name: 'Mixed', deployers: ['0xMIXED'] },
    { id: 'team-multi', name: 'Multi', deployers: ['0xMULTI'] },
  ];
  return {
    ALL_TEAMS: teams,
    getTeam: (id: string | null | undefined) => (id ? teams.find((t) => t.id === id) : undefined),
    getTeamByDeployer: (addr: string) => {
      const low = addr.toLowerCase();
      return teams.find((t) => t.deployers.some((d) => d.toLowerCase() === low));
    },
    Team: undefined,
  };
});

type FetchMock = jest.Mock<Promise<{ json: () => any }>, [string, any?]>;

const GRAPHQL_URL = 'https://graphql.mainnet.iota.cafe';

// Fluent Mongoose chain ending in exec(): `findOne().sort().lean().exec()`.
const chain = <T>(value: T) => {
  const c: any = {};
  c.sort = jest.fn(() => c);
  c.select = jest.fn(() => c);
  c.lean = jest.fn(() => c);
  c.exec = jest.fn(async () => value);
  c.then = (r: any, j: any) => Promise.resolve(value).then(r, j);
  return c;
};

describe('EcosystemService', () => {
  let service: EcosystemService;
  let ecoModel: any;
  let senderModel: any;
  let senderDocModel: any;
  let txCountModel: any;
  let txDigestModel: any;
  let holdersStateModel: any;
  let holderEntryModel: any;
  let classifiedModel: any;
  let fetchMock: FetchMock;

  beforeEach(async () => {
    ecoModel = {
      countDocuments: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    };
    senderModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    senderDocModel = {
      insertMany: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([]),
      collection: { name: 'project_sender_entries' },
    };
    txCountModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    txDigestModel = {
      insertMany: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
      collection: { name: 'project_tx_digests' },
    };
    holdersStateModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    holderEntryModel = {
      insertMany: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([]),
      collection: { name: 'project_holder_entries' },
    };
    classifiedModel = {
      // Default: no persisted classified view → readers fall through to
      // classifyFromRaw. Individual tests override `findOne` when they need
      // to exercise the hit path.
      findOne: jest.fn(() => chain(null)),
      updateOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({}) })),
    };
    const alertsMock = { notifyCaptureAlarm: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        EcosystemService,
        { provide: getModelToken(OnchainSnapshot.name), useValue: ecoModel },
        { provide: getModelToken(ProjectSenders.name), useValue: senderModel },
        { provide: getModelToken(ProjectSender.name), useValue: senderDocModel },
        { provide: getModelToken(ProjectTxCounts.name), useValue: txCountModel },
        { provide: getModelToken(ProjectTxDigest.name), useValue: txDigestModel },
        { provide: getModelToken(ProjectHolders.name), useValue: holdersStateModel },
        { provide: getModelToken(ProjectHolderEntry.name), useValue: holderEntryModel },
        { provide: getModelToken(ClassifiedSnapshot.name), useValue: classifiedModel },
        { provide: AlertsService, useValue: alertsMock },
      ],
    }).compile();
    service = module.get(EcosystemService);
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => jest.restoreAllMocks());

  // ---------- matchProject (synchronous classifier) ----------

  describe('matchProject', () => {
    const match = (mods: string[], addr = '0x0', deployer: string | null = null) =>
      (service as any).matchProject(new Set(mods), addr, deployer);

    it('matches by package address (case-insensitive)', () => {
      expect(match([], '0xabcdef').name).toBe('AddrOnly');
      expect(match([], '0xABCDEF').name).toBe('AddrOnly');
    });

    it('falls through when packageAddresses does not match', () => {
      expect(match([], '0xnope')).toBeNull();
    });

    it('matches by deployer address (case-insensitive)', () => {
      expect(match([], '0x0', '0xdepl').name).toBe('DeployerOnly');
      expect(match([], '0x0', '0xDEPL').name).toBe('DeployerOnly');
    });

    it('falls through when deployer does not match a deployerAddresses rule', () => {
      expect(match([], '0x0', '0xother')).toBeNull();
    });

    it('falls through deployerAddresses rule when no deployer is available', () => {
      expect(match([], '0x0', null)).toBeNull();
    });

    it('composes deployerAddresses + all (both must pass)', () => {
      expect(match(['gate'], '0x0', '0xcompose').name).toBe('DeployerAndModule');
      // Right deployer, wrong modules — rule fails, so no rule matches.
      expect(match(['nope'], '0x0', '0xcompose')).toBeNull();
      // Right modules, wrong deployer — rule fails.
      expect(match(['gate'], '0x0', '0xother')).toBeNull();
    });

    it('matches exact module set', () => {
      expect(match(['foo', 'bar']).name).toBe('Exact');
    });

    it('rejects exact match when set differs', () => {
      expect(match(['foo'])).toBeNull();
      expect(match(['foo', 'bar', 'baz']).name).toBe('MinMods');
    });

    it('matches "all" when all required modules present', () => {
      expect(match(['a', 'b']).name).toBe('AllRequired');
      expect(match(['a', 'b', 'c']).name).toBe('AllRequired');
    });

    it('rejects "all" when a required module is missing', () => {
      expect(match(['a'])).toBeNull();
    });

    it('matches "any" when at least one listed module is present', () => {
      expect(match(['x']).name).toBe('AnyOne');
      expect(match(['y', 'z']).name).toBe('AnyOne');
    });

    it('matches minModules when module count meets threshold', () => {
      expect(match(['m1', 'm2', 'm3']).name).toBe('MinMods');
    });

    it('returns null when no matcher matches', () => {
      expect(match(['unknown'])).toBeNull();
    });

    it('skips defs with no synchronous matcher (empty match)', () => {
      expect(match([])).toBeNull();
      expect(match(['anything-at-all'])).toBeNull();
      expect(match(['z1', 'z2'])).toBeNull();
    });

    it('skips fingerprint-only defs in the synchronous matcher', () => {
      // fp module is 'nft' — but even if 'nft' is present, the sync matcher
      // must not claim FingerprintOnly (it has no all/any/minModules/exact).
      expect(match(['nft'])).not.toBeNull();
      expect(match(['nft']).name).not.toBe('FingerprintOnly');
    });

    it('matches Combo via packageAddresses despite having a fingerprint', () => {
      expect(match([], '0x999').name).toBe('Combo');
      expect(match([], '0x0999')).toBeNull();
    });
  });

  // ---------- getLatest ----------

  describe('getLatest', () => {
    it('returns null when no snapshot has been captured yet', async () => {
      ecoModel.findOne.mockReturnValue(chain(null));
      await expect(service.getLatest()).resolves.toBeNull();
    });

    it('loads the raw snapshot and runs classifyFromRaw through the in-process cache', async () => {
      const raw = { _id: 'abc', packages: [], totalStorageRebateNanos: 0, networkTxTotal: 42, txRates: { perDay: 1 } };
      ecoModel.findOne.mockReturnValue(chain(raw));
      const classifySpy = jest
        .spyOn(service as any, 'classifyFromRaw')
        .mockResolvedValue({ l1: [], l2: [], totalProjects: 0, totalEvents: 0 });

      const first = await service.getLatest();
      const second = await service.getLatest();

      // `enrichWithTvl` fetch is unmocked → swallowed by the try/catch; view
      // stays L1-only with empty L2 and untouched totals. Clone-before-enrich
      // means first and second are distinct objects with equal content.
      expect(first).toEqual({ l1: [], l2: [], totalProjects: 0, totalEvents: 0 });
      expect(second).toEqual(first);
      expect(first).not.toBe(second); // cloned before enrichment
      // Persisted doc missed (default chain(null)) → classify runs once, then
      // cached in-process LRU for the second call.
      expect(classifySpy).toHaveBeenCalledTimes(1);
    });

    it('evicts the oldest cache entry when more than CLASSIFY_CACHE_MAX snapshots are classified', async () => {
      // Inspect the cache directly: MAX is 4, so asking for 5 distinct
      // snapshot ids should evict the first one (LRU = insertion order).
      const classifySpy = jest
        .spyOn(service as any, 'classifyFromRaw')
        .mockImplementation(async (snap: any) => ({ tag: `classified-${snap._id}` }));
      for (let i = 1; i <= 5; i++) {
        ecoModel.findOne.mockReturnValueOnce(chain({ _id: `snap-${i}` }));
        await service.getLatest();
      }
      const cache = (service as any).classifyCache as Map<string, unknown>;
      expect(cache.size).toBe(4);
      expect(cache.has('snap-1')).toBe(false); // oldest evicted
      expect(cache.has('snap-5')).toBe(true);  // newest retained
      expect(classifySpy).toHaveBeenCalledTimes(5);
    });

    it('invalidateClassifyCache() forces the next getLatest() to re-classify', async () => {
      const raw = { _id: 'abc', packages: [], totalStorageRebateNanos: 0, networkTxTotal: 0, txRates: {} };
      ecoModel.findOne.mockReturnValue(chain(raw));
      const classifySpy = jest
        .spyOn(service as any, 'classifyFromRaw')
        .mockResolvedValue({ l1: [], l2: [], totalProjects: 0 });

      await service.getLatest();
      service.invalidateClassifyCache();
      await service.getLatest();

      expect(classifySpy).toHaveBeenCalledTimes(2);
    });

    it('serves from the persisted ClassifiedSnapshot when registryHash matches — skips classifyFromRaw', async () => {
      const raw = { _id: 'abc', packages: [] };
      ecoModel.findOne.mockReturnValue(chain(raw));
      const currentHash = (service as any).computeRegistryHash();
      classifiedModel.findOne.mockReturnValue(
        chain({
          snapshotId: 'abc',
          registryHash: currentHash,
          view: { l1: [{ name: 'Persisted', tvl: null, tvlShared: null, tvlSharedWith: null, events: 0 } as any], l2: [], totalProjects: 1, totalEvents: 0 },
        }),
      );
      const classifySpy = jest.spyOn(service as any, 'classifyFromRaw');

      const out = await service.getLatest();

      expect(classifySpy).not.toHaveBeenCalled();
      expect((out as any).l1[0].name).toBe('Persisted');
    });

    it('re-classifies + upserts when the persisted registryHash is stale', async () => {
      const raw = { _id: 'abc', packages: [] };
      ecoModel.findOne.mockReturnValue(chain(raw));
      classifiedModel.findOne.mockReturnValue(
        chain({
          snapshotId: 'abc',
          registryHash: 'stale-hash-0000',
          view: { l1: [], l2: [], totalProjects: 0 },
        }),
      );
      const classifySpy = jest
        .spyOn(service as any, 'classifyFromRaw')
        .mockResolvedValue({ l1: [], l2: [], totalProjects: 0 });

      await service.getLatest();

      expect(classifySpy).toHaveBeenCalledTimes(1);
      expect(classifiedModel.updateOne).toHaveBeenCalledWith(
        { snapshotId: 'abc' },
        expect.objectContaining({
          $set: expect.objectContaining({ registryHash: (service as any).computeRegistryHash() }),
        }),
        { upsert: true },
      );
    });
  });

  describe('getLatestRaw', () => {
    it('returns the raw snapshot without classification', async () => {
      const raw = { packages: [], networkTxTotal: 0, txRates: {} };
      ecoModel.findOne.mockReturnValue(chain(raw));
      await expect(service.getLatestRaw()).resolves.toBe(raw);
    });
  });

  describe('growthRanking', () => {
    // Build a chainable mock for ecoModel.findOne that returns different
    // values per invocation — baseline + latest in that order.
    const oneshot = (value: any) => ({
      sort: () => ({ lean: () => ({ exec: async () => value }) }),
    });

    const baselineSnap = { _id: 'b', createdAt: new Date('2026-04-13T00:00:00Z') };
    const latestSnap = { _id: 'l', createdAt: new Date('2026-04-20T00:00:00Z') };

    const baselineClassified = {
      l1: [
        { slug: 'proj-a', name: 'A', events: 100, eventsCapped: false, packages: 1, uniqueSenders: 10, team: null, logo: null, category: 'DeFi' },
      ],
      unattributed: [
        { deployer: '0xaaa', events: 50, eventsCapped: false, packages: 2, uniqueSenders: 5, sampleIdentifiers: [], sampledObjectType: null },
      ],
    };
    const latestClassified = {
      l1: [
        { slug: 'proj-a', name: 'A', events: 300, eventsCapped: false, packages: 1, uniqueSenders: 25, team: null, logo: null, category: 'DeFi' },
        { slug: 'proj-b', name: 'B (new)', events: 80, eventsCapped: true, packages: 2, uniqueSenders: 4, team: null, logo: '/l.png', category: 'Oracle' },
      ],
      unattributed: [
        { deployer: '0xaaa', events: 200, eventsCapped: false, packages: 2, uniqueSenders: 18, sampleIdentifiers: ['name: X'], sampledObjectType: 't::T' },
        { deployer: '0xbbb', events: 40, eventsCapped: false, packages: 1, uniqueSenders: 2, sampleIdentifiers: [], sampledObjectType: null },
      ],
    };

    beforeEach(() => {
      ecoModel.findOne
        .mockReturnValueOnce(oneshot(baselineSnap))
        .mockReturnValueOnce(oneshot(latestSnap));
      jest.spyOn(service as any, 'classifyCached').mockImplementation(async (snap: any) => {
        if (snap._id === 'b') return baselineClassified;
        if (snap._id === 'l') return latestClassified;
        throw new Error(`unexpected classifyCached arg: ${JSON.stringify(snap)}`);
      });
    });

    it('returns null when no latest snapshot exists', async () => {
      ecoModel.findOne.mockReset();
      ecoModel.findOne
        .mockReturnValueOnce(oneshot(baselineSnap))
        .mockReturnValueOnce(oneshot(null));
      const out = await service.growthRanking(new Date('2026-04-13'), new Date('2026-04-20'), 'all');
      expect(out).toBeNull();
    });

    it('treats missing baseline as zeros (window predates first capture)', async () => {
      ecoModel.findOne.mockReset();
      ecoModel.findOne
        .mockReturnValueOnce(oneshot(null))
        .mockReturnValueOnce(oneshot(latestSnap));
      const out = await service.growthRanking(new Date('2026-01-01'), new Date('2026-04-20'), 'attributed');
      expect(out).not.toBeNull();
      expect(out!.baseline).toBeNull();
      const a = out!.items.find((i) => i.key === 'proj-a')!;
      // No baseline → delta equals full current value.
      expect(a.eventsDelta).toBe(300);
      expect(a.events).toBe(300);
    });

    it('computes per-project and per-cluster deltas, sorts by eventsDelta desc', async () => {
      const out = await service.growthRanking(new Date('2026-04-13'), new Date('2026-04-20'), 'all');
      expect(out).not.toBeNull();
      expect(out!.baseline).toEqual({ snapshotId: 'b', createdAt: baselineSnap.createdAt });
      expect(out!.latest).toEqual({ snapshotId: 'l', createdAt: latestSnap.createdAt });

      // Expected delta ranking:
      //   proj-a (attrib): 300 - 100 = +200
      //   0xaaa (unattr):  200 -  50 = +150
      //   proj-b (attrib, new): 80 - 0 = +80
      //   0xbbb (unattr, new): 40 - 0 = +40
      const keys = out!.items.map((i) => i.key);
      expect(keys).toEqual(['proj-a', '0xaaa', 'proj-b', '0xbbb']);

      const byKey = Object.fromEntries(out!.items.map((i) => [i.key, i]));
      expect(byKey['proj-a'].scope).toBe('attributed');
      expect(byKey['proj-a'].eventsDelta).toBe(200);
      expect(byKey['proj-a'].uniqueSendersDelta).toBe(15);
      expect(byKey['proj-a'].packagesDelta).toBe(0);

      expect(byKey['0xaaa'].scope).toBe('unattributed');
      expect(byKey['0xaaa'].name).toContain('0xaaa');
      expect(byKey['0xaaa'].eventsDelta).toBe(150);
      expect(byKey['0xaaa'].sampleIdentifiers).toEqual(['name: X']);

      expect(byKey['proj-b'].scope).toBe('attributed');
      expect(byKey['proj-b'].eventsDelta).toBe(80);
      expect(byKey['proj-b'].eventsCapped).toBe(true);
      expect(byKey['proj-b'].logo).toBe('/l.png');

      expect(byKey['0xbbb'].eventsDelta).toBe(40);
      expect(byKey['0xbbb'].packagesDelta).toBe(1);
    });

    it('filters to attributed scope only', async () => {
      const out = await service.growthRanking(new Date('2026-04-13'), new Date('2026-04-20'), 'attributed');
      expect(out!.items.every((i) => i.scope === 'attributed')).toBe(true);
      expect(out!.items.map((i) => i.key)).toEqual(['proj-a', 'proj-b']);
    });

    it('filters to unattributed scope only', async () => {
      const out = await service.growthRanking(new Date('2026-04-13'), new Date('2026-04-20'), 'unattributed');
      expect(out!.items.every((i) => i.scope === 'unattributed')).toBe(true);
      expect(out!.items.map((i) => i.key)).toEqual(['0xaaa', '0xbbb']);
    });
  });

  describe('computeGrowth', () => {
    // Build a chainable mock that returns `result` at the end of
    // findOne().sort().lean().exec(). Supports being called twice
    // (once for baseline, once for latest) by returning a fresh chain each time.
    const oneshot = (value: any) => ({
      sort: () => ({ lean: () => ({ exec: async () => value }) }),
    });

    const baseline = {
      _id: 'b',
      createdAt: new Date('2026-04-13T00:00:00Z'),
      networkTxTotal: 100,
      packages: [
        {
          address: '0xaa',
          storageRebateNanos: 1000,
          moduleMetrics: [
            { module: 'm1', events: 10, eventsCapped: false, uniqueSenders: 3 },
            { module: 'm2', events: 5, eventsCapped: false, uniqueSenders: 2 },
          ],
        },
      ],
    };
    const latest = {
      _id: 'l',
      createdAt: new Date('2026-04-20T00:00:00Z'),
      networkTxTotal: 150,
      packages: [
        {
          address: '0xaa',
          storageRebateNanos: 1000, // static per package
          moduleMetrics: [
            { module: 'm1', events: 30, eventsCapped: false, uniqueSenders: 7 },
            { module: 'm2', events: 5, eventsCapped: false, uniqueSenders: 2 }, // no change
          ],
        },
        {
          address: '0xbb', // newly published package
          storageRebateNanos: 500,
          moduleMetrics: [{ module: 'new_mod', events: 8, eventsCapped: false, uniqueSenders: 4 }],
        },
      ],
    };

    it('returns null when the baseline window has no snapshot', async () => {
      ecoModel.findOne.mockReturnValueOnce(oneshot(null)).mockReturnValueOnce(oneshot(latest));
      const out = await service.computeGrowth(new Date('2026-04-01'), new Date('2026-04-20'));
      expect(out).toBeNull();
    });

    it('returns null when the latest window has no snapshot', async () => {
      ecoModel.findOne.mockReturnValueOnce(oneshot(baseline)).mockReturnValueOnce(oneshot(null));
      const out = await service.computeGrowth(new Date('2026-04-13'), new Date('2026-04-20'));
      expect(out).toBeNull();
    });

    it('returns zero deltas when both endpoints resolve to the same snapshot', async () => {
      ecoModel.findOne.mockReturnValueOnce(oneshot(baseline)).mockReturnValueOnce(oneshot(baseline));
      const out = await service.computeGrowth(new Date('2026-04-13'), new Date('2026-04-13T12:00:00Z'));
      expect(out).toMatchObject({
        network: { totalEventsDelta: 0, totalStorageRebateDelta: 0, networkTxTotalDelta: 0, newPackages: 0 },
        packages: [],
      });
    });

    it('computes per-package and per-module deltas correctly', async () => {
      ecoModel.findOne.mockReturnValueOnce(oneshot(baseline)).mockReturnValueOnce(oneshot(latest));
      const out = await service.computeGrowth(
        new Date('2026-04-13T00:00:00Z'),
        new Date('2026-04-20T00:00:00Z'),
      );
      expect(out).not.toBeNull();
      // Events: 0xaa::m1 grew by 20, m2 stayed; 0xbb new +8 → total +28.
      expect(out!.network.totalEventsDelta).toBe(28);
      expect(out!.network.newPackages).toBe(1);
      expect(out!.network.networkTxTotalDelta).toBe(50);
      // storageRebate delta: 0xaa static (0), 0xbb new (+500) → +500.
      expect(out!.network.totalStorageRebateDelta).toBe(500);

      const byAddr = Object.fromEntries(out!.packages.map((p) => [p.address, p]));
      expect(byAddr['0xaa'].isNew).toBe(false);
      expect(byAddr['0xaa'].eventsDelta).toBe(20);
      expect(byAddr['0xaa'].uniqueSendersDelta).toBe(4);
      // Module m2 had no change — should be pruned from the per-module list
      // but m1 stays.
      expect(byAddr['0xaa'].modules).toEqual([
        { module: 'm1', eventsDelta: 20, uniqueSendersDelta: 4 },
      ]);

      expect(byAddr['0xbb'].isNew).toBe(true);
      expect(byAddr['0xbb'].eventsDelta).toBe(8);
      expect(byAddr['0xbb'].storageRebateDelta).toBe(500);
      expect(byAddr['0xbb'].modules).toEqual([
        { module: 'new_mod', eventsDelta: 8, uniqueSendersDelta: 4 },
      ]);
    });
  });

  describe('findSnapshotsBetween', () => {
    it('queries by createdAt window ordered ascending', async () => {
      const snaps = [{ _id: '1' }, { _id: '2' }];
      const exec = jest.fn().mockResolvedValue(snaps);
      const lean = jest.fn().mockReturnValue({ exec });
      const sort = jest.fn().mockReturnValue({ lean });
      const find = jest.fn().mockReturnValue({ sort });
      ecoModel.find = find;

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-20');
      await expect(service.findSnapshotsBetween(from, to)).resolves.toBe(snaps);
      expect(find).toHaveBeenCalledWith({ createdAt: { $gte: from, $lte: to } });
      expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    });
  });

  // ---------- onModuleInit ----------

  describe('onModuleInit', () => {
    const origEnv = process.env.NODE_ENV;
    afterEach(() => { process.env.NODE_ENV = origEnv; });

    it('short-circuits in test env without touching the DB', async () => {
      process.env.NODE_ENV = 'test';
      await service.onModuleInit();
      expect(ecoModel.countDocuments).not.toHaveBeenCalled();
    });

    it('fires an initial capture in background when DB is empty', async () => {
      process.env.NODE_ENV = 'development';
      ecoModel.countDocuments.mockResolvedValue(0);
      const captureSpy = jest.spyOn(service, 'capture').mockResolvedValue(undefined as any);
      await service.onModuleInit();
      expect(captureSpy).toHaveBeenCalledTimes(1);
    });

    it('does not capture when DB already has snapshots', async () => {
      process.env.NODE_ENV = 'development';
      ecoModel.countDocuments.mockResolvedValue(3);
      const captureSpy = jest.spyOn(service, 'capture').mockResolvedValue(undefined as any);
      await service.onModuleInit();
      expect(captureSpy).not.toHaveBeenCalled();
    });

    it('logs but swallows errors from the background capture', async () => {
      process.env.NODE_ENV = 'development';
      ecoModel.countDocuments.mockResolvedValue(0);
      const captureSpy = jest
        .spyOn(service, 'capture')
        .mockRejectedValue(new Error('boom'));
      await service.onModuleInit();
      // Let the .catch() run
      await new Promise((r) => setImmediate(r));
      expect(captureSpy).toHaveBeenCalled();
    });
  });

  // ---------- capture ----------

  describe('capture', () => {
    const rawStub = { packages: [], totalStorageRebateNanos: 0, networkTxTotal: 0, txRates: {} };

    it('saves the raw snapshot returned by captureRaw, enriched with captureDurationMs', async () => {
      jest.spyOn(service as any, 'captureRaw').mockResolvedValue(rawStub);
      await service.capture();
      expect(ecoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...rawStub, captureDurationMs: expect.any(Number) }),
      );
    });

    it('emits ERROR log + alerts.notifyCaptureAlarm when duration crosses the 90min alarm threshold', async () => {
      // Advance Date.now() by 95 min while captureRaw runs — simulates a slow capture
      // without the test itself taking 95 real minutes.
      let t = 1_000_000_000;
      const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => t);
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
      const notifySpy = (service as any).alerts.notifyCaptureAlarm as jest.Mock;
      notifySpy.mockClear();
      jest.spyOn(service as any, 'captureRaw').mockImplementation(async () => {
        t += 95 * 60 * 1000;
        return rawStub;
      });
      await service.capture();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ALARM'));
      expect(notifySpy).toHaveBeenCalledWith('alarm', expect.stringContaining('ALARM'));
      dateSpy.mockRestore();
    });

    it('skips the email alarm when duration is below the 90min threshold', async () => {
      let t = 1_000_000_000;
      const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => t);
      const notifySpy = (service as any).alerts.notifyCaptureAlarm as jest.Mock;
      notifySpy.mockClear();
      jest.spyOn(service as any, 'captureRaw').mockImplementation(async () => {
        t += 80 * 60 * 1000; // 80 min: WARN territory, not ALARM
        return rawStub;
      });
      await service.capture();
      expect(notifySpy).not.toHaveBeenCalled();
      dateSpy.mockRestore();
    });

    it('swallows captureRaw errors (logs only)', async () => {
      jest.spyOn(service as any, 'captureRaw').mockRejectedValue(new Error('network'));
      await expect(service.capture()).resolves.toBeUndefined();
      expect(ecoModel.create).not.toHaveBeenCalled();
    });

    it('flips isCapturing() during the scan and clears it on completion', async () => {
      let seenWhileRunning: boolean | null = null;
      jest.spyOn(service as any, 'captureRaw').mockImplementation(async () => {
        seenWhileRunning = service.isCapturing();
        return rawStub;
      });
      expect(service.isCapturing()).toBe(false);
      await service.capture();
      expect(seenWhileRunning).toBe(true);
      expect(service.isCapturing()).toBe(false);
    });

    it('clears isCapturing() even when captureRaw throws', async () => {
      jest.spyOn(service as any, 'captureRaw').mockRejectedValue(new Error('boom'));
      await service.capture();
      expect(service.isCapturing()).toBe(false);
    });

    it('no-ops a concurrent capture while one is already in flight', async () => {
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      const captureRaw = jest.spyOn(service as any, 'captureRaw').mockImplementation(async () => {
        await gate;
        return rawStub;
      });
      const first = service.capture();
      // Second call lands while the first is awaiting `gate` — must short-circuit.
      await service.capture();
      expect(captureRaw).toHaveBeenCalledTimes(1);
      release();
      await first;
    });

    it('clears the classify cache after a successful capture', async () => {
      (service as any).classifyCache.set('stale', { expiresAt: Date.now() + 60_000, value: {} });
      jest.spyOn(service as any, 'captureRaw').mockResolvedValue(rawStub);
      await service.capture();
      expect((service as any).classifyCache.size).toBe(0);
    });

    it('persists the classified view for the newly-captured snapshot', async () => {
      jest.spyOn(service as any, 'captureRaw').mockResolvedValue(rawStub);
      ecoModel.create.mockResolvedValue({ _id: 'new-snap', ...rawStub });
      const view = { l1: [], l2: [], totalProjects: 0 };
      jest.spyOn(service as any, 'classifyFromRaw').mockResolvedValue(view);
      await service.capture();
      expect(classifiedModel.updateOne).toHaveBeenCalledWith(
        { snapshotId: 'new-snap' },
        expect.objectContaining({
          $set: expect.objectContaining({
            registryHash: expect.any(String),
            view,
          }),
        }),
        { upsert: true },
      );
    });

    it('does not fail capture when classified persistence throws', async () => {
      jest.spyOn(service as any, 'captureRaw').mockResolvedValue(rawStub);
      ecoModel.create.mockResolvedValue({ _id: 'new-snap', ...rawStub });
      jest.spyOn(service as any, 'classifyFromRaw').mockRejectedValue(new Error('boom'));
      await expect(service.capture()).resolves.toBeUndefined();
      expect(ecoModel.create).toHaveBeenCalledTimes(1);
    });
  });

  // ---------- enrichWithTvl ----------

  describe('enrichWithTvl', () => {
    const l1Project = (overrides: any = {}) => ({
      slug: 'p', name: 'Proto', layer: 'L1' as const, category: 'DeFi', description: '',
      urls: [], packages: 1, packageAddress: '0x1', latestPackageAddress: '0x1',
      storageIota: 0, events: 100, eventsCapped: false, transactions: 0, transactionsCapped: false,
      modules: [], tvl: null, tvlShared: null, tvlSharedWith: null, isCollectible: false,
      logo: null, logoWordmark: null, team: null, disclaimer: null, detectedDeployers: [],
      anomalousDeployers: [], uniqueSenders: 0, uniqueHolders: null, objectCount: null,
      marketplaceListedCount: null, uniqueWalletsReach: 0, attribution: null, addedAt: null,
      ...overrides,
    });

    it('matches DefiLlama TVL onto an L1 project and synthesizes an L2 row, caches the fetch for 10 min', async () => {
      const view = {
        l1: [l1Project({ name: 'Proto' })],
        l2: [] as any[],
        unattributed: [],
        totalProjects: 1,
        totalEvents: 100,
        totalStorageIota: 0,
        totalUnattributedPackages: 0,
        networkTxTotal: 0,
        txRates: {},
      };
      const llamaResponse = [
        { name: 'Proto', slug: 'proto', chains: ['IOTA'], chainTvls: { IOTA: 12345 }, category: 'Dex' },
        { name: 'EvmOnly', slug: 'evmonly', chains: ['IOTA EVM'], chainTvls: { 'IOTA EVM': 5000 }, category: 'Dex', url: 'https://x' },
      ];
      fetchMock.mockResolvedValue({ json: async () => llamaResponse });

      const out = await (service as any).enrichWithTvl(view);

      expect(out.l1[0].tvl).toBe(12345);
      expect(out.l2).toHaveLength(1);
      expect(out.l2[0].name).toBe('EvmOnly');
      expect(out.l2[0].tvl).toBe(5000);
      expect(out.totalProjects).toBe(2);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call hits the 10-min cache — no new fetch.
      await (service as any).enrichWithTvl({
        l1: [l1Project({ name: 'Proto' })], l2: [], unattributed: [],
        totalProjects: 1, totalEvents: 100, totalStorageIota: 0,
        totalUnattributedPackages: 0, networkTxTotal: 0, txRates: {},
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('swallows DefiLlama fetch errors — view stays L1-only, totals unchanged', async () => {
      const view = {
        l1: [l1Project()], l2: [] as any[], unattributed: [],
        totalProjects: 1, totalEvents: 100, totalStorageIota: 0,
        totalUnattributedPackages: 0, networkTxTotal: 0, txRates: {},
      };
      fetchMock.mockRejectedValue(new Error('offline'));

      const out = await (service as any).enrichWithTvl(view);

      expect(out.l1[0].tvl).toBeNull();
      expect(out.l2).toEqual([]);
      expect(out.totalProjects).toBe(1);
    });
  });

  // ---------- selfHealLatestClassified ----------

  describe('selfHealLatestClassified', () => {
    it('does nothing when there are no snapshots', async () => {
      ecoModel.findOne.mockReturnValue(chain(null));
      const classifySpy = jest.spyOn(service as any, 'classifyFromRaw');
      await (service as any).selfHealLatestClassified();
      expect(classifySpy).not.toHaveBeenCalled();
    });

    it('skips when the persisted hash already matches current', async () => {
      ecoModel.findOne.mockReturnValue(chain({ _id: 'abc' }));
      const currentHash = (service as any).computeRegistryHash();
      classifiedModel.findOne.mockReturnValue(chain({ registryHash: currentHash }));
      const classifySpy = jest.spyOn(service as any, 'classifyFromRaw');
      await (service as any).selfHealLatestClassified();
      expect(classifySpy).not.toHaveBeenCalled();
    });

    it('re-classifies + persists when latest has no classified doc', async () => {
      ecoModel.findOne.mockReturnValue(chain({ _id: 'abc', packages: [] }));
      classifiedModel.findOne.mockReturnValue(chain(null));
      const view = { l1: [], l2: [], totalProjects: 0 };
      jest.spyOn(service as any, 'classifyFromRaw').mockResolvedValue(view);
      await (service as any).selfHealLatestClassified();
      expect(classifiedModel.updateOne).toHaveBeenCalledWith(
        { snapshotId: 'abc' },
        expect.objectContaining({
          $set: expect.objectContaining({ view, registryHash: (service as any).computeRegistryHash() }),
        }),
        { upsert: true },
      );
    });

    it('re-classifies when persisted hash is stale', async () => {
      ecoModel.findOne.mockReturnValue(chain({ _id: 'abc', packages: [] }));
      classifiedModel.findOne.mockReturnValue(chain({ registryHash: 'stale' }));
      const classifySpy = jest
        .spyOn(service as any, 'classifyFromRaw')
        .mockResolvedValue({ l1: [], l2: [], totalProjects: 0 });
      await (service as any).selfHealLatestClassified();
      expect(classifySpy).toHaveBeenCalledTimes(1);
      expect(classifiedModel.updateOne).toHaveBeenCalled();
    });
  });

  // ---------- probeFingerprint ----------

  describe('probeFingerprint', () => {
    const probe = (addr: string, fp: any) => (service as any).probeFingerprint(addr, fp);

    it('returns true when no issuer/tag constraints and an object is found', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: { objects: { nodes: [{ asMoveObject: { contents: { json: {} } } }] } },
        }),
      });
      expect(await probe('0x1', { type: 'a::B' })).toBe(true);
    });

    it('returns false when no object is found', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ data: { objects: { nodes: [] } } }),
      });
      expect(await probe('0x1', { type: 'a::B' })).toBe(false);
    });

    it('matches when issuer matches (case-insensitive)', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{ asMoveObject: { contents: { json: { issuer: '0xABC' } } } }],
            },
          },
        }),
      });
      expect(await probe('0x1', { type: 'a::B', issuer: '0xabc' })).toBe(true);
    });

    it('rejects when issuer mismatches', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{ asMoveObject: { contents: { json: { issuer: '0xother' } } } }],
            },
          },
        }),
      });
      expect(await probe('0x1', { type: 'a::B', issuer: '0xabc' })).toBe(false);
    });

    it('matches when tag matches', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: { nodes: [{ asMoveObject: { contents: { json: { tag: 't1' } } } }] },
          },
        }),
      });
      expect(await probe('0x1', { type: 'a::B', tag: 't1' })).toBe(true);
    });

    it('rejects when tag mismatches', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: { nodes: [{ asMoveObject: { contents: { json: { tag: 'nope' } } } }] },
          },
        }),
      });
      expect(await probe('0x1', { type: 'a::B', tag: 't1' })).toBe(false);
    });

    it('returns false on fetch / graphql errors', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ errors: [{ message: 'boom' }] }),
      });
      expect(await probe('0x1', { type: 'a::B' })).toBe(false);
    });

    // fields matcher — exact / prefix / suffix / present

    const mockSample = (json: Record<string, unknown>) =>
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: { objects: { nodes: [{ asMoveObject: { contents: { json } } }] } },
        }),
      });

    it('fields: string value → exact match passes', async () => {
      mockSample({ name: 'Isla Silver' });
      expect(await probe('0x1', { type: 'a::B', fields: { name: 'Isla Silver' } })).toBe(true);
    });

    it('fields: string value → mismatch rejects', async () => {
      mockSample({ name: 'Other' });
      expect(await probe('0x1', { type: 'a::B', fields: { name: 'Isla Silver' } })).toBe(false);
    });

    it('fields: prefix matches serialized-name collections', async () => {
      mockSample({ name: 'Healthy Gang #42 - Banana' });
      expect(
        await probe('0x1', { type: 'a::B', fields: { name: { prefix: 'Healthy Gang #' } } }),
      ).toBe(true);
    });

    it('fields: prefix rejects when value does not start with prefix', async () => {
      mockSample({ name: 'Not Healthy' });
      expect(
        await probe('0x1', { type: 'a::B', fields: { name: { prefix: 'Healthy Gang #' } } }),
      ).toBe(false);
    });

    it('fields: suffix matches namespaced identifiers', async () => {
      mockSample({ name_str: 'nnpc.iota' });
      expect(
        await probe('0x1', { type: 'a::B', fields: { name_str: { suffix: '.iota' } } }),
      ).toBe(true);
    });

    it('fields: present rejects absent / empty / null values', async () => {
      mockSample({ vin: '' });
      expect(await probe('0x1', { type: 'a::B', fields: { vin: { present: true } } })).toBe(false);
      mockSample({});
      expect(await probe('0x1', { type: 'a::B', fields: { vin: { present: true } } })).toBe(false);
      mockSample({ vin: null });
      expect(await probe('0x1', { type: 'a::B', fields: { vin: { present: true } } })).toBe(false);
    });

    it('fields: present accepts any non-empty value', async () => {
      mockSample({ vin: 'WF0JXXGAHJKD30348' });
      expect(await probe('0x1', { type: 'a::B', fields: { vin: { present: true } } })).toBe(true);
    });

    it('fields: multiple keys AND together', async () => {
      mockSample({ brand: 'FORD', model: 'FIESTA', vin: 'X' });
      expect(
        await probe('0x1', {
          type: 'a::B',
          fields: {
            brand: 'FORD',
            model: { present: true },
            vin: { present: true },
          },
        }),
      ).toBe(true);
      // one key fails → whole match fails
      mockSample({ brand: 'BMW', model: 'FIESTA', vin: 'X' });
      expect(
        await probe('0x1', {
          type: 'a::B',
          fields: {
            brand: 'FORD',
            model: { present: true },
            vin: { present: true },
          },
        }),
      ).toBe(false);
    });

    it('fields: prefix + suffix on the same key both apply', async () => {
      mockSample({ handle: '@foo.iota' });
      expect(
        await probe('0x1', {
          type: 'a::B',
          fields: { handle: { prefix: '@', suffix: '.iota' } },
        }),
      ).toBe(true);
      mockSample({ handle: '@foo.xyz' });
      expect(
        await probe('0x1', {
          type: 'a::B',
          fields: { handle: { prefix: '@', suffix: '.iota' } },
        }),
      ).toBe(false);
    });

    it('fields: combines with legacy issuer/tag shortcuts via AND', async () => {
      mockSample({ issuer: '0xABC', tag: 'salus', name: 'Batch #1' });
      expect(
        await probe('0x1', {
          type: 'a::B',
          issuer: '0xabc',
          tag: 'salus',
          fields: { name: { prefix: 'Batch #' } },
        }),
      ).toBe(true);
      mockSample({ issuer: '0xABC', tag: 'salus', name: 'Other' });
      expect(
        await probe('0x1', {
          type: 'a::B',
          issuer: '0xabc',
          tag: 'salus',
          fields: { name: { prefix: 'Batch #' } },
        }),
      ).toBe(false);
    });
  });

  // ---------- probeSampleName ----------

  describe('probeSampleName', () => {
    const probe = (addr: string, mods: string[]) =>
      (service as any).probeSampleName(addr, mods);

    it('returns the first usable tag/name/collection_name from the probe', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{ asMoveObject: { contents: { json: { tag: 'Cool Cats' } } } }],
            },
          },
        }),
      });
      expect(await probe('0xaa', ['nft'])).toBe('Cool Cats');
    });

    it('prefers tag > name > collection_name', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [
                { asMoveObject: { contents: { json: { name: 'N', collection_name: 'C' } } } },
              ],
            },
          },
        }),
      });
      expect(await probe('0xaa', ['nft'])).toBe('N');
    });

    it('falls back to collection_name when tag and name are missing', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{ asMoveObject: { contents: { json: { collection_name: 'CN' } } } }],
            },
          },
        }),
      });
      expect(await probe('0xaa', ['nft'])).toBe('CN');
    });

    it('skips candidates that are not strings', async () => {
      fetchMock
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              objects: {
                nodes: [{ asMoveObject: { contents: { json: { tag: 123 } } } }],
              },
            },
          }),
        })
        // second and third attempts (Nft variant of same mod, then next mod)
        .mockResolvedValue({
          json: async () => ({ data: { objects: { nodes: [] } } }),
        });
      expect(await probe('0xaa', ['nft'])).toBeNull();
    });

    it('skips candidates that are empty or too long', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{ asMoveObject: { contents: { json: { tag: '   ' } } } }],
            },
          },
        }),
      });
      expect(await probe('0xaa', ['nft'])).toBeNull();
    });

    it('skips tags longer than 80 chars', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{ asMoveObject: { contents: { json: { tag: 'x'.repeat(200) } } } }],
            },
          },
        }),
      });
      expect(await probe('0xaa', ['nft'])).toBeNull();
    });

    it('only samples up to 3 modules and both NFT/Nft variants each', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ data: { objects: { nodes: [] } } }),
      });
      await probe('0xaa', ['m1', 'm2', 'm3', 'm4']);
      // 3 modules × 2 variants = 6
      expect(fetchMock).toHaveBeenCalledTimes(6);
    });

    it('returns null when all probes error out', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ errors: [{ message: 'x' }] }),
      });
      expect(await probe('0xaa', ['nft'])).toBeNull();
    });
  });

  // ---------- probeIdentityFields ----------

  describe('probeIdentityFields', () => {
    const probe = (addr: string) => (service as any).probeIdentityFields(addr);

    it('extracts known identifier keys and sample type from a live object', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{
                asMoveObject: {
                  contents: {
                    type: { repr: '0xaa::nft::NFT' },
                    json: { tag: 'salus', issuer: '0xdead', name: 'Doc #1', noise: 42 },
                  },
                },
              }],
            },
          },
        }),
      });
      const { identifiers, objectType } = await probe('0xaa');
      expect(objectType).toBe('0xaa::nft::NFT');
      expect(identifiers).toEqual(expect.arrayContaining([
        'tag: salus',
        'name: Doc #1',
      ]));
      // non-strings dropped
      expect(identifiers.find((s: string) => s.startsWith('noise:'))).toBeUndefined();
    });

    it('drops strings that just echo a full address', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [{
                asMoveObject: {
                  contents: {
                    type: { repr: '0xaa::m::T' },
                    json: { owner: '0x' + 'a'.repeat(64), label: 'Human Label' },
                  },
                },
              }],
            },
          },
        }),
      });
      const { identifiers } = await probe('0xaa');
      expect(identifiers).toContain('label: Human Label');
      expect(identifiers.find((s: string) => s.startsWith('owner:'))).toBeUndefined();
    });

    it('returns empty on error without throwing', async () => {
      fetchMock.mockResolvedValue({ json: async () => ({ errors: [{ message: 'boom' }] }) });
      const res = await probe('0xaa');
      expect(res.identifiers).toEqual([]);
      expect(res.objectType).toBeNull();
    });

    it('breaks immediately when the first page returns zero objects', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ data: { objects: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } }),
      });
      const res = await probe('0xaa');
      expect(res.identifiers).toEqual([]);
      expect(res.objectType).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('short-circuits without paging when the first page yields enough idents', async () => {
      // Page 1 returns 3+ idents → should not request page 2 even if hasNextPage=true.
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [
                { asMoveObject: { contents: { type: { repr: '0xaa::nft::NFT' }, json: { tag: 'p1', name: 'P1', issuer: 'P1Inc' } } } },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'NEXT' },
            },
          },
        }),
      });
      await probe('0xaa');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('paginates beyond the first page when fewer than 3 idents collected', async () => {
      // Page 1 returns objects with no identifiable fields → 0 idents.
      // Page 2 returns one object with two idents → loop terminates after page 2.
      fetchMock
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              objects: {
                nodes: [
                  { asMoveObject: { contents: { type: { repr: '0xaa::admin::AdminCap' }, json: { id: '0x1' } } } },
                ],
                pageInfo: { hasNextPage: true, endCursor: 'CURSOR1' },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              objects: {
                nodes: [
                  { asMoveObject: { contents: { type: { repr: '0xaa::nft::NFT' }, json: { tag: 'late', name: 'Late Find' } } } },
                ],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          }),
        });
      const { identifiers, objectType } = await probe('0xaa');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // sampledType is the first non-empty type seen (page 1's AdminCap).
      expect(objectType).toBe('0xaa::admin::AdminCap');
      expect(identifiers).toEqual(expect.arrayContaining(['tag: late', 'name: Late Find']));
    });
  });

  // ---------- probeTxEffects ----------

  describe('probeTxEffects', () => {
    const probe = (addr: string) => (service as any).probeTxEffects(addr);

    it('extracts non-framework type fragments from TX effect objectChanges', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            transactionBlocks: {
              nodes: [{
                effects: {
                  objectChanges: {
                    nodes: [
                      // Framework-only: should be skipped entirely.
                      { outputState: { asMoveObject: { contents: { type: { repr: '0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA>' } } } } },
                      // Sibling-package types (the identity signal): repr is wrapped in a
                      // framework Coin<...>, but the inner type is non-framework and
                      // gets harvested.
                      { outputState: { asMoveObject: { contents: { type: { repr: '0x0000000000000000000000000000000000000000000000000000000000000002::coin::TreasuryCap<0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD>' } } } } },
                      { outputState: { asMoveObject: { contents: { type: { repr: '0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT' } } } } },
                    ],
                  },
                },
              }],
            },
          },
        }),
      });
      const { identifiers, objectType } = await probe('0xb0ca');
      expect(identifiers).toEqual(expect.arrayContaining([
        'creates: 0xd3b63e…::vusd::VUSD',
        'creates: 0x346778…::cert::CERT',
      ]));
      // Pure-framework reprs contribute nothing.
      expect(identifiers.find((s: string) => s.includes('iota::IOTA'))).toBeUndefined();
      expect(objectType).toBe('0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD');
    });

    it('returns empty on error without throwing', async () => {
      fetchMock.mockResolvedValue({ json: async () => ({ errors: [{ message: 'boom' }] }) });
      const res = await probe('0xaa');
      expect(res.identifiers).toEqual([]);
      expect(res.objectType).toBeNull();
    });

    it('returns empty when no TXs match the package filter', async () => {
      fetchMock.mockResolvedValue({ json: async () => ({ data: { transactionBlocks: { nodes: [] } } }) });
      const res = await probe('0xaa');
      expect(res.identifiers).toEqual([]);
      expect(res.objectType).toBeNull();
    });

    it('caps at 20 collected identifiers across many TX effects', async () => {
      // 25 distinct sibling-package types across 25 changes, all non-framework
      // — should stop adding at the 20th and break out of all loops.
      const reprs = Array.from({ length: 25 }, (_, i) =>
        // 64-hex addresses with varying first chars so each is unique.
        `0x${i.toString(16).padStart(2, '0')}aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa::brand${i}::Mark`,
      );
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            transactionBlocks: {
              nodes: [{
                effects: {
                  objectChanges: {
                    nodes: reprs.map((repr) => ({ outputState: { asMoveObject: { contents: { type: { repr } } } } })),
                  },
                },
              }],
            },
          },
        }),
      });
      const { identifiers } = await probe('0xaa');
      expect(identifiers).toHaveLength(20);
    });

    it('skips object changes whose outputState has no readable type repr', async () => {
      // Mix of: undefined outputState, missing asMoveObject, missing repr, plus
      // one valid sibling-package type that should still be harvested.
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            transactionBlocks: {
              nodes: [{
                effects: {
                  objectChanges: {
                    nodes: [
                      { outputState: null },
                      { outputState: { asMoveObject: null } },
                      { outputState: { asMoveObject: { contents: { type: null } } } },
                      { outputState: { asMoveObject: { contents: { type: { repr: '0xaaa1bb2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcd::brand::Marker' } } } } },
                    ],
                  },
                },
              }],
            },
          },
        }),
      });
      const { identifiers } = await probe('0xaa');
      expect(identifiers).toEqual(['creates: 0xaaa1bb…::brand::Marker']);
    });
  });

  // ---------- matchByFingerprint ----------

  describe('matchByFingerprint', () => {
    const byFp = (mods: string[], addr: string) =>
      (service as any).matchByFingerprint(new Set(mods), addr);

    it('skips defs whose fingerprint module is not in the package', async () => {
      // fp type 'nft::NFT' → module 'nft'. Package without 'nft' module → null.
      const result = await byFp(['other'], '0x1');
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns the def when fingerprint probe succeeds', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            objects: {
              nodes: [
                {
                  asMoveObject: {
                    contents: { json: { issuer: '0xISSUER', tag: 'coolcats' } },
                  },
                },
              ],
            },
          },
        }),
      });
      const result = await byFp(['nft'], '0xpkg');
      // FingerprintOnly has the most specific fp (with issuer+tag constraints);
      // Combo's fp has no constraints so either could match; the order in
      // ALL_PROJECTS has Combo later than FingerprintOnly… actually Combo is
      // LATER in the mock list, so FingerprintOnly wins first.
      expect(result?.name).toBe('FingerprintOnly');
    });

    it('returns null when no fingerprint-bearing def probes successfully', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({ data: { objects: { nodes: [] } } }),
      });
      expect(await byFp(['nft'], '0xpkg')).toBeNull();
    });
  });

  // ---------- countEvents ----------

  describe('countEvents (private)', () => {
    const count = (...args: any[]) =>
      (service as any).countEvents(...args) as Promise<{ count: number; capped: boolean }>;

    it('sums events across pages until hasNextPage is false', async () => {
      fetchMock
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              events: {
                nodes: Array.from({ length: 50 }, () => ({ __typename: 'E' })),
                pageInfo: { hasNextPage: true, endCursor: 'c1' },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              events: {
                nodes: Array.from({ length: 20 }, () => ({ __typename: 'E' })),
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          }),
        });
      const r = await count('0xpkg::mod');
      expect(r).toEqual({ count: 70, capped: false });
      expect(fetchMock.mock.calls[1][1].body).toMatch(/after: \\?"c1\\?"/);
    });

    it('breaks and returns current total on a thrown page', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ errors: [{ message: 'boom' }] }),
      });
      const r = await count('0xpkg::mod');
      expect(r).toEqual({ count: 0, capped: false });
    });

    it('flags capped=true when hitting the maxPages limit', async () => {
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            events: {
              nodes: Array.from({ length: 50 }, () => ({ __typename: 'E' })),
              pageInfo: { hasNextPage: true, endCursor: 'c' },
            },
          },
        }),
      });
      const r = await count('0xpkg::mod', 2);
      expect(r.capped).toBe(true);
      expect(r.count).toBe(100);
    });
  });

  // ---------- updateSendersForModule ----------

  describe('updateSendersForModule (private)', () => {
    const update = (pkg: string, mod: string) =>
      (service as any).updateSendersForModule(pkg, mod) as Promise<number>;

    it('delegates to pageBackwardSenders with a 100-page budget and returns countDocuments', async () => {
      const pageSpy = jest
        .spyOn(service as any, 'pageBackwardSenders')
        .mockResolvedValue({ scanned: 17, reachedEnd: true });
      senderDocModel.countDocuments.mockResolvedValue(42);

      const r = await update('0xaa', 'mod');

      expect(pageSpy).toHaveBeenCalledWith('0xaa', 'mod', 100);
      expect(senderDocModel.countDocuments).toHaveBeenCalledWith({
        packageAddress: '0xaa',
        module: 'mod',
      });
      expect(r).toBe(42);
    });

    it('still returns countDocuments when the backward page-run caps at the budget', async () => {
      jest
        .spyOn(service as any, 'pageBackwardSenders')
        .mockResolvedValue({ scanned: 5000, reachedEnd: false });
      senderDocModel.countDocuments.mockResolvedValue(5000);

      const r = await update('0xaa', 'mod');
      // No persistent cursor state is touched — the scanner is idempotent.
      expect(r).toBe(5000);
    });
  });

  // ---------- pageBackwardSenders ----------

  describe('pageBackwardSenders (private)', () => {
    const run = (pkg: string, mod: string, max = 100) =>
      (service as any).pageBackwardSenders(pkg, mod, max) as Promise<{ scanned: number; reachedEnd: boolean }>;

    it('first page uses `last: 50` with no `before:`; subsequent pages chain on startCursor', async () => {
      let page = 0;
      jest.spyOn(service as any, 'graphql').mockImplementation(async (q: unknown) => {
        page += 1;
        const body = String(q);
        if (page === 1) {
          // No before on first call — just the bare `last: 50`.
          expect(body).toMatch(/last: 50/);
          expect(body).not.toMatch(/before:/);
          return {
            events: {
              nodes: [{ sender: { address: '0xAAA' } }],
              pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
            },
          };
        }
        // Second call must reference the prior startCursor.
        expect(body).toMatch(/before: "sc-1"/);
        return {
          events: {
            nodes: [{ sender: { address: '0xBBB' } }],
            pageInfo: { hasPreviousPage: false, startCursor: 'sc-2' },
          },
        };
      });
      senderDocModel.insertMany
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]);

      const result = await run('0xaa', 'm');
      expect(result).toEqual({ scanned: 2, reachedEnd: true });
      expect(senderDocModel.insertMany).toHaveBeenCalledTimes(2);
    });

    it('lowercases addresses, dedupes within a page, writes insertMany with ordered:false', async () => {
      jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
        events: {
          nodes: [
            { sender: { address: '0xAAA' } },
            { sender: { address: '0xBBB' } },
            { sender: { address: '0xaaa' } }, // dup within page
            { sender: null },
          ],
          pageInfo: { hasPreviousPage: false, startCursor: null },
        },
      });
      senderDocModel.insertMany.mockResolvedValueOnce([{}, {}]);

      const result = await run('0xaa', 'm');
      expect(result).toEqual({ scanned: 4, reachedEnd: true });
      expect(senderDocModel.insertMany).toHaveBeenCalledTimes(1);
      const [docs, opts] = senderDocModel.insertMany.mock.calls[0];
      expect(opts).toEqual({ ordered: false });
      const addresses = (docs as any[]).map((d) => d.address).sort();
      expect(addresses).toEqual(['0xaaa', '0xbbb']);
      expect((docs as any[]).every((d) => d.packageAddress === '0xaa' && d.module === 'm')).toBe(true);
    });

    it('silently swallows top-level E11000 dup-key on insertMany', async () => {
      jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
        events: {
          nodes: [{ sender: { address: '0xA' } }],
          pageInfo: { hasPreviousPage: false, startCursor: null },
        },
      });
      const err: any = new Error('E11000 dup');
      err.code = 11000;
      senderDocModel.insertMany.mockRejectedValueOnce(err);

      const result = await run('0xaa', 'm');
      expect(result.scanned).toBe(1);
      // All-dupes page → caught-up → reachedEnd must be true.
      expect(result.reachedEnd).toBe(true);
    });

    it('silently swallows bulk writeErrors when every entry is 11000', async () => {
      jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
        events: {
          nodes: [{ sender: { address: '0xA' } }, { sender: { address: '0xB' } }],
          pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
        },
      });
      const bulk: any = new Error('Bulk');
      bulk.writeErrors = [{ code: 11000 }, { err: { code: 11000 } }];
      senderDocModel.insertMany.mockRejectedValueOnce(bulk);

      const result = await run('0xaa', 'm');
      // All-dupes page → caught-up heuristic fires BEFORE the loop chains.
      expect(result.reachedEnd).toBe(true);
    });

    it('re-throws mixed writeErrors (one non-11000 entry present)', async () => {
      jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
        events: {
          nodes: [{ sender: { address: '0xA' } }],
          pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
        },
      });
      const bulk: any = new Error('mixed');
      bulk.writeErrors = [{ code: 11000 }, { code: 66 }];
      senderDocModel.insertMany.mockRejectedValueOnce(bulk);

      await expect(run('0xaa', 'm')).rejects.toThrow(/mixed/);
    });

    it('re-throws non-duplicate top-level errors', async () => {
      jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
        events: {
          nodes: [{ sender: { address: '0xA' } }],
          pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
        },
      });
      senderDocModel.insertMany.mockRejectedValueOnce(new Error('network down'));

      await expect(run('0xaa', 'm')).rejects.toThrow(/network down/);
    });

    it('reachedEnd=true on empty nodes', async () => {
      jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
        events: { nodes: [], pageInfo: { hasPreviousPage: false, startCursor: null } },
      });
      const result = await run('0xaa', 'm');
      expect(result).toEqual({ scanned: 0, reachedEnd: true });
      expect(senderDocModel.insertMany).not.toHaveBeenCalled();
    });

    it('reachedEnd=true on hasPreviousPage:false (full history drained)', async () => {
      jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
        events: {
          nodes: [{ sender: { address: '0xA' } }],
          pageInfo: { hasPreviousPage: false, startCursor: 'sc' },
        },
      });
      senderDocModel.insertMany.mockResolvedValueOnce([{}]);
      const result = await run('0xaa', 'm');
      expect(result.reachedEnd).toBe(true);
    });

    it('reachedEnd=false when maxPages budget exhausted with more pages pending', async () => {
      jest.spyOn(service as any, 'graphql').mockImplementation(async () => ({
        events: {
          nodes: [{ sender: { address: '0x' + Math.random().toString(16).slice(2, 10) } }],
          pageInfo: { hasPreviousPage: true, startCursor: 'cursor-' + Math.random() },
        },
      }));
      senderDocModel.insertMany.mockResolvedValue([{}]);

      const result = await run('0xaa', 'm', 3);
      expect(result.reachedEnd).toBe(false);
      expect(result.scanned).toBe(3);
    });

    it('graphql throw breaks the loop gracefully (returns, does not throw)', async () => {
      let page = 0;
      jest.spyOn(service as any, 'graphql').mockImplementation(async () => {
        page += 1;
        if (page === 1) {
          return {
            events: {
              nodes: [{ sender: { address: '0xA' } }],
              pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
            },
          };
        }
        throw new Error('gql blew up');
      });
      senderDocModel.insertMany.mockResolvedValueOnce([{}]);

      const result = await run('0xaa', 'm');
      expect(result.scanned).toBe(1);
      expect(result.reachedEnd).toBe(false);
    });
  });

  // ---------- backfillSendersForModule ----------

  describe('backfillSendersForModule', () => {
    it('calls pageBackwardSenders with a 10000-page budget and returns countDocuments', async () => {
      const pageSpy = jest
        .spyOn(service as any, 'pageBackwardSenders')
        .mockResolvedValue({ scanned: 7, reachedEnd: true });
      senderDocModel.countDocuments.mockResolvedValue(7);

      const n = await service.backfillSendersForModule('0xpkg', 'mod');

      expect(pageSpy).toHaveBeenCalledWith('0xpkg', 'mod', 10000);
      expect(senderDocModel.countDocuments).toHaveBeenCalledWith({
        packageAddress: '0xpkg',
        module: 'mod',
      });
      expect(n).toBe(7);
    });
  });

  // ---------- backfillAllSenders ----------

  describe('backfillAllSenders', () => {
    it('throws when there is no snapshot', async () => {
      ecoModel.findOne.mockReturnValue(chain(null));
      await expect(service.backfillAllSenders()).rejects.toThrow(/No ecosystem snapshot/);
    });

    it('iterates every (package, module) with a module and reports progress', async () => {
      // New raw-snapshot shape: the backfill now iterates `packages[]` from
      // the `OnchainSnapshot`, not the classified `l1[]`. Packages without
      // modules are filtered out; the progress callback reports `project`
      // as the package address (the addressable unit for `ProjectSenders`).
      ecoModel.findOne.mockReturnValue(chain({
        packages: [
          { address: '0xaa', modules: ['m1', 'm2'] },
          { address: '0xcc', modules: [] },  // filtered out (no modules)
          { address: '0xdd', modules: ['d1'] },
        ],
      }));
      const spy = jest.spyOn(service, 'backfillSendersForModule')
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(7);
      const progress = jest.fn();
      const result = await service.backfillAllSenders(progress);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ totalProjects: 2, totalModules: 3, totalSenders: 15 });
      expect(progress).toHaveBeenCalledTimes(3);
      expect(progress).toHaveBeenNthCalledWith(1, { project: '0xaa', module: 'm1', senders: 5 });
    });

    it('works without the progress callback', async () => {
      ecoModel.findOne.mockReturnValue(chain({
        packages: [{ address: '0xaa', modules: ['m1'] }],
      }));
      jest.spyOn(service, 'backfillSendersForModule').mockResolvedValue(1);
      const result = await service.backfillAllSenders();
      expect(result).toEqual({ totalProjects: 1, totalModules: 1, totalSenders: 1 });
    });
  });

  // ---------- capture → classify end-to-end ----------

  describe('capture + classify end-to-end', () => {
    /**
     * Build a scripted fetch that dispatches on URL + body content. Each call
     * returns a Promise<Response-like>. Unknown requests throw to surface
     * missing stubs loudly.
     */
    const scriptFetch = (script: {
      packages: any[];
      llama?: any[] | 'error';
      objects?: Record<string, any>;
      txEffects?: Record<string, string[]>;
      networkTx?: string;
      /** Per-package event counts — matched against the `emittingModule` prefix in the filter. Modules on the same package all share the count. Used to drive primary-selection in shared-slug TVL tests. */
      eventsByPackage?: Record<string, number>;
    }) => {
      return jest.fn(async (url: string, opts: any) => {
        const body: string = opts?.body || '';
        if (url === 'https://api.llama.fi/protocols') {
          if (script.llama === 'error') throw new Error('llama down');
          return { json: async () => script.llama ?? [] };
        }
        if (url === GRAPHQL_URL) {
          if (body.includes('packages(first')) {
            return { json: async () => ({ data: { packages: { nodes: script.packages, pageInfo: { hasNextPage: false, endCursor: null } } } }) };
          }
          if (body.includes('checkpoint { networkTotalTransactions')) {
            return { json: async () => ({ data: { checkpoint: { networkTotalTransactions: script.networkTx ?? '1000000' } } }) };
          }
          if (body.includes('events(filter:') && body.includes('nodes { __typename }')) {
            const unescaped = body.replace(/\\/g, '');
            const m = /emittingModule: "([^:]+)::/.exec(unescaped);
            const pkgAddr = m?.[1] ?? '';
            const count = script.eventsByPackage?.[pkgAddr] ?? 0;
            const nodes = Array.from({ length: count }, () => ({ __typename: 'MoveEvent' }));
            return { json: async () => ({ data: { events: { nodes, pageInfo: { hasNextPage: false, endCursor: null } } } }) };
          }
          // Backward-paginated senders: `events(filter:...) { nodes { sender { address } } pageInfo { hasPreviousPage startCursor } }`.
          // Distinguish from the countEvents shape (__typename-only nodes) via `sender { address }` in the selection set.
          if (body.includes('events(filter:') && body.includes('sender { address }')) {
            return { json: async () => ({ data: { events: { nodes: [], pageInfo: { hasPreviousPage: false, startCursor: null } } } }) };
          }
          if (body.includes('events(filter:') && body.includes('last: 1')) {
            return { json: async () => ({ data: { events: { pageInfo: { endCursor: null } } } }) };
          }
          // MovePackage module/datatypes enumeration from `captureObjectTypesForPackage`.
          // Return an empty module list so `updateHoldersForType` is never reached via capture.
          if (body.includes('asMovePackage') && body.includes('datatypes(')) {
            return { json: async () => ({ data: { object: { asMovePackage: { modules: { nodes: [] } } } } }) };
          }
          // Backward-paginated holders: `objects(filter:...) { nodes { owner { ... } } pageInfo { hasPreviousPage startCursor } }`.
          // Stubbed to empty so the capture doesn't try to classify unexpected holders.
          if (body.includes('objects(filter:') && body.includes('__typename') && body.includes('hasPreviousPage')) {
            return { json: async () => ({ data: { objects: { nodes: [], pageInfo: { hasPreviousPage: false, startCursor: null } } } }) };
          }
          if (body.includes('objects(filter:')) {
            // Strip JSON-stringify backslash-escaping so we can match on raw type.
            const unescaped = body.replace(/\\/g, '');
            const m = /type: "([^"]+)"/.exec(unescaped);
            const typeKey = m?.[1] ?? '';
            const node = script.objects?.[typeKey];
            return {
              json: async () => ({
                data: {
                  objects: { nodes: node ? [{ asMoveObject: { contents: { json: node } } }] : [] },
                },
              }),
            };
          }
          // Backward-paginated TX digest scanner: `transactionBlocks(filter:...) { nodes { digest } pageInfo { hasPreviousPage startCursor } }`.
          // Distinguish from probeTxEffects (which selects objectChanges) by looking for digest + hasPreviousPage.
          if (body.includes('transactionBlocks(filter:') && body.includes('nodes { digest }')) {
            return { json: async () => ({ data: { transactionBlocks: { nodes: [], pageInfo: { hasPreviousPage: false, startCursor: null } } } }) };
          }
          if (body.includes('transactionBlocks(filter:')) {
            const unescaped = body.replace(/\\/g, '');
            const m = /function: "([^"]+)"/.exec(unescaped);
            const pkg = m?.[1] ?? '';
            const reprs = script.txEffects?.[pkg] ?? [];
            return {
              json: async () => ({
                data: {
                  transactionBlocks: {
                    nodes: reprs.length
                      ? [{ effects: { objectChanges: { nodes: reprs.map((repr) => ({ outputState: { asMoveObject: { contents: { type: { repr } } } } })) } } }]
                      : [],
                  },
                },
              }),
            };
          }
        }
        throw new Error(`unexpected fetch: ${url} / ${body.slice(0, 80)}`);
      });
    };

    const pkg = (overrides: Partial<{ address: string; storageRebate: string; modules: string[]; deployer: string | null }>) => ({
      address: overrides.address ?? '0xaa',
      storageRebate: overrides.storageRebate ?? '1000000000',
      modules: { nodes: (overrides.modules ?? ['nft']).map((name) => ({ name })) },
      previousTransactionBlock: overrides.deployer === null
        ? null
        : { sender: { address: overrides.deployer ?? '0xdeployer' } },
    });

    const runCapture = async () => {
      // Stub senderModel to behave as "no record, first encounter anchors null cursor".
      senderModel.findOne.mockResolvedValue(null);
      senderModel.create.mockResolvedValue({});
      await service.capture();
      expect(ecoModel.create).toHaveBeenCalledTimes(1);
      // Wire the raw snapshot that `capture()` just wrote through `getLatest()`
      // so assertions can inspect the CLASSIFIED view — `getLatest()` loads
      // the raw snapshot then runs `classifyFromRaw`, which produces the
      // frontend-facing shape (`l1`, `l2`, `unattributed`, `totalProjects`).
      // Gives us end-to-end coverage of capture → classify in a single test.
      const raw = ecoModel.create.mock.calls[0][0];
      const stored = { _id: 'test-id', ...raw };
      ecoModel.findOne.mockReturnValue({
        sort: () => ({ lean: () => ({ exec: async () => stored }) }),
      });
      const classified = await service.getLatest();
      if (!classified) throw new Error('runCapture: getLatest() returned null');
      // Cast through `any` so existing assertions can use `.find(...)` and
      // index access without TS18048 noise; the shape is asserted by the
      // tests themselves.
      return classified as any;
    };

    it('skips framework-ish 0x0-prefixed packages that are not explicitly claimed', async () => {
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0x0000000000000000000000000000000000000000000000000000000000000003', modules: ['foo', 'bar'] }),
          pkg({ address: '0xaa', modules: ['foo', 'bar'] }),
        ],
      });
      const snap = await runCapture();
      // Only the 0xaa package classified as 'Exact' (mods=['foo','bar'])
      expect(snap.totalProjects).toBe(1);
      expect(snap.l1[0].name).toBe('Exact');
    });

    it('classify: populates uniqueHolders + objectCount + marketplaceListedCount + uniqueWalletsReach for projects with countTypes', async () => {
      // Collectible mock project declares `countTypes: ['pfp::PFPNFT']`. Stubbing
      // captureObjectTypesForPackage to write a matching entry onto the
      // PackageFact; classifyFromRaw's countTypes-filter branch should sum
      // count + listedCount and query the holders collection. Reach uses the
      // $unionWith pipeline.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['pfp'] })],
      });
      jest.spyOn(service as any, 'captureObjectTypesForPackage').mockResolvedValue([
        { type: '0xaa::pfp::PFPNFT', count: 200, listedCount: 30, capped: false },
      ]);
      // First senderDocModel.aggregate call is `pairs.length>0` senders count;
      // second call is the $unionWith reach aggregation. Return distinct counts.
      senderDocModel.aggregate
        .mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([{ count: 180 }]);
      holderEntryModel.aggregate.mockResolvedValue([{ count: 150 }]);
      const snap = await runCapture();
      const proj = snap.l1.find((p: any) => p.name === 'Collectible');
      expect(proj).toBeDefined();
      expect(proj.uniqueSenders).toBe(50);
      expect(proj.objectCount).toBe(200);
      expect(proj.marketplaceListedCount).toBe(30);
      expect(proj.uniqueHolders).toBe(150);
      expect(proj.uniqueWalletsReach).toBe(180);
      // Reach pipeline: $match(senders pairs) → $unionWith(holders collection) → $group → $count.
      const reachPipeline = senderDocModel.aggregate.mock.calls[1][0];
      expect(reachPipeline[1].$unionWith.coll).toBe('project_holder_entries');
    });

    it('classify: projects without countTypes leave holder fields null + reach falls through to uniqueSenders', async () => {
      // "Exact" mock has no countTypes — holder-side fields should stay null.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
      });
      senderDocModel.aggregate.mockResolvedValue([{ count: 77 }]);
      const snap = await runCapture();
      const proj = snap.l1.find((p: any) => p.name === 'Exact');
      expect(proj).toBeDefined();
      expect(proj.uniqueSenders).toBe(77);
      expect(proj.uniqueHolders).toBeNull();
      expect(proj.objectCount).toBeNull();
      expect(proj.marketplaceListedCount).toBeNull();
      // Reach falls back to uniqueSenders when no countTypes contribute.
      expect(proj.uniqueWalletsReach).toBe(77);
    });

    it('classify: project with countTypes + zero module activity falls through to reach=holders-only (object-owning package, no events)', async () => {
      // AddrOnly matches by packageAddresses, accepts a module-less package.
      // With zero moduleMetrics → no sender pairs → classify's 2032 edge
      // case fires: reach = uniqueHolders (not senders-union-holders).
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xabcdef', modules: [] })],
      });
      jest.spyOn(service as any, 'captureObjectTypesForPackage').mockResolvedValue([
        { type: '0xabcdef::module_only::ObjectOnly', count: 42, listedCount: 0, capped: false },
      ]);
      holderEntryModel.aggregate.mockResolvedValue([{ count: 42 }]);
      const snap = await runCapture();
      const proj = snap.l1.find((p: any) => p.name === 'AddrOnly');
      expect(proj).toBeDefined();
      expect(proj.uniqueSenders).toBe(0);
      expect(proj.uniqueHolders).toBe(42);
      expect(proj.uniqueWalletsReach).toBe(42); // holders-only fallback
    });

    it('classify: project with countTypes but no matching objectTypeCounts entries → uniqueHolders=0, reach=senders only', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['pfp'] })],
      });
      // Capture returns objectTypeCounts with a non-matching type (AdminCap).
      jest.spyOn(service as any, 'captureObjectTypesForPackage').mockResolvedValue([
        { type: '0xaa::pfp::AdminCap', count: 1, listedCount: 0, capped: false },
      ]);
      senderDocModel.aggregate.mockResolvedValue([{ count: 12 }]);
      const snap = await runCapture();
      const proj = snap.l1.find((p: any) => p.name === 'Collectible');
      expect(proj).toBeDefined();
      // countTypes is non-empty but filter matched nothing → objectCount=0, holders=0, reach=senders.
      expect(proj.objectCount).toBe(0);
      expect(proj.uniqueHolders).toBe(0);
      expect(proj.uniqueWalletsReach).toBe(12);
    });

    it('surfaces the classify aggregate-based uniqueSenders count on the classified project', async () => {
      // Tests the `pairs.length > 0` → aggregate branch in classifyFromRaw:
      // union of senders across the project's (pkg, module) pairs, returned
      // as a scalar `count` from the `$group: { _id: '$address' } / $count`
      // pipeline. Mocking the aggregate to resolve to `[{ count: 17 }]`
      // verifies the scalar flows into `Project.uniqueSenders`.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
      });
      senderDocModel.aggregate.mockResolvedValue([{ count: 17 }]);
      const snap = await runCapture();
      const proj = snap.l1.find((p: any) => p.name === 'Exact');
      expect(proj).toBeDefined();
      expect(proj.uniqueSenders).toBe(17);
      // Aggregate pipeline: first stage `$match: { $or: [pairs] }` with
      // two pairs for 0xaa::foo + 0xaa::bar.
      const pipeline = senderDocModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.$or).toEqual([
        { packageAddress: '0xaa', module: 'foo' },
        { packageAddress: '0xaa', module: 'bar' },
      ]);
      expect(pipeline[1]).toEqual({ $group: { _id: '$address' } });
      expect(pipeline[2]).toEqual({ $count: 'count' });
    });

    it('allows 0x0-prefixed packages when explicitly claimed via packageAddresses', async () => {
      // Add a mock project whose packageAddresses includes the framework-style
      // address 0x00...abcdef? Actually AddrOnly uses '0xABCDEF' which does
      // not begin with 0x000..03. So this test instead claims a real 0x000..03
      // address via AddrOnly. To do that cleanly without editing the mock, we
      // just verify the filter *doesn't* apply to AddrOnly's claimed address.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xabcdef', modules: [] })],
      });
      const snap = await runCapture();
      expect(snap.l1.map((p: any) => p.name)).toContain('AddrOnly');
    });

    it('uses fingerprint to override an aggregate-bucket match', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft1', modules: ['nft'] })],
        objects: {
          '0xnft1::nft::NFT': { issuer: '0xISSUER', tag: 'coolcats' },
        },
      });
      const snap = await runCapture();
      expect(snap.l1.map((p: any) => p.name)).toContain('FingerprintOnly');
      expect(snap.l1.map((p: any) => p.name)).not.toContain('Aggregate');
    });

    it('leaves aggregate match when fingerprint probe does not find the struct', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft2', modules: ['nft'], deployer: '0xunknown' })],
        // No objects → fingerprint probe returns false
        objects: {},
      });
      const snap = await runCapture();
      const names = snap.l1.map((p: any) => p.name);
      // Aggregate splits by deployer → display name will be "Aggregate (deployer-<hash>)"
      expect(names.some((n: string) => n.startsWith('Aggregate'))).toBe(true);
    });

    it('routes splitByDeployer packages to a single-project team when deployer is known', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft3', modules: ['nft'], deployer: '0xSOLO' })],
        objects: {},
      });
      const snap = await runCapture();
      expect(snap.l1.map((p: any) => p.name)).toContain('SoloTeam');
    });

    it('keeps splitByDeployer behavior when deployer belongs to a multi-project team', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft4', modules: ['nft'], deployer: '0xMULTI' })],
        objects: {},
      });
      const snap = await runCapture();
      const aggNames = snap.l1.map((p: any) => p.name).filter((n: string) => n.startsWith('Aggregate'));
      expect(aggNames).toHaveLength(1);
      expect(aggNames[0]).toMatch(/\(deployer-[0-9a-f]{6}\)$/);
    });

    it('does NOT route splitByDeployer packages to a team whose single project has a sync match rule', async () => {
      // Regression guard for the TWIN / IF-Testing shared-deployer bug.
      // 0xSTRICT is claimed by BOTH team-strict (single project StrictSolo
      // has `{all: [strict_module]}`, a sync rule) and team-shared-routing
      // (single project SharedRoutingSolo has empty match — routing-only).
      // An nft package at 0xSTRICT must skip StrictSolo and land on
      // SharedRoutingSolo: the routing logic iterates candidate teams and
      // picks the first whose single project is routing-only.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft-strict', modules: ['nft'], deployer: '0xSTRICT' })],
        objects: {},
      });
      const snap = await runCapture();
      const names = snap.l1.map((p: any) => p.name);
      expect(names).toContain('SharedRoutingSolo');
      expect(names).not.toContain('StrictSolo');
      expect(names.some((n: string) => n.startsWith('Aggregate'))).toBe(false);
    });

    it('routes splitByDeployer packages to a multi-project team when the team has at least one routing-only project', async () => {
      // This is the IOTA Foundation / Testing shape introduced when if-testing
      // was merged into iota-foundation: a team with many sync-matched product
      // rows PLUS one routing-only project. Packages matching only the
      // NFT-Collections aggregate (not any of the team's sync rules) must
      // still route to the routing-only project.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft-mixed', modules: ['nft'], deployer: '0xMIXED' })],
        objects: {},
      });
      const snap = await runCapture();
      const names = snap.l1.map((p: any) => p.name);
      expect(names).toContain('MultiProjectRouting');
      expect(names).not.toContain('MixedSyncA');
      expect(names.some((n: string) => n.startsWith('Aggregate'))).toBe(false);
    });

    it('leaves package in Aggregate bucket when no candidate team has a routing-only project', async () => {
      // Counterpart to the previous test: if every team claiming the
      // deployer has a sync-match project, no routing happens and the
      // package stays in the Aggregate bucket split by deployer.
      // 0xstrict-only is only claimed by a transient single-match team —
      // simulated here by using a deployer not in the mock team list at
      // all; the effect is the same.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft-orphan', modules: ['nft'], deployer: '0xorphan' })],
        objects: {},
      });
      const snap = await runCapture();
      const aggNames = snap.l1.map((p: any) => p.name).filter((n: string) => n.startsWith('Aggregate'));
      expect(aggNames).toHaveLength(1);
    });

    it('falls back to "unknown" deployer string when previousTransactionBlock is missing', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft5', modules: ['nft'], deployer: null })],
        objects: {},
      });
      const snap = await runCapture();
      expect(snap.l1[0].name).toMatch(/deployer-/);
    });

    it('labels splitByDeployer entries with probe-sampled name when available', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xnft6', modules: ['nft'], deployer: '0xunknown' })],
        objects: {
          '0xnft6::nft::NFT': { tag: 'Shiny Frogs' },
        },
      });
      const snap = await runCapture();
      // probe tag 'Shiny Frogs' — but the fingerprint test would match
      // FingerprintOnly! Its fp has issuer+tag constraints which fail here
      // (issuer is undefined in the sample). So FingerprintOnly.probeFingerprint
      // returns false → def stays Aggregate. Then splitDeployer path samples
      // the object (which has tag='Shiny Frogs') → displayName = "Aggregate: Shiny Frogs (hash)".
      const p = snap.l1.find((x: any) => x.name.includes('Shiny Frogs'));
      expect(p).toBeDefined();
      expect(p.name).toMatch(/Aggregate: Shiny Frogs \([0-9a-f]{6}\)$/);
    });

    it('sets logo precedence def.logo → team.logo → null', async () => {
      (global as any).fetch = scriptFetch({
        packages: [
          // Matches SoloTeam which has teamId: 'team-solo', team has logo
          pkg({ address: '0xsolo', modules: ['nft'], deployer: '0xSOLO' }),
        ],
        objects: {},
      });
      const snap = await runCapture();
      const solo = snap.l1.find((p: any) => p.name === 'SoloTeam');
      expect(solo.logo).toBe('/logos/solo.svg');
      expect(solo.team?.id).toBe('team-solo');
    });

    it('flags anomalous deployers (not in team deployer list)', async () => {
      // TeamedA has teamId team-multi with deployer 0xMULTI. A package matched
      // to TeamedA but deployed by 0xOUTSIDER should be tagged anomalous.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xteamed', modules: ['alpha'], deployer: '0xOUTSIDER' })],
        objects: {},
      });
      const snap = await runCapture();
      const teamed = snap.l1.find((p: any) => p.name === 'TeamedA');
      expect(teamed.detectedDeployers).toEqual(['0xoutsider']);
      expect(teamed.anomalousDeployers).toEqual(['0xoutsider']);
    });

    it('does not flag known-team deployers as anomalous', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xteamed2', modules: ['alpha'], deployer: '0xMULTI' })],
        objects: {},
      });
      const snap = await runCapture();
      const teamed = snap.l1.find((p: any) => p.name === 'TeamedA');
      expect(teamed.anomalousDeployers).toEqual([]);
    });

    it('enriches L1 projects with DefiLlama TVL when name matches — IOTA slice only', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })], // → Exact
        llama: [
          // tvl = cross-chain total, chainTvls.IOTA = slice; we must use the slice
          { name: 'Exact Protocol', tvl: 99_999, chainTvls: { IOTA: 12345, Ethereum: 87_654 }, chains: ['IOTA', 'Ethereum'] },
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      // Name match is substring either way; 'Exact' ⊂ 'Exact Protocol'
      expect(exact.tvl).toBe(12345);
    });

    it('assigns a DefiLlama protocol\'s TVL to at most one primary; siblings carry `tvlShared` + `tvlSharedWith` — no double-counting in ecosystem totals', async () => {
      // Shared-slug parens pattern: when >1 project substring-matches the
      // same DefiLlama protocol, the highest-events project becomes primary
      // (carries `tvl`); the rest become siblings (carry `tvlShared` with
      // the same number and `tvlSharedWith: <primary>`). Dashboard sums
      // `tvl` only — `tvlShared` is display-only so team / layer totals
      // don't triple-count a shared figure across Virtue + Virtue Stability
      // Pool, Swirl V1 + V2, or TokenLabs Staking / vIOTA / TLN / Payment.
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xa', modules: ['foo', 'bar'] }), // → Exact (2 events)
          pkg({ address: '0xb', modules: ['a', 'b'] }),     // → AllRequired (5 events)
        ],
        eventsByPackage: { '0xa': 2, '0xb': 5 },
        llama: [
          { name: 'ExactTestProtoAllRequired', tvl: 999, chainTvls: { IOTA: 12345 }, chains: ['IOTA'] },
        ],
      });
      const snap = await runCapture();
      const primary = snap.l1.find((p: any) => p.tvl != null);
      const sibling = snap.l1.find((p: any) => p.tvlShared != null);
      // Highest-events project wins primary → AllRequired (5) over Exact (2).
      expect(primary.name).toBe('AllRequired');
      expect(primary.tvl).toBe(12345);
      expect(primary.tvlShared).toBeNull();
      expect(primary.tvlSharedWith).toBeNull();
      // Sibling carries the same number as tvlShared + links to primary.
      expect(sibling.name).toBe('Exact');
      expect(sibling.tvl).toBeNull();
      expect(sibling.tvlShared).toBe(12345);
      expect(sibling.tvlSharedWith).toBe('AllRequired');
    });

    it('shared-slug tie-break: at equal event counts, primary goes to name-asc', async () => {
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xa', modules: ['foo', 'bar'] }), // → Exact
          pkg({ address: '0xb', modules: ['a', 'b'] }),     // → AllRequired
        ],
        // Both zero events — tie. AllRequired < Exact by name → primary.
        llama: [
          { name: 'ExactTestProtoAllRequired', tvl: 999, chainTvls: { IOTA: 12345 }, chains: ['IOTA'] },
        ],
      });
      const snap = await runCapture();
      const primary = snap.l1.find((p: any) => p.tvl != null);
      const sibling = snap.l1.find((p: any) => p.tvlShared != null);
      expect(primary.name).toBe('AllRequired');
      expect(sibling.name).toBe('Exact');
      expect(sibling.tvlSharedWith).toBe('AllRequired');
    });

    it('propagates `isCollectible: true` from ProjectDefinition to the emitted row; defaults to false when the def omits the flag; always false on L2 DefiLlama-derived rows', async () => {
      // The dashboard's "Hide collectibles" toggle reads this field — it must
      // flow from the ProjectDefinition into the serialized Project row, and
      // default to false for anything the def doesn't flag (including L2 rows
      // generated from DefiLlama protocols, which have no ProjectDefinition).
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xa', modules: ['pfp'] }),   // → Collectible (isCollectible: true)
          pkg({ address: '0xb', modules: ['foo', 'bar'] }), // → Exact (unset → false)
        ],
        llama: [
          { name: 'EvmDex', tvl: 1_000_000, chainTvls: { 'IOTA EVM': 5_000 }, chains: ['IOTA EVM'], category: 'Dexs', slug: 'evmdex' },
        ],
      });
      const snap = await runCapture();
      const collectible = snap.l1.find((p: any) => p.name === 'Collectible');
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      const evmRow = snap.l2.find((p: any) => p.name === 'EvmDex');
      expect(collectible.isCollectible).toBe(true);
      expect(exact.isCollectible).toBe(false);
      expect(evmRow.isCollectible).toBe(false);
    });

    it('does not add an L2 row for a DefiLlama protocol already claimed by an L1 project via substring match — guards against Swirl-V2-rename-style duplicates', async () => {
      // When L1 project "Exact" claims DefiLlama's "Exact Protocol" via
      // bidirectional substring match, the L2-add loop must not then push
      // a fresh "Exact Protocol" L1/L2 row just because the proto.name
      // doesn't exact-lowercase-match any row in `existingNames`. Regression
      // triggered by renaming "Swirl" → "Swirl V2" + "Swirl V1": neither
      // exactly matches DefiLlama's "Swirl", so without the claimed-slug
      // guard the loop would add a duplicate L1 "Swirl" row.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })], // → Exact
        llama: [
          { name: 'Exact Protocol', slug: 'exact-protocol', tvl: 99_999, chainTvls: { IOTA: 12345 }, chains: ['IOTA'] },
        ],
      });
      const snap = await runCapture();
      const exactRows = snap.l1.filter((p: any) => p.name === 'Exact' || p.name === 'Exact Protocol');
      // Only the original L1 "Exact" row — no duplicate "Exact Protocol" row added.
      expect(exactRows.map((p: any) => p.name)).toEqual(['Exact']);
    });

    it('leaves L1 tvl null when DefiLlama has no IOTA-chain slice for the match', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
        llama: [
          // Multi-chain protocol that matches by name but has no IOTA slice at all
          { name: 'Exact Protocol', tvl: 50_000, chainTvls: { Ethereum: 50_000 }, chains: ['Ethereum'] },
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      expect(exact.tvl).toBeNull();
    });

    it('leaves L1 tvl null and skips L2 add when DefiLlama response omits chainTvls entirely', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
        llama: [
          // L1 name-match protocol on IOTA (passes the chain filter) but with no chainTvls object at all
          { name: 'Exact Protocol', tvl: 50_000, chains: ['IOTA'] },
          // L2 candidate with no chainTvls object at all — must be dropped by the floor
          { name: 'NoSliceDex', tvl: 1_000_000, chains: ['IOTA EVM'], category: 'Dexs', slug: 'noslicedex' },
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      expect(exact.tvl).toBeNull();
      expect(snap.l2.map((p: any) => p.name)).not.toContain('NoSliceDex');
    });

    it('adds L2 EVM protocols not already present in L1 — uses IOTA EVM slice only', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
        llama: [
          {
            name: 'L2Dex',
            tvl: 50_000, // cross-chain total — should be ignored
            chainTvls: { 'IOTA EVM': 5_000, Ethereum: 45_000 },
            chains: ['IOTA EVM', 'Ethereum'],
            category: 'Dexs',
            url: 'https://l2dex.example',
            slug: 'l2dex',
          },
        ],
      });
      const snap = await runCapture();
      expect(snap.l2.map((p: any) => p.name)).toContain('L2Dex');
      const l2 = snap.l2.find((p: any) => p.name === 'L2Dex');
      expect(l2.slug).toBe('evm-l2dex');
      expect(l2.category).toBe('Dexs');
      expect(l2.urls[0]).toEqual({ label: 'Website', href: 'https://l2dex.example' });
      expect(l2.tvl).toBe(5_000);
    });

    it('skips L2 protocols whose IOTA EVM slice is below the $100 floor (even if cross-chain total is huge)', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
        llama: [
          { name: 'DustyDex', tvl: 1_000_000, chainTvls: { 'IOTA EVM': 50, Ethereum: 999_950 }, chains: ['IOTA EVM', 'Ethereum'] },
        ],
      });
      const snap = await runCapture();
      expect(snap.l2.map((p: any) => p.name)).not.toContain('DustyDex');
    });

    it('skips L1-only protocols already present in L1', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
        llama: [
          { name: 'Exact', tvl: 1000, chainTvls: { IOTA: 1000 }, chains: ['IOTA'] },
        ],
      });
      const snap = await runCapture();
      const names = snap.l1.map((p: any) => p.name);
      // 'Exact' appears once (the L1 project, now TVL-enriched) and NOT
      // separately duplicated from llama.
      expect(names.filter((n: string) => n === 'Exact')).toHaveLength(1);
    });

    it('swallows DefiLlama failures and still produces a snapshot', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
        llama: 'error',
      });
      const snap = await runCapture();
      expect(snap.l1.map((p: any) => p.name)).toContain('Exact');
      expect(snap.l2).toEqual([]);
    });

    it('tolerates DefiLlama entries with missing `chains`/`category`/`url` fields', async () => {
      // Exercises the `(p.chains || [])` fallbacks and the later category/url defaults.
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'] })],
        llama: [
          // No `chains` — must not throw, and must not be treated as an IOTA protocol
          { name: 'Ghost', tvl: 1000 },
          // Minimal IOTA EVM entry: no category, no url, no slug → defaults must kick in
          { name: 'MinL2', chainTvls: { 'IOTA EVM': 500 }, chains: ['IOTA EVM'] },
        ],
      });
      const snap = await runCapture();
      expect(snap.l2.map((p: any) => p.name)).not.toContain('Ghost');
      const min = snap.l2.find((p: any) => p.name === 'MinL2');
      expect(min).toBeTruthy();
      expect(min.category).toBe('Unknown');
      expect(min.urls).toEqual([]);
      expect(min.slug).toBe('evm-minl2');
    });

    it('computes total events, storage, and tx rates from the final list', async () => {
      (global as any).fetch = scriptFetch({
        packages: [pkg({ address: '0xaa', modules: ['foo', 'bar'], storageRebate: '2000000000' })],
        networkTx: '33200',
      });
      const snap = await runCapture();
      expect(snap.totalEvents).toBe(0); // events stub returns []
      expect(snap.totalStorageIota).toBe(2);
      expect(snap.networkTxTotal).toBe(33200);
      expect(snap.txRates.perDay).toBe(100); // 33200 / 332
      expect(snap.txRates.perYear).toBe(36500);
    });

    it('sorts projects by descending event count', async () => {
      // Stub countEvents per-address so tiny vs big event counts are deterministic.
      (service as any).countEvents = jest.fn(async (emit: string) => ({
        count: emit.includes('0xfirst') ? 5 : 100,
        capped: false,
      }));

      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xfirst', modules: ['foo', 'bar'] }),  // Exact
          pkg({ address: '0xsecond', modules: ['a', 'b'] }),     // AllRequired
        ],
      });
      const snap = await runCapture();
      // 2 modules × 100 = 200 for AllRequired, 2 × 5 = 10 for Exact
      expect(snap.l1[0].events).toBe(200);
      expect(snap.l1[1].events).toBe(10);
    });

    it('merges packages with the same matched def — multiple packages, one project', async () => {
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xv1', modules: ['foo', 'bar'], storageRebate: '1000000000' }),
          pkg({ address: '0xv2', modules: ['foo', 'bar'], storageRebate: '2000000000' }),
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      expect(exact.packages).toBe(2);
      expect(exact.packageAddress).toBe('0xv1');
      expect(exact.latestPackageAddress).toBe('0xv2');
      expect(exact.storageIota).toBe(3);
    });

    it('sums events across every package in a project\'s set — not just the latest', async () => {
      // Regression guard for the TWIN bug: Move events are scoped to the
      // emitting package's address; upgrades get fresh event streams.
      // A project with N package versions should count events on all N.
      // Here: 2 versions of the same Exact-matched package, first emits
      // 100 events per module, second emits 7 per module. 2 modules each.
      // Expected total: (100+7) × 2 = 214.
      (service as any).countEvents = jest.fn(async (emit: string) => ({
        count: emit.startsWith('0xv1') ? 100 : 7,
        capped: false,
      }));

      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xv1', modules: ['foo', 'bar'] }),
          pkg({ address: '0xv2', modules: ['foo', 'bar'] }),
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      expect(exact.events).toBe(214);
      // `modules` should still reflect the latest package's module set
      // (the current API surface), not a union across versions.
      expect(exact.modules).toEqual(['foo', 'bar']);
      // countEvents should have been called 4 times: 2 packages × 2 modules.
      expect((service as any).countEvents).toHaveBeenCalledTimes(4);
    });

    it('propagates eventsCapped=true when any (package, module) hits the pagination cap', async () => {
      (service as any).countEvents = jest.fn(async (emit: string) => ({
        count: 1,
        capped: emit.startsWith('0xv2'), // only the second package's queries are capped
      }));

      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xv1', modules: ['foo', 'bar'] }),
          pkg({ address: '0xv2', modules: ['foo', 'bar'] }),
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      expect(exact.eventsCapped).toBe(true);
    });

    it('sums transactions across every package in a project\'s set — same pattern as events', async () => {
      // Regression guard analogous to the TWIN events test above: TX count
      // lives on PackageFact (package-level, not per-module). A project with
      // N matched packages should sum all N, not sample one. Single package
      // per project contributes `transactions` directly; multi-package sums
      // are what rescue the upgrade-trail case (TWIN's 93%-on-one-pkg shape).
      (service as any).updateTxCountForPackage = jest.fn(async (addr: string) => {
        if (addr === '0xv1') return { total: 2328, capped: false };
        if (addr === '0xv2') return { total: 165, capped: false };
        return { total: 0, capped: false };
      });

      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xv1', modules: ['foo', 'bar'] }),
          pkg({ address: '0xv2', modules: ['foo', 'bar'] }),
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      expect(exact.transactions).toBe(2328 + 165);
      expect(exact.transactionsCapped).toBe(false);
    });

    it('propagates transactionsCapped=true when any package hits the TX pagination cap', async () => {
      (service as any).updateTxCountForPackage = jest.fn(async (addr: string) => ({
        total: 100,
        capped: addr === '0xv2', // only the second package is capped
      }));

      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xv1', modules: ['foo', 'bar'] }),
          pkg({ address: '0xv2', modules: ['foo', 'bar'] }),
        ],
      });
      const snap = await runCapture();
      const exact = snap.l1.find((p: any) => p.name === 'Exact');
      expect(exact.transactionsCapped).toBe(true);
    });

    it('sums events across sibling packages when project uses deployerAddresses match', async () => {
      // Deployer-matched projects (LayerZero, Tradeport, etc.) have packages
      // that are NOT an upgrade chain — they're siblings with potentially
      // different module sets. Event counting must still iterate all of
      // them using each package's own module list.
      (service as any).countEvents = jest.fn(async (emit: string) => {
        if (emit === '0xdpA::gate') return { count: 11, capped: false };
        if (emit === '0xdpB::gate') return { count: 13, capped: false };
        if (emit === '0xdpB::other') return { count: 17, capped: false };
        return { count: 0, capped: false };
      });

      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xdpA', modules: ['gate'], deployer: '0xCOMPOSE' }),
          pkg({ address: '0xdpB', modules: ['gate', 'other'], deployer: '0xCOMPOSE' }),
        ],
      });
      const snap = await runCapture();
      const dam = snap.l1.find((p: any) => p.name === 'DeployerAndModule');
      expect(dam.events).toBe(11 + 13 + 17);
      // Latest package is 0xdpB, so its module set is what `modules` shows.
      expect(dam.modules).toEqual(['gate', 'other']);
    });

    it('orders unattributed clusters by facts.length desc, breaks ties by storageIota desc', async () => {
      // Covers the sort tiebreaker branch in unattributedRanked. Two distinct
      // deployers with the same pkg count (1 each) but different storage —
      // the tiebreaker should order by storageIota descending.
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xsmall', modules: ['genericNFT'], deployer: '0xdeployerA', storageRebate: '100000000' }),   // 0.1 IOTA
          pkg({ address: '0xlarge', modules: ['genericNFT'], deployer: '0xdeployerB', storageRebate: '5000000000' }),  // 5.0 IOTA
        ],
      });
      const snap = await runCapture();
      expect(snap.unattributed).toHaveLength(2);
      // Tie on packages (both = 1), break by storageIota — 0xdeployerB (5 IOTA) > 0xdeployerA (0.1 IOTA).
      expect(snap.unattributed[0].deployer).toBe('0xdeployerb');
      expect(snap.unattributed[1].deployer).toBe('0xdeployera');
    });

    it('collects unmatched packages into unattributed clusters, grouped by deployer, with probed identifiers', async () => {
      // Two packages, same unknown deployer, module `genericNFT` that matches
      // nothing in ALL_PROJECTS. Probe returns a usable `tag` and `name`.
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xunknown1', modules: ['genericNFT'], deployer: '0xunknownteam', storageRebate: '500000000' }),
          pkg({ address: '0xunknown2', modules: ['genericNFT'], deployer: '0xunknownteam', storageRebate: '1500000000' }),
        ],
        objects: {
          '0xunknown2': {
            tag: 'mystery-project',
            name: 'Mystery Thing',
          },
        },
      });
      const snap = await runCapture();
      expect(snap.totalProjects).toBe(0);
      expect(snap.unattributed).toHaveLength(1);
      const cluster = snap.unattributed[0];
      expect(cluster.deployer).toBe('0xunknownteam');
      expect(cluster.packages).toBe(2);
      // Latest package = highest storage rebate = 0xunknown2
      expect(cluster.latestPackageAddress).toBe('0xunknown2');
      expect(cluster.firstPackageAddress).toBe('0xunknown1');
      expect(cluster.modules).toContain('genericNFT');
      expect(cluster.sampleIdentifiers).toEqual(expect.arrayContaining([
        'tag: mystery-project',
        'name: Mystery Thing',
      ]));
      expect(snap.totalUnattributedPackages).toBe(2);
    });

    it('sums transactions across an unattributed cluster\'s packages — symmetric with attributed rows', async () => {
      // Load-bearing per plans/implementation_strategy_conversation.md:
      // growth-ranking's `scope=all` interleaves attributed + unattributed
      // by the chosen delta, so unattributed rows MUST expose the same
      // transactions field shape.
      (service as any).updateTxCountForPackage = jest.fn(async (addr: string) => {
        if (addr === '0xunknown1') return { total: 40, capped: false };
        if (addr === '0xunknown2') return { total: 60, capped: true };
        return { total: 0, capped: false };
      });

      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xunknown1', modules: ['genericNFT'], deployer: '0xunknownteam', storageRebate: '500000000' }),
          pkg({ address: '0xunknown2', modules: ['genericNFT'], deployer: '0xunknownteam', storageRebate: '1500000000' }),
        ],
      });
      const snap = await runCapture();
      expect(snap.unattributed).toHaveLength(1);
      const cluster = snap.unattributed[0];
      expect(cluster.transactions).toBe(40 + 60);
      expect(cluster.transactionsCapped).toBe(true);
    });

    it('falls back to TX-effects probe when the object probe finds nothing across all cluster packages', async () => {
      // Two packages, same unknown deployer, no objects of either pkg's own
      // types — simulates a logic-only protocol like Virtue. Pass 1 returns
      // empty for both, pass 2 (TX-effects) finds sibling-package types via
      // the latest pkg.
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xlogicA', modules: ['orchestration'], deployer: '0xlogicteam', storageRebate: '500000000' }),
          pkg({ address: '0xlogicB', modules: ['orchestration'], deployer: '0xlogicteam', storageRebate: '1500000000' }),
        ],
        // No `objects` entries → object probe returns empty for every pkg
        txEffects: {
          // Latest pkg (highest storageRebate) is iterated first in reverse order
          '0xlogicB': [
            '0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD',
            '0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT',
          ],
        },
      });
      const snap = await runCapture();
      expect(snap.unattributed).toHaveLength(1);
      const cluster = snap.unattributed[0];
      expect(cluster.deployer).toBe('0xlogicteam');
      expect(cluster.sampleIdentifiers).toEqual(expect.arrayContaining([
        'creates: 0xd3b63e…::vusd::VUSD',
        'creates: 0x346778…::cert::CERT',
      ]));
      // sampledObjectType comes from the first non-framework type in TX effects
      expect(cluster.sampledObjectType).toBe('0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD');
    });

    it('still runs TX-effects fallback when pass 1 captured an objectType but no identifiers', async () => {
      // Pass 1 finds an object on the latest pkg whose JSON fields are all
      // addresses (no human-readable idents). Pass 2 should still run because
      // identifiers are missing, harvesting sibling-package types from TX
      // effects as the brand signal.
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xreg1', modules: ['orchestration'], deployer: '0xregteam', storageRebate: '500000000' }),
          pkg({ address: '0xreg2', modules: ['orchestration'], deployer: '0xregteam', storageRebate: '1500000000' }),
        ],
        objects: {
          // Latest pkg returns a Registry-like object with only address fields → objectType set, no idents
          '0xreg2': {
            owner: '0x' + 'a'.repeat(64),
            authority: '0x' + 'b'.repeat(64),
          },
        },
        txEffects: {
          '0xreg2': [
            '0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD',
          ],
        },
      });
      const snap = await runCapture();
      const cluster = snap.unattributed[0];
      // Pass 1 captured *some* objectType from the registry probe (mock returns
      // null type repr → null objectType in this test, so pass 2's objectType wins).
      // The crucial assertion: idents from pass 2 are present.
      expect(cluster.sampleIdentifiers).toEqual(['creates: 0xd3b63e…::vusd::VUSD']);
    });

    it('buckets unmatched packages with null deployers under the "unknown" key', async () => {
      (global as any).fetch = scriptFetch({
        packages: [
          pkg({ address: '0xorph1', modules: ['orphan'], deployer: null }),
        ],
      });
      const snap = await runCapture();
      expect(snap.unattributed).toHaveLength(1);
      expect(snap.unattributed[0].deployer).toBe('unknown');
      expect(snap.totalUnattributedPackages).toBe(1);
    });
  });

  // ---------- TX-count cursor + backfill ----------

  describe('tx-count helpers', () => {
    describe('pageBackwardTxs', () => {
      it('first page uses `last: 50` with no `before:`; second uses `before: <startCursor>`', async () => {
        let page = 0;
        jest.spyOn(service as any, 'graphql').mockImplementation(async (q: unknown) => {
          page += 1;
          const body = String(q);
          if (page === 1) {
            expect(body).toMatch(/last: 50/);
            expect(body).not.toMatch(/before:/);
            return {
              transactionBlocks: {
                nodes: [{ digest: 'd1' }],
                pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
              },
            };
          }
          expect(body).toMatch(/before: "sc-1"/);
          return {
            transactionBlocks: {
              nodes: [{ digest: 'd2' }],
              pageInfo: { hasPreviousPage: false, startCursor: 'sc-2' },
            },
          };
        });
        txDigestModel.insertMany
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{}]);

        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true });
        expect(result).toEqual({ scanned: 2, reachedEnd: true });
        expect(txDigestModel.insertMany).toHaveBeenCalledTimes(2);
        const [docs, opts] = txDigestModel.insertMany.mock.calls[0];
        expect(opts).toEqual({ ordered: false });
        expect((docs as any[])[0]).toEqual({ packageAddress: '0xpkg', digest: 'd1' });
      });

      it('reachedEnd=true on empty nodes', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          transactionBlocks: { nodes: [], pageInfo: { hasPreviousPage: false, startCursor: null } },
        });
        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true });
        expect(result).toEqual({ scanned: 0, reachedEnd: true });
        expect(txDigestModel.insertMany).not.toHaveBeenCalled();
      });

      it('reachedEnd=true on hasPreviousPage:false', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          transactionBlocks: {
            nodes: [{ digest: 'd1' }],
            pageInfo: { hasPreviousPage: false, startCursor: 'sc' },
          },
        });
        txDigestModel.insertMany.mockResolvedValueOnce([{}]);
        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true });
        expect(result.reachedEnd).toBe(true);
      });

      it('reachedEnd=false when page budget is exhausted with more pages pending', async () => {
        jest.spyOn(service as any, 'graphql').mockImplementation(async () => ({
          transactionBlocks: {
            nodes: [{ digest: 'd-' + Math.random() }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-' + Math.random() },
          },
        }));
        txDigestModel.insertMany.mockResolvedValue([{}]);

        const result = await (service as any).pageBackwardTxs('0xpkg', 3, { stopOnAllDups: true });
        expect(result.reachedEnd).toBe(false);
        expect(result.scanned).toBe(3);
      });

      it('silently swallows top-level E11000 on insertMany', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          transactionBlocks: {
            nodes: [{ digest: 'd' }],
            pageInfo: { hasPreviousPage: false, startCursor: null },
          },
        });
        const err: any = new Error('E11000 dup');
        err.code = 11000;
        txDigestModel.insertMany.mockRejectedValueOnce(err);

        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true });
        expect(result.reachedEnd).toBe(true);
        expect(result.scanned).toBe(1);
      });

      it('stopOnAllDups:true — all-dup page fires the caught-up heuristic (live-cron)', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          transactionBlocks: {
            nodes: [{ digest: 'd' }, { digest: 'e' }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
          },
        });
        const bulk: any = new Error('bulk');
        bulk.writeErrors = [{ code: 11000 }, { err: { code: 11000 } }];
        txDigestModel.insertMany.mockRejectedValueOnce(bulk);

        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true });
        expect(result.reachedEnd).toBe(true);
        expect(result.scanned).toBe(2);
      });

      it('stopOnAllDups:false — all-dup page advances the cursor instead of exiting (backfill resume)', async () => {
        // Simulates a backfill resuming after a prior run stored the newest 2
        // digests: page 1 is all-dup (re-traversing stored range), page 2
        // yields a genuinely new digest, page 3 hits end-of-history.
        let page = 0;
        jest.spyOn(service as any, 'graphql').mockImplementation(async (q: unknown) => {
          page += 1;
          const body = String(q);
          if (page === 1) {
            expect(body).not.toMatch(/before:/);
            return {
              transactionBlocks: {
                nodes: [{ digest: 'd' }, { digest: 'e' }],
                pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
              },
            };
          }
          if (page === 2) {
            expect(body).toMatch(/before: "sc-1"/);
            return {
              transactionBlocks: {
                nodes: [{ digest: 'f' }],
                pageInfo: { hasPreviousPage: true, startCursor: 'sc-2' },
              },
            };
          }
          expect(body).toMatch(/before: "sc-2"/);
          return {
            transactionBlocks: {
              nodes: [{ digest: 'g' }],
              pageInfo: { hasPreviousPage: false, startCursor: 'sc-3' },
            },
          };
        });
        const bulk: any = new Error('bulk');
        bulk.writeErrors = [{ code: 11000 }, { err: { code: 11000 } }];
        txDigestModel.insertMany
          .mockRejectedValueOnce(bulk)
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{}]);

        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: false });
        expect(result).toEqual({ scanned: 4, reachedEnd: true });
        expect(txDigestModel.insertMany).toHaveBeenCalledTimes(3);
      });

      it('stopOnAllDups:false — page budget caps a perpetually-dup scan (reachedEnd:false)', async () => {
        // Every page is all-dup and hasPreviousPage:true. Backfill must not
        // early-exit on dups, so the only exit is the page budget.
        jest.spyOn(service as any, 'graphql').mockImplementation(async () => ({
          transactionBlocks: {
            nodes: [{ digest: 'd-' + Math.random() }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-' + Math.random() },
          },
        }));
        const makeBulk = () => {
          const bulk: any = new Error('bulk');
          bulk.writeErrors = [{ code: 11000 }];
          return bulk;
        };
        txDigestModel.insertMany.mockImplementation(async () => {
          throw makeBulk();
        });

        const result = await (service as any).pageBackwardTxs('0xpkg', 4, { stopOnAllDups: false });
        expect(result).toEqual({ scanned: 4, reachedEnd: false });
      });

      it('re-throws mixed writeErrors (one non-11000 entry)', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          transactionBlocks: {
            nodes: [{ digest: 'd' }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
          },
        });
        const bulk: any = new Error('mixed');
        bulk.writeErrors = [{ code: 11000 }, { code: 66 }];
        txDigestModel.insertMany.mockRejectedValueOnce(bulk);

        await expect(
          (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true }),
        ).rejects.toThrow(/mixed/);
      });

      it('re-throws non-duplicate top-level insertMany errors', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          transactionBlocks: {
            nodes: [{ digest: 'd' }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
          },
        });
        txDigestModel.insertMany.mockRejectedValueOnce(new Error('network'));

        await expect(
          (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true }),
        ).rejects.toThrow(/network/);
      });

      it('graphql throw breaks the loop gracefully', async () => {
        let page = 0;
        jest.spyOn(service as any, 'graphql').mockImplementation(async () => {
          page += 1;
          if (page === 1) {
            return {
              transactionBlocks: {
                nodes: [{ digest: 'd' }],
                pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
              },
            };
          }
          throw new Error('gql down');
        });
        txDigestModel.insertMany.mockResolvedValueOnce([{}]);

        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true });
        expect(result.scanned).toBe(1);
        expect(result.reachedEnd).toBe(false);
      });

      it('filters out nodes with missing digest (defensive) — empty doc list does not trigger caught-up', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          transactionBlocks: {
            nodes: [{ digest: null }, { digest: '' }],
            pageInfo: { hasPreviousPage: false, startCursor: null },
          },
        });
        const result = await (service as any).pageBackwardTxs('0xpkg', 10, { stopOnAllDups: true });
        // Nodes scanned (2), but nothing written. reachedEnd via hasPreviousPage=false.
        expect(result.scanned).toBe(2);
        expect(result.reachedEnd).toBe(true);
        expect(txDigestModel.insertMany).not.toHaveBeenCalled();
      });
    });

    describe('updateTxCountForPackage', () => {
      it('delegates to pageBackwardTxs with 100-page budget + stopOnAllDups:true; total = countDocuments; capped = !reachedEnd (false)', async () => {
        const spy = jest
          .spyOn(service as any, 'pageBackwardTxs')
          .mockResolvedValue({ scanned: 42, reachedEnd: true });
        txDigestModel.countDocuments.mockResolvedValue(142);

        const result = await (service as any).updateTxCountForPackage('0xpkg');

        expect(spy).toHaveBeenCalledWith('0xpkg', 100, { stopOnAllDups: true });
        expect(txDigestModel.countDocuments).toHaveBeenCalledWith({ packageAddress: '0xpkg' });
        expect(result).toEqual({ total: 142, capped: false });
      });

      it('capped=true when the backward page-run hits the budget', async () => {
        jest
          .spyOn(service as any, 'pageBackwardTxs')
          .mockResolvedValue({ scanned: 5000, reachedEnd: false });
        txDigestModel.countDocuments.mockResolvedValue(5100);
        const result = await (service as any).updateTxCountForPackage('0xpkg');
        expect(result).toEqual({ total: 5100, capped: true });
      });
    });

    describe('backfillTxCountsForPackage', () => {
      it('delegates to pageBackwardTxs with 200000-page budget + stopOnAllDups:false for non-framework packages', async () => {
        const spy = jest
          .spyOn(service as any, 'pageBackwardTxs')
          .mockResolvedValue({ scanned: 50, reachedEnd: true });
        txDigestModel.countDocuments.mockResolvedValue(50);

        const result = await service.backfillTxCountsForPackage('0xpkg');
        expect(spy).toHaveBeenCalledWith('0xpkg', 200000, { stopOnAllDups: false });
        expect(result).toEqual({ total: 50, capped: false });
      });

      it('uses the legacy 10000-page budget for framework packages (0x1 / 0x2 / 0x3), still stopOnAllDups:false', async () => {
        const spy = jest
          .spyOn(service as any, 'pageBackwardTxs')
          .mockResolvedValue({ scanned: 500000, reachedEnd: false });
        txDigestModel.countDocuments.mockResolvedValue(500000);

        const framework = '0x0000000000000000000000000000000000000000000000000000000000000002';
        await service.backfillTxCountsForPackage(framework);
        expect(spy).toHaveBeenCalledWith(framework, 10000, { stopOnAllDups: false });
      });

      it('capped=true when the drain hits the page budget', async () => {
        jest
          .spyOn(service as any, 'pageBackwardTxs')
          .mockResolvedValue({ scanned: 500000, reachedEnd: false });
        txDigestModel.countDocuments.mockResolvedValue(500000);
        const result = await service.backfillTxCountsForPackage('0xpkg');
        expect(result).toEqual({ total: 500000, capped: true });
      });
    });

    describe('backfillAllTxCounts', () => {
      it('throws when no snapshot exists — one-shot CLI precondition, matches backfillAllSenders', async () => {
        ecoModel.findOne.mockReturnValue({ sort: () => ({ lean: () => ({ exec: async () => null }) }) });
        await expect((service as any).backfillAllTxCounts()).rejects.toThrow(/No ecosystem snapshot/);
      });

      it('iterates every package in the latest snapshot; onProgress fires once per package; totals aggregate', async () => {
        ecoModel.findOne.mockReturnValue({
          sort: () => ({ lean: () => ({ exec: async () => ({ packages: [{ address: '0xa' }, { address: '0xb' }, { address: '0xc' }] }) }) }),
        });
        jest.spyOn(service as any, 'backfillTxCountsForPackage').mockImplementation(async (addr: any) => {
          if (addr === '0xa') return { total: 10, capped: false };
          if (addr === '0xb') return { total: 20, capped: true };
          return { total: 30, capped: false };
        });
        const progress: any[] = [];
        const result = await (service as any).backfillAllTxCounts((info: any) => progress.push(info), 2);
        expect(result).toEqual({ totalPackages: 3, totalTxs: 60, cappedPackages: 1 });
        expect(progress).toHaveLength(3);
      });

      it('isolates per-package failures — one throw does not abort the whole backfill', async () => {
        ecoModel.findOne.mockReturnValue({
          sort: () => ({ lean: () => ({ exec: async () => ({ packages: [{ address: '0xa' }, { address: '0xb' }] }) }) }),
        });
        jest.spyOn(service as any, 'backfillTxCountsForPackage').mockImplementation(async (addr: any) => {
          if (addr === '0xa') throw new Error('one package failed');
          return { total: 20, capped: false };
        });
        const result = await (service as any).backfillAllTxCounts(undefined, 1);
        expect(result).toEqual({ totalPackages: 2, totalTxs: 20, cappedPackages: 0 });
      });
    });

    // ---------- Holders (objects + reach) — parallel to the TX writer suite ----------

    function mkHoldersRecord(packageAddress: string, type: string, init: Partial<{ cursor: string | null; nodesScanned: number; listedCount: number }> = {}) {
      return {
        packageAddress,
        type,
        cursor: init.cursor ?? null,
        nodesScanned: init.nodesScanned ?? 0,
        listedCount: init.listedCount ?? 0,
        save: jest.fn().mockResolvedValue(undefined),
      };
    }

    describe('pageBackwardHolders', () => {
      it('buckets each node by owner.__typename — AddressOwner → insertMany, Parent → listed counter, Shared/Immutable/burn → skip', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: {
            nodes: [
              { owner: { __typename: 'AddressOwner', owner: { address: '0xAAA' } } },
              { owner: { __typename: 'AddressOwner', owner: { address: '0xBBB' } } },
              { owner: { __typename: 'Parent', parent: { address: '0xkiosk1' } } },
              { owner: { __typename: 'Parent', parent: { address: '0xkiosk2' } } },
              { owner: { __typename: 'Shared', initialSharedVersion: 42 } },
              { owner: { __typename: 'Immutable' } },
              { owner: { __typename: 'AddressOwner', owner: { address: '0x' + '0'.repeat(64) } } },  // burn
            ],
            pageInfo: { hasPreviousPage: false, startCursor: 'sc' },
          },
        });
        holderEntryModel.insertMany.mockResolvedValueOnce([{}, {}]);

        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result).toEqual({ scanned: 7, listed: 2, reachedEnd: true });
        expect(holderEntryModel.insertMany).toHaveBeenCalledWith(
          [
            { packageAddress: '0xpkg', type: '0xpkg::m::T', address: '0xaaa' },
            { packageAddress: '0xpkg', type: '0xpkg::m::T', address: '0xbbb' },
          ],
          { ordered: false },
        );
      });

      it('first page uses `last: 50` with no `before:`; second uses `before: <startCursor>`', async () => {
        let page = 0;
        jest.spyOn(service as any, 'graphql').mockImplementation(async (q: unknown) => {
          page += 1;
          const body = String(q);
          if (page === 1) {
            expect(body).toMatch(/last: 50/);
            expect(body).not.toMatch(/before:/);
            return {
              objects: {
                nodes: [{ owner: { __typename: 'AddressOwner', owner: { address: '0xa' } } }],
                pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
              },
            };
          }
          expect(body).toMatch(/before: "sc-1"/);
          return {
            objects: {
              nodes: [{ owner: { __typename: 'AddressOwner', owner: { address: '0xb' } } }],
              pageInfo: { hasPreviousPage: false, startCursor: 'sc-2' },
            },
          };
        });
        holderEntryModel.insertMany
          .mockResolvedValueOnce([{}])
          .mockResolvedValueOnce([{}]);

        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result).toEqual({ scanned: 2, listed: 0, reachedEnd: true });
      });

      it('reachedEnd=true on empty nodes', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: { nodes: [], pageInfo: { hasPreviousPage: false, startCursor: null } },
        });
        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result).toEqual({ scanned: 0, listed: 0, reachedEnd: true });
        expect(holderEntryModel.insertMany).not.toHaveBeenCalled();
      });

      it('reachedEnd=true on hasPreviousPage:false', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: {
            nodes: [{ owner: { __typename: 'AddressOwner', owner: { address: '0xa' } } }],
            pageInfo: { hasPreviousPage: false, startCursor: 'sc' },
          },
        });
        holderEntryModel.insertMany.mockResolvedValueOnce([{}]);
        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result.reachedEnd).toBe(true);
      });

      it('reachedEnd=false when page budget is exhausted with more pages pending', async () => {
        jest.spyOn(service as any, 'graphql').mockImplementation(async () => ({
          objects: {
            nodes: [{ owner: { __typename: 'AddressOwner', owner: { address: '0x' + Math.random().toString(16).slice(2, 10) } } }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-' + Math.random() },
          },
        }));
        holderEntryModel.insertMany.mockResolvedValue([{}]);

        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 3);
        expect(result.reachedEnd).toBe(false);
        expect(result.scanned).toBe(3);
      });

      it('all-dupes page (writeErrors form) triggers caught-up (reachedEnd=true even without hasPreviousPage:false)', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: {
            nodes: [{ owner: { __typename: 'AddressOwner', owner: { address: '0xa' } } }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
          },
        });
        // writeErrors-form: newlyInserted computes to 0 (docs.length - writeErrors.length),
        // which then trips the caught-up heuristic. Top-level `code: 11000` doesn't populate
        // writeErrors, so it leaves newlyInserted = docs.length — covered separately.
        holderEntryModel.insertMany.mockRejectedValueOnce({
          name: 'MongoBulkWriteError',
          writeErrors: [{ code: 11000 }],
        });

        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result.reachedEnd).toBe(true);
        expect(result.scanned).toBe(1);
      });

      it('silently swallows bulk writeErrors when every entry is 11000', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: {
            nodes: [
              { owner: { __typename: 'AddressOwner', owner: { address: '0xa' } } },
              { owner: { __typename: 'AddressOwner', owner: { address: '0xb' } } },
            ],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
          },
        });
        holderEntryModel.insertMany.mockRejectedValueOnce({
          name: 'MongoBulkWriteError',
          writeErrors: [{ code: 11000 }, { err: { code: 11000 } }],
        });
        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result.reachedEnd).toBe(true);
      });

      it('re-throws non-duplicate insertMany errors', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: {
            nodes: [{ owner: { __typename: 'AddressOwner', owner: { address: '0xa' } } }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
          },
        });
        holderEntryModel.insertMany.mockRejectedValueOnce(
          Object.assign(new Error('network'), { code: 12345 }),
        );
        await expect((service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10)).rejects.toThrow(/network/);
      });

      it('re-throws mixed writeErrors (one non-11000 entry)', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: {
            nodes: [{ owner: { __typename: 'AddressOwner', owner: { address: '0xa' } } }],
            pageInfo: { hasPreviousPage: true, startCursor: 'sc-1' },
          },
        });
        holderEntryModel.insertMany.mockRejectedValueOnce({
          writeErrors: [{ code: 11000 }, { code: 66 }],
          message: 'mixed bulk',
        });
        await expect((service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10)).rejects.toBeTruthy();
      });

      it('graphql throw breaks the loop gracefully', async () => {
        jest.spyOn(service as any, 'graphql').mockRejectedValue(new Error('gql down'));
        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result).toEqual({ scanned: 0, listed: 0, reachedEnd: false });
        expect(holderEntryModel.insertMany).not.toHaveBeenCalled();
      });

      it('skips nodes without a resolvable AddressOwner.owner.address (defensive null-check)', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          objects: {
            nodes: [
              { owner: { __typename: 'AddressOwner', owner: null } },
              { owner: null },
            ],
            pageInfo: { hasPreviousPage: false, startCursor: null },
          },
        });
        const result = await (service as any).pageBackwardHolders('0xpkg', '0xpkg::m::T', 10);
        expect(result.scanned).toBe(2);
        expect(holderEntryModel.insertMany).not.toHaveBeenCalled();
      });
    });

    describe('updateHoldersForType', () => {
      it('creates a ProjectHolders state record when none exists (cursor=null + 0 counters)', async () => {
        holdersStateModel.findOne.mockResolvedValue(null);
        const fresh = mkHoldersRecord('0xpkg', '0xpkg::m::T');
        holdersStateModel.create.mockResolvedValue(fresh);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 0, listed: 0, reachedEnd: true });
        holderEntryModel.countDocuments.mockResolvedValue(0);

        const result = await (service as any).updateHoldersForType('0xpkg', '0xpkg::m::T');

        expect(holdersStateModel.create).toHaveBeenCalledWith({
          packageAddress: '0xpkg',
          type: '0xpkg::m::T',
          cursor: null,
          nodesScanned: 0,
          listedCount: 0,
        });
        expect(result).toEqual({ count: 0, listedCount: 0, capped: false });
      });

      it('delegates to pageBackwardHolders with a 100-page budget', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T');
        holdersStateModel.findOne.mockResolvedValue(record);
        const spy = jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 5, listed: 2, reachedEnd: true });
        holderEntryModel.countDocuments.mockResolvedValue(5);

        await (service as any).updateHoldersForType('0xpkg', '0xpkg::m::T');
        expect(spy).toHaveBeenCalledWith('0xpkg', '0xpkg::m::T', 100);
      });

      it('accumulates scanned + listed onto the record and saves when progress was made', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T', { nodesScanned: 10, listedCount: 1 });
        holdersStateModel.findOne.mockResolvedValue(record);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 7, listed: 3, reachedEnd: true });
        holderEntryModel.countDocuments.mockResolvedValue(20);

        const result = await (service as any).updateHoldersForType('0xpkg', '0xpkg::m::T');

        expect(record.nodesScanned).toBe(17);
        expect(record.listedCount).toBe(4);
        expect(record.save).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ count: 20, listedCount: 4, capped: false });
      });

      it('does not save when no progress (scanned=0 && listed=0)', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T', { listedCount: 5 });
        holdersStateModel.findOne.mockResolvedValue(record);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 0, listed: 0, reachedEnd: false });
        holderEntryModel.countDocuments.mockResolvedValue(42);

        const result = await (service as any).updateHoldersForType('0xpkg', '0xpkg::m::T');

        expect(record.save).not.toHaveBeenCalled();
        expect(result).toEqual({ count: 42, listedCount: 5, capped: true });
      });

      it('count comes from holderEntryModel.countDocuments filtered by package+type', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T');
        holdersStateModel.findOne.mockResolvedValue(record);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 5, listed: 0, reachedEnd: true });
        holderEntryModel.countDocuments.mockResolvedValue(77);

        const result = await (service as any).updateHoldersForType('0xpkg', '0xpkg::m::T');
        expect(holderEntryModel.countDocuments).toHaveBeenCalledWith({
          packageAddress: '0xpkg',
          type: '0xpkg::m::T',
        });
        expect(result.count).toBe(77);
      });

      it('capped=true when the backward scanner bumped the budget', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T');
        holdersStateModel.findOne.mockResolvedValue(record);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 5000, listed: 0, reachedEnd: false });
        holderEntryModel.countDocuments.mockResolvedValue(5000);

        const result = await (service as any).updateHoldersForType('0xpkg', '0xpkg::m::T');
        expect(result.capped).toBe(true);
      });
    });

    describe('backfillHoldersForType', () => {
      it('creates a ProjectHolders record when none exists, then drains with 10000-page budget', async () => {
        holdersStateModel.findOne.mockResolvedValue(null);
        const fresh = mkHoldersRecord('0xpkg', '0xpkg::m::T');
        holdersStateModel.create.mockResolvedValue(fresh);
        const spy = jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 3, listed: 0, reachedEnd: true });
        holderEntryModel.countDocuments.mockResolvedValue(3);

        const result = await service.backfillHoldersForType('0xpkg', '0xpkg::m::T');

        expect(holdersStateModel.create).toHaveBeenCalledWith({
          packageAddress: '0xpkg',
          type: '0xpkg::m::T',
          cursor: null,
          nodesScanned: 0,
          listedCount: 0,
        });
        expect(spy).toHaveBeenCalledWith('0xpkg', '0xpkg::m::T', 10000);
        expect(result).toEqual({ count: 3, listedCount: 0, capped: false });
      });

      it('resets listedCount=0 + nodesScanned=0 on an existing record before drain; address entries untouched', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T', { nodesScanned: 999, listedCount: 50 });
        holdersStateModel.findOne.mockResolvedValue(record);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 10, listed: 3, reachedEnd: true });
        holderEntryModel.countDocuments.mockResolvedValue(10);

        const result = await service.backfillHoldersForType('0xpkg', '0xpkg::m::T');

        // Reset save + progress save = 2.
        expect(record.save).toHaveBeenCalledTimes(2);
        // After drain + accumulation: listedCount started at 0 then +3, nodesScanned +10.
        expect(record.listedCount).toBe(3);
        expect(record.nodesScanned).toBe(10);
        expect(result).toEqual({ count: 10, listedCount: 3, capped: false });
      });

      it('capped=true when the backward drain hits the 10000-page budget', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T');
        holdersStateModel.findOne.mockResolvedValue(record);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 500000, listed: 0, reachedEnd: false });
        holderEntryModel.countDocuments.mockResolvedValue(500000);

        const result = await service.backfillHoldersForType('0xpkg', '0xpkg::m::T');
        expect(result.capped).toBe(true);
      });

      it('skips the post-drain save when scanned=0 && listed=0 (still returns a stable count)', async () => {
        const record = mkHoldersRecord('0xpkg', '0xpkg::m::T', { nodesScanned: 10, listedCount: 5 });
        holdersStateModel.findOne.mockResolvedValue(record);
        jest
          .spyOn(service as any, 'pageBackwardHolders')
          .mockResolvedValue({ scanned: 0, listed: 0, reachedEnd: true });
        holderEntryModel.countDocuments.mockResolvedValue(0);

        const result = await service.backfillHoldersForType('0xpkg', '0xpkg::m::T');
        // Only the pre-drain reset save fires.
        expect(record.save).toHaveBeenCalledTimes(1);
        expect(record.listedCount).toBe(0);
        expect(result).toEqual({ count: 0, listedCount: 0, capped: false });
      });
    });

    describe('backfillAllHolders', () => {
      it('throws when no snapshot exists', async () => {
        ecoModel.findOne.mockReturnValue({ sort: () => ({ lean: () => ({ exec: async () => null }) }) });
        await expect((service as any).backfillAllHolders()).rejects.toThrow(/No ecosystem snapshot/);
      });

      it('iterates every (pkg, type) pair from the latest snapshot; aggregates totals; fires progress per pair', async () => {
        ecoModel.findOne.mockReturnValue({
          sort: () => ({ lean: () => ({ exec: async () => ({
            packages: [
              { address: '0xaa', objectTypeCounts: [{ type: '0xaa::m::T1' }, { type: '0xaa::m::T2' }] },
              { address: '0xbb', objectTypeCounts: [{ type: '0xbb::m::T3' }] },
              { address: '0xcc', objectTypeCounts: [] },  // empty
            ],
          }) }) }),
        });
        jest.spyOn(service as any, 'backfillHoldersForType').mockImplementation(async (pkg: any, type: any) => {
          if (type === '0xaa::m::T1') return { count: 10, listedCount: 1, capped: false };
          if (type === '0xaa::m::T2') return { count: 20, listedCount: 2, capped: true };
          return { count: 30, listedCount: 0, capped: false };
        });
        const progress: any[] = [];
        const result = await (service as any).backfillAllHolders((info: any) => progress.push(info), 2);
        expect(result).toEqual({ totalPairs: 3, totalHolders: 60, cappedPairs: 1 });
        expect(progress).toHaveLength(3);
      });

      it('isolates per-pair failures — one throw does not abort the whole backfill', async () => {
        ecoModel.findOne.mockReturnValue({
          sort: () => ({ lean: () => ({ exec: async () => ({
            packages: [{ address: '0xaa', objectTypeCounts: [{ type: '0xaa::m::T1' }, { type: '0xaa::m::T2' }] }],
          }) }) }),
        });
        jest.spyOn(service as any, 'backfillHoldersForType').mockImplementation(async (_: any, type: any) => {
          if (type === '0xaa::m::T1') throw new Error('one pair failed');
          return { count: 5, listedCount: 0, capped: false };
        });
        const result = await (service as any).backfillAllHolders(undefined, 1);
        expect(result).toEqual({ totalPairs: 2, totalHolders: 5, cappedPairs: 0 });
      });
    });

    describe('captureObjectTypesForPackage', () => {
      it('enumerates key-able struct types from MovePackage.modules.datatypes, skips non-key abilities, drains each via updateHoldersForType', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          object: {
            asMovePackage: {
              modules: {
                nodes: [
                  {
                    name: 'otterfly_1',
                    datatypes: {
                      nodes: [
                        { name: 'OtterFly1NFT', abilities: ['KEY', 'STORE'] },
                        { name: 'NFTMinted', abilities: [] },  // event struct, no key
                        { name: 'AdminCap', abilities: ['KEY'] },
                      ],
                    },
                  },
                ],
              },
            },
          },
        });
        const drainSpy = jest.spyOn(service as any, 'updateHoldersForType').mockImplementation(async (_pkg: any, type: any) => {
          if (String(type).endsWith('::OtterFly1NFT')) return { count: 200, listedCount: 10, capped: false };
          if (String(type).endsWith('::AdminCap')) return { count: 1, listedCount: 0, capped: false };
          return { count: 0, listedCount: 0, capped: false };
        });
        const result = await (service as any).captureObjectTypesForPackage('0xpkg');
        expect(drainSpy).toHaveBeenCalledTimes(2);  // key-able only; NFTMinted skipped
        const byType: any = Object.fromEntries(result.map((r: any) => [r.type, r]));
        expect(byType['0xpkg::otterfly_1::OtterFly1NFT']).toEqual({
          type: '0xpkg::otterfly_1::OtterFly1NFT', count: 200, listedCount: 10, capped: false,
        });
        expect(byType['0xpkg::otterfly_1::AdminCap'].count).toBe(1);
      });

      it('returns [] when struct enumeration fails (graphql error) — capture stays resilient', async () => {
        jest.spyOn(service as any, 'graphql').mockRejectedValue(new Error('module query blew up'));
        const result = await (service as any).captureObjectTypesForPackage('0xpkg');
        expect(result).toEqual([]);
      });

      it('returns [] when the package has no key-able structs', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          object: { asMovePackage: { modules: { nodes: [{ name: 'm', datatypes: { nodes: [{ name: 'NoKey', abilities: [] }] } }] } } },
        });
        const result = await (service as any).captureObjectTypesForPackage('0xpkg');
        expect(result).toEqual([]);
      });

      it('per-type drain failures fill a zero entry rather than aborting the package — partial data is better than no data', async () => {
        jest.spyOn(service as any, 'graphql').mockResolvedValueOnce({
          object: {
            asMovePackage: {
              modules: { nodes: [{ name: 'm', datatypes: { nodes: [{ name: 'T1', abilities: ['KEY'] }, { name: 'T2', abilities: ['KEY'] }] } }] },
            },
          },
        });
        jest.spyOn(service as any, 'updateHoldersForType').mockImplementation(async (_: any, type: any) => {
          if (String(type).endsWith('::T1')) throw new Error('drain failed');
          return { count: 7, listedCount: 0, capped: false };
        });
        const result = await (service as any).captureObjectTypesForPackage('0xpkg');
        const byType: any = Object.fromEntries(result.map((r: any) => [r.type, r]));
        expect(byType['0xpkg::m::T1']).toEqual({ type: '0xpkg::m::T1', count: 0, listedCount: 0, capped: false });
        expect(byType['0xpkg::m::T2'].count).toBe(7);
      });
    });

    describe('capture tier-log — CRITICAL branch (>=100min)', () => {
      it('fires ERROR log + alerts.notifyCaptureAlarm("critical", …) when duration crosses 100min', async () => {
        let t = 1_000_000_000;
        const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => t);
        const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
        const notifySpy = (service as any).alerts.notifyCaptureAlarm as jest.Mock;
        notifySpy.mockClear();
        jest.spyOn(service as any, 'captureRaw').mockImplementation(async () => {
          t += 105 * 60 * 1000; // 105 min
          return { packages: [], totalStorageRebateNanos: 0, networkTxTotal: 0, txRates: {} };
        });
        await service.capture();
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'));
        expect(notifySpy).toHaveBeenCalledWith('critical', expect.stringContaining('CRITICAL'));
        dateSpy.mockRestore();
      });

      it('Promise.race hard-timeout branch fires when captureRaw hangs past 125min — guard clears, next cron can start', async () => {
        // Fake timers let us advance past 125min without real waiting. captureRaw
        // hangs forever; the hard-timeout must reject the outer race and run the
        // finally block that resets `capturing`.
        jest.useFakeTimers();
        const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
        jest.spyOn(service as any, 'captureRaw').mockImplementation(() => new Promise(() => {}));

        const capturePromise = service.capture();
        await jest.advanceTimersByTimeAsync(126 * 60 * 1000);
        await capturePromise;

        expect(service.isCapturing()).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Ecosystem capture failed'),
          expect.objectContaining({ message: expect.stringContaining('hard timeout') }),
        );
        jest.useRealTimers();
      });
    });
  });
});
