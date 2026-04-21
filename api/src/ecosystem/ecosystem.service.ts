import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import {
  OnchainSnapshot,
  PackageFact,
  ModuleMetrics,
  FingerprintSampleDoc,
} from './schemas/onchain-snapshot.schema';
import { ProjectSenders } from './schemas/project-senders.schema';
import { ProjectSender } from './schemas/project-sender.schema';
import { ProjectTxCounts } from './schemas/project-tx-counts.schema';
import { AlertsService } from '../alerts/alerts.service';
import { ALL_PROJECTS, ProjectDefinition } from './projects';
import { ALL_TEAMS, Team, getTeam } from './teams';

/**
 * Whether a project has any synchronous match criterion — i.e. can be matched
 * directly from a package's address/deployer/modules without fingerprint
 * probing or team-deployer routing. Projects with NO synchronous criteria
 * are "routing-only" (e.g. `IOTA Foundation (Testing)`): they sit empty in
 * the registry and only get populated when team-deployer routing attributes
 * an aggregate-bucket package to them.
 */
function hasSyncMatch(def: ProjectDefinition): boolean {
  const m = def.match;
  return (
    (m.packageAddresses?.length ?? 0) > 0 ||
    (m.deployerAddresses?.length ?? 0) > 0 ||
    (m.exact?.length ?? 0) > 0 ||
    (m.all?.length ?? 0) > 0 ||
    (m.any?.length ?? 0) > 0 ||
    (m.minModules ?? 0) > 0
  );
}

/**
 * A def is "routing-only" iff it has no match criteria AT ALL — no sync rules
 * AND no fingerprint. Used by the splitByDeployer team-routing code to pick
 * projects that exist solely to absorb team-deployer-routed aggregate-bucket
 * packages (e.g. the `IF Testing` project). Must NOT include fingerprint-only
 * defs (e.g. `Healthy Gang`, `IOTA Link`) — those are reachable via
 * `matchByFingerprint` and have their own identity; routing aggregate packages
 * to them would absorb unrelated traffic.
 */
function isRoutingOnly(def: ProjectDefinition): boolean {
  return !hasSyncMatch(def) && !def.match.fingerprint;
}

const GRAPHQL_URL = 'https://graphql.mainnet.iota.cafe';

/**
 * A bucket of on-chain packages whose deployer doesn't match any known team
 * and whose modules/objects don't match any ProjectDefinition. Produced by
 * `fetchFull` to surface unlabeled activity that a human should investigate
 * and, where appropriate, promote into a proper `ProjectDefinition`.
 *
 * Clustering is by deployer (lowercase) because real-world teams typically
 * ship multiple packages from one address (Salus has ~60). One row per
 * deployer keeps the discovery feed scannable.
 */
export interface UnattributedCluster {
  deployer: string;
  packages: number;
  firstPackageAddress: string;
  latestPackageAddress: string;
  storageIota: number;
  modules: string[];
  /** Summed cumulative events across every (package, module) in this cluster. Mirror of `Project.events` so the triage-leaderboard can rank attributed + unattributed rows side-by-side. */
  events: number;
  /** True if any package×module in this cluster had its event count capped by `countEvents` — the `events` field is a floor. */
  eventsCapped: boolean;
  /** Summed `uniqueSenders` per-module across the cluster. Over-counts senders that used multiple modules; acceptable as a floor for ranking. */
  uniqueSenders: number;
  /** Summed cumulative TX count across every package in this cluster. Mirror of `Project.transactions` so the triage-leaderboard can rank attributed + unattributed rows side-by-side. */
  transactions: number;
  /** True if any package in this cluster had `transactionsCapped` — the `transactions` field is a floor. */
  transactionsCapped: boolean;
  /** `key:value` pairs extracted from a sampled Move object (tag, name, url, …). */
  sampleIdentifiers: string[];
  /** Fully-qualified type of the object we probed, for provenance. */
  sampledObjectType: string | null;
}

export interface Project {
  slug: string;
  name: string;
  layer: 'L1' | 'L2';
  category: string;
  description: string;
  urls: { label: string; href: string }[];
  packages: number;
  /** First package address on mainnet (L1 only) */
  packageAddress: string | null;
  /** Latest (upgraded) package address — used for event queries */
  latestPackageAddress: string | null;
  storageIota: number;
  events: number;
  eventsCapped: boolean;
  /** Cumulative MoveCall TX count summed across the project's matched packages. Rescues Salus-shape (object-mint) and TWIN-shape (anchoring) projects whose real activity under-reports in `events`. */
  transactions: number;
  /** True if any of the project's packages had per-scan TX pagination hit the page cap — `transactions` is a floor in that case. */
  transactionsCapped: boolean;
  modules: string[];
  tvl: number | null;
  /** Set when this project shares a DefiLlama slug with another higher-ranked project. Same numeric value as the primary's `tvl`; rendered in parens on the UI to signal the overlap. Mutually exclusive with `tvl` (exactly one is non-null when the row participates in a shared-slug group). */
  tvlShared: number | null;
  /** Name of the primary project this row shares its DefiLlama TVL with — used for the "shared with <primary>" tooltip. `null` when `tvlShared` is null. */
  tvlSharedWith: string | null;
  /** True for dumb PFP / collectible NFT projects (no utility, no RWA). Drives the "Hide collectibles" filter on the dashboard — RWA / utility NFTs stay `false`. */
  isCollectible: boolean;
  /** Resolved square icon URL. Precedence: `ProjectDefinition.logo` → `Team.logo` → `null` (frontend falls back to initials). Used on list rows, team cards, and other small renders. */
  logo: string | null;
  /** Resolved landscape wordmark URL. Precedence: `ProjectDefinition.logoWordmark` → `Team.logoWordmark` → `null` (details page falls back to `logo`). */
  logoWordmark: string | null;
  /** Owning team snapshot (resolved from def.teamId). `null` for aggregates / L2 */
  team: Team | null;
  /** Disclaimer text from the project definition (aggregates warn here). */
  disclaimer: string | null;
  /** Addresses that actually published this project's matched packages. */
  detectedDeployers: string[];
  /** Subset of `detectedDeployers` not present in the team's known deployer list — worth inspecting. */
  anomalousDeployers: string[];
  /** Unique sender addresses seen across this project's modules since first scan. */
  uniqueSenders: number;
  /** Prose explaining how this project's display name was derived (shown only on the details page). */
  attribution: string | null;
  /** ISO-8601 date the project was first added to the registry (from `ProjectDefinition.addedAt`). `null` for defs that predate the field or for DefiLlama-synthesized L2 rows. */
  addedAt: string | null;
}

interface PackageInfo {
  address: string;
  storageRebate: string;
  modules: { nodes: { name: string }[] };
  previousTransactionBlock: { sender: { address: string } | null } | null;
}

@Injectable()
export class EcosystemService implements OnModuleInit {
  private readonly logger = new Logger(EcosystemService.name);

  /**
   * Guards against concurrent `capture()` calls. Captures take 30–40 min
   * against mainnet; a second call landing while one is in flight would
   * double the load on the GraphQL endpoint and potentially double-write
   * the snapshot. Paired with `capture()`'s try/finally below.
   */
  private capturing = false;

  /** Returns true while a capture is actively running. */
  isCapturing(): boolean {
    return this.capturing;
  }

  /**
   * In-process LRU for classified snapshot views. Classification is
   * deterministic for a given `(snapshot, registry)` so the first request
   * pays the classify cost (~1–2 s + any fingerprint probes) and subsequent
   * reads within the TTL are free.
   *
   * Keyed by snapshot `_id`. Cap is small (4) because the hot access pattern
   * is latest + at most one baseline for growth-range queries. Short TTL
   * (5 min) also bounds staleness against live-chain-state drift that would
   * change fingerprint matching.
   */
  private classifyCache = new Map<
    string,
    { expiresAt: number; value: Awaited<ReturnType<EcosystemService['classifyFromRaw']>> }
  >();

  private static readonly CLASSIFY_CACHE_TTL_MS = 5 * 60 * 1000;
  private static readonly CLASSIFY_CACHE_MAX = 4;

  /**
   * Tier thresholds for post-capture wall-clock logging. Values match the
   * ship-gate tiers in `plans/implementation_strategy_conversation.md`:
   * 75 min = approaching alarm, 90 min = post-TX alarm (port events/senders
   * per shared follow-up), 100 min = post-Obj alarm. The hard timeout
   * (125 min) is a safety net for the rare "awaited promise literally hangs
   * forever" case — try/finally can't protect against it, but Promise.race
   * can. The 2h cron's in-flight guard handles the normal "long scan still
   * running at next tick" case by skipping.
   */
  private static readonly CAPTURE_WARN_MS = 75 * 60 * 1000;
  private static readonly CAPTURE_ALARM_MS = 90 * 60 * 1000;
  private static readonly CAPTURE_CRITICAL_MS = 100 * 60 * 1000;
  private static readonly CAPTURE_HARD_TIMEOUT_MS = 125 * 60 * 1000;

  constructor(
    @InjectModel(OnchainSnapshot.name) private ecoModel: Model<OnchainSnapshot>,
    @InjectModel(ProjectSenders.name) private senderModel: Model<ProjectSenders>,
    @InjectModel(ProjectSender.name) private senderDocModel: Model<ProjectSender>,
    @InjectModel(ProjectTxCounts.name) private txCountModel: Model<ProjectTxCounts>,
    private alerts: AlertsService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const count = await this.ecoModel.countDocuments();
    if (count === 0) {
      this.logger.log('No ecosystem snapshot found, capturing in background...');
      this.capture().catch((e) => this.logger.error('Initial ecosystem capture failed', e));
    }
  }

  /**
   * Classified ecosystem view for the most recent `OnchainSnapshot`. Returns
   * the same JSON shape the Nuxt frontend already consumes (`l1`, `l2`,
   * `unattributed`, totals, `networkTxTotal`, `txRates`) — no API contract
   * change. Classification runs every call but is cached in-process per
   * snapshot id, so repeat requests are O(1).
   */
  async getLatest() {
    const snap = await this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
    if (!snap) return null;
    return this.classifyCached(snap);
  }

  /** Fetch the raw latest snapshot without classification. Used by the growth endpoint. */
  async getLatestRaw() {
    return this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
  }

  /** Fetch raw snapshots in a `[from, to]` `createdAt` window. Used by the growth endpoint. */
  async findSnapshotsBetween(from: Date, to: Date) {
    return this.ecoModel
      .find({ createdAt: { $gte: from, $lte: to } })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  /**
   * Activity-leaderboard across classified projects + unattributed deployer
   * clusters between two snapshots. Baseline = latest snapshot with
   * `createdAt <= from` (null when the window predates any capture — deltas
   * then equal the latest row's absolute values). Latest = latest snapshot
   * with `createdAt <= to`.
   *
   * Output rows are uniform across scopes — attributed projects keyed by
   * `slug`, unattributed clusters keyed by `deployer` — with the same set
   * of delta fields (`events`, `transactions`, `packages`, `uniqueSenders`).
   * Sort key is controlled by `sortBy`; default `eventsDelta` preserves
   * legacy behaviour. `transactionsDelta` surfaces the loudest movers that
   * don't emit events (Salus-shape, TWIN-shape).
   *
   * Powers the triage dashboard: user sees which known projects grew fastest
   * this week (attributed leaderboard) and which unknown deployer clusters
   * did too (unattributed leaderboard) — same UI, one filter.
   */
  async growthRanking(
    from: Date,
    to: Date,
    scope: 'all' | 'attributed' | 'unattributed' = 'all',
    sortBy: 'eventsDelta' | 'transactionsDelta' = 'eventsDelta',
  ): Promise<{
    window: { from: Date; to: Date };
    baseline: { snapshotId: string; createdAt: Date } | null;
    latest: { snapshotId: string; createdAt: Date };
    sortBy: 'eventsDelta' | 'transactionsDelta';
    items: Array<{
      scope: 'attributed' | 'unattributed';
      key: string;
      name: string;
      events: number;
      eventsDelta: number;
      eventsCapped: boolean;
      transactions: number;
      transactionsDelta: number;
      transactionsCapped: boolean;
      packages: number;
      packagesDelta: number;
      uniqueSenders: number;
      uniqueSendersDelta: number;
      team: Team | null;
      logo: string | null;
      category: string | null;
      sampleIdentifiers: string[] | null;
    }>;
  } | null> {
    const baselineSnap = await this.ecoModel
      .findOne({ createdAt: { $lte: from } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const latestSnap = await this.ecoModel
      .findOne({ createdAt: { $lte: to } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (!latestSnap) return null;

    const baseline = baselineSnap ? await this.classifyCached(baselineSnap) : null;
    const latest = await this.classifyCached(latestSnap);

    // Baseline lookups: one map per scope. When baseline is null (window
    // predates first capture) all deltas collapse to the current value.
    const baselineProjects = new Map<string, (typeof latest.l1)[number]>();
    const baselineUnattrib = new Map<string, (typeof latest.unattributed)[number]>();
    if (baseline) {
      for (const p of baseline.l1) baselineProjects.set(p.slug, p);
      for (const u of baseline.unattributed) baselineUnattrib.set(u.deployer, u);
    }

    const items: Array<any> = [];

    if (scope === 'all' || scope === 'attributed') {
      for (const p of latest.l1) {
        const prev = baselineProjects.get(p.slug);
        items.push({
          scope: 'attributed',
          key: p.slug,
          name: p.name,
          events: p.events,
          eventsDelta: p.events - (prev?.events ?? 0),
          eventsCapped: p.eventsCapped,
          transactions: p.transactions ?? 0,
          transactionsDelta: (p.transactions ?? 0) - (prev?.transactions ?? 0),
          transactionsCapped: p.transactionsCapped ?? false,
          packages: p.packages,
          packagesDelta: p.packages - (prev?.packages ?? 0),
          uniqueSenders: p.uniqueSenders,
          uniqueSendersDelta: p.uniqueSenders - (prev?.uniqueSenders ?? 0),
          team: p.team,
          logo: p.logo,
          category: p.category,
          sampleIdentifiers: null,
        });
      }
    }

    if (scope === 'all' || scope === 'unattributed') {
      for (const u of latest.unattributed) {
        const prev = baselineUnattrib.get(u.deployer);
        items.push({
          scope: 'unattributed',
          key: u.deployer,
          name: `Unknown (${u.deployer.slice(0, 10)}…)`,
          events: u.events,
          eventsDelta: u.events - (prev?.events ?? 0),
          eventsCapped: u.eventsCapped,
          transactions: u.transactions ?? 0,
          transactionsDelta: (u.transactions ?? 0) - (prev?.transactions ?? 0),
          transactionsCapped: u.transactionsCapped ?? false,
          packages: u.packages,
          packagesDelta: u.packages - (prev?.packages ?? 0),
          uniqueSenders: u.uniqueSenders,
          uniqueSendersDelta: u.uniqueSenders - (prev?.uniqueSenders ?? 0),
          team: null,
          logo: null,
          category: null,
          sampleIdentifiers: u.sampleIdentifiers,
        });
      }
    }

    // Sort by the chosen delta, interleaving scopes when scope='all'.
    items.sort((a, b) => (b as any)[sortBy] - (a as any)[sortBy]);

    return {
      window: { from, to },
      baseline: baselineSnap
        ? { snapshotId: String(baselineSnap._id), createdAt: baselineSnap.createdAt! }
        : null,
      latest: { snapshotId: String(latestSnap._id), createdAt: latestSnap.createdAt! },
      sortBy,
      items,
    };
  }

  /**
   * Compute per-package / per-module growth deltas between two snapshots.
   * Baseline = latest snapshot with `createdAt <= from`; latest = latest
   * snapshot with `createdAt <= to`. Both are looked up from the raw
   * `onchainsnapshots` collection — no classification, no live RPC. The
   * delta is plain subtraction on cumulative counters keyed by the on-chain-
   * stable `(address, module)`, so adding a project definition or renaming
   * a team in between the two snapshots doesn't perturb the numbers.
   *
   * Packages present in the `to` snapshot but not the `from` snapshot are
   * flagged `isNew: true`; their module-level deltas are taken against zero.
   * Packages missing from `to` (should never happen on mainnet — packages
   * don't un-publish) are omitted.
   *
   * Returns `null` when either end of the window has no matching snapshot —
   * the caller surfaces this as a 404 rather than synthesizing numbers
   * against a nonexistent baseline.
   */
  async computeGrowth(from: Date, to: Date): Promise<{
    from: Date;
    to: Date;
    baseline: { snapshotId: string; createdAt: Date };
    latest: { snapshotId: string; createdAt: Date };
    network: {
      totalEventsDelta: number;
      totalTransactionsDelta: number;
      totalStorageRebateDelta: number;
      networkTxTotalDelta: number;
      newPackages: number;
    };
    packages: Array<{
      address: string;
      isNew: boolean;
      eventsDelta: number;
      uniqueSendersDelta: number;
      transactionsDelta: number;
      storageRebateDelta: number;
      modules: Array<{ module: string; eventsDelta: number; uniqueSendersDelta: number }>;
    }>;
  } | null> {
    const baseline = await this.ecoModel
      .findOne({ createdAt: { $lte: from } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const latest = await this.ecoModel
      .findOne({ createdAt: { $lte: to } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (!baseline || !latest) return null;
    if (String(baseline._id) === String(latest._id)) {
      // Both endpoints resolve to the same snapshot — no growth window.
      // Return zeros rather than erroring so the frontend can render a
      // "no change yet" state without branching.
      return {
        from,
        to,
        baseline: { snapshotId: String(baseline._id), createdAt: baseline.createdAt! },
        latest: { snapshotId: String(latest._id), createdAt: latest.createdAt! },
        network: {
          totalEventsDelta: 0,
          totalTransactionsDelta: 0,
          totalStorageRebateDelta: 0,
          networkTxTotalDelta: 0,
          newPackages: 0,
        },
        packages: [],
      };
    }

    // Index the baseline by address for O(1) lookups while scanning `latest`.
    const baselineByAddr = new Map<string, typeof baseline.packages[number]>();
    for (const p of baseline.packages) baselineByAddr.set(p.address, p);

    let totalEventsDelta = 0;
    let totalTransactionsDelta = 0;
    let totalStorageRebateDelta = 0;
    let newPackages = 0;
    const packages: Array<{
      address: string;
      isNew: boolean;
      eventsDelta: number;
      uniqueSendersDelta: number;
      transactionsDelta: number;
      storageRebateDelta: number;
      modules: Array<{ module: string; eventsDelta: number; uniqueSendersDelta: number }>;
    }> = [];

    for (const pkg of latest.packages) {
      const prev = baselineByAddr.get(pkg.address);
      const isNew = !prev;
      if (isNew) newPackages += 1;

      const prevModules = new Map<string, typeof pkg.moduleMetrics[number]>();
      for (const mm of prev?.moduleMetrics ?? []) prevModules.set(mm.module, mm);

      let pkgEventsDelta = 0;
      let pkgSendersDelta = 0;
      const moduleDeltas: Array<{ module: string; eventsDelta: number; uniqueSendersDelta: number }> = [];
      for (const mm of pkg.moduleMetrics) {
        const p = prevModules.get(mm.module);
        const eventsDelta = mm.events - (p?.events ?? 0);
        const sendersDelta = mm.uniqueSenders - (p?.uniqueSenders ?? 0);
        pkgEventsDelta += eventsDelta;
        pkgSendersDelta += sendersDelta;
        if (eventsDelta !== 0 || sendersDelta !== 0 || isNew) {
          moduleDeltas.push({ module: mm.module, eventsDelta, uniqueSendersDelta: sendersDelta });
        }
      }
      // TX count lives on PackageFact, not ModuleMetrics. Old snapshots
      // predating the tx-count schema addition decode with `transactions:
      // undefined` on `prev`; `?? 0` yields "delta = full current count"
      // against the first post-deploy snapshot — honest, that's when we
      // started counting. The frontend can surface this in a tooltip.
      const pkgTransactionsDelta = (pkg.transactions ?? 0) - (prev?.transactions ?? 0);
      const storageRebateDelta = pkg.storageRebateNanos - (prev?.storageRebateNanos ?? 0);
      totalEventsDelta += pkgEventsDelta;
      totalTransactionsDelta += pkgTransactionsDelta;
      totalStorageRebateDelta += storageRebateDelta;
      if (pkgEventsDelta !== 0 || pkgSendersDelta !== 0 || pkgTransactionsDelta !== 0 || storageRebateDelta !== 0 || isNew) {
        packages.push({
          address: pkg.address,
          isNew,
          eventsDelta: pkgEventsDelta,
          uniqueSendersDelta: pkgSendersDelta,
          transactionsDelta: pkgTransactionsDelta,
          storageRebateDelta,
          modules: moduleDeltas,
        });
      }
    }
    packages.sort((a, b) => b.eventsDelta - a.eventsDelta);

    return {
      from,
      to,
      baseline: { snapshotId: String(baseline._id), createdAt: baseline.createdAt! },
      latest: { snapshotId: String(latest._id), createdAt: latest.createdAt! },
      network: {
        totalEventsDelta,
        totalTransactionsDelta,
        totalStorageRebateDelta,
        networkTxTotalDelta: latest.networkTxTotal - baseline.networkTxTotal,
        newPackages,
      },
      packages,
    };
  }

  private async classifyCached(snap: any) {
    const key = String(snap._id);
    const now = Date.now();
    const hit = this.classifyCache.get(key);
    if (hit && hit.expiresAt > now) {
      // Refresh LRU order — delete + re-insert keeps most-recently-used last
      // so eviction (below) drops the least-recently-used entry first.
      this.classifyCache.delete(key);
      this.classifyCache.set(key, hit);
      return hit.value;
    }
    const value = await this.classifyFromRaw(snap);
    this.classifyCache.set(key, { expiresAt: now + EcosystemService.CLASSIFY_CACHE_TTL_MS, value });
    while (this.classifyCache.size > EcosystemService.CLASSIFY_CACHE_MAX) {
      // Map preserves insertion order — first key is least-recently-used.
      const firstKey = this.classifyCache.keys().next().value;
      if (firstKey === undefined) break;
      this.classifyCache.delete(firstKey);
    }
    return value;
  }

  /** Clear the classified-view cache. Called after a successful capture so the next read picks up the new snapshot. */
  invalidateClassifyCache() {
    this.classifyCache.clear();
  }

  // Refresh every 2 hours (was 6h prior to the 2026-04-20 raw-snapshot refactor).
  // 2h is a compromise between fresh deltas on the growth chart and scan duration —
  // a captureRaw() today takes ~45–60 min against mainnet, leaving headroom but not
  // unlimited. If we ever extend per-package scanning (e.g. add tx counts), revisit
  // the cadence before cranking it further.
  @Cron('0 */2 * * *')
  async capture() {
    // In-flight guard: only one capture at a time. `getLatest()` keeps
    // serving the previous snapshot throughout, so the dashboard never
    // goes blank during a refresh — the new snapshot appends on success
    // and `findOne().sort({createdAt:-1})` atomically picks it up.
    //
    // If a capture overruns the 2h cron window, the next cron tick reads
    // `capturing: true` and skips. We miss one snapshot interval rather
    // than overlap. No data corruption.
    if (this.capturing) {
      this.logger.log('Capture already in flight, skipping duplicate trigger');
      return;
    }
    this.capturing = true;
    this.logger.log('Capturing ecosystem snapshot...');
    const startedAt = Date.now();
    try {
      // Hard timeout at 125 min: the only edge case `try/finally` can't
      // protect against is an awaited promise that literally hangs forever
      // (no resolve, no reject). Promise.race forces the finally to run,
      // releasing the guard so the next cron tick can start. In-flight
      // GraphQL requests become orphaned; harmless (no one awaits them).
      // `.unref()` so the timer doesn't keep the Node process alive past
      // its natural exit (important for tests + graceful shutdown).
      const captureWork = (async () => {
        const raw = await this.captureRaw();
        const durationMs = Date.now() - startedAt;
        await this.ecoModel.create({ ...raw, captureDurationMs: durationMs });
        this.invalidateClassifyCache();
        return { raw, durationMs };
      })();
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const hardTimeout = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error(`Capture exceeded ${EcosystemService.CAPTURE_HARD_TIMEOUT_MS / 60000}min hard timeout — likely a hung await.`)),
          EcosystemService.CAPTURE_HARD_TIMEOUT_MS,
        );
        timeoutHandle.unref();
      });
      let raw: Awaited<ReturnType<EcosystemService['captureRaw']>>;
      let durationMs: number;
      try {
        ({ raw, durationMs } = await Promise.race([captureWork, hardTimeout]));
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }

      const durationMin = Math.round(durationMs / 60000);
      const summary =
        `Ecosystem snapshot saved in ${durationMin}min (${Math.round(durationMs / 1000)}s): ` +
        `${raw.packages.length} packages, ` +
        `${raw.packages.reduce((s, p) => s + p.moduleMetrics.reduce((ss, m) => ss + m.events, 0), 0)} events, ` +
        `${raw.packages.reduce((s, p) => s + (p.transactions ?? 0), 0)} txs`;

      // Tiered alarm log. Thresholds match the ship-gate from
      // `plans/implementation_strategy_conversation.md`: WARN at 75min
      // (approaching), ERROR at 90min (post-TX alarm — port events/senders
      // per shared follow-up before Obj schema work), and a louder ERROR
      // at 100min (post-Obj alarm — Obj schema work must wait).
      if (durationMs >= EcosystemService.CAPTURE_CRITICAL_MS) {
        const msg =
          `${summary} — CAPTURE DURATION ${durationMin}min ≥ 100min CRITICAL threshold. ` +
          `Shared follow-up (port events + senders to inner-loop parallelism) is required before any further per-package scanning lands. ` +
          `See plans/implementation_strategy_conversation.md § Cross-plan follow-up.`;
        this.logger.error(msg);
        this.alerts.notifyCaptureAlarm('critical', msg).catch(() => {});
      } else if (durationMs >= EcosystemService.CAPTURE_ALARM_MS) {
        const msg =
          `${summary} — CAPTURE DURATION ${durationMin}min ≥ 90min ALARM threshold. ` +
          `Post-TX ship-gate: hold Obj schema work. See plans/plan_tx_count.md § capture wall-clock alarm.`;
        this.logger.error(msg);
        this.alerts.notifyCaptureAlarm('alarm', msg).catch(() => {});
      } else if (durationMs >= EcosystemService.CAPTURE_WARN_MS) {
        this.logger.warn(
          `${summary} — capture duration ${durationMin}min ≥ 75min; approaching the 90min alarm.`,
        );
      } else {
        this.logger.log(summary);
      }
    } catch (e) {
      const durationMin = Math.round((Date.now() - startedAt) / 60000);
      this.logger.error(`Ecosystem capture failed after ${durationMin}min`, e);
    } finally {
      this.capturing = false;
    }
  }

  private async graphql(query: string): Promise<any> {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const json: any = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
  }

  private async getAllPackages(): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];
    let cursor: string | null = null;

    // Drain the full list. Safety cap at 2000 pages (100k packages) — if
    // mainnet ever has more, bump this; never let it cut the scan silently.
    for (let page = 0; page < 2000; page++) {
      const afterClause: string = cursor ? `, after: "${cursor}"` : '';
      const data: any = await this.graphql(`{
        packages(first: 50${afterClause}) {
          nodes {
            address
            storageRebate
            modules { nodes { name } }
            previousTransactionBlock { sender { address } }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`);
      packages.push(...data.packages.nodes);
      if (!data.packages.pageInfo.hasNextPage) break;
      cursor = data.packages.pageInfo.endCursor;
    }
    if (packages.length >= 2000 * 50) {
      this.logger.warn(`Package scan hit the 100k safety cap — results may be incomplete`);
    }
    this.logger.log(`Fetched ${packages.length} mainnet packages`);
    return packages;
  }

  private async countEvents(emittingModule: string, maxPages = 50000): Promise<{ count: number; capped: boolean }> {
    let total = 0;
    let cursor: string | null = null;

    for (let i = 0; i < maxPages; i++) {
      const afterClause: string = cursor ? `, after: "${cursor}"` : '';
      try {
        const data: any = await this.graphql(`{
          events(filter: { emittingModule: "${emittingModule}" }, first: 50${afterClause}) {
            nodes { __typename }
            pageInfo { hasNextPage endCursor }
          }
        }`);
        total += data.events.nodes.length;
        if (!data.events.pageInfo.hasNextPage) return { count: total, capped: false };
        cursor = data.events.pageInfo.endCursor;
      } catch {
        break;
      }
    }
    return { count: total, capped: total >= maxPages * 50 };
  }

  /**
   * Incrementally collect unique sender addresses for a (package, module).
   * Sender docs live in the `ProjectSender` collection — this method keeps
   * the per-(pkg, module) cursor/state record up to date and triggers a
   * forward page. Returns the current total sender count for this module.
   *
   * On first encounter we set the cursor to the current end of events (no
   * historical backfill — that's a separate one-time job). Subsequent scans
   * fetch only events after the stored cursor.
   */
  private async updateSendersForModule(packageAddress: string, module: string): Promise<number> {
    const emittingModule = `${packageAddress}::${module}`;
    let record = await this.senderModel.findOne({ packageAddress, module });

    if (!record) {
      try {
        const latest: any = await this.graphql(`{
          events(filter: { emittingModule: "${emittingModule}" }, last: 1) {
            pageInfo { endCursor }
          }
        }`);
        await this.senderModel.create({
          packageAddress,
          module,
          cursor: latest.events?.pageInfo?.endCursor ?? null,
          senders: [],
          eventsScanned: 0,
        });
      } catch {
        // ignore
      }
      return 0;
    }

    await this.pageForwardSenders(record, emittingModule, 100);
    return this.senderDocModel.countDocuments({ packageAddress, module });
  }

  /**
   * Drain all historical events for a (package, module) starting from cursor=null.
   * Designed to be invoked from a one-shot CLI; resumes if interrupted.
   * Existing records are reset (cursor=null, eventsScanned=0) before draining
   * because the live cron anchors the cursor at end-of-history on first sight
   * — without the reset, this method would just page forward from that anchor
   * and find no history. Sender docs already in `ProjectSender` stay put;
   * re-inserts are deduped by the unique compound index.
   * Returns the total unique sender count for the module after the drain.
   */
  async backfillSendersForModule(packageAddress: string, module: string): Promise<number> {
    const emittingModule = `${packageAddress}::${module}`;
    let record = await this.senderModel.findOne({ packageAddress, module });

    if (!record) {
      record = await this.senderModel.create({
        packageAddress,
        module,
        cursor: null,
        senders: [],
        eventsScanned: 0,
      });
    } else {
      record.cursor = null;
      record.eventsScanned = 0;
      await record.save();
    }

    // Drain in 100-page batches (5000 events each) until no more pages.
    let prevCursor: string | null | undefined;
    let safety = 0;
    while (record.cursor !== prevCursor && safety < 100) {
      prevCursor = record.cursor;
      const moreScanned = await this.pageForwardSenders(record, emittingModule, 100);
      if (moreScanned === 0) break;
      safety += 1;
    }

    return this.senderDocModel.countDocuments({ packageAddress, module });
  }

  async backfillAllSenders(
    onProgress?: (info: { project: string; module: string; senders: number }) => void,
  ): Promise<{ totalProjects: number; totalModules: number; totalSenders: number }> {
    const snapshot = await this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
    if (!snapshot) {
      throw new Error('No ecosystem snapshot exists yet — run a scan first.');
    }

    // Backfill runs over every raw package × module recorded in the snapshot.
    // Classification doesn't matter for sender drain — `ProjectSenders` is
    // keyed by `(packageAddress, module)`, which is stable regardless of
    // which ProjectDefinition the package ultimately maps to at read time.
    const packages = snapshot.packages.filter((p) => p.modules.length > 0);
    let totalModules = 0;
    let totalSenders = 0;

    for (const p of packages) {
      for (const mod of p.modules) {
        const count = await this.backfillSendersForModule(p.address, mod);
        totalModules += 1;
        totalSenders += count;
        onProgress?.({ project: p.address, module: mod, senders: count });
      }
    }

    return { totalProjects: packages.length, totalModules, totalSenders };
  }

  /**
   * Pages forward from `record.cursor`, upserting each unique sender into the
   * `ProjectSender` collection (one doc per `(packageAddress, module, address)`;
   * uniqueness enforced via compound index, duplicates are silently dropped).
   * Mutates + saves the cursor and eventsScanned counter on `record`.
   * Returns the number of events scanned in this call.
   */
  private async pageForwardSenders(record: ProjectSenders, emittingModule: string, maxPages: number): Promise<number> {
    let cursor = record.cursor;
    const newSenders = new Set<string>();
    let scanned = 0;

    for (let i = 0; i < maxPages; i++) {
      const after = cursor ? `, after: "${cursor}"` : '';
      try {
        const data: any = await this.graphql(`{
          events(filter: { emittingModule: "${emittingModule}" }, first: 50${after}) {
            nodes { sender { address } }
            pageInfo { hasNextPage endCursor }
          }
        }`);
        const nodes = data.events?.nodes ?? [];
        for (const e of nodes) {
          const addr = e.sender?.address?.toLowerCase();
          if (addr) newSenders.add(addr);
        }
        scanned += nodes.length;
        cursor = data.events?.pageInfo?.endCursor ?? cursor;
        if (!data.events?.pageInfo?.hasNextPage) break;
      } catch {
        break;
      }
    }

    if (newSenders.size > 0) {
      const docs = Array.from(newSenders).map((address) => ({
        packageAddress: record.packageAddress,
        module: record.module,
        address,
      }));
      try {
        await this.senderDocModel.insertMany(docs, { ordered: false });
      } catch (e: any) {
        // Duplicate-key errors (code 11000) on the compound unique index are
        // expected — they simply mean we've seen the sender before. Re-throw
        // anything else so unexpected write failures are not hidden.
        const allDupKey =
          e?.code === 11000 ||
          (Array.isArray(e?.writeErrors) && e.writeErrors.every((we: any) => (we?.code ?? we?.err?.code) === 11000));
        if (!allDupKey) throw e;
      }
    }

    if (scanned > 0) {
      record.cursor = cursor;
      record.eventsScanned += scanned;
      await record.save();
    }
    return scanned;
  }

  /**
   * Pages forward from `record.cursor` through `transactionBlocks(filter: { function: <pkg> })`,
   * counting nodes into `record.total`. Unlike senders, there's no per-item
   * dedupe — every TX node is a +1 increment. Mutates + saves cursor + total
   * + txsScanned on `record`. Returns `{ scanned, reachedEnd }` where
   * `reachedEnd: true` means we exited via `hasNextPage: false` (fully caught
   * up through the saved cursor); `false` means we exhausted the page budget
   * with more history pending — the caller sets `transactionsCapped: true`
   * in that case to keep the `transactions` field honest as a floor.
   */
  private async pageForwardTxs(record: ProjectTxCounts, maxPages: number): Promise<{ scanned: number; reachedEnd: boolean }> {
    let cursor = record.cursor;
    let scanned = 0;
    let reachedEnd = false;

    for (let i = 0; i < maxPages; i++) {
      const after = cursor ? `, after: "${cursor}"` : '';
      try {
        const data: any = await this.graphql(`{
          transactionBlocks(filter: { function: "${record.packageAddress}" }, first: 50${after}) {
            nodes { digest }
            pageInfo { hasNextPage endCursor }
          }
        }`);
        const nodes = data.transactionBlocks?.nodes ?? [];
        scanned += nodes.length;
        cursor = data.transactionBlocks?.pageInfo?.endCursor ?? cursor;
        if (!data.transactionBlocks?.pageInfo?.hasNextPage) {
          reachedEnd = true;
          break;
        }
      } catch {
        break;
      }
    }

    if (scanned > 0) {
      record.cursor = cursor;
      record.total += scanned;
      record.txsScanned += scanned;
      await record.save();
    }
    return { scanned, reachedEnd };
  }

  /**
   * Incrementally update the running TX count for a package. One cursor-state
   * record per `packageAddress` in `ProjectTxCounts`. On first sight, anchors
   * the cursor at end-of-history via `last: 1` (so we don't pay a full-history
   * backfill on every new package — that's the `backfillTxCountsForPackage`
   * CLI's job). Subsequent scans page forward from the saved cursor.
   *
   * Returns `{ total, capped }`. `capped` is true when this scan exhausted
   * its page budget without reaching `hasNextPage: false` — the `total`
   * is a floor until the next scan catches up. Mirrors the `eventsCapped`
   * / `countEvents` honesty convention.
   */
  private async updateTxCountForPackage(packageAddress: string): Promise<{ total: number; capped: boolean }> {
    let record = await this.txCountModel.findOne({ packageAddress });

    if (!record) {
      try {
        const latest: any = await this.graphql(`{
          transactionBlocks(filter: { function: "${packageAddress}" }, last: 1) {
            pageInfo { endCursor }
          }
        }`);
        await this.txCountModel.create({
          packageAddress,
          cursor: latest.transactionBlocks?.pageInfo?.endCursor ?? null,
          total: 0,
          txsScanned: 0,
        });
      } catch {
        // First-sight anchor failed; leave uncreated so next scan retries.
      }
      return { total: 0, capped: false };
    }

    const { reachedEnd } = await this.pageForwardTxs(record, 100);
    return { total: record.total, capped: !reachedEnd };
  }

  /**
   * Drain all historical TXs for a package starting from cursor=null.
   * Designed to be invoked from a one-shot CLI; resumes if interrupted.
   * Existing records are reset (cursor=null, total=0, txsScanned=0) before
   * draining because the live cron anchors the cursor at end-of-history on
   * first sight — without the reset, this method would just page forward
   * from that anchor and find no history. Mirrors `backfillSendersForModule`.
   * Returns `{ total, capped }`.
   */
  async backfillTxCountsForPackage(packageAddress: string): Promise<{ total: number; capped: boolean }> {
    let record = await this.txCountModel.findOne({ packageAddress });

    if (!record) {
      record = await this.txCountModel.create({
        packageAddress,
        cursor: null,
        total: 0,
        txsScanned: 0,
      });
    } else {
      record.cursor = null;
      record.total = 0;
      record.txsScanned = 0;
      await record.save();
    }

    // Drain in 100-page batches (5000 TXs each) until hasNextPage:false.
    // Safety cap at 1000 outer iterations ≈ 5M TXs — no mainnet package
    // comes close today; bumps the ceiling if that ever changes.
    let safety = 0;
    let reachedEnd = false;
    while (safety < 1000) {
      const result = await this.pageForwardTxs(record, 100);
      if (result.reachedEnd) {
        reachedEnd = true;
        break;
      }
      if (result.scanned === 0) break; // endpoint swallowed an error; stop rather than loop
      safety += 1;
    }

    return { total: record.total, capped: !reachedEnd };
  }

  /**
   * Parallel full-fleet TX-count backfill across every package in the latest
   * snapshot. Worker-pool with `concurrency` parallel packages in flight;
   * pagination inside each package stays serial (cursor chain). Default
   * concurrency=20 validated against mainnet (see `plans/limits.md`).
   *
   * Classification-free — iterates `packages[].address` from the raw snapshot,
   * so `ProjectTxCounts` repopulates for every package regardless of whether
   * it matches a `ProjectDefinition` today. Same retroactivity guarantee
   * `backfillAllSenders` has.
   */
  async backfillAllTxCounts(
    onProgress?: (info: { packageAddress: string; total: number; capped: boolean }) => void,
    concurrency: number = 20,
  ): Promise<{ totalPackages: number; totalTxs: number; cappedPackages: number }> {
    const snapshot = await this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
    if (!snapshot) {
      throw new Error('No ecosystem snapshot exists yet — run a scan first.');
    }

    const addresses = snapshot.packages.map((p) => p.address);
    let totalTxs = 0;
    let cappedPackages = 0;
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= addresses.length) return;
        const addr = addresses[i];
        try {
          const { total, capped } = await this.backfillTxCountsForPackage(addr);
          totalTxs += total;
          if (capped) cappedPackages += 1;
          onProgress?.({ packageAddress: addr, total, capped });
        } catch (e) {
          this.logger.warn(`backfillTxCounts: package ${addr} failed — ${(e as Error).message}`);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

    return { totalPackages: addresses.length, totalTxs, cappedPackages };
  }

  /**
   * Classify a package against `ALL_PROJECTS` by AND-combining every
   * specified criterion in the first def that passes. Priority is the
   * order of `ALL_PROJECTS` — first match wins.
   *
   * A def with no synchronous criteria (empty `match`, or `match` containing
   * only `fingerprint`) is skipped here; it's only reachable via
   * `matchByFingerprint` or team-deployer routing downstream.
   */
  private matchProject(
    mods: Set<string>,
    address: string,
    deployer: string | null,
  ): ProjectDefinition | null {
    const lowerAddr = address.toLowerCase();
    const lowerDeployer = deployer?.toLowerCase() ?? null;
    for (const def of ALL_PROJECTS) {
      if (!hasSyncMatch(def)) continue;
      const { match } = def;

      if (match.packageAddresses?.length) {
        if (!match.packageAddresses.some((a) => a.toLowerCase() === lowerAddr)) continue;
      }
      if (match.deployerAddresses?.length) {
        if (!lowerDeployer) continue;
        if (!match.deployerAddresses.some((a) => a.toLowerCase() === lowerDeployer)) continue;
      }
      if (match.exact?.length) {
        const expected = new Set(match.exact);
        if (mods.size !== expected.size) continue;
        if (![...expected].every((m) => mods.has(m))) continue;
      }
      if (match.all?.length && !match.all.every((m) => mods.has(m))) continue;
      if (match.any?.length && !match.any.some((m) => mods.has(m))) continue;
      if (match.minModules && mods.size < match.minModules) continue;
      return def;
    }
    return null;
  }

  private async probeFingerprint(
    pkgAddress: string,
    fp: NonNullable<ProjectDefinition['match']['fingerprint']>,
  ): Promise<boolean> {
    try {
      const data: any = await this.graphql(`{
        objects(filter: { type: "${pkgAddress}::${fp.type}" }, first: 1) {
          nodes { asMoveObject { contents { json } } }
        }
      }`);
      const fields = data.objects?.nodes?.[0]?.asMoveObject?.contents?.json;
      if (!fields) return false;
      if (fp.issuer && String(fields.issuer ?? '').toLowerCase() !== fp.issuer.toLowerCase()) return false;
      if (fp.tag && fields.tag !== fp.tag) return false;
      for (const [key, rule] of Object.entries(fp.fields ?? {})) {
        const v = fields[key];
        if (typeof rule === 'string') {
          if (v !== rule) return false;
          continue;
        }
        if (rule.present && (v === undefined || v === null || v === '')) return false;
        if (rule.prefix !== undefined && (typeof v !== 'string' || !v.startsWith(rule.prefix))) return false;
        if (rule.suffix !== undefined && (typeof v !== 'string' || !v.endsWith(rule.suffix))) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sample one Move object from the package and extract a human-readable label.
   * Tries `<pkg>::<module>::NFT` then `<pkg>::<module>::Nft` for each module.
   * Returns the first non-empty `tag`/`name`/`collection_name` field found.
   */
  private async probeSampleName(pkgAddress: string, modules: string[]): Promise<string | null> {
    for (const mod of modules.slice(0, 3)) {
      for (const structName of ['NFT', 'Nft']) {
        try {
          const data: any = await this.graphql(`{
            objects(filter: { type: "${pkgAddress}::${mod}::${structName}" }, first: 1) {
              nodes { asMoveObject { contents { json } } }
            }
          }`);
          const fields = data.objects?.nodes?.[0]?.asMoveObject?.contents?.json;
          if (!fields) continue;
          const candidate = fields.tag ?? fields.name ?? fields.collection_name;
          if (typeof candidate !== 'string') continue;
          const trimmed = candidate.trim();
          if (!trimmed || trimmed.length > 80) continue;
          return trimmed;
        } catch {
          // try next struct/module
        }
      }
    }
    return null;
  }

  /**
   * Deep identity probe for an unattributed package. Queries any Move object
   * whose type starts with `<pkg>` (GraphQL's `type` filter supports prefix
   * matching — verified empirically against `pkg` alone and `pkg::mod`).
   *
   * Extracts short string-valued fields from the sampled object's JSON. The
   * point is to surface self-attestation — e.g. Salus's `tag: "salus"` or an
   * `issuer`/`url`/`collection_name` — that a package-level ProjectDefinition
   * matcher would miss because module names are generic.
   *
   * Pages through up to MAX_OBJECT_PAGES * 50 objects per package because the
   * first page is often dominated by admin caps / generic Bag wrappers / empty
   * registries created at init — the identifying objects (NFTs, configs with
   * brand metadata) sit further in. Short-circuits as soon as TARGET_IDENTS
   * are collected to keep the cron budget tight.
   */
  private async probeIdentityFields(
    pkgAddress: string,
  ): Promise<{ identifiers: string[]; objectType: string | null }> {
    const identifierKeys = new Set([
      'tag', 'name', 'issuer', 'project', 'protocol',
      'collection_name', 'collection', 'title', 'symbol', 'ticker',
      'brand', 'url', 'website', 'publisher', 'creator', 'author',
    ]);
    const MAX_OBJECT_PAGES = 3;
    const TARGET_IDENTS = 3;
    const idents = new Set<string>();
    let sampledType: string | null = null;
    let cursor: string | null = null;

    for (let page = 0; page < MAX_OBJECT_PAGES; page++) {
      const after: string = cursor ? `, after: "${cursor}"` : '';
      let data: any;
      try {
        data = await this.graphql(`{
          objects(filter: { type: "${pkgAddress}" }, first: 50${after}) {
            nodes { asMoveObject { contents { type { repr } json } } }
            pageInfo { hasNextPage endCursor }
          }
        }`);
      } catch {
        break;
      }
      const nodes = data.objects?.nodes ?? [];
      if (nodes.length === 0) break;
      for (const n of nodes) {
        const json = n.asMoveObject?.contents?.json;
        const typeRepr = n.asMoveObject?.contents?.type?.repr as string | undefined;
        if (!json) continue;
        if (!sampledType && typeRepr) sampledType = typeRepr;
        for (const [k, v] of Object.entries(json)) {
          if (typeof v !== 'string') continue;
          const trimmed = v.trim();
          if (!trimmed || trimmed.length > 80) continue;
          const keyLower = k.toLowerCase();
          const looksIdentifying =
            identifierKeys.has(keyLower) ||
            /^https?:\/\//.test(trimmed) ||
            /^[A-Za-z][A-Za-z0-9 _\-.:/]{2,}$/.test(trimmed);
          if (!looksIdentifying) continue;
          // Skip fields that just echo the package address.
          if (trimmed.toLowerCase().startsWith('0x') && trimmed.length > 40) continue;
          idents.add(`${k}: ${trimmed}`);
          if (idents.size >= 20) break;
        }
        if (idents.size >= 20) break;
      }
      if (idents.size >= TARGET_IDENTS) break;
      if (!data.objects?.pageInfo?.hasNextPage) break;
      cursor = data.objects?.pageInfo?.endCursor ?? null;
      if (!cursor) break;
    }
    return { identifiers: Array.from(idents), objectType: sampledType };
  }

  /**
   * Fallback probe for logic-only packages whose own types are never owned by
   * any object (so `probeIdentityFields` returns empty). Reads `effects
   * .objectChanges` of one TX touching the package and harvests every
   * non-framework `<addr>::<module>::<Type>` fragment from the changed objects'
   * type reprs — including types from sibling packages. For a 25-package CDP
   * protocol like Virtue (logic in this pkg, types in sibling cert/vusd
   * packages), this surfaces `vusd::VUSD`, `cert::CERT`, etc. as
   * `creates: <short>` identifiers that a human can pattern-match into a
   * `ProjectDefinition`.
   */
  private async probeTxEffects(
    pkgAddress: string,
  ): Promise<{ identifiers: string[]; objectType: string | null }> {
    const FRAMEWORK_PREFIX = '0x0000000000000000000000000000000000000000000000000000000000000';
    const idents = new Set<string>();
    let sampledType: string | null = null;

    let data: any;
    try {
      data = await this.graphql(`{
        transactionBlocks(filter: { function: "${pkgAddress}" }, first: 3) {
          nodes {
            effects {
              objectChanges {
                nodes {
                  outputState { asMoveObject { contents { type { repr } } } }
                }
              }
            }
          }
        }
      }`);
    } catch {
      return { identifiers: [], objectType: null };
    }

    const typeRe = /(0x[0-9a-f]{40,})::([a-z_][a-z0-9_]*)::([A-Z][A-Za-z0-9_]*)/g;
    const txs = data.transactionBlocks?.nodes ?? [];
    for (const tx of txs) {
      const changes = tx.effects?.objectChanges?.nodes ?? [];
      for (const ch of changes) {
        const repr = ch.outputState?.asMoveObject?.contents?.type?.repr as string | undefined;
        if (!repr) continue;
        typeRe.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = typeRe.exec(repr)) !== null) {
          const [, addr, mod, type] = m;
          if (addr.startsWith(FRAMEWORK_PREFIX)) continue;
          const short = `${addr.slice(0, 8)}…::${mod}::${type}`;
          idents.add(`creates: ${short}`);
          if (!sampledType) sampledType = `${addr}::${mod}::${type}`;
          if (idents.size >= 20) break;
        }
        if (idents.size >= 20) break;
      }
      if (idents.size >= 20) break;
    }
    return { identifiers: Array.from(idents), objectType: sampledType };
  }

  private async matchByFingerprint(mods: Set<string>, address: string): Promise<ProjectDefinition | null> {
    for (const def of ALL_PROJECTS) {
      const fp = def.match.fingerprint;
      if (!fp) continue;
      const fpModule = fp.type.split('::')[0];
      if (!mods.has(fpModule)) continue;
      if (await this.probeFingerprint(address, fp)) return def;
    }
    return null;
  }

  /**
   * Gathers raw on-chain facts for every mainnet package and stores them
   * classification-free in the snapshot. No project-registry dependence —
   * the output is verbatim chain state, so historical snapshots stay valid
   * forever, even as `ALL_PROJECTS`/`ALL_TEAMS` evolve.
   *
   * Per-package output:
   *   - `address`, `deployer`, `storageRebateNanos`, `modules[]`
   *   - `moduleMetrics[]` — cumulative per-module `events` + `uniqueSenders`
   *     (senders taken from the maintained `ProjectSenders` collection,
   *     updated in place during this scan)
   *   - `fingerprint` — one identity probe per package (object-level first,
   *     tx-effects fallback for logic-only packages). Raw key:value strings
   *     suitable for UI display and (with a follow-up rule shape) classifier
   *     fingerprint matching without live RPC
   *
   * The framework filter (`0x0000…0001` etc.) is registry-dependent but
   * cheap — it only decides whether we capture these at all, not how we
   * label them downstream.
   */
  private async captureRaw(): Promise<{
    packages: PackageFact[];
    totalStorageRebateNanos: number;
    networkTxTotal: number;
    txRates: Record<string, number>;
  }> {
    const allPackages = await this.getAllPackages();

    // Framework filter (see doc-comment above).
    const claimedAddresses = new Set<string>();
    for (const def of ALL_PROJECTS) {
      for (const addr of def.match.packageAddresses ?? []) {
        claimedAddresses.add(addr.toLowerCase());
      }
    }

    const packages: PackageFact[] = [];
    let totalStorageRebateNanos = 0;

    for (const pkg of allPackages) {
      if (
        pkg.address.startsWith('0x000000000000000000000000000000000000000000000000000000000000000') &&
        !claimedAddresses.has(pkg.address.toLowerCase())
      ) {
        continue;
      }

      const deployer = pkg.previousTransactionBlock?.sender?.address?.toLowerCase() ?? null;
      const modules = (pkg.modules?.nodes || []).map((m) => m.name);
      const storageRebateNanos = Number(pkg.storageRebate || 0);
      totalStorageRebateNanos += storageRebateNanos;

      // Per-module counters. These stay cumulative across scans so delta
      // queries are plain subtraction between any two snapshots.
      const moduleMetrics: ModuleMetrics[] = [];
      for (const mod of modules) {
        const { count: events, capped: eventsCapped } = await this.countEvents(`${pkg.address}::${mod}`);
        const uniqueSenders = await this.updateSendersForModule(pkg.address, mod);
        moduleMetrics.push({
          module: mod,
          events,
          eventsCapped,
          uniqueSenders,
        });
      }

      // Identity probe — one shot per package. Pass 1 reads owned Move
      // objects (NFTs, configs with brand metadata); pass 2 falls back to
      // tx-effect object changes for logic-only packages (CDP-style
      // protocols whose package contains logic but never owns objects of
      // its own types). Storing the raw output keeps classification
      // schema-independent at read time.
      const ident = await this.probeIdentityFields(pkg.address);
      let identifiers = ident.identifiers;
      let objectType: string | null = ident.objectType;
      if (identifiers.length === 0) {
        const tx = await this.probeTxEffects(pkg.address);
        if (tx.identifiers.length) {
          identifiers = tx.identifiers;
          if (!objectType) objectType = tx.objectType;
        }
      }
      const fingerprint: FingerprintSampleDoc | null =
        identifiers.length > 0 || objectType
          ? { sampledObjectType: objectType, identifiers }
          : null;

      // Per-package cumulative TX count. Sibling to the events/senders loop
      // above; one GraphQL call per scan on the steady-state path (cursor-
      // forward from the saved watermark). Full history drains happen via
      // the `backfill:txcounts` CLI, not here.
      const { total: transactions, capped: transactionsCapped } =
        await this.updateTxCountForPackage(pkg.address);

      packages.push({
        address: pkg.address,
        deployer,
        storageRebateNanos,
        modules,
        moduleMetrics,
        objectCount: 0, // reserved for future — see schema doc-comment
        transactions,
        transactionsCapped,
        fingerprint,
      } as PackageFact);
    }

    const checkpointData: any = await this.graphql(`{ checkpoint { networkTotalTransactions } }`);
    const networkTxTotal = Number(checkpointData.checkpoint.networkTotalTransactions);
    const daysLive = 332;
    const secondsLive = daysLive * 86400;

    this.logger.log(
      `captureRaw: ${packages.length} packages, ` +
        `${packages.reduce((s, p) => s + p.moduleMetrics.reduce((ss, m) => ss + m.events, 0), 0)} events, ` +
        `${packages.reduce((s, p) => s + (p.transactions ?? 0), 0)} txs, ` +
        `${packages.filter((p) => p.fingerprint).length} with identity fingerprint`,
    );

    return {
      packages,
      totalStorageRebateNanos,
      networkTxTotal,
      txRates: {
        perYear: Math.round((networkTxTotal / daysLive) * 365),
        perMonth: Math.round((networkTxTotal / daysLive) * 30),
        perWeek: Math.round((networkTxTotal / daysLive) * 7),
        perDay: Math.round(networkTxTotal / daysLive),
        perHour: Math.round(networkTxTotal / (daysLive * 24)),
        perMinute: Math.round(networkTxTotal / (daysLive * 24 * 60)),
        perSecond: Math.round((networkTxTotal / secondsLive) * 100) / 100,
      },
    };
  }

  /**
   * Applies the current `ALL_PROJECTS` / `ALL_TEAMS` registry to a raw
   * `OnchainSnapshot`, producing the classified view the frontend renders.
   * Pure with respect to the snapshot — running the same `(snapshot, registry)`
   * combination always returns the same output, modulo live RPC for
   * fingerprint matching and live DefiLlama TVL.
   *
   * A new project definition landed today retroactively re-labels every
   * historical snapshot at read time (schema independence goal), because
   * the matching lookup happens here, not at capture.
   */
  private async classifyFromRaw(raw: {
    _id?: unknown;
    packages: PackageFact[];
    totalStorageRebateNanos?: number;
    networkTxTotal: number;
    txRates: Record<string, number>;
    createdAt?: Date;
  }) {
    const projectMap = new Map<string, { def: ProjectDefinition; facts: PackageFact[]; splitDeployer?: string }>();
    // Unmatched packages grouped by deployer. `unknown` collects packages
    // whose deployer resolves to null (framework / legacy publish records).
    const unattributedByDeployer = new Map<string, PackageFact[]>();
    for (const pkg of raw.packages) {
      const mods = new Set(pkg.modules);
      const pkgDeployer = pkg.deployer;
      let def = this.matchProject(mods, pkg.address, pkgDeployer);
      // When the synchronous match is an aggregate bucket, consult fingerprint
      // first — a more-specific project may claim this package by `issuer`/`tag`.
      if (def?.splitByDeployer) {
        const fp = await this.matchByFingerprint(mods, pkg.address);
        if (fp && fp.name !== def.name) def = fp;
      }
      if (!def) def = await this.matchByFingerprint(mods, pkg.address);
      if (!def) {
        const key = pkgDeployer?.toLowerCase() ?? 'unknown';
        const bucket = unattributedByDeployer.get(key);
        if (bucket) bucket.push(pkg);
        else unattributedByDeployer.set(key, [pkg]);
        continue;
      }

      let mapKey = def.name;
      let splitDeployer: string | undefined;
      if (def.splitByDeployer) {
        const deployer = pkg.deployer?.toLowerCase() ?? 'unknown';
        // Team routing: route aggregate-bucket packages (NFT Collections) to
        // a team's "routing-only" project — one that sets `match: {}` to
        // declare "I exist only to receive team-deployer-routed packages".
        // Projects with their own match rules (e.g. TWIN's
        // `{all: [verifiable_storage]}`, or IF's Notarization rule) must
        // never absorb unrelated packages from a shared deployer; they're
        // reached via matchProject, not here.
        //
        // A team can have many projects and still participate in routing as
        // long as AT LEAST ONE is routing-only — this lets us put the
        // IF Testing project on the iota-foundation team without fragmenting
        // team identity across sub-teams.
        //
        // Iterate every team claiming the deployer because one deployer can
        // belong to multiple teams (e.g. `0x164625aa…` is on both TWIN and
        // iota-foundation). Pick the first team that exposes a routing-only
        // project; if none do, the package stays in the aggregate bucket
        // split by deployer.
        const candidateTeams = ALL_TEAMS.filter((t) =>
          t.deployers.some((d) => d.toLowerCase() === deployer),
        );
        let routed = false;
        for (const team of candidateTeams) {
          const routingOnly = ALL_PROJECTS.find(
            (p) => p.teamId === team.id && isRoutingOnly(p),
          );
          if (!routingOnly) continue;
          def = routingOnly;
          mapKey = def.name;
          routed = true;
          break;
        }
        if (!routed) {
          splitDeployer = deployer;
          mapKey = `${def.name}::${deployer}`;
        }
      }
      const existing = projectMap.get(mapKey);
      if (existing) { existing.facts.push(pkg); } else { projectMap.set(mapKey, { def, facts: [pkg], splitDeployer }); }
    }

    const projects: Project[] = [];
    for (const [, { def, facts, splitDeployer }] of projectMap) {
      const latestPkg = facts[facts.length - 1];
      const latestMods = latestPkg.modules;
      const totalStorage = facts.reduce((sum, p) => sum + Number(p.storageRebateNanos || 0), 0) / 1_000_000_000;

      // Events: sum stored per-module counters across every package in the
      // project's set — not just the latest. Move events are scoped by the
      // emitting package's address: when a package is upgraded, the new
      // address gets its own event stream, and events on the old address
      // stay bound there forever. Summing across packages preserves historical
      // activity (e.g. TWIN's 2000+ `store_data` events on the prior
      // `0xf951…cc13` package address). Same rationale for deployer-matched
      // projects (LayerZero, Tradeport, ObjectID, etc.) where the project's
      // package set contains sibling packages, not only an upgrade chain.
      //
      // Senders: live-read from `ProjectSender` (per-sender docs, one per
      // `(packageAddress, module, address)`) + UNION across the project's
      // (package, module) pairs. The snapshot stores per-module counts for
      // the growth endpoint's delta math, but for the classified view we
      // still need to dedupe a wallet active on mod_a and mod_b so it
      // counts once. We do the union server-side via `$group: { _id: address }`
      // + `$count` — returning only a number avoids pulling large address
      // lists across the wire (otterfly_1 alone can be ~210k addresses).
      let events = 0;
      let eventsCapped = false;
      let transactions = 0;
      let transactionsCapped = false;
      const pairs: Array<{ packageAddress: string; module: string }> = [];
      for (const pkg of facts) {
        for (const mm of pkg.moduleMetrics) {
          events += mm.events;
          if (mm.eventsCapped) eventsCapped = true;
          pairs.push({ packageAddress: pkg.address, module: mm.module });
        }
        // TX count lives on PackageFact (package-level, not per-module).
        // Old snapshots predating the tx-count schema addition decode with
        // `transactions: undefined` — coerce to 0, treated as "unknown for
        // that snapshot" by the growth endpoint via the same convention.
        transactions += pkg.transactions ?? 0;
        if (pkg.transactionsCapped) transactionsCapped = true;
      }
      let uniqueSendersCount = 0;
      if (pairs.length > 0) {
        const agg = await this.senderDocModel.aggregate([
          { $match: { $or: pairs } },
          { $group: { _id: '$address' } },
          { $count: 'count' },
        ]);
        uniqueSendersCount = agg[0]?.count ?? 0;
      }
      // The `modules` snapshot field stays as the latest package's module
      // set — that's the current API surface, not a union across versions.
      const mods = latestMods;

      const team = getTeam(def.teamId) ?? null;
      const detectedDeployers = [
        ...new Set(facts.map((p) => p.deployer).filter((a): a is string => !!a)),
      ];
      const knownDeployers = new Set((team?.deployers ?? []).map((d) => d.toLowerCase()));
      const anomalousDeployers = detectedDeployers.filter((d) => !knownDeployers.has(d));
      if (team && anomalousDeployers.length) {
        this.logger.warn(
          `[${def.name}] ${anomalousDeployers.length} deployer(s) not in team "${team.id}": ${anomalousDeployers.join(', ')}`,
        );
      }

      let displayName = def.name;
      if (splitDeployer) {
        const hash = createHash('sha256').update(splitDeployer).digest('hex').slice(0, 6);
        const sampled = await this.probeSampleName(latestPkg.address, mods);
        displayName = sampled
          ? `${def.name}: ${sampled} (${hash})`
          : `${def.name} (deployer-${hash})`;
      }

      const firstPkg = facts[0]; // original deployment — address never changes
      const addrPrefix = firstPkg.address.slice(2, 8);
      projects.push({
        slug: `${addrPrefix}-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        name: displayName, layer: def.layer, category: def.category,
        description: def.description, urls: def.urls,
        packages: facts.length,
        packageAddress: firstPkg.address,
        latestPackageAddress: latestPkg.address,
        storageIota: Math.round(totalStorage * 10000) / 10000,
        events, eventsCapped,
        transactions, transactionsCapped,
        modules: mods,
        tvl: null,
        tvlShared: null,
        tvlSharedWith: null,
        isCollectible: def.isCollectible ?? false,
        logo: def.logo ?? team?.logo ?? null,
        logoWordmark: def.logoWordmark ?? team?.logoWordmark ?? null,
        team,
        disclaimer: def.disclaimer ?? null,
        detectedDeployers,
        anomalousDeployers,
        uniqueSenders: uniqueSendersCount,
        attribution: def.attribution ?? null,
        addedAt: def.addedAt ?? null,
      });
    }

    // Enrich with DefiLlama TVL + add L2 EVM projects
    try {
      const llamaRes = await fetch('https://api.llama.fi/protocols');
      const llamaData: any[] = await llamaRes.json();

      const iotaProtocols = llamaData.filter((p) =>
        (p.chains || []).some((c: string) => c === 'IOTA' || c === 'IOTA EVM'),
      );

      // Match TVL to existing L1 projects — IOTA-chain slice only, not
      // cross-chain total. When multiple project rows share one DefiLlama
      // slug (e.g. Swirl V1 + V2, Virtue + Virtue Stability Pool, or any of
      // the TokenLabs products), pick a single *primary* by activity (event
      // count desc, name asc tiebreak); primary carries `tvl`, the others
      // carry the same number as `tvlShared` + `tvlSharedWith: <primary>`.
      // The dashboard sums only `tvl` into totals so the shared value is
      // never double-counted; siblings render `(TVL)` in parentheses with
      // a "shared with <primary>" tooltip.
      type LlamaMatch = { project: (typeof projects)[number]; proto: any; tvl: number };
      const matches: LlamaMatch[] = [];
      for (const project of projects) {
        for (const proto of iotaProtocols) {
          const nameMatch =
            proto.name.toLowerCase().includes(project.name.toLowerCase()) ||
            project.name.toLowerCase().includes(proto.name.toLowerCase());
          if (!nameMatch) continue;
          const tvl = proto.chainTvls?.['IOTA'];
          if (tvl == null) continue;
          matches.push({ project, proto, tvl });
          break; // first matching proto wins per project (consistent with prior `.find()` behavior)
        }
      }

      const claimedLlamaSlugs = new Set<string>();
      const byProto = new Map<string, LlamaMatch[]>();
      for (const m of matches) {
        const slug = m.proto.slug || m.proto.name;
        claimedLlamaSlugs.add(slug);
        if (!byProto.has(slug)) byProto.set(slug, []);
        byProto.get(slug)!.push(m);
      }
      for (const group of byProto.values()) {
        group.sort((a, b) => {
          if (b.project.events !== a.project.events) return b.project.events - a.project.events;
          return a.project.name.localeCompare(b.project.name);
        });
        const [primary, ...siblings] = group;
        primary.project.tvl = primary.tvl;
        for (const sib of siblings) {
          sib.project.tvlShared = sib.tvl;
          sib.project.tvlSharedWith = primary.project.name;
        }
      }

      // Add L2 EVM projects that aren't already in the L1 list.
      // L2 name → team-id map: lets us attribute DefiLlama-synthesized L2 rows
      // to the same `Team` that owns the project's L1 work (when there is
      // any), so the Teams view aggregates L1 + L2 activity per team and the
      // per-project page shows the team row consistently. Keep the keys in
      // lowercase to match the name-normalization below.
      const L2_TEAM_MAP: Record<string, string> = {
        'magicsea amm': 'magicsea',
        'magicsea lb': 'magicsea',
      };
      const existingNames = new Set(projects.map((p) => p.name.toLowerCase()));
      for (const proto of iotaProtocols) {
        const slug = proto.slug || proto.name;
        // Skip protocols already claimed by an L1 project via substring
        // name-match above — guards against duplicating e.g. DefiLlama's
        // "Swirl" as a fresh L1 row when L1 already carries "Swirl V2" +
        // "Swirl V1" (neither an exact-lowercase match for "swirl").
        if (claimedLlamaSlugs.has(slug)) continue;

        const isEvm = (proto.chains || []).includes('IOTA EVM');

        // Skip if already matched to an L1 project by exact-lowercase name.
        // Complements the `claimedLlamaSlugs` check above: the claimed-slug
        // guard catches substring name-matches (primary/sibling projects);
        // this catches protos whose IOTA slice was null (so step-1 didn't
        // claim them) but whose name still exactly matches an L1 row.
        if (existingNames.has(proto.name.toLowerCase())) continue;
        // Only count the IOTA EVM slice, not the protocol's cross-chain total
        const chainTvl = proto.chainTvls?.['IOTA EVM'] ?? 0;
        // Skip protocols where the IOTA EVM slice is below the $100 floor
        if (chainTvl < 100) continue;

        const llamaSlug = (proto.slug || proto.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const l2Team = getTeam(L2_TEAM_MAP[proto.name.toLowerCase()]) ?? null;
        projects.push({
          slug: `evm-${llamaSlug}`,
          name: proto.name,
          layer: isEvm ? 'L2' : 'L1',
          category: proto.category || 'Unknown',
          description: `${proto.category || ''} on IOTA${isEvm ? ' EVM' : ''}`.trim(),
          urls: proto.url ? [{ label: 'Website', href: proto.url }] : [],
          packages: 0,
          packageAddress: null,
          latestPackageAddress: null,
          storageIota: 0,
          events: 0,
          eventsCapped: false,
          transactions: 0,
          transactionsCapped: false,
          modules: [],
          tvl: chainTvl,
          tvlShared: null,
          tvlSharedWith: null,
          isCollectible: false,
          logo: l2Team?.logo ?? null,
          logoWordmark: l2Team?.logoWordmark ?? null,
          team: l2Team,
          disclaimer: null,
          detectedDeployers: [],
          anomalousDeployers: [],
          uniqueSenders: 0,
          attribution: null,
          addedAt: null,
        });
      }
    } catch (e) {
      this.logger.warn('DefiLlama fetch failed, L2 data unavailable', e);
    }

    projects.sort((a, b) => b.events - a.events);

    // Build unattributed clusters from the snapshot's stored fingerprint
    // samples — no live RPC here. `captureRaw` already ran
    // probeIdentityFields (+ probeTxEffects fallback) per package, so the
    // identifiers/objectType are present on `PackageFact.fingerprint`.
    // Walk the cluster's packages latest → earliest picking the first
    // fingerprint with identifiers; fall back to the first available
    // sampledObjectType if every package came back with no identifiers
    // (e.g. new logic-only package with no tx effects yet).
    const unattributedRanked = [...unattributedByDeployer.entries()]
      .map(([deployer, facts]) => {
        const sorted = [...facts].sort((a, b) => Number(a.storageRebateNanos) - Number(b.storageRebateNanos));
        const storageIota = facts.reduce((s, p) => s + Number(p.storageRebateNanos || 0), 0) / 1_000_000_000;
        return { deployer, facts: sorted, storageIota };
      })
      .sort((a, b) => {
        if (b.facts.length !== a.facts.length) return b.facts.length - a.facts.length;
        return b.storageIota - a.storageIota;
      });

    const unattributed: UnattributedCluster[] = [];
    for (const { deployer, facts, storageIota } of unattributedRanked) {
      const firstPkg = facts[0];
      const latestPkg = facts[facts.length - 1];
      const modulesUnion = new Set<string>();
      for (const pkg of facts) for (const m of pkg.modules) modulesUnion.add(m);

      // Sum activity across the cluster's packages. `events`, `uniqueSenders`,
      // and `transactions` mirror the `Project` shape so the growth-ranking
      // endpoint can present attributed + unattributed rows side-by-side
      // with consistent columns. Load-bearing per
      // `plans/implementation_strategy_conversation.md` (turns 2–4).
      let events = 0;
      let eventsCapped = false;
      let uniqueSenders = 0;
      let transactions = 0;
      let transactionsCapped = false;
      for (const pkg of facts) {
        for (const mm of pkg.moduleMetrics) {
          events += mm.events;
          if (mm.eventsCapped) eventsCapped = true;
          uniqueSenders += mm.uniqueSenders;
        }
        transactions += pkg.transactions ?? 0;
        if (pkg.transactionsCapped) transactionsCapped = true;
      }

      let identifiers: string[] = [];
      let objectType: string | null = null;
      for (const pkg of [...facts].reverse()) {
        const fp = pkg.fingerprint;
        if (!fp) continue;
        if (fp.sampledObjectType && !objectType) objectType = fp.sampledObjectType;
        if (fp.identifiers?.length) {
          identifiers = fp.identifiers;
          break;
        }
      }

      unattributed.push({
        deployer,
        packages: facts.length,
        firstPackageAddress: firstPkg.address,
        latestPackageAddress: latestPkg.address,
        storageIota: Math.round(storageIota * 10000) / 10000,
        modules: Array.from(modulesUnion).slice(0, 20),
        events,
        eventsCapped,
        uniqueSenders,
        transactions,
        transactionsCapped,
        sampleIdentifiers: identifiers,
        sampledObjectType: objectType,
      });
    }
    const totalUnattributedPackages = unattributed.reduce((s, c) => s + c.packages, 0);
    this.logger.log(
      `classifyFromRaw: ${projects.length} projects, ` +
        `${unattributed.length} unattributed cluster(s) / ${totalUnattributedPackages} package(s)`,
    );

    return {
      l1: projects.filter((p) => p.layer === 'L1'),
      l2: projects.filter((p) => p.layer === 'L2'),
      unattributed,
      totalProjects: projects.length,
      totalEvents: projects.reduce((sum, p) => sum + p.events, 0),
      totalStorageIota: Math.round(projects.reduce((sum, p) => sum + p.storageIota, 0) * 10000) / 10000,
      totalUnattributedPackages,
      networkTxTotal: raw.networkTxTotal,
      txRates: raw.txRates,
    };
  }
}
