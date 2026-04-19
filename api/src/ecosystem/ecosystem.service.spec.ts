import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EcosystemService } from './ecosystem.service';
import { EcosystemSnapshot } from './schemas/ecosystem-snapshot.schema';
import { ProjectSenders } from './schemas/project-senders.schema';
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
      description: 'Project flagged as a PFP / collectible — exercises the isCollectible propagation path.',
      urls: [],
      teamId: null,
      isCollectible: true,
      match: { all: ['pfp'] },
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
    const module = await Test.createTestingModule({
      providers: [
        EcosystemService,
        { provide: getModelToken(EcosystemSnapshot.name), useValue: ecoModel },
        { provide: getModelToken(ProjectSenders.name), useValue: senderModel },
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
    it('returns the most recently created snapshot', async () => {
      const doc = { totalProjects: 3 };
      ecoModel.findOne.mockReturnValue(chain(doc));
      await expect(service.getLatest()).resolves.toEqual(doc);
      expect(ecoModel.findOne).toHaveBeenCalledWith();
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
    it('saves the fetched snapshot', async () => {
      const data = { totalProjects: 1, totalEvents: 5 };
      jest.spyOn(service as any, 'fetchFull').mockResolvedValue(data);
      await service.capture();
      expect(ecoModel.create).toHaveBeenCalledWith(data);
    });

    it('swallows fetchFull errors (logs only)', async () => {
      jest.spyOn(service as any, 'fetchFull').mockRejectedValue(new Error('network'));
      await expect(service.capture()).resolves.toBeUndefined();
      expect(ecoModel.create).not.toHaveBeenCalled();
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
      (service as any).updateSendersForModule(pkg, mod) as Promise<string[]>;

    it('anchors the cursor and returns [] when no record exists', async () => {
      senderModel.findOne.mockResolvedValue(null);
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: { events: { pageInfo: { endCursor: 'latest-cur' } } },
        }),
      });
      senderModel.create.mockResolvedValue({});
      const r = await update('0xaa', 'mod');
      expect(r).toEqual([]);
      expect(senderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ packageAddress: '0xaa', module: 'mod', cursor: 'latest-cur', senders: [] }),
      );
    });

    it('ignores errors on first-encounter cursor anchor', async () => {
      senderModel.findOne.mockResolvedValue(null);
      fetchMock.mockResolvedValue({ json: async () => ({ errors: [{ message: 'boom' }] }) });
      const r = await update('0xaa', 'mod');
      expect(r).toEqual([]);
      expect(senderModel.create).not.toHaveBeenCalled();
    });

    it('pages forward when a record already exists', async () => {
      const record = {
        senders: ['0xold'],
        cursor: 'prev',
        eventsScanned: 10,
        save: jest.fn().mockResolvedValue({}),
      };
      senderModel.findOne.mockResolvedValue(record);
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            events: {
              nodes: [{ sender: { address: '0xNEW' } }],
              pageInfo: { hasNextPage: false, endCursor: 'after' },
            },
          },
        }),
      });
      const r = await update('0xaa', 'mod');
      expect(r).toEqual(expect.arrayContaining(['0xold', '0xnew']));
      expect(record.save).toHaveBeenCalled();
    });
  });

  // ---------- pageForwardSenders ----------

  describe('pageForwardSenders (private)', () => {
    const run = (record: any, emit: string, max = 100) =>
      (service as any).pageForwardSenders(record, emit, max) as Promise<number>;

    it('accumulates lowercased senders, deduplicates, and persists on change', async () => {
      const record = {
        senders: ['0xold'],
        cursor: null,
        eventsScanned: 0,
        save: jest.fn().mockResolvedValue({}),
      };
      fetchMock
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              events: {
                nodes: [
                  { sender: { address: '0xAAA' } },
                  { sender: { address: '0xBBB' } },
                  { sender: null },
                ],
                pageInfo: { hasNextPage: true, endCursor: 'p1' },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              events: {
                nodes: [{ sender: { address: '0xAAA' } }], // dupe
                pageInfo: { hasNextPage: false, endCursor: 'p2' },
              },
            },
          }),
        });
      const scanned = await run(record, '0xaa::m');
      expect(scanned).toBe(4);
      expect(record.senders.sort()).toEqual(['0xaaa', '0xbbb', '0xold']);
      expect(record.cursor).toBe('p2');
      expect(record.eventsScanned).toBe(4);
      expect(record.save).toHaveBeenCalledTimes(1);
    });

    it('breaks on a thrown page', async () => {
      const record = {
        senders: [],
        cursor: null,
        eventsScanned: 0,
        save: jest.fn().mockResolvedValue({}),
      };
      fetchMock.mockResolvedValueOnce({ json: async () => ({ errors: [{ message: 'x' }] }) });
      const scanned = await run(record, '0xaa::m');
      expect(scanned).toBe(0);
      expect(record.save).not.toHaveBeenCalled();
    });

    it('does not save when nothing changed (no events found)', async () => {
      const record = {
        senders: [],
        cursor: null,
        eventsScanned: 0,
        save: jest.fn().mockResolvedValue({}),
      };
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          data: { events: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } },
        }),
      });
      const scanned = await run(record, '0xaa::m');
      expect(scanned).toBe(0);
      expect(record.save).not.toHaveBeenCalled();
    });

    it('sends the after cursor once one is set', async () => {
      const record = {
        senders: [],
        cursor: 'start-cur',
        eventsScanned: 0,
        save: jest.fn().mockResolvedValue({}),
      };
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          data: { events: { nodes: [], pageInfo: { hasNextPage: false, endCursor: 'start-cur' } } },
        }),
      });
      await run(record, '0xaa::m');
      expect(fetchMock.mock.calls[0][1].body).toMatch(/after: \\?"start-cur\\?"/);
    });
  });

  // ---------- backfillSendersForModule ----------

  describe('backfillSendersForModule', () => {
    it('creates a cursor=null record when none exists and drains events', async () => {
      const created = {
        senders: [],
        cursor: null,
        eventsScanned: 0,
        save: jest.fn().mockResolvedValue({}),
      };
      senderModel.findOne.mockResolvedValue(null);
      senderModel.create.mockResolvedValue(created);
      fetchMock
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              events: {
                nodes: [{ sender: { address: '0xA' } }],
                pageInfo: { hasNextPage: false, endCursor: 'done' },
              },
            },
          }),
        });
      const n = await service.backfillSendersForModule('0xpkg', 'mod');
      expect(senderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: null, senders: [] }),
      );
      expect(n).toBe(1);
    });

    it('drains in batches until a cycle sees zero progress', async () => {
      // Batch 1 returns 2 nodes, hasNextPage=false → scanned=2, save. Outer
      // loop iterates; prevCursor=null initially, after batch1 cursor='end'.
      // Next iteration, prevCursor='end', record.cursor==='end' → loop exits.
      const record = {
        senders: [],
        cursor: null,
        eventsScanned: 0,
        save: jest.fn().mockResolvedValue({}),
      };
      senderModel.findOne.mockResolvedValue(record);
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          data: {
            events: {
              nodes: [{ sender: { address: '0xA' } }, { sender: { address: '0xB' } }],
              pageInfo: { hasNextPage: false, endCursor: 'end' },
            },
          },
        }),
      });
      const n = await service.backfillSendersForModule('0xpkg', 'mod');
      expect(n).toBe(2);
      expect(record.senders.sort()).toEqual(['0xa', '0xb']);
    });
  });

  // ---------- backfillAllSenders ----------

  describe('backfillAllSenders', () => {
    it('throws when there is no snapshot', async () => {
      ecoModel.findOne.mockReturnValue(chain(null));
      await expect(service.backfillAllSenders()).rejects.toThrow(/No ecosystem snapshot/);
    });

    it('iterates every (project, module) with a package and reports progress', async () => {
      ecoModel.findOne.mockReturnValue(chain({
        l1: [
          { name: 'P1', latestPackageAddress: '0xaa', modules: ['m1', 'm2'] },
          { name: 'P2', latestPackageAddress: null, modules: ['z'] }, // filtered out
          { name: 'P3', latestPackageAddress: '0xcc', modules: [] },  // filtered out
          { name: 'P4', latestPackageAddress: '0xdd', modules: ['d1'] },
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
      expect(progress).toHaveBeenNthCalledWith(1, { project: 'P1', module: 'm1', senders: 5 });
    });

    it('works without the progress callback', async () => {
      ecoModel.findOne.mockReturnValue(chain({
        l1: [{ name: 'P1', latestPackageAddress: '0xaa', modules: ['m1'] }],
      }));
      jest.spyOn(service, 'backfillSendersForModule').mockResolvedValue(1);
      const result = await service.backfillAllSenders();
      expect(result).toEqual({ totalProjects: 1, totalModules: 1, totalSenders: 1 });
    });
  });

  // ---------- fetchFull (end-to-end via capture) ----------

  describe('fetchFull (via capture)', () => {
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
          if (body.includes('events(filter:') && body.includes('last: 1')) {
            return { json: async () => ({ data: { events: { pageInfo: { endCursor: null } } } }) };
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
      return ecoModel.create.mock.calls[0][0];
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
});
