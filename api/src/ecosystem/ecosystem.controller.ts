import { Controller, Get, Post, Param, Query, NotFoundException } from '@nestjs/common';
import { EcosystemService } from './ecosystem.service';
import { ALL_TEAMS } from './teams';

const GRAPHQL_URL = 'https://graphql.mainnet.iota.cafe';

@Controller('ecosystem')
export class EcosystemController {
  constructor(private ecosystemService: EcosystemService) {}

  /**
   * Trigger a fresh ecosystem scan out-of-band (without waiting for the 6h
   * cron or restarting the container). The capture runs in the background;
   * the previous snapshot keeps serving via `GET /` until the new one
   * finishes, so the dashboard never goes blank during a refresh. A
   * redundant trigger while a capture is already in-flight is safely
   * no-op'd by the service's `capturing` guard.
   */
  @Post('rescan')
  async rescan() {
    if (this.ecosystemService.isCapturing()) {
      return { started: false, status: 'already in flight' };
    }
    // Fire and forget — the capture is slow (30–40 min) so we don't block
    // the HTTP response on it. Errors are logged inside `capture()`.
    this.ecosystemService.capture().catch(() => {});
    return { started: true, status: 'capture started' };
  }

  @Get()
  async getProjects() {
    const data = await this.ecosystemService.getLatest();
    return data ?? {
      l1: [],
      l2: [],
      unattributed: [],
      totalProjects: 0,
      totalEvents: 0,
      totalStorageIota: 0,
      totalUnattributedPackages: 0,
      networkTxTotal: 0,
      txRates: {},
    };
  }

  @Get('teams')
  async getTeams() {
    const data = await this.ecosystemService.getLatest();
    const all = [...(data?.l1 || []), ...(data?.l2 || [])];
    return ALL_TEAMS.map((team) => ({
      ...team,
      projects: all
        .filter((p: any) => p.team?.id === team.id)
        .map((p: any) => ({ slug: p.slug, name: p.name, category: p.category, layer: p.layer })),
    }));
  }

  @Get('teams/:id')
  async getTeam(@Param('id') id: string) {
    const team = ALL_TEAMS.find((t) => t.id === id);
    if (!team) throw new NotFoundException(`Team "${id}" not found`);
    const data = await this.ecosystemService.getLatest();
    const all = [...(data?.l1 || []), ...(data?.l2 || [])];
    return {
      ...team,
      projects: all.filter((p: any) => p.team?.id === id),
    };
  }

  @Get('project/:slug')
  async getProject(@Param('slug') slug: string) {
    const data = await this.ecosystemService.getLatest();
    if (!data) throw new NotFoundException('No ecosystem data');

    const all = [...(data.l1 || []), ...(data.l2 || [])];
    const project = all.find((p: any) => p.slug === slug);
    if (!project) throw new NotFoundException(`Project "${slug}" not found`);

    return project;
  }

  @Get('project/:slug/events')
  async getProjectEvents(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.ecosystemService.getLatest();
    if (!data) throw new NotFoundException('No ecosystem data');

    const all = [...(data.l1 || []), ...(data.l2 || [])];
    const project = all.find((p: any) => p.slug === slug);
    if (!project) throw new NotFoundException(`Project "${slug}" not found`);

    const pkgAddr = project.latestPackageAddress || project.packageAddress;
    if (!pkgAddr || !project.modules?.length) {
      return { events: [], module: null, note: 'No on-chain package for this project' };
    }

    const mod = project.modules[0];
    const emittingModule = `${pkgAddr}::${mod}`;
    const n = Math.min(Number(limit) || 20, 50);

    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          events(filter: { emittingModule: "${emittingModule}" }, last: ${n}) {
            nodes {
              timestamp
              type { repr }
              json
              sender { address }
            }
          }
        }`,
      }),
    });

    const json: any = await res.json();
    if (json.errors?.length) {
      return { events: [], module: emittingModule, error: json.errors[0].message };
    }

    const events = (json.data?.events?.nodes || []).reverse().map((e: any) => ({
      timestamp: e.timestamp,
      type: e.type?.repr?.split('::').pop() || 'Unknown',
      typeFull: e.type?.repr || '',
      sender: e.sender?.address || '',
      data: e.json || {},
    }));

    return { events, module: emittingModule };
  }

  @Get('project/:slug/activity')
  async getProjectActivity(@Param('slug') slug: string) {
    const data = await this.ecosystemService.getLatest();
    if (!data) throw new NotFoundException('No ecosystem data');

    const all = [...(data.l1 || []), ...(data.l2 || [])];
    const project = all.find((p: any) => p.slug === slug);
    if (!project) throw new NotFoundException(`Project "${slug}" not found`);

    const result: any = {
      eventsPerDay: [],
      eventTypes: [],
      sendersPerDay: [],
      cumulativeEvents: [],
      tvlHistory: [],
    };

    // Fetch events from GraphQL (up to 500) for L1 projects
    const pkgAddr = project.latestPackageAddress || project.packageAddress;
    if (pkgAddr && project.modules?.length) {
      const allEvents: any[] = [];
      for (const mod of project.modules.slice(0, 3)) {
        const emittingModule = `${pkgAddr}::${mod}`;
        let cursor: string | null = null;

        for (let page = 0; page < 10; page++) {
          const afterClause = cursor ? `, after: "${cursor}"` : '';
          try {
            const res = await fetch(GRAPHQL_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `{ events(filter: { emittingModule: "${emittingModule}" }, first: 50${afterClause}) { nodes { timestamp type { repr } sender { address } } pageInfo { hasNextPage endCursor } } }`,
              }),
            });
            const json: any = await res.json();
            if (json.errors?.length) break;
            const nodes = json.data?.events?.nodes || [];
            allEvents.push(...nodes);
            if (!json.data?.events?.pageInfo?.hasNextPage) break;
            cursor = json.data.events.pageInfo.endCursor;
          } catch {
            break;
          }
        }
      }

      // Group by day
      const byDay = new Map<string, { count: number; senders: Set<string>; }>();
      const typeCounts = new Map<string, number>();

      for (const evt of allEvents) {
        const day = evt.timestamp?.slice(0, 10) || 'unknown';
        const entry = byDay.get(day) || { count: 0, senders: new Set() };
        entry.count++;
        if (evt.sender?.address) entry.senders.add(evt.sender.address);
        byDay.set(day, entry);

        const type = evt.type?.repr?.split('::').pop() || 'Unknown';
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }

      const sortedDays = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
      result.eventsPerDay = sortedDays.map(([date, d]) => ({ date, count: d.count }));
      result.sendersPerDay = sortedDays.map(([date, d]) => ({ date, count: d.senders.size }));

      let cumulative = 0;
      result.cumulativeEvents = sortedDays.map(([date, d]) => {
        cumulative += d.count;
        return { date, count: cumulative };
      });

      result.eventTypes = [...typeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }));
    }

    // Fetch TVL history from DefiLlama
    if (project.tvl) {
      try {
        const llamaSlug = project.slug?.replace(/^evm-/, '') || project.name.toLowerCase().replace(/\s+/g, '-');
        const res = await fetch(`https://api.llama.fi/protocol/${llamaSlug}`);
        const json: any = await res.json();
        const chainKey = project.layer === 'L2' ? 'IOTA EVM' : 'IOTA';
        const tvlData = json.chainTvls?.[chainKey]?.tvl || json.tvl || [];
        result.tvlHistory = tvlData.map((d: any) => ({
          date: new Date(d.date * 1000).toISOString().slice(0, 10),
          tvl: d.totalLiquidityUSD,
        }));
      } catch {
        // DefiLlama unavailable
      }
    }

    return result;
  }
}
