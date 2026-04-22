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
  ObjectTypeCount,
} from './schemas/onchain-snapshot.schema';
import { ProjectSenders } from './schemas/project-senders.schema';
import { ProjectSender } from './schemas/project-sender.schema';
import { ProjectTxCounts } from './schemas/project-tx-counts.schema';
import { ProjectHolders } from './schemas/project-holders.schema';
import { ProjectHolderEntry } from './schemas/project-holder-entry.schema';
import { ProjectTxDigest } from './schemas/project-tx-digest.schema';
import { ClassifiedSnapshot } from './schemas/classified-snapshot.schema';
import { AlertsService } from '../alerts/alerts.service';
import { ALL_PROJECTS, ProjectDefinition, Category, Subcategory } from './projects';
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
 * Chain-primitive framework packages — `0x1` (move-stdlib), `0x2` (iota system
 * framework), `0x3` (iota system state). These are touched by essentially
 * every transaction on IOTA (gas payment, coin ops, transfers, epoch + staking
 * events) so their TX counts are 100M-scale rather than project-scale. A full
 * drain of `0x2` alone is estimated at ~40 GB of digest storage and surfaces
 * no project-level activity signal — see `iotaFramework` project disclaimer.
 *
 * Backfill keeps these capped at the legacy page budget; every other package
 * gets the larger `MAX_BACKFILL_PAGES_DEFAULT` so realistic project-scale
 * totals (Spam Club at ~4M TXs, Turing Certs at 362k, etc.) land accurately.
 */
const FRAMEWORK_PACKAGE_ADDRESSES = new Set<string>([
  '0x0000000000000000000000000000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000000000000000000000000000003',
]);

/** Legacy 10k-page cap (= 500k TXs) retained for `0x1`/`0x2`/`0x3` framework packages. */
const MAX_BACKFILL_PAGES_FRAMEWORK = 10_000;

/**
 * Default cap for all non-framework packages: 200k pages × 50 TXs/page = 10M
 * TXs per package. Covers every realistic project-scale package on mainnet
 * with large headroom (biggest known non-framework package is Spam Club at
 * ~4M TXs as of 2026-04-22). Raising from the prior 10k-page floor to uncap
 * the 13 packages that were hitting the ceiling; see TODO.md § "Add storage
 * + full TX capture" for the storage-scenario trade-off (scenario B = +2.5 GB
 * across all non-`0x2` packages).
 */
const MAX_BACKFILL_PAGES_DEFAULT = 200_000;

/**
 * Per-address page cap for `backfillTxCountsForPackage`. Framework packages
 * stay on the legacy 10k-page cap; everything else gets the 200k-page cap.
 */
function maxBackfillPagesFor(packageAddress: string): number {
  return FRAMEWORK_PACKAGE_ADDRESSES.has(packageAddress.toLowerCase())
    ? MAX_BACKFILL_PAGES_FRAMEWORK
    : MAX_BACKFILL_PAGES_DEFAULT;
}

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
  /**
   * Shape-parity fallback with `Project` — unattributed clusters have no
   * `countTypes` by definition (they aren't registered as a project), so
   * these all pin to zero / senders-fallback and never reflect real
   * holder/object data. Present so `growthRanking`'s `scope === 'all'`
   * interleave doesn't have to branch on row kind. Matches the
   * `transactions: 0` / `transactionsCapped: false` precedent from
   * `plans/plan_tx_count.md`.
   */
  uniqueHolders: number;
  /** Always 0 on unattributed clusters — see `uniqueHolders` doc. */
  objectCount: number;
  /** Always 0 on unattributed clusters — see `uniqueHolders` doc. */
  marketplaceListedCount: number;
  /** Equals `uniqueSenders` on unattributed clusters (no holder union to contribute). */
  uniqueWalletsReach: number;
  /** `key:value` pairs extracted from a sampled Move object (tag, name, url, …). */
  sampleIdentifiers: string[];
  /** Fully-qualified type of the object we probed, for provenance. */
  sampledObjectType: string | null;
  /**
   * Attributed projects (L1) whose `detectedDeployers` include this cluster's
   * deployer. A non-empty list is a strong "probably same team" signal: the
   * unattributed cluster is very likely a spillover of a known team's footprint
   * that our match rules don't yet cover. Empty = deployer is not claimed by
   * any current ProjectDefinition / Team. Rendered in the UI's Insights column.
   */
  deployerAttributedProjects: { name: string; slug: string }[];
  /**
   * True if the cluster's deployer address also appears as a sender on at
   * least one of the cluster's (package, module) pairs. Distinguishes
   * "self-deployed, no external usage" shapes (deployer is the only interactor)
   * from "distributed-usage" shapes (deployer absent from the sender list).
   * Feeds the Insights column; lets a maintainer spot throwaway / internal
   * deploys at a glance.
   */
  deployerIsSender: boolean;
  /**
   * Human-readable notes synthesized from the signals above (deployer
   * cross-ref, deployer-as-sender, basic sender count). Not raw strings —
   * short sentences like "Same deployer as Salus, TWIN" or "Self-deployed
   * only: deployer is the sole sender". Up to ~5 entries; UI renders them as
   * stacked badges in the Insights column so they're scannable across
   * clusters.
   */
  insights: string[];
}

/**
 * Map DefiLlama category strings (returned on L2 IOTA EVM protocols) to our
 * own `{ category, subcategory }` taxonomy. DefiLlama uses its own vocabulary
 * (`Dexs`, `Derivatives`, `Liquidity Manager`, …) which otherwise appears as
 * duplicate chip entries next to the L1-registry strings (`DEX`, `Perpetuals`,
 * …). Anything not in this table falls through to `Misc`.
 */
const LLAMA_CATEGORY_MAP: Record<string, { category: Category; subcategory?: Subcategory }> = {
  Dexs: { category: 'DeFi', subcategory: 'DEX' },
  Derivatives: { category: 'DeFi', subcategory: 'Perpetuals' },
  Lending: { category: 'DeFi', subcategory: 'Lending' },
  'Liquidity Manager': { category: 'DeFi', subcategory: 'Liquidity Manager' },
  'Yield Aggregator': { category: 'DeFi', subcategory: 'Vault' },
  Yield: { category: 'DeFi', subcategory: 'Vault' },
  Bridge: { category: 'Bridge', subcategory: 'Messaging' },
  'Cross Chain Bridge': { category: 'Bridge', subcategory: 'Messaging' },
  CDP: { category: 'DeFi', subcategory: 'Stablecoin' },
  'Liquid Staking': { category: 'DeFi', subcategory: 'Liquid Staking' },
  Staking: { category: 'DeFi', subcategory: 'Staking' },
  Oracle: { category: 'Oracle', subcategory: 'Price Feed' },
  RWA: { category: 'Real World', subcategory: 'Application' },
};

function normalizeLlamaCategory(llamaCat: string | null | undefined): { category: Category; subcategory?: Subcategory } {
  if (!llamaCat) return { category: 'Misc' };
  return LLAMA_CATEGORY_MAP[llamaCat] ?? { category: 'Misc' };
}

/** `Category / Subcategory` when a sub is set, otherwise just `Category`. Used for list/chip display. */
function buildCategoryLabel(category: Category, subcategory?: Subcategory | null): string {
  return subcategory ? `${category} / ${subcategory}` : category;
}

export interface Project {
  slug: string;
  name: string;
  layer: 'L1' | 'L2';
  /** Top-level category from the closed 10-member `CATEGORIES` set. */
  category: Category;
  /** Sub-vocabulary within the category. `null` for Misc projects and some L2 rows where DefiLlama's category has no mapping. */
  subcategory: Subcategory | null;
  /** Display-ready "Category / Subcategory" label (or just "Category" when no sub). Convenience for existing UI consumers. */
  categoryLabel: string;
  /** Orthogonal sector tags (Agriculture, Carbon, Luxury, …). Empty array when the project doesn't carry any. */
  industries: string[];
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
  /**
   * Distinct owner wallets holding Move objects of the project's declared
   * `countTypes`, summed across its packages. `null` when `countTypes` is
   * absent/empty on the ProjectDefinition — detail page renders `—`.
   * Parent-owned objects (marketplace listings) are **not** counted here;
   * their count lives on `marketplaceListedCount` separately.
   */
  uniqueHolders: number | null;
  /**
   * Total live Move objects of the project's declared `countTypes`, summed
   * across its packages. `null` when `countTypes` is absent/empty.
   * Includes both wallet-held and marketplace-listed objects.
   */
  objectCount: number | null;
  /**
   * Count of the project's objects currently owned by another object
   * (marketplace listings via dynamic_field wrappers, Kiosk-like wrappers,
   * etc.). Surfaced on the detail page so the gap between `objectCount`
   * and `uniqueHolders` is visible. `null` when `countTypes` absent.
   */
  marketplaceListedCount: number | null;
  /**
   * Deduped union of this project's senders ∪ holders — the "reach" metric.
   * Computed at classify time via `$unionWith` across `project_sender_entries`
   * (by project's (pkg, module) pairs) and `project_holder_entries` (by
   * project's (pkg, type) pairs), then `$group { _id: '$address' } + $count`.
   * For projects without `countTypes`: falls through to `uniqueSenders`.
   * This is what the dashboard overview's `Wallets*` column displays.
   */
  uniqueWalletsReach: number;
  /** Prose explaining how this project's display name was derived (shown only on the details page). */
  attribution: string | null;
  /** ISO-8601 date the project was first added to the registry (from `ProjectDefinition.addedAt`). `null` for defs that predate the field or for DefiLlama-synthesized L2 rows. */
  addedAt: string | null;
  /**
   * Probe-extracted string fields from one sampled Move object per project
   * (latest package first, first-non-empty wins). Exposed for the same
   * review-and-audit purpose as on `UnattributedCluster`: surfaces on-chain
   * self-attestation (names, symbols, URLs, tags) so a registry maintainer
   * can confirm a match rule is capturing what they think it is. `[]` if the
   * project's packages had no probe-worthy fields.
   */
  sampleIdentifiers: string[];
  /** Move type repr of the sampled object behind `sampleIdentifiers`. `null` when no object was sampled. */
  sampledObjectType: string | null;
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
   * Bump this constant in the same commit as any `classifyFromRaw` behavior
   * change that isn't already reflected in `ALL_PROJECTS` / `ALL_TEAMS`.
   * `computeRegistryHash()` folds it into the hash stored on each
   * `ClassifiedSnapshot`; a mismatch triggers re-classify on next read, so
   * the fleet converges to the new shape within one request after deploy
   * without an operator action.
   *
   * Registry-only edits (adding a project, renaming a team) do NOT need a
   * bump — `ALL_PROJECTS` / `ALL_TEAMS` are already in the hash input.
   */
  private static readonly CLASSIFIER_VERSION = 3;

  /**
   * In-process 10-min TTL cache for DefiLlama's `/protocols` response. The
   * DefiLlama fetch used to live inside `classifyFromRaw` and gated every
   * cache miss on a network round-trip; extracting it to `enrichWithTvl`
   * means we run it once per 10-min window instead of once per classify
   * pass. The persisted classified view is deliberately TVL-free so the
   * enrichment can refresh faster than the 2h capture cadence.
   */
  private static readonly DEFILLAMA_CACHE_TTL_MS = 10 * 60 * 1000;
  private defillamaCache: { expiresAt: number; value: any[] } | null = null;

  /**
   * Memoized result of `computeRegistryHash()`. Registry is static over
   * process lifetime so we hash once per boot. Cleared by tests that mutate
   * `ALL_PROJECTS`/`ALL_TEAMS` at runtime (none today, but cheap to keep
   * swappable via `recomputeRegistryHash()`).
   */
  private cachedRegistryHash: string | null = null;

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
    @InjectModel(ProjectHolders.name) private holdersStateModel: Model<ProjectHolders>,
    @InjectModel(ProjectHolderEntry.name) private holderEntryModel: Model<ProjectHolderEntry>,
    @InjectModel(ProjectTxDigest.name) private txDigestModel: Model<ProjectTxDigest>,
    @InjectModel(ClassifiedSnapshot.name) private classifiedModel: Model<ClassifiedSnapshot>,
    private alerts: AlertsService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const count = await this.ecoModel.countDocuments();
    if (count === 0) {
      this.logger.log('No ecosystem snapshot found, capturing in background...');
      this.capture().catch((e) => this.logger.error('Initial ecosystem capture failed', e));
      return;
    }
    // Self-heal: if the latest snapshot has no classified doc, or its
    // persisted view was computed against a stale registry (registry edit or
    // CLASSIFIER_VERSION bump since last capture), re-classify in the
    // background. Fire-and-forget — first read during the gap falls through
    // to `classifyOrLoad`, which runs the same work synchronously on the
    // request path. Self-heal just removes that user-visible cost.
    this.selfHealLatestClassified().catch((e) =>
      this.logger.error('Boot self-heal of classified view failed', e),
    );
  }

  /**
   * Ensure the latest `OnchainSnapshot` has a fresh-hash `ClassifiedSnapshot`.
   * Runs in the background from `onModuleInit` so boot doesn't stall on the
   * 1–2 s classify cost. Safe to call multiple times — the persist step
   * upserts and `classifyOrLoad` short-circuits when the hash already matches.
   */
  private async selfHealLatestClassified(): Promise<void> {
    const latest = await this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
    if (!latest) return;
    const cached = await this.classifiedModel
      .findOne({ snapshotId: latest._id })
      .lean()
      .exec();
    const currentHash = this.computeRegistryHash();
    if (cached && cached.registryHash === currentHash) return;
    this.logger.log(
      cached
        ? 'Latest classified view registry-hash stale, re-classifying in background...'
        : 'Latest snapshot has no classified view, computing in background...',
    );
    const t0 = Date.now();
    const view = await this.classifyFromRaw(latest);
    await this.persistClassified(latest._id, view, Date.now() - t0);
    this.logger.log(`Boot self-heal classified view persisted in ${Date.now() - t0}ms`);
  }

  /**
   * Classified ecosystem view for the most recent `OnchainSnapshot`. Returns
   * the same JSON shape the Nuxt frontend already consumes (`l1`, `l2`,
   * `unattributed`, totals, `networkTxTotal`, `txRates`) — no API contract
   * change. Reads go through the persisted `ClassifiedSnapshot` doc (written
   * at capture time) so the hot path is a single indexed `findOne` plus
   * `enrichWithTvl` (DefiLlama-backed, own 10-min cache). First request
   * after a registry/classifier edit pays one classify cost, persists the
   * new view, and subsequent reads are fast again.
   *
   * The returned view's `l1` / `l2` / totals reflect the live DefiLlama
   * state; `unattributed`, `networkTxTotal`, `txRates` come from the
   * deterministic persisted doc (or a fresh classify on miss). Deep-copied
   * before enrichment so repeated reads don't mutate the cached value.
   */
  async getLatest() {
    const snap = await this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
    if (!snap) return null;
    const view = await this.classifyCached(snap);
    // `enrichWithTvl` mutates in place. The classified view comes from either
    // the in-process LRU, the persisted doc (fresh lean read), or a fresh
    // classify. For the LRU case repeated reads would double-apply TVL
    // (idempotent — tvl just gets re-set to the same number) but also carry
    // stale TVL forward across the 10-min cache boundary. Safer to clone.
    const cloned = JSON.parse(JSON.stringify(view)) as typeof view;
    return this.enrichWithTvl(cloned);
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
    sortBy:
      | 'eventsDelta'
      | 'transactionsDelta'
      | 'uniqueSendersDelta'
      | 'uniqueHoldersDelta'
      | 'uniqueWalletsReachDelta'
      | 'objectCountDelta'
      | 'marketplaceListedCountDelta' = 'eventsDelta',
  ): Promise<{
    window: { from: Date; to: Date };
    baseline: { snapshotId: string; createdAt: Date } | null;
    latest: { snapshotId: string; createdAt: Date };
    sortBy: string;
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
      /** Distinct wallets holding project objects. `null` on attributed rows without `countTypes`; always `0` on unattributed. */
      uniqueHolders: number | null;
      uniqueHoldersDelta: number;
      /** Total live objects of project `countTypes`. Null semantics mirror `uniqueHolders`. */
      objectCount: number | null;
      objectCountDelta: number;
      /** Subset of `objectCount` sitting inside marketplace listing wrappers (Parent-owned). Null semantics mirror. */
      marketplaceListedCount: number | null;
      marketplaceListedCountDelta: number;
      /** Deduped senders ∪ holders. Always populated (falls back to uniqueSenders when no countTypes). This is what the overview `Wallets*` column shows. */
      uniqueWalletsReach: number;
      uniqueWalletsReachDelta: number;
      team: Team | null;
      logo: string | null;
      category: string | null;
      categoryLabel: string | null;
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
          uniqueHolders: p.uniqueHolders ?? null,
          uniqueHoldersDelta: (p.uniqueHolders ?? 0) - (prev?.uniqueHolders ?? 0),
          objectCount: p.objectCount ?? null,
          objectCountDelta: (p.objectCount ?? 0) - (prev?.objectCount ?? 0),
          marketplaceListedCount: p.marketplaceListedCount ?? null,
          marketplaceListedCountDelta: (p.marketplaceListedCount ?? 0) - (prev?.marketplaceListedCount ?? 0),
          uniqueWalletsReach: p.uniqueWalletsReach ?? p.uniqueSenders,
          uniqueWalletsReachDelta: (p.uniqueWalletsReach ?? p.uniqueSenders) - (prev?.uniqueWalletsReach ?? prev?.uniqueSenders ?? 0),
          team: p.team,
          logo: p.logo,
          category: p.category,
          categoryLabel: p.categoryLabel,
          sampleIdentifiers: p.sampleIdentifiers ?? null,
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
          // Unattributed shape-parity: literal fallbacks (see UnattributedCluster doc).
          uniqueHolders: u.uniqueHolders ?? 0,
          uniqueHoldersDelta: (u.uniqueHolders ?? 0) - (prev?.uniqueHolders ?? 0),
          objectCount: u.objectCount ?? 0,
          objectCountDelta: (u.objectCount ?? 0) - (prev?.objectCount ?? 0),
          marketplaceListedCount: u.marketplaceListedCount ?? 0,
          marketplaceListedCountDelta: (u.marketplaceListedCount ?? 0) - (prev?.marketplaceListedCount ?? 0),
          uniqueWalletsReach: u.uniqueWalletsReach ?? u.uniqueSenders,
          uniqueWalletsReachDelta: (u.uniqueWalletsReach ?? u.uniqueSenders) - (prev?.uniqueWalletsReach ?? prev?.uniqueSenders ?? 0),
          team: null,
          logo: null,
          category: null,
          categoryLabel: null,
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

  /**
   * Three-tier read path:
   *   1. In-process LRU (below) — sub-ms hit for repeat reads within a process.
   *   2. `classifyOrLoad` (persisted `ClassifiedSnapshot`) — survives restarts,
   *      hash-invalidates on registry/classifier edits.
   *   3. `classifyFromRaw` — recompute, persist, fill tier 1.
   *
   * DefiLlama enrichment is NOT applied here. `getLatest` runs
   * `enrichWithTvl` on top of this for the public response. `growthRanking`
   * skips enrichment — TVL isn't in its output shape.
   */
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
    const value = await this.classifyOrLoad(snap);
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
        const created = await this.ecoModel.create({ ...raw, captureDurationMs: durationMs });
        // Precompute + persist the classified view so the first read after
        // this capture is O(1). Failures here are non-fatal — readers fall
        // back to classify-on-demand via `classifyOrLoad`. Keeps the
        // capture cron resilient to a transient Mongo error on write.
        try {
          const t0 = Date.now();
          const view = await this.classifyFromRaw(created);
          await this.persistClassified(created._id, view, Date.now() - t0);
        } catch (err) {
          this.logger.warn('Post-capture classify/persist failed; readers will classify on demand', err);
        }
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
  /**
   * Live-cron tick: paginate newest-first through recent events for
   * `(packageAddress, module)`, writing unique senders into
   * `ProjectSender` with dup-key silencing. Stops when caught up (a
   * full page contributed no new senders) or when the 100-page budget
   * is exhausted. No persistent cursor state — each tick is
   * self-contained. Total = `countDocuments({packageAddress, module})`.
   */
  private async updateSendersForModule(packageAddress: string, module: string): Promise<number> {
    await this.pageBackwardSenders(packageAddress, module, 100);
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
    // Drain backwards with a generous page budget — the caught-up heuristic
    // in `pageBackwardSenders` fires on the first all-dupes page, so a
    // backfill that's already been run is a quick no-op. On fresh packages
    // we page until `hasPreviousPage: false` (full history) or the budget.
    await this.pageBackwardSenders(packageAddress, module, 10000);
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
  /**
   * Paginate the `events` connection newest-first via `last: 50` +
   * `before: <prevStartCursor>`, accumulating unique senders into
   * `ProjectSender` with dup-key silencing. Stops when: (a) a full page
   * contributed zero new senders (caught up to prior scans), (b) the
   * connection reports `hasPreviousPage: false` (full history drained),
   * or (c) the per-tick page budget is exhausted.
   *
   * No persistent cursor is carried across ticks — each invocation starts
   * fresh from `last: 50`, which side-steps two IOTA GraphQL realities
   * that broke the prior `last: 1` + `pageForward` design: the `last: 1`
   * cursor is a permanent past-end sentinel (no new items ever appear
   * `after:` it), and natural forward cursors have a limited server-side
   * validity window. Dedup via the unique compound index makes re-scan
   * of the "tip" of the stream idempotent.
   *
   * Returns `{ scanned, reachedEnd }`. `reachedEnd: true` means we
   * terminated via `hasPreviousPage: false` or caught-up; `false` means
   * the caller should treat the count as a floor (capped this tick).
   */
  private async pageBackwardSenders(
    packageAddress: string,
    module: string,
    maxPages: number,
  ): Promise<{ scanned: number; reachedEnd: boolean }> {
    const emittingModule = `${packageAddress}::${module}`;
    let beforeCursor: string | null = null;
    let scanned = 0;
    let reachedEnd = false;

    for (let i = 0; i < maxPages; i++) {
      const before = beforeCursor ? `, before: "${beforeCursor}"` : '';
      let data: any;
      try {
        data = await this.graphql(`{
          events(filter: { emittingModule: "${emittingModule}" }, last: 50${before}) {
            nodes { sender { address } }
            pageInfo { hasPreviousPage startCursor }
          }
        }`);
      } catch {
        break;
      }

      const nodes = data.events?.nodes ?? [];
      if (nodes.length === 0) {
        reachedEnd = true;
        break;
      }
      scanned += nodes.length;

      const pageSenders = new Set<string>();
      for (const e of nodes) {
        const addr = e.sender?.address?.toLowerCase();
        if (addr) pageSenders.add(addr);
      }

      let newlyInserted = 0;
      if (pageSenders.size > 0) {
        const docs = Array.from(pageSenders).map((address) => ({
          packageAddress,
          module,
          address,
        }));
        try {
          const res = await this.senderDocModel.insertMany(docs, { ordered: false });
          newlyInserted = Array.isArray(res) ? res.length : 0;
        } catch (e: any) {
          const writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : [];
          const allDupKey =
            e?.code === 11000 ||
            (writeErrors.length > 0 && writeErrors.every((we: any) => (we?.code ?? we?.err?.code) === 11000));
          if (!allDupKey) throw e;
          newlyInserted = Math.max(0, docs.length - writeErrors.length);
        }
      }

      // Caught-up heuristic: entire page contributed zero new senders.
      // Safe because dup-key tells us exactly — no ambiguity.
      if (newlyInserted === 0 && pageSenders.size > 0) {
        reachedEnd = true;
        break;
      }

      beforeCursor = data.events?.pageInfo?.startCursor ?? beforeCursor;
      if (!data.events?.pageInfo?.hasPreviousPage) {
        reachedEnd = true;
        break;
      }
    }

    return { scanned, reachedEnd };
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
  /**
   * Paginate `transactionBlocks(filter: { function })` newest-first via
   * `last: 50` + `before: <prevStartCursor>`, storing digests into
   * `ProjectTxDigest` with dup-key silencing. Mirrors the senders
   * pattern; see `pageBackwardSenders` for the rationale on backward
   * pagination + no-persistent-cursor. Count-of-total is served by
   * `countDocuments({packageAddress})` on the digest collection.
   *
   * `stopOnAllDups` selects the termination semantics:
   *   - `true` (live-cron catch-up): a page where every digest is already
   *     stored means we've paged back into known territory, so we're caught
   *     up — exit with `reachedEnd: true`. This is the correct signal for
   *     the tail-scanning cron tick (newest digests re-seen = nothing new
   *     to do).
   *   - `false` (historical drain): re-seeing already-stored digests means
   *     the prior run's stored range is being re-traversed; keep paging
   *     backward via `pageInfo.startCursor` until a fresh page appears
   *     beyond the stored tail, the page budget is exhausted, or GraphQL
   *     signals end-of-history via `hasPreviousPage: false`. This is what
   *     makes `backfillTxCountsForPackage` actually idempotent after the
   *     per-address page cap is raised (re-run fills in the missing tail
   *     rather than bailing on page 1 because the newest 50 are dups).
   *
   * Returns `{ scanned, reachedEnd }` with the same "floor" semantics.
   */
  private async pageBackwardTxs(
    packageAddress: string,
    maxPages: number,
    { stopOnAllDups }: { stopOnAllDups: boolean },
  ): Promise<{ scanned: number; reachedEnd: boolean }> {
    let beforeCursor: string | null = null;
    let scanned = 0;
    let reachedEnd = false;

    for (let i = 0; i < maxPages; i++) {
      const before = beforeCursor ? `, before: "${beforeCursor}"` : '';
      let data: any;
      try {
        data = await this.graphql(`{
          transactionBlocks(filter: { function: "${packageAddress}" }, last: 50${before}) {
            nodes { digest }
            pageInfo { hasPreviousPage startCursor }
          }
        }`);
      } catch {
        break;
      }

      const nodes = data.transactionBlocks?.nodes ?? [];
      if (nodes.length === 0) {
        reachedEnd = true;
        break;
      }
      scanned += nodes.length;

      const docs = nodes
        .filter((n: any) => typeof n?.digest === 'string' && n.digest.length > 0)
        .map((n: any) => ({ packageAddress, digest: n.digest }));

      let newlyInserted = 0;
      if (docs.length > 0) {
        try {
          const res = await this.txDigestModel.insertMany(docs, { ordered: false });
          newlyInserted = Array.isArray(res) ? res.length : 0;
        } catch (e: any) {
          const writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : [];
          const allDupKey =
            e?.code === 11000 ||
            (writeErrors.length > 0 && writeErrors.every((we: any) => (we?.code ?? we?.err?.code) === 11000));
          if (!allDupKey) throw e;
          newlyInserted = Math.max(0, docs.length - writeErrors.length);
        }
      }

      if (stopOnAllDups && newlyInserted === 0 && docs.length > 0) {
        reachedEnd = true;
        break;
      }

      beforeCursor = data.transactionBlocks?.pageInfo?.startCursor ?? beforeCursor;
      if (!data.transactionBlocks?.pageInfo?.hasPreviousPage) {
        reachedEnd = true;
        break;
      }
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
  /**
   * Live-cron tick: paginate newest-first through TXs for a package,
   * writing unique digests into `ProjectTxDigest`. Stops on caught-up
   * or 100-page budget. Total = `countDocuments({packageAddress})`.
   * `capped: true` when we exited via the page cap rather than caught-up
   * or end-of-history — the count is a floor until the next tick.
   */
  private async updateTxCountForPackage(packageAddress: string): Promise<{ total: number; capped: boolean }> {
    const { reachedEnd } = await this.pageBackwardTxs(packageAddress, 100, { stopOnAllDups: true });
    const total = await this.txDigestModel.countDocuments({ packageAddress });
    return { total, capped: !reachedEnd };
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
    // Drain backwards with a per-address page budget (`maxBackfillPagesFor`).
    // Framework packages (`0x1`/`0x2`/`0x3`) stay at the legacy 10k-page cap
    // — full drain of `0x2` alone is ~40 GB of digest storage with no
    // project-level activity signal. Every other package gets the larger
    // 200k-page cap so project-scale totals land accurately. `stopOnAllDups:
    // false` disables the live-cron catch-up heuristic so a re-run after
    // raising the cap walks past the already-stored (500k-TX) zone instead
    // of bailing on page 1; dup-key silencing keeps the re-traversal cheap
    // on Mongo and idempotent on retries.
    const { reachedEnd } = await this.pageBackwardTxs(packageAddress, maxBackfillPagesFor(packageAddress), {
      stopOnAllDups: false,
    });
    const total = await this.txDigestModel.countDocuments({ packageAddress });
    return { total, capped: !reachedEnd };
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

  // ======================= Holders / Object counts =======================
  // Paginates `objects(filter: { type: <pkg>::<mod>::<T> })`, buckets each
  // node's owner into AddressOwner → holder, Parent → listed, Shared /
  // Immutable / burn → ignored. Cursor-model per `(packageAddress, type)`
  // mirrors the senders/TX patterns. Writes per-holder docs into
  // `project_holder_entries` (no 16 MB BSON ceiling — see commit c49a5cf).
  //
  // Capture is classification-free: every `key`-able struct type gets a
  // cursor record regardless of whether any `ProjectDefinition.countTypes`
  // claims it. Classify filters raw → user-facing at read time (Option C,
  // `plans/plan_object_count.md`).

  /**
   * Single forward-page pass for a `(packageAddress, type)` pair. Collects
   * new AddressOwner wallets into `insertMany` (dup-key silenced by the
   * unique compound index — same pattern as `pageForwardSenders`). Counts
   * Parent-owned nodes as `listed` (tracked on the cursor record so we can
   * compute the snapshot's `listedCount` without requerying).
   *
   * Returns `{ scanned, listed, reachedEnd }`. `reachedEnd: true` means
   * `hasNextPage: false` — caller treats `capped: false`. Early break on
   * GraphQL error (swallowed, like the other `pageForward*` writers).
   */
  /**
   * Paginate `objects(filter: { type })` newest-first via `last: 50` +
   * `before: <prevStartCursor>`. Buckets each node's owner: AddressOwner
   * writes to `ProjectHolderEntry` (dedup'd), Parent increments the
   * tick-local `listed` counter, Shared/Immutable/burn are skipped.
   * Mirrors the senders pattern; see `pageBackwardSenders` for rationale.
   *
   * Caught-up heuristic fires when a full page contributed zero new
   * addresses to the entry collection AND had at least one AddressOwner
   * node (if the whole page is Parent/Shared we can't tell, so continue).
   *
   * Returns `{ scanned, listed, reachedEnd }`. Caller tracks running
   * `listedCount` on the `ProjectHolders` record (Parent observations are
   * not dedup'd; backfill resets `listedCount` to avoid over-accumulation
   * across re-drains).
   */
  private async pageBackwardHolders(
    packageAddress: string,
    type: string,
    maxPages: number,
  ): Promise<{ scanned: number; listed: number; reachedEnd: boolean }> {
    let beforeCursor: string | null = null;
    let scanned = 0;
    let listed = 0;
    let reachedEnd = false;

    for (let i = 0; i < maxPages; i++) {
      const before = beforeCursor ? `, before: "${beforeCursor}"` : '';
      let data: any;
      try {
        data = await this.graphql(`{
          objects(filter: { type: "${type}" }, last: 50${before}) {
            nodes {
              owner {
                __typename
                ... on AddressOwner { owner { address } }
                ... on Parent { parent { address } }
                ... on Shared { initialSharedVersion }
                ... on Immutable { __typename }
              }
            }
            pageInfo { hasPreviousPage startCursor }
          }
        }`);
      } catch {
        break;
      }

      const nodes = data.objects?.nodes ?? [];
      if (nodes.length === 0) {
        reachedEnd = true;
        break;
      }
      scanned += nodes.length;

      const pageAddresses = new Set<string>();
      let pageListed = 0;
      for (const n of nodes) {
        const owner = n?.owner;
        if (!owner) continue;
        if (owner.__typename === 'AddressOwner') {
          const addr = owner.owner?.address?.toLowerCase();
          if (!addr) continue;
          if (/^0x0+$/.test(addr)) continue;
          pageAddresses.add(addr);
        } else if (owner.__typename === 'Parent') {
          pageListed += 1;
        }
      }
      listed += pageListed;

      let newlyInserted = 0;
      if (pageAddresses.size > 0) {
        const docs = Array.from(pageAddresses).map((address) => ({
          packageAddress,
          type,
          address,
        }));
        try {
          const res = await this.holderEntryModel.insertMany(docs, { ordered: false });
          newlyInserted = Array.isArray(res) ? res.length : 0;
        } catch (e: any) {
          const writeErrors = Array.isArray(e?.writeErrors) ? e.writeErrors : [];
          const allDupKey =
            e?.code === 11000 ||
            (writeErrors.length > 0 && writeErrors.every((we: any) => (we?.code ?? we?.err?.code) === 11000));
          if (!allDupKey) throw e;
          newlyInserted = Math.max(0, docs.length - writeErrors.length);
        }
      }

      // Caught-up heuristic: page had AddressOwner nodes, all were dupes.
      // Parent-only or mixed pages are indeterminate (can't tell if those
      // wrappers are new or old), so we keep paginating.
      if (newlyInserted === 0 && pageAddresses.size > 0) {
        reachedEnd = true;
        break;
      }

      beforeCursor = data.objects?.pageInfo?.startCursor ?? beforeCursor;
      if (!data.objects?.pageInfo?.hasPreviousPage) {
        reachedEnd = true;
        break;
      }
    }

    return { scanned, listed, reachedEnd };
  }

  /**
   * Incrementally scan a `(packageAddress, type)` for new holders. First
   * sight anchors cursor at end-of-history via `last: 1` (so captures stay
   * cheap; full history is drained by `backfill:holders` CLI). Subsequent
   * scans page forward from the saved cursor. Returns `{ count, listedCount,
   * capped }` — `count` is the current total holder-address count (distinct
   * addresses in `project_holder_entries` for this pair), `listedCount` is
   * the cumulative Parent-owned observations tracked on the cursor record.
   */
  /**
   * Live-cron tick: paginate newest-first through objects of a
   * `(packageAddress, type)`, writing unique AddressOwner wallets into
   * `ProjectHolderEntry` with dup-key silencing; Parent-owned
   * observations accumulate into `record.listedCount`. Stops on
   * caught-up or 100-page budget.
   *
   * `count` is `countDocuments({packageAddress, type})` on the entry
   * collection. `listedCount` comes from the `ProjectHolders` state
   * record — the live cron *adds* this tick's Parent observations to
   * the running total. Backfill resets `listedCount` before draining
   * so it doesn't over-accumulate on re-runs.
   */
  private async updateHoldersForType(
    packageAddress: string,
    type: string,
  ): Promise<{ count: number; listedCount: number; capped: boolean }> {
    let record = await this.holdersStateModel.findOne({ packageAddress, type });
    if (!record) {
      record = await this.holdersStateModel.create({
        packageAddress,
        type,
        cursor: null,
        nodesScanned: 0,
        listedCount: 0,
      });
    }

    const { scanned, listed, reachedEnd } = await this.pageBackwardHolders(packageAddress, type, 100);
    if (scanned > 0 || listed > 0) {
      record.nodesScanned += scanned;
      record.listedCount += listed;
      await record.save();
    }

    const count = await this.holderEntryModel.countDocuments({ packageAddress, type });
    return { count, listedCount: record.listedCount, capped: !reachedEnd };
  }

  /**
   * Drain all historical objects for a `(packageAddress, type)` starting
   * from cursor=null. One-shot CLI path; resumable via saved cursor.
   * Existing records reset (cursor=null, nodesScanned=0, listedCount=0)
   * before draining — otherwise the end-of-history anchor set by the live
   * cron would make this a no-op. Mirrors `backfillTxCountsForPackage`.
   */
  async backfillHoldersForType(
    packageAddress: string,
    type: string,
  ): Promise<{ count: number; listedCount: number; capped: boolean }> {
    // Reset listedCount on the state record before the full drain — Parent
    // observations aren't dedup'd, so re-running the backfill would double-
    // count without this reset. Address entries are safe to leave (dedup
    // via the unique compound index). nodesScanned is informational.
    let record = await this.holdersStateModel.findOne({ packageAddress, type });
    if (!record) {
      record = await this.holdersStateModel.create({
        packageAddress,
        type,
        cursor: null,
        nodesScanned: 0,
        listedCount: 0,
      });
    } else {
      record.listedCount = 0;
      record.nodesScanned = 0;
      await record.save();
    }

    const { scanned, listed, reachedEnd } = await this.pageBackwardHolders(packageAddress, type, 10000);
    if (scanned > 0 || listed > 0) {
      record.nodesScanned += scanned;
      record.listedCount += listed;
      await record.save();
    }

    const count = await this.holderEntryModel.countDocuments({ packageAddress, type });
    return { count, listedCount: record.listedCount, capped: !reachedEnd };
  }

  /**
   * Parallel full-fleet holders backfill. Enumerates `(package, type)`
   * pairs from the latest snapshot's `packages[].objectTypeCounts[].type` —
   * the type set already populated by a prior capture. Classification-free:
   * drains every type of every package, regardless of whether a
   * `ProjectDefinition.countTypes` claims it. Default `concurrency=20`
   * mirrors `backfillAllTxCounts` (validated against mainnet, see
   * `plans/limits.md`).
   */
  async backfillAllHolders(
    onProgress?: (info: { packageAddress: string; type: string; count: number; listedCount: number; capped: boolean }) => void,
    concurrency: number = 20,
  ): Promise<{ totalPairs: number; totalHolders: number; cappedPairs: number }> {
    const snapshot = await this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
    if (!snapshot) {
      throw new Error('No ecosystem snapshot exists yet — run a scan first.');
    }

    const pairs: Array<{ packageAddress: string; type: string }> = [];
    for (const p of snapshot.packages) {
      for (const entry of p.objectTypeCounts ?? []) {
        pairs.push({ packageAddress: p.address, type: entry.type });
      }
    }

    let totalHolders = 0;
    let cappedPairs = 0;
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= pairs.length) return;
        const { packageAddress, type } = pairs[i];
        try {
          const { count, listedCount, capped } = await this.backfillHoldersForType(packageAddress, type);
          totalHolders += count;
          if (capped) cappedPairs += 1;
          onProgress?.({ packageAddress, type, count, listedCount, capped });
        } catch (e) {
          this.logger.warn(`backfillHolders: ${packageAddress}::${type} failed — ${(e as Error).message}`);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

    return { totalPairs: pairs.length, totalHolders, cappedPairs };
  }

  /**
   * Enumerates every `key`-able struct type declared by this package, then
   * calls `updateHoldersForType` on each with inner concurrency=3 (types
   * are independent — each writes to its own `(pkg, type)` cursor + a
   * disjoint subset of `project_holder_entries`). Mitigates the
   * serial-inner-loop wall-clock cost (see `plans/plan_object_count.md
   * § Step 3.5`). Returns the array of `ObjectTypeCount` entries to
   * persist on `PackageFact`.
   *
   * Uses `MovePackage.modules.nodes.datatypes.nodes { name abilities }`
   * to enumerate. Skips structs without the `key` ability — they can't be
   * on-chain objects. Failure to enumerate (GraphQL error) logs + returns
   * `[]`, keeping the broader capture pass resilient.
   */
  private async captureObjectTypesForPackage(
    packageAddress: string,
    concurrency: number = 3,
  ): Promise<ObjectTypeCount[]> {
    let keyableTypes: string[];
    try {
      const data: any = await this.graphql(`{
        object(address: "${packageAddress}") {
          asMovePackage {
            modules(first: 50) {
              nodes {
                name
                datatypes(first: 50) {
                  nodes { name abilities }
                }
              }
            }
          }
        }
      }`);
      const mods = data?.object?.asMovePackage?.modules?.nodes ?? [];
      keyableTypes = [];
      for (const mod of mods) {
        const dts = mod?.datatypes?.nodes ?? [];
        for (const dt of dts) {
          const abilities: string[] = (dt?.abilities ?? []).map((a: string) => String(a).toUpperCase());
          if (!abilities.includes('KEY')) continue;
          keyableTypes.push(`${packageAddress}::${mod.name}::${dt.name}`);
        }
      }
    } catch (e) {
      this.logger.warn(`captureObjectTypes: ${packageAddress} struct enumeration failed — ${(e as Error).message}`);
      return [];
    }

    if (keyableTypes.length === 0) return [];

    const results: ObjectTypeCount[] = [];
    let idx = 0;
    const worker = async () => {
      while (true) {
        const i = idx++;
        if (i >= keyableTypes.length) return;
        const type = keyableTypes[i];
        try {
          const { count, listedCount, capped } = await this.updateHoldersForType(packageAddress, type);
          results.push({ type, count, listedCount, capped });
        } catch (e) {
          this.logger.warn(`captureObjectTypes: ${type} drain failed — ${(e as Error).message}`);
          results.push({ type, count: 0, listedCount: 0, capped: false });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, keyableTypes.length)) }, () => worker()));

    return results;
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
   * Synthesize the human-readable notes that appear in the UI's Insights
   * column on each unattributed cluster. Input is the already-computed
   * per-cluster aggregates + cross-references; output is an ordered array
   * of short sentences (up to ~5). Kept separate from the cluster-push loop
   * so it's trivially unit-testable without a full classify setup.
   *
   * Not raw identifier strings — these are *interpretations*: "same deployer
   * as X", "self-deployed only", "never interacted with". Order runs from
   * highest-specificity / strongest-signal first so a reader can scan the
   * first entry and stop when satisfied.
   */
  private buildClusterInsights(ctx: {
    packageCount: number;
    uniqueSenders: number;
    transactions: number;
    events: number;
    deployerAttributedProjects: { name: string; slug: string }[];
    deployerIsSender: boolean;
    deployerIsUnknown: boolean;
  }): string[] {
    const out: string[] = [];

    if (ctx.deployerAttributedProjects.length > 0) {
      const names = ctx.deployerAttributedProjects.map((p) => p.name);
      const joined =
        names.length <= 3
          ? names.join(', ')
          : `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
      out.push(`Same deployer as ${joined}`);
    }

    if (ctx.uniqueSenders === 0 && ctx.transactions === 0 && ctx.events === 0) {
      out.push('No on-chain interaction yet — deploy-only');
    } else if (ctx.deployerIsUnknown) {
      // Framework / legacy publish records have no resolvable deployer.
      // Keep the `deployerIsSender` story silent here since there's no
      // deployer to test against.
    } else if (ctx.uniqueSenders === 1 && ctx.deployerIsSender) {
      out.push('Self-deployed only: deployer is the sole sender');
    } else if (ctx.deployerIsSender && ctx.uniqueSenders > 1) {
      out.push(`Deployer-driven + ${ctx.uniqueSenders - 1} other sender(s)`);
    } else if (!ctx.deployerIsSender && ctx.uniqueSenders > 0) {
      out.push(`Distributed usage: ${ctx.uniqueSenders} sender(s), deployer absent from senders`);
    }

    if (ctx.packageCount >= 5) {
      out.push(`${ctx.packageCount}-package footprint — likely a multi-contract protocol`);
    }

    return out;
  }

  /**
   * Flattens a Move object's JSON into `[dotPath, stringValue]` leaves so the
   * identity probe can reach fields hidden inside wrapper structs, `Option`
   * (`{vec:[T]}`), `VecMap` (`[{key,value}]`) and plain nested objects.
   *
   * Bounds: depth 4, first 5 elements per array, 64 leaves total. Two Move-
   * specific stubs are pruned because they carry no identifying content — a
   * `{id, size}` Table/Bag handle and an empty `{vec: []}` Option. Non-strings
   * (numbers, bools, objects, arrays themselves) never hit `out`; only leaf
   * strings do.
   */
  private flattenJson(
    json: unknown,
    path: string,
    depth: number,
    out: [string, string][],
  ): void {
    if (out.length >= 64 || depth > 4) return;
    if (typeof json === 'string') {
      out.push([path, json]);
      return;
    }
    if (Array.isArray(json)) {
      const cap = Math.min(json.length, 5);
      for (let i = 0; i < cap; i++) {
        this.flattenJson(json[i], `${path}.${i}`, depth + 1, out);
        if (out.length >= 64) return;
      }
      return;
    }
    if (json && typeof json === 'object') {
      const keys = Object.keys(json);
      // Prune Table/Bag stubs: they carry only a handle + size, contents live
      // elsewhere as dynamic fields.
      if (keys.length === 2 && keys.includes('id') && keys.includes('size')) return;
      // Prune empty Option<T>: `{vec: []}` is `None`, no leaf to emit.
      if (
        keys.length === 1 &&
        keys[0] === 'vec' &&
        Array.isArray((json as { vec: unknown[] }).vec) &&
        (json as { vec: unknown[] }).vec.length === 0
      ) {
        return;
      }
      for (const k of keys) {
        this.flattenJson(
          (json as Record<string, unknown>)[k],
          path ? `${path}.${k}` : k,
          depth + 1,
          out,
        );
        if (out.length >= 64) return;
      }
    }
  }

  /**
   * Deep identity probe for an unattributed package. Queries any Move object
   * whose type starts with `<pkg>` (GraphQL's `type` filter supports prefix
   * matching — verified empirically against `pkg` alone and `pkg::mod`).
   *
   * Extracts short string-valued fields from the sampled object's JSON. The
   * point is to surface self-attestation — e.g. Salus's `tag: "salus"` or an
   * `issuer`/`url`/`collection_name` — that a package-level ProjectDefinition
   * matcher would miss because module names are generic. JSON is walked via
   * `flattenJson`, so identity hidden one layer deep (e.g. `metadata.name`)
   * or inside `Option`/`VecMap` still surfaces.
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
        const leaves: [string, string][] = [];
        this.flattenJson(json, '', 0, leaves);
        for (const [path, v] of leaves) {
          const trimmed = v.trim();
          // Min 3 chars keeps real tickers (`BTC`, `NFT`, `IRT`) but drops
          // 1–2 char junk that snuck in via whitelisted keys (e.g. a `url`
          // field literally set to `"ee"`).
          if (!trimmed || trimmed.length < 3 || trimmed.length > 80) continue;
          const leafKey = path.split('.').pop()!.toLowerCase();
          const looksIdentifying =
            identifierKeys.has(leafKey) ||
            /^https?:\/\//.test(trimmed) ||
            /^[A-Za-z][A-Za-z0-9 _\-.:/]{2,}$/.test(trimmed);
          if (!looksIdentifying) continue;
          // Skip fields that just echo the package address.
          if (trimmed.toLowerCase().startsWith('0x') && trimmed.length > 40) continue;
          idents.add(`${path}: ${trimmed}`);
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

      // Per-package object counts + holder cursor advance. Option C: every
      // `key`-able struct type gets captured, not just project-configured
      // ones. Inner-loop type-level concurrency=3 keeps this off the 2h
      // cron's critical path. Classify filters to project `countTypes` at
      // read time. See `plans/plan_object_count.md § Option C + Step 3.5`.
      const objectTypeCounts = await this.captureObjectTypesForPackage(pkg.address);
      const summedObjectCount = objectTypeCounts.reduce((s, e) => s + e.count, 0);

      packages.push({
        address: pkg.address,
        deployer,
        storageRebateNanos,
        modules,
        moduleMetrics,
        objectCount: summedObjectCount,
        transactions,
        transactionsCapped,
        objectTypeCounts,
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

      // Object + holder metrics. Scope: project-declared `countTypes`. The
      // capture pass writes every `key`-able struct to `objectTypeCounts`
      // (Option C — classification-free), so filtering here is safe regardless
      // of when the project def was added. A `countTypes` entry is a module-
      // local path like `'otterfly_1::OtterFly1NFT'`; we match it against
      // each fact's fully-qualified types via suffix compare (since the
      // `<pkg>::` prefix varies between upgraded package versions).
      //
      // `uniqueHolders` / `uniqueWalletsReach` pull from `project_holder_entries`
      // via a single $group+$count aggregation per project. `uniqueWalletsReach`
      // additionally `$unionWith`es `project_sender_entries` to produce the
      // deduped senders ∪ holders reach number — see `plans/plan_object_count.md`.
      const countTypes = def.countTypes ?? [];
      let objectCount: number | null = null;
      let marketplaceListedCount: number | null = null;
      let uniqueHolders: number | null = null;
      const typePairs: Array<{ packageAddress: string; type: string }> = [];
      if (countTypes.length > 0) {
        objectCount = 0;
        marketplaceListedCount = 0;
        for (const pkg of facts) {
          for (const entry of (pkg.objectTypeCounts ?? [])) {
            if (countTypes.some((ct) => entry.type.endsWith(`::${ct}`))) {
              objectCount += entry.count;
              marketplaceListedCount += entry.listedCount;
              typePairs.push({ packageAddress: pkg.address, type: entry.type });
            }
          }
        }
        if (typePairs.length > 0) {
          const agg = await this.holderEntryModel.aggregate([
            { $match: { $or: typePairs } },
            { $group: { _id: '$address' } },
            { $count: 'count' },
          ]);
          uniqueHolders = agg[0]?.count ?? 0;
        } else {
          uniqueHolders = 0;
        }
      }

      // Reach = |senders ∪ holders| deduped. Scalar return, no address list
      // over the wire. When the project has no `countTypes` (no holder
      // contribution), this collapses to `uniqueSendersCount`.
      let uniqueWalletsReach = uniqueSendersCount;
      if (typePairs.length > 0 && pairs.length > 0) {
        const agg = await this.senderDocModel.aggregate([
          { $match: { $or: pairs } },
          {
            $unionWith: {
              coll: this.holderEntryModel.collection.name,
              pipeline: [{ $match: { $or: typePairs } }],
            },
          },
          { $group: { _id: '$address' } },
          { $count: 'count' },
        ]);
        uniqueWalletsReach = agg[0]?.count ?? 0;
      } else if (typePairs.length > 0) {
        // Edge case: project has countTypes but no module activity (all-zero senders). Reach = holders only.
        uniqueWalletsReach = uniqueHolders ?? 0;
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

      // Same walk-latest-first-non-empty rule as unattributed clusters
      // (`ecosystem.service.ts` — unattributed block below). Surfacing this
      // on attributed projects too lets a maintainer eyeball the actual
      // Move metadata a match rule is claiming (catches cases like a
      // package matched on module-name alone whose on-chain `asset_metadata`
      // says something different from the registry name).
      let sampleIdentifiers: string[] = [];
      let sampledObjectType: string | null = null;
      for (const pkg of [...facts].reverse()) {
        const fp = pkg.fingerprint;
        if (!fp) continue;
        if (fp.sampledObjectType && !sampledObjectType) sampledObjectType = fp.sampledObjectType;
        if (fp.identifiers?.length) {
          sampleIdentifiers = fp.identifiers;
          break;
        }
      }

      const firstPkg = facts[0]; // original deployment — address never changes
      const addrPrefix = firstPkg.address.slice(2, 8);
      projects.push({
        slug: `${addrPrefix}-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        name: displayName, layer: def.layer,
        category: def.category,
        subcategory: def.subcategory ?? null,
        categoryLabel: buildCategoryLabel(def.category, def.subcategory),
        industries: def.industries ?? [],
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
        uniqueHolders,
        objectCount,
        marketplaceListedCount,
        uniqueWalletsReach,
        attribution: def.attribution ?? null,
        addedAt: def.addedAt ?? null,
        sampleIdentifiers,
        sampledObjectType,
      });
    }

    // DefiLlama TVL enrichment + L2 EVM synthesis used to live here. Extracted
    // into `enrichWithTvl` so this method stays deterministic for a given
    // `(raw snapshot, registry code)` — a precondition for persisting the
    // classified view via `ClassifiedSnapshot`. Enrichment runs downstream on
    // the read path (see `getLatest`), cached separately on its own 10-min
    // TTL so TVL updates arrive faster than the 2h capture cadence.
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

    // Build deployer → attributed-project index so each unattributed cluster
    // can surface "same deployer as <known project>" insights. Deployer
    // strings are lowercased on both sides during `detectedDeployers` build,
    // so this map matches the cluster's deployer key directly. Cheap (one
    // pass over the attributed `projects` array, already built above).
    const deployerToAttributedProjects = new Map<
      string,
      { name: string; slug: string }[]
    >();
    for (const p of projects) {
      for (const d of p.detectedDeployers) {
        const key = d.toLowerCase();
        const bucket = deployerToAttributedProjects.get(key);
        const entry = { name: p.name, slug: p.slug };
        if (bucket) bucket.push(entry);
        else deployerToAttributedProjects.set(key, [entry]);
      }
    }

    // Bulk sender probe — one Mongo query covers every (clusterPkg, deployer)
    // pair. Key the result set so the per-cluster loop below is an O(1)
    // lookup rather than a per-cluster round-trip. Senders store the deployer
    // address verbatim from on-chain data (lowercased on write in
    // `updateSendersForModule`); cluster deployer keys are already lowercase.
    const deployerSenderPairs: Array<{ packageAddress: string; address: string }> = [];
    for (const { deployer, facts } of unattributedRanked) {
      if (deployer === 'unknown') continue;
      for (const pkg of facts) {
        deployerSenderPairs.push({ packageAddress: pkg.address, address: deployer });
      }
    }
    const deployerSenderHits = new Set<string>();
    if (deployerSenderPairs.length > 0) {
      const rows = await this.senderDocModel
        .find({ $or: deployerSenderPairs }, { packageAddress: 1, address: 1 })
        .lean()
        .exec();
      for (const r of rows as Array<{ packageAddress: string; address: string }>) {
        deployerSenderHits.add(`${r.packageAddress.toLowerCase()}|${r.address.toLowerCase()}`);
      }
    }

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

      const deployerAttributedProjects =
        deployer !== 'unknown'
          ? deployerToAttributedProjects.get(deployer.toLowerCase()) ?? []
          : [];
      const deployerIsSender =
        deployer !== 'unknown' &&
        facts.some((p) => deployerSenderHits.has(`${p.address.toLowerCase()}|${deployer.toLowerCase()}`));
      const insights = this.buildClusterInsights({
        packageCount: facts.length,
        uniqueSenders,
        transactions,
        events,
        deployerAttributedProjects,
        deployerIsSender,
        deployerIsUnknown: deployer === 'unknown',
      });

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
        // Shape-parity with `Project` (see UnattributedCluster interface doc).
        // Unattributed clusters have no `countTypes` by definition, so these
        // always pin to zero / senders-fallback. `growthRanking` can
        // interleave attributed + unattributed rows without branching on kind.
        uniqueHolders: 0,
        objectCount: 0,
        marketplaceListedCount: 0,
        uniqueWalletsReach: uniqueSenders,
        sampleIdentifiers: identifiers,
        sampledObjectType: objectType,
        deployerAttributedProjects,
        deployerIsSender,
        insights,
      });
    }
    const totalUnattributedPackages = unattributed.reduce((s, c) => s + c.packages, 0);
    this.logger.log(
      `classifyFromRaw: ${projects.length} projects, ` +
        `${unattributed.length} unattributed cluster(s) / ${totalUnattributedPackages} package(s)`,
    );

    // L1-only return. L2 projects are synthesized in `enrichWithTvl` from
    // DefiLlama; `l2: []` here is a placeholder so consumers that read from
    // the persisted (pre-enrichment) view see a stable shape even if they
    // never get enriched. `totalProjects` / `totalEvents` / `totalStorageIota`
    // get recomputed in `enrichWithTvl` after L2 rows are appended.
    return {
      l1: projects,
      l2: [] as Project[],
      unattributed,
      totalProjects: projects.length,
      totalEvents: projects.reduce((sum, p) => sum + p.events, 0),
      totalStorageIota: Math.round(projects.reduce((sum, p) => sum + p.storageIota, 0) * 10000) / 10000,
      totalUnattributedPackages,
      networkTxTotal: raw.networkTxTotal,
      txRates: raw.txRates,
    };
  }

  /**
   * Attach DefiLlama TVL to L1 projects and synthesize L2 EVM rows on top of
   * a classified view. Non-deterministic (network round-trip + time-varying
   * TVL), so kept out of `classifyFromRaw` — that method's output is what we
   * persist in `ClassifiedSnapshot`. This enrichment runs on the read path
   * instead, gated by a 10-min `defillamaCache` so dashboard reads stay
   * sub-10ms in the common case.
   *
   * Mutates the provided `view` in place (adds `tvl`/`tvlShared`/`tvlSharedWith`
   * to L1 project objects, replaces `l2`, recomputes totals) and returns it.
   * Failure mode: DefiLlama fetch error → log a warn, leave L1 TVL at null,
   * skip L2 synthesis. Matches the prior in-classify behavior exactly.
   */
  async enrichWithTvl<V extends {
    l1: Project[];
    l2: Project[];
    totalProjects: number;
    totalEvents: number;
    totalStorageIota: number;
  }>(view: V): Promise<V> {
    try {
      const now = Date.now();
      const cached = this.defillamaCache;
      let llamaData: any[];
      if (cached && cached.expiresAt > now) {
        llamaData = cached.value;
      } else {
        const llamaRes = await fetch('https://api.llama.fi/protocols');
        llamaData = await llamaRes.json();
        this.defillamaCache = {
          expiresAt: now + EcosystemService.DEFILLAMA_CACHE_TTL_MS,
          value: llamaData,
        };
      }

      const iotaProtocols = llamaData.filter((p) =>
        (p.chains || []).some((c: string) => c === 'IOTA' || c === 'IOTA EVM'),
      );

      const l1Projects = view.l1;

      // Match TVL to existing L1 projects — IOTA-chain slice only, not
      // cross-chain total. When multiple project rows share one DefiLlama
      // slug (e.g. Swirl V1 + V2, Virtue + Virtue Stability Pool, or any of
      // the TokenLabs products), pick a single *primary* by activity (event
      // count desc, name asc tiebreak); primary carries `tvl`, the others
      // carry the same number as `tvlShared` + `tvlSharedWith: <primary>`.
      // The dashboard sums only `tvl` into totals so the shared value is
      // never double-counted; siblings render `(TVL)` in parentheses with
      // a "shared with <primary>" tooltip.
      type LlamaMatch = { project: Project; proto: any; tvl: number };
      const matches: LlamaMatch[] = [];
      for (const project of l1Projects) {
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
      const existingNames = new Set(l1Projects.map((p) => p.name.toLowerCase()));
      const l2Projects: Project[] = [];
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
        const { category: l2Category, subcategory: l2Sub } = normalizeLlamaCategory(proto.category);
        l2Projects.push({
          slug: `evm-${llamaSlug}`,
          name: proto.name,
          layer: isEvm ? 'L2' : 'L1',
          category: l2Category,
          subcategory: l2Sub ?? null,
          categoryLabel: buildCategoryLabel(l2Category, l2Sub),
          industries: [],
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
          uniqueHolders: null,
          objectCount: null,
          marketplaceListedCount: null,
          uniqueWalletsReach: 0,
          attribution: null,
          addedAt: null,
          sampleIdentifiers: [],
          sampledObjectType: null,
        });
      }
      view.l2 = l2Projects;
      // Recompute totals across L1 + L2 (L2 rows have events=0 / storageIota=0
      // so `totalEvents` / `totalStorageIota` are unchanged; `totalProjects`
      // picks up the new L2 rows).
      view.totalProjects = l1Projects.length + l2Projects.length;
    } catch (e) {
      this.logger.warn('DefiLlama fetch failed, L2 data unavailable', e);
    }
    return view;
  }

  /**
   * sha256 hash of the registry inputs that drive `classifyFromRaw`'s output.
   * Stored on each `ClassifiedSnapshot` so a registry edit or classifier
   * version bump invalidates stale persisted views on first read, without
   * an operator action. Memoized per process — registry is static over
   * lifetime of the service instance.
   *
   * `JSON.stringify` drops function-valued fields silently
   * (`ProjectDefinition.fingerprint.probe`, etc.), so a change to a function
   * body does NOT bump the hash. Bump `CLASSIFIER_VERSION` in the same
   * commit for logic changes that aren't reflected in structured data.
   */
  private computeRegistryHash(): string {
    if (this.cachedRegistryHash !== null) return this.cachedRegistryHash;
    const payload = JSON.stringify({
      projects: ALL_PROJECTS,
      teams: ALL_TEAMS,
      version: EcosystemService.CLASSIFIER_VERSION,
    });
    this.cachedRegistryHash = createHash('sha256').update(payload).digest('hex');
    return this.cachedRegistryHash;
  }

  /**
   * Upsert a classified view for the given snapshot. Called at capture time
   * and on read-path cache misses (stale-hash or missing doc). Keyed by
   * `snapshotId` (unique); overwrites in place — no version history.
   */
  private async persistClassified(
    snapshotId: unknown,
    view: Awaited<ReturnType<EcosystemService['classifyFromRaw']>>,
    classifyDurationMs: number,
  ): Promise<void> {
    await this.classifiedModel
      .updateOne(
        { snapshotId },
        {
          $set: {
            snapshotId,
            registryHash: this.computeRegistryHash(),
            classifiedAt: new Date(),
            classifyDurationMs,
            view,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Return a classified view for `snap`, hitting the persisted
   * `ClassifiedSnapshot` collection on hot path and falling back to
   * `classifyFromRaw` on miss / stale-hash. The classify-and-persist
   * fallback is shared by cron (`capture`), boot self-heal
   * (`onModuleInit`), and read paths (`getLatest`, `growthRanking`).
   *
   * Does NOT run `enrichWithTvl` — the persisted view is deterministic by
   * design. Callers that need TVL (currently just `getLatest`) wrap the
   * result in `enrichWithTvl`.
   */
  private async classifyOrLoad(snap: any): Promise<Awaited<ReturnType<EcosystemService['classifyFromRaw']>>> {
    const cached = await this.classifiedModel
      .findOne({ snapshotId: snap._id })
      .lean()
      .exec();
    const currentHash = this.computeRegistryHash();
    if (cached && cached.registryHash === currentHash) {
      return cached.view as Awaited<ReturnType<EcosystemService['classifyFromRaw']>>;
    }
    const t0 = Date.now();
    const view = await this.classifyFromRaw(snap);
    const durationMs = Date.now() - t0;
    await this.persistClassified(snap._id, view, durationMs);
    return view;
  }
}
