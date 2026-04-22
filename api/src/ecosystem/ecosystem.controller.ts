import { BadRequestException, Controller, Get, Post, Param, Query, NotFoundException } from '@nestjs/common';
import { EcosystemService } from './ecosystem.service';
import { ALL_TEAMS } from './teams';

const GRAPHQL_URL = 'https://graphql.mainnet.iota.cafe';

@Controller('ecosystem')
export class EcosystemController {
  constructor(private ecosystemService: EcosystemService) {}

  /**
   * Trigger a fresh ecosystem scan out-of-band (without waiting for the 2h
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
    // Fire and forget — the capture is slow (45–60 min) so we don't block
    // the HTTP response on it. Errors are logged inside `capture()`.
    this.ecosystemService.capture().catch(() => {});
    return { started: true, status: 'capture started' };
  }

  /**
   * Activity leaderboard for the dashboard's time-range selector. Returns
   * attributed projects + unattributed clusters ranked by event growth over
   * the chosen window — same row shape across scopes so the frontend can
   * render a single sorted list with project rows and "Unknown (0x…)" rows
   * interleaved (or filter to one side via `?scope=`).
   *
   * Query params:
   *   - `window` — shorthand, one of `24h` | `7d` | `30d` | `all` (default `all`)
   *   - `scope`  — one of `all` | `attributed` | `unattributed` (default `all`)
   *   - `sortBy` — one of `eventsDelta` | `transactionsDelta` |
   *     `uniqueSendersDelta` | `uniqueHoldersDelta` | `uniqueWalletsReachDelta` |
   *     `objectHolderCountDelta` | `objectCountDelta` |
   *     `marketplaceListedCountDelta` (default `eventsDelta`)
   *
   * `window=all` resolves baseline to `1970-01-01` — since no snapshot
   * predates it, deltas collapse to absolute current values and the ranking
   * becomes an all-time leaderboard (useful as the dashboard's default).
   *
   * `sortBy=transactionsDelta` surfaces activity that doesn't emit events
   * (Salus-shape object-mint packages, TWIN-shape anchoring) — those rank
   * near the bottom under `eventsDelta` but near the top under TXs.
   * `sortBy=uniqueHoldersDelta` / `uniqueWalletsReachDelta` surface PFP/NFT
   * collection growth in wallet-count terms — rescue for projects whose
   * activity is mint-only with few distinct senders.
   */
  @Get('growth-ranking')
  async growthRanking(
    @Query('window') windowRaw?: string,
    @Query('scope') scopeRaw?: string,
    @Query('sortBy') sortByRaw?: string,
  ) {
    const window = windowRaw ?? 'all';
    const scope = scopeRaw ?? 'all';
    const sortBy = sortByRaw ?? 'eventsDelta';
    const validSortBy = [
      'eventsDelta',
      'transactionsDelta',
      'uniqueSendersDelta',
      'uniqueHoldersDelta',
      'uniqueWalletsReachDelta',
      'objectHolderCountDelta',
      'objectCountDelta',
      'marketplaceListedCountDelta',
    ];
    if (!['all', 'attributed', 'unattributed'].includes(scope)) {
      throw new BadRequestException('`scope` must be one of: all, attributed, unattributed.');
    }
    if (!validSortBy.includes(sortBy)) {
      throw new BadRequestException('`sortBy` must be one of: ' + validSortBy.join(', ') + '.');
    }

    // Shorthand → (from, to) resolution. `to` is always "now"; `from` is
    // `now - <window>`, except `all` anchors at the Unix epoch (predates
    // any snapshot → baseline null → deltas equal absolute current values).
    const now = new Date();
    const windowMs: Record<string, number | null> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      all: null,
    };
    if (!(window in windowMs)) {
      throw new BadRequestException('`window` must be one of: 24h, 7d, 30d, all.');
    }
    const offset = windowMs[window];
    const from = offset === null ? new Date(0) : new Date(now.getTime() - offset);
    const to = now;

    const result = await this.ecosystemService.growthRanking(
      from,
      to,
      scope as 'all' | 'attributed' | 'unattributed',
      sortBy as any,
    );
    if (!result) {
      throw new NotFoundException('No snapshots cover the requested window.');
    }
    return result;
  }

  /**
   * Per-package growth between two points in time. Pure subtraction over the
   * raw `OnchainSnapshot` collection — no classification, no live RPC — so
   * queries across arbitrary windows are fast (~100 ms for a week of
   * 2h snapshots).
   *
   * Query params (both required, both ISO-8601):
   *   - `from` — start of the window
   *   - `to`   — end of the window
   *
   * Resolution semantics: baseline = latest snapshot with `createdAt <= from`;
   * latest = latest snapshot with `createdAt <= to`. If either endpoint has
   * no matching snapshot, responds 404 (rather than synthesizing numbers
   * against a nonexistent baseline).
   *
   * Response shape — see `EcosystemService.computeGrowth` for the full
   * contract. Top-level `network` holds the aggregate counters; `packages`
   * is a per-package breakdown sorted by `eventsDelta` desc. Packages with
   * all-zero deltas are omitted unless `isNew: true`.
   */
  @Get('growth')
  async growth(
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
  ) {
    if (!fromRaw || !toRaw) {
      throw new BadRequestException('Both `from` and `to` query params are required (ISO-8601 dates).');
    }
    const from = new Date(fromRaw);
    const to = new Date(toRaw);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('`from` and `to` must be ISO-8601 parsable dates.');
    }
    if (from > to) {
      throw new BadRequestException('`from` must be <= `to`.');
    }
    const result = await this.ecosystemService.computeGrowth(from, to);
    if (!result) {
      throw new NotFoundException('No snapshots cover the requested window.');
    }
    return result;
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
