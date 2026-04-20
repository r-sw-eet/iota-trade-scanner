import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EcosystemController } from './ecosystem.controller';
import { EcosystemService } from './ecosystem.service';

jest.mock('./teams', () => ({
  ALL_TEAMS: [
    { id: 'team-a', name: 'Team A', deployers: [] },
    { id: 'team-b', name: 'Team B', deployers: [] },
  ],
}));

describe('EcosystemController', () => {
  let controller: EcosystemController;
  let service: { getLatest: jest.Mock; capture: jest.Mock; isCapturing: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    service = {
      getLatest: jest.fn(),
      capture: jest.fn().mockResolvedValue(undefined),
      isCapturing: jest.fn().mockReturnValue(false),
    };
    const module = await Test.createTestingModule({
      controllers: [EcosystemController],
      providers: [{ provide: EcosystemService, useValue: service }],
    }).compile();
    controller = module.get(EcosystemController);
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => jest.restoreAllMocks());

  const mkProject = (overrides: any = {}) => ({
    slug: 'p1',
    name: 'P1',
    layer: 'L1',
    category: 'DeFi',
    description: '',
    urls: [],
    packages: 1,
    packageAddress: '0xaa',
    latestPackageAddress: '0xaa',
    storageIota: 0,
    events: 0,
    eventsCapped: false,
    modules: ['mod'],
    tvl: null,
    logo: null,
    logoWordmark: null,
    team: { id: 'team-a', name: 'Team A' },
    disclaimer: null,
    detectedDeployers: [],
    anomalousDeployers: [],
    uniqueSenders: 0,
    attribution: null,
    ...overrides,
  });

  describe('GET /ecosystem', () => {
    it('returns the stored snapshot', async () => {
      const data = { l1: [mkProject()], l2: [], totalProjects: 1 };
      service.getLatest.mockResolvedValue(data);
      await expect(controller.getProjects()).resolves.toBe(data);
    });

    it('returns an empty structure when no snapshot exists', async () => {
      service.getLatest.mockResolvedValue(null);
      const result = await controller.getProjects();
      expect(result).toMatchObject({ l1: [], l2: [], totalProjects: 0, totalEvents: 0 });
    });
  });

  describe('POST /ecosystem/rescan', () => {
    it('kicks off a capture when none is running and returns started=true', async () => {
      service.isCapturing.mockReturnValue(false);
      const result = await controller.rescan();
      expect(result).toEqual({ started: true, status: 'capture started' });
      expect(service.capture).toHaveBeenCalledTimes(1);
    });

    it('returns started=false when a capture is already in flight', async () => {
      service.isCapturing.mockReturnValue(true);
      const result = await controller.rescan();
      expect(result).toEqual({ started: false, status: 'already in flight' });
      expect(service.capture).not.toHaveBeenCalled();
    });

    it('swallows capture() rejections so the fire-and-forget call never crashes the response', async () => {
      service.isCapturing.mockReturnValue(false);
      service.capture.mockRejectedValue(new Error('boom'));
      await expect(controller.rescan()).resolves.toEqual({ started: true, status: 'capture started' });
    });
  });

  describe('GET /ecosystem/teams', () => {
    it('groups projects by team id', async () => {
      service.getLatest.mockResolvedValue({
        l1: [
          mkProject({ slug: 'a', name: 'A', team: { id: 'team-a' } }),
          mkProject({ slug: 'b', name: 'B', team: { id: 'team-b' } }),
        ],
        l2: [mkProject({ slug: 'c', name: 'C', layer: 'L2', team: { id: 'team-a' } })],
      });
      const result = await controller.getTeams();
      const a = result.find((t: any) => t.id === 'team-a')!;
      expect(a.projects.map((p: any) => p.slug).sort()).toEqual(['a', 'c']);
      const b = result.find((t: any) => t.id === 'team-b')!;
      expect(b.projects).toEqual([{ slug: 'b', name: 'B', category: 'DeFi', layer: 'L1' }]);
    });

    it('returns teams with empty projects when no data exists', async () => {
      service.getLatest.mockResolvedValue(null);
      const result = await controller.getTeams();
      expect(result).toHaveLength(2);
      expect(result.every((t: any) => t.projects.length === 0)).toBe(true);
    });
  });

  describe('GET /ecosystem/teams/:id', () => {
    it('returns the team with its projects', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ team: { id: 'team-a' } })],
        l2: [],
      });
      const result = await controller.getTeam('team-a');
      expect(result.id).toBe('team-a');
      expect(result.projects).toHaveLength(1);
    });

    it('404s on unknown team id', async () => {
      await expect(controller.getTeam('ghost')).rejects.toThrow(NotFoundException);
    });

    it('tolerates null snapshot when the team exists', async () => {
      service.getLatest.mockResolvedValue(null);
      const result = await controller.getTeam('team-a');
      expect(result.projects).toEqual([]);
    });
  });

  describe('GET /ecosystem/project/:slug', () => {
    it('returns the matching project', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      const result = await controller.getProject('p1');
      expect(result.name).toBe('P1');
    });

    it('404s when no snapshot exists', async () => {
      service.getLatest.mockResolvedValue(null);
      await expect(controller.getProject('p1')).rejects.toThrow(NotFoundException);
    });

    it('404s when the slug is unknown', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      await expect(controller.getProject('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /ecosystem/project/:slug/events', () => {
    it('404s when no snapshot exists', async () => {
      service.getLatest.mockResolvedValue(null);
      await expect(controller.getProjectEvents('p1')).rejects.toThrow(NotFoundException);
    });

    it('404s when the slug is unknown', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      await expect(controller.getProjectEvents('ghost')).rejects.toThrow(NotFoundException);
    });

    it('returns empty events with a note for a project without a package', async () => {
      service.getLatest.mockResolvedValue({
        l1: [],
        l2: [mkProject({ slug: 'l2', layer: 'L2', packageAddress: null, latestPackageAddress: null, modules: [] })],
      });
      const result = await controller.getProjectEvents('l2');
      expect(result).toEqual({ events: [], module: null, note: 'No on-chain package for this project' });
    });

    it('returns the same note when modules array is empty', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ modules: [] })],
        l2: [],
      });
      const result = await controller.getProjectEvents('p1');
      expect(result.module).toBeNull();
    });

    it('fetches events and reverses them, defaulting limit to 20 and capping at 50', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            events: {
              nodes: [
                { timestamp: '2026-01-01T00:00:00Z', type: { repr: '0x1::mod::Alpha' }, json: { a: 1 }, sender: { address: '0xs1' } },
                { timestamp: '2026-01-02T00:00:00Z', type: { repr: '0x1::mod::Beta' }, json: { a: 2 }, sender: { address: '0xs2' } },
              ],
            },
          },
        }),
      });

      const result = await controller.getProjectEvents('p1', '100');
      // limit capped at 50 in the GraphQL query
      expect(fetchMock.mock.calls[0][1].body).toMatch(/last: 50/);
      // reverses order
      expect(result.events[0].type).toBe('Beta');
      expect(result.events[1].type).toBe('Alpha');
      expect(result.events[0].sender).toBe('0xs2');
      expect(result.module).toBe('0xaa::mod');
    });

    it('uses default limit (20) when param is missing', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      fetchMock.mockResolvedValue({
        json: async () => ({ data: { events: { nodes: [] } } }),
      });
      await controller.getProjectEvents('p1');
      expect(fetchMock.mock.calls[0][1].body).toMatch(/last: 20/);
    });

    it('returns the GraphQL error surface when events query errors out', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      fetchMock.mockResolvedValue({
        json: async () => ({ errors: [{ message: 'bad query' }] }),
      });
      const result = await controller.getProjectEvents('p1');
      expect(result).toEqual({ events: [], module: '0xaa::mod', error: 'bad query' });
    });

    it('falls back through missing fields gracefully', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      fetchMock.mockResolvedValue({
        json: async () => ({ data: { events: { nodes: [{ timestamp: null }] } } }),
      });
      const result = await controller.getProjectEvents('p1');
      expect(result.events[0]).toEqual({
        timestamp: null,
        type: 'Unknown',
        typeFull: '',
        sender: '',
        data: {},
      });
    });
  });

  describe('GET /ecosystem/project/:slug/activity', () => {
    it('404s when no snapshot exists', async () => {
      service.getLatest.mockResolvedValue(null);
      await expect(controller.getProjectActivity('p1')).rejects.toThrow(NotFoundException);
    });

    it('404s when the slug is unknown', async () => {
      service.getLatest.mockResolvedValue({ l1: [mkProject()], l2: [] });
      await expect(controller.getProjectActivity('ghost')).rejects.toThrow(NotFoundException);
    });

    it('returns empty buckets for an L2 project without a package', async () => {
      service.getLatest.mockResolvedValue({
        l1: [],
        l2: [mkProject({ slug: 'l2', layer: 'L2', packageAddress: null, latestPackageAddress: null, modules: [], tvl: null })],
      });
      const result = await controller.getProjectActivity('l2');
      expect(result).toEqual({
        eventsPerDay: [],
        eventTypes: [],
        sendersPerDay: [],
        cumulativeEvents: [],
        tvlHistory: [],
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('aggregates events per day, types, senders, and cumulative count', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ modules: ['modA'] })],
        l2: [],
      });
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            events: {
              nodes: [
                { timestamp: '2026-01-01T12:00:00Z', type: { repr: 'a::b::Swap' }, sender: { address: '0xs1' } },
                { timestamp: '2026-01-01T13:00:00Z', type: { repr: 'a::b::Swap' }, sender: { address: '0xs1' } },
                { timestamp: '2026-01-02T00:00:00Z', type: { repr: 'a::b::Deposit' }, sender: { address: '0xs2' } },
                { timestamp: '2026-01-02T05:00:00Z', type: { repr: 'a::b::Swap' }, sender: { address: '0xs3' } },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        }),
      });

      const result = await controller.getProjectActivity('p1');
      expect(result.eventsPerDay).toEqual([
        { date: '2026-01-01', count: 2 },
        { date: '2026-01-02', count: 2 },
      ]);
      expect(result.sendersPerDay).toEqual([
        { date: '2026-01-01', count: 1 },
        { date: '2026-01-02', count: 2 },
      ]);
      expect(result.cumulativeEvents).toEqual([
        { date: '2026-01-01', count: 2 },
        { date: '2026-01-02', count: 4 },
      ]);
      expect(result.eventTypes[0]).toEqual({ type: 'Swap', count: 3 });
      expect(result.eventTypes[1]).toEqual({ type: 'Deposit', count: 1 });
    });

    it('follows pagination cursors until hasNextPage=false', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ modules: ['modA'] })],
        l2: [],
      });
      fetchMock
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              events: {
                nodes: [{ timestamp: '2026-01-01', type: { repr: 'x::y::E' }, sender: { address: '0xs' } }],
                pageInfo: { hasNextPage: true, endCursor: 'cur1' },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              events: {
                nodes: [{ timestamp: '2026-01-01', type: { repr: 'x::y::E' }, sender: { address: '0xs' } }],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          }),
        });

      const result = await controller.getProjectActivity('p1');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][1].body).toMatch(/after: \\?"cur1\\?"/);
      expect(result.eventsPerDay).toEqual([{ date: '2026-01-01', count: 2 }]);
    });

    it('breaks pagination when a GraphQL error is returned', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ modules: ['modA'] })],
        l2: [],
      });
      fetchMock.mockResolvedValueOnce({
        json: async () => ({ errors: [{ message: 'boom' }] }),
      });

      const result = await controller.getProjectActivity('p1');
      expect(result.eventsPerDay).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('breaks pagination when fetch itself throws', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ modules: ['modA'] })],
        l2: [],
      });
      fetchMock.mockRejectedValueOnce(new Error('network'));
      const result = await controller.getProjectActivity('p1');
      expect(result.eventsPerDay).toEqual([]);
    });

    it('falls back to "unknown" day when event timestamp is missing', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ modules: ['modA'] })],
        l2: [],
      });
      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            events: {
              nodes: [{ timestamp: null, type: { repr: null }, sender: null }],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        }),
      });
      const result = await controller.getProjectActivity('p1');
      expect(result.eventsPerDay).toEqual([{ date: 'unknown', count: 1 }]);
      expect(result.eventTypes[0]).toEqual({ type: 'Unknown', count: 1 });
    });

    it('only scans up to 3 modules per project', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ modules: ['a', 'b', 'c', 'd', 'e'] })],
        l2: [],
      });
      fetchMock.mockResolvedValue({
        json: async () => ({ data: { events: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } }),
      });
      await controller.getProjectActivity('p1');
      // 3 modules × 1 page each = 3 fetch calls (no TVL → no DefiLlama)
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('pulls TVL history from DefiLlama for projects with tvl', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ tvl: 500, modules: [] })],
        l2: [],
      });
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          chainTvls: {
            IOTA: {
              tvl: [
                { date: 1_700_000_000, totalLiquidityUSD: 100 },
                { date: 1_700_086_400, totalLiquidityUSD: 110 },
              ],
            },
          },
        }),
      });
      const result = await controller.getProjectActivity('p1');
      expect(result.tvlHistory).toHaveLength(2);
      expect(result.tvlHistory[0].tvl).toBe(100);
      expect(result.tvlHistory[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('uses the IOTA EVM chain bucket for L2 projects', async () => {
      service.getLatest.mockResolvedValue({
        l1: [],
        l2: [mkProject({ slug: 'evm-dex', layer: 'L2', tvl: 500, modules: [], packageAddress: null, latestPackageAddress: null })],
      });
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          chainTvls: {
            'IOTA EVM': { tvl: [{ date: 1_700_000_000, totalLiquidityUSD: 50 }] },
          },
        }),
      });
      const result = await controller.getProjectActivity('evm-dex');
      expect(result.tvlHistory).toEqual([{ date: expect.any(String), tvl: 50 }]);
      expect(fetchMock.mock.calls[0][0]).toContain('/protocol/dex');
    });

    it('swallows DefiLlama failures and leaves tvlHistory empty', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ tvl: 500, modules: [] })],
        l2: [],
      });
      fetchMock.mockRejectedValueOnce(new Error('llama down'));
      const result = await controller.getProjectActivity('p1');
      expect(result.tvlHistory).toEqual([]);
    });

    it('falls back to legacy flat tvl array when chainTvls key is missing', async () => {
      service.getLatest.mockResolvedValue({
        l1: [mkProject({ tvl: 500, modules: [] })],
        l2: [],
      });
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          tvl: [{ date: 1_700_000_000, totalLiquidityUSD: 42 }],
        }),
      });
      const result = await controller.getProjectActivity('p1');
      expect(result.tvlHistory).toEqual([{ date: expect.any(String), tvl: 42 }]);
    });
  });
});
