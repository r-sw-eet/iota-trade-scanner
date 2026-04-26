import { Injectable, Logger, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { BSON } from 'bson';
import { createHash } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as os from 'node:os';
import {
  OnchainSnapshot,
  PackageFact,
  ModuleMetrics,
  FingerprintSampleDoc,
  ObjectTypeCount,
} from './schemas/onchain-snapshot.schema';
import { PackageFactDoc } from './schemas/package-fact.schema';
import { SchemaAlert } from './schemas/schema-alert.schema';
import { ProjectSenders } from './schemas/project-senders.schema';
import { ProjectSender } from './schemas/project-sender.schema';
import { ProjectTxCounts } from './schemas/project-tx-counts.schema';
import { ProjectHolders } from './schemas/project-holders.schema';
import { ProjectHolderEntry } from './schemas/project-holder-entry.schema';
import { ProjectTxDigest } from './schemas/project-tx-digest.schema';
import { ClassifiedSnapshot } from './schemas/classified-snapshot.schema';
import { TestnetCursor } from './schemas/testnet-cursor.schema';
import { CaptureLock } from './schemas/capture-lock.schema';
import { AlertsService } from '../alerts/alerts.service';
import { ALL_PROJECTS, ProjectDefinition, Category, Subcategory } from './projects';
import { ALL_TEAMS, Team, getTeam } from './teams';
import { isTutorialModuleSet } from './testnet-tutorial-signatures';

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
    (m.minModules ?? 0) > 0 ||
    (m.objectTypes?.length ?? 0) > 0
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

/**
 * GraphQL endpoint per IOTA network. Resolved once at service construction
 * from `this.network` into `this.graphqlUrl` — resolving per-call would burn
 * a map lookup on every one of the ~3000 GraphQL round-trips a capture does.
 */
const GRAPHQL_URL_BY_NETWORK: Record<string, string> = {
  mainnet: 'https://graphql.mainnet.iota.cafe',
  testnet: 'https://graphql.testnet.iota.cafe',
  devnet: 'https://graphql.devnet.iota.cafe',
};

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
  objectHolderCount: number;
  /** Always 0 on unattributed clusters — see `uniqueHolders` doc. */
  objectCount: number;
  /** Always false on unattributed clusters — see `uniqueHolders` doc. */
  objectCountCapped: boolean;
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
  /** ISO-8601 timestamp of the latest package's publish TX in this cluster. `null` for framework packages / legacy snapshots. */
  publishedAt: string | null;
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
   * Sum across the project's `countTypes` of the per-type `objectHolderCount`
   * (distinct wallets currently holding at least one live object of each type).
   * Cross-type wallet duplication is not removed here; for the dedup'd version
   * see `uniqueHolders`. `null` when `countTypes` is absent/empty.
   */
  objectHolderCount: number | null;
  /**
   * Total live Move objects of the project's declared `countTypes`, summed
   * across its packages. Stateless re-walk per scan via `countObjectsForType`.
   * `null` when `countTypes` is absent/empty.
   */
  objectCount: number | null;
  /** True if any constituent type's live-object walk hit its per-scan page cap — `objectCount` is then a floor. */
  objectCountCapped: boolean;
  /**
   * Count of the project's objects currently owned by another object
   * (marketplace listings via dynamic_field wrappers, Kiosk-like wrappers,
   * etc.). Surfaced on the detail page so the gap between `objectHolderCount`
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
  /** ISO-8601 timestamp of the latest package's publish TX (from `PackageFact.publishedAt`). `null` for framework-only projects or snapshots predating the field. Used by the unattributed discovery layer for cross-cluster "published within N min of X" pairing. */
  publishedAt: string | null;
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
  previousTransactionBlock: {
    sender: { address: string } | null;
    effects: { timestamp: string | null } | null;
  } | null;
}

@Injectable()
export class EcosystemService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(EcosystemService.name);

  /**
   * Guards against concurrent `capture()` calls. Captures take 30–40 min
   * against mainnet; a second call landing while one is in flight would
   * double the load on the GraphQL endpoint and potentially double-write
   * the snapshot. Paired with `capture()`'s try/finally below.
   */
  private capturing = false;

  /**
   * Per-network capture guard for the testnet priority-sharded tick
   * (Phase 4c). Separate from `capturing` because mainnet and testnet
   * talk to different GraphQL endpoints at different tick cadences and
   * must be able to run in parallel — a mainnet capture in flight
   * should never block a testnet tick from starting, and vice versa.
   */
  private capturingByNetwork: Record<string, boolean> = {};

  /**
   * Set of capture-lock networks THIS process holds. Populated when
   * `acquireCaptureLock` succeeds, drained when `releaseCaptureLock` runs
   * or by the shutdown hook. Critical for the shutdown hook: it ONLY
   * releases locks in this set, so an externally-applied manual halt
   * lock is preserved when a forked Node process exits.
   *
   * Without this guard, the bug observed 2026-04-25 recurs: a manual
   * `docker exec node -e ...` triggered tick fires `onApplicationShutdown`
   * on exit which used to call `releaseCaptureLock` unconditionally for
   * BOTH networks, wiping the operator's far-future halt locks. Cron
   * then fired unattended, racing with manual triggers, deleting
   * in-flight partials, leaving orphan packagefacts.
   */
  private acquiredLocks: Set<string> = new Set();

  /** Returns true while the mainnet capture is actively running. */
  isCapturing(): boolean {
    return this.capturing;
  }

  /** Returns true while a testnet tick is actively running. */
  isCapturingTestnet(): boolean {
    return this.capturingByNetwork['testnet'] === true;
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
  private static readonly CLASSIFIER_VERSION = 10;

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

  // ----- Testnet two-pipeline capture constants -----

  /**
   * Pipeline-A freshness window. When the discovery paginator hits an
   * address that's already in the previous snapshot AND was deep-probed
   * within this window (`lastProbedAt > now - this`), discovery has
   * caught up with recent work and bails — everything beyond is older
   * known territory that Pipeline B's full-sweep deep-probe will pick
   * up. 18h = 3 ticks × 6h interval, so we never miss newly-published
   * packages for more than one tick.
   *
   * Note: this only fires when the prior fact has a non-null
   * `lastProbedAt`. Shallow-discovered facts (Pipeline A's own output)
   * carry `lastProbedAt: null`, so they never trip this check — only
   * deep-probed history matters for "caught up?"
   */
  private static readonly TESTNET_FRESHNESS_WINDOW_MS = 18 * 60 * 60 * 1000;

  /**
   * Default concurrency for Pipeline B's parallel batches. Mirrors
   * `backfillTestnetFromAddressList` — ~15 in-flight `fetchPackageByAddress`
   * + `probeOnePackage` calls keeps the testnet GraphQL endpoint busy
   * without tripping its rate limit. Math: 7,798 non-tutorial packages
   * × ~3-4s/probe ÷ 15 ≈ ~33 min, comfortably inside the 90-min budget.
   */
  private static readonly TESTNET_DEEP_PROBE_CONCURRENCY = 15;

  /**
   * Upper-bound per-tick budget. The effective deadline is computed at
   * tick-start as `min(now + this, nextMainnetCron - BUFFER)` — whichever
   * comes sooner. For the natural cron cadence (testnet at odd UTC hours,
   * mainnet at even) the gap-to-next-mainnet dominates (~55 min
   * effective). For a manual trigger right after mainnet finishes the
   * 90-min ceiling dominates. Either way testnet never overlaps the
   * mainnet capture window — Invariant 5: testnet never breaks mainnet.
   */
  private static readonly TESTNET_TICK_BUDGET_MS = 90 * 60 * 1000;

  /**
   * Safety buffer before the next mainnet cron fires. The effective
   * testnet deadline cuts 5 min short of that, so even if this Node
   * event loop is mid-BSON-serialization when the buffer kicks in, the
   * mainnet capture can start on a clean scheduler. 5 min is generous
   * for the testnet partial-save path (finalize + insertMany typically
   * completes in a few seconds).
   */
  private static readonly TESTNET_MAINNET_OVERLAP_BUFFER_MS = 5 * 60 * 1000;

  // Cron-interval of the mainnet capture (every 2h). Kept in sync with
  // the `@Cron` on `capture()` — 0 SPLAT 2 SPLAT SPLAT SPLAT where SPLAT
  // is the asterisk character. (Jsdoc can't render the raw expression
  // since its slash-splat closes the comment.)
  private static readonly MAINNET_CRON_INTERVAL_MS = 2 * 60 * 60 * 1000;

  /**
   * Compute the next wall-clock time the mainnet cron fires, at or after
   * `from`. Mainnet fires every even UTC hour on the hour. If `from` is
   * exactly on an even UTC hour the result is the NEXT even UTC hour —
   * the mainnet cron is already firing at that instant. Static helper so
   * it can be unit-tested directly.
   */
  static nextMainnetCronAt(from: Date): Date {
    const next = new Date(from);
    next.setUTCMilliseconds(0);
    next.setUTCSeconds(0);
    next.setUTCMinutes(0);
    const currentHour = next.getUTCHours();
    // Round UP to the next even UTC hour strictly after `from`. If we're
    // at 14:05 UTC the answer is 16:00 UTC (14:00's mainnet slot already
    // fired). If we're at 15:00 UTC it's 16:00 (next even). If we're at
    // exactly 14:00:00.000 UTC the answer is still 16:00 — this helper
    // is for "when will the next mainnet cron fire from my perspective",
    // and at the instant of 14:00:00 the cron has just (about to) fire,
    // so the *next* one is 16:00.
    const hoursToAdd = currentHour % 2 === 0 ? 2 : 1;
    next.setUTCHours(currentHour + hoursToAdd);
    return next;
  }

  /**
   * Which IOTA network this process is scanning/serving. Resolved once at
   * construction from `IOTA_NETWORK` (default `mainnet`). Every write stamps
   * this onto the persisted doc; every read filters by it (with a transitional
   * `$exists: false` branch for pre-tagging prod docs — see `networkFilter`).
   */
  private readonly network: 'mainnet' | 'testnet' | 'devnet';

  /**
   * GraphQL endpoint bound to this process's network. Resolved once at
   * construction rather than per-call — `captureRaw()` fires thousands of
   * GraphQL requests per cycle and the indirection adds no value once the
   * network is known. Public via `getGraphqlUrl()` so the HTTP controller
   * (which does its own direct `fetch` for a few project-detail endpoints)
   * hits the same endpoint without duplicating the network→URL map.
   */
  private readonly graphqlUrl: string;

  constructor(
    @InjectModel(OnchainSnapshot.name) private ecoModel: Model<OnchainSnapshot>,
    @InjectModel(PackageFactDoc.name) private pkgFactModel: Model<PackageFactDoc>,
    @InjectModel(SchemaAlert.name) private schemaAlertModel: Model<SchemaAlert>,
    @InjectModel(ProjectSenders.name) private senderModel: Model<ProjectSenders>,
    @InjectModel(ProjectSender.name) private senderDocModel: Model<ProjectSender>,
    @InjectModel(ProjectTxCounts.name) private txCountModel: Model<ProjectTxCounts>,
    @InjectModel(ProjectHolders.name) private holdersStateModel: Model<ProjectHolders>,
    @InjectModel(ProjectHolderEntry.name) private holderEntryModel: Model<ProjectHolderEntry>,
    @InjectModel(ProjectTxDigest.name) private txDigestModel: Model<ProjectTxDigest>,
    @InjectModel(ClassifiedSnapshot.name) private classifiedModel: Model<ClassifiedSnapshot>,
    @InjectModel(TestnetCursor.name) private testnetCursorModel: Model<TestnetCursor>,
    @InjectModel(CaptureLock.name) private captureLockModel: Model<CaptureLock>,
    private alerts: AlertsService,
  ) {
    const env = process.env.IOTA_NETWORK;
    this.network = env === 'testnet' || env === 'devnet' ? env : 'mainnet';
    // Map is exhaustive over the three valid network literals above, so no
    // fallback branch is needed here.
    this.graphqlUrl = GRAPHQL_URL_BY_NETWORK[this.network];
  }

  /**
   * GraphQL endpoint bound to this process's network (e.g. mainnet →
   * `https://graphql.mainnet.iota.cafe`). Exposed for the HTTP controller's
   * direct-fetch endpoints so one source of truth governs both the scanner
   * and the request-time GraphQL reads.
   */
  getGraphqlUrl(): string {
    return this.graphqlUrl;
  }

  /** Which IOTA network this process is bound to. */
  getNetwork(): 'mainnet' | 'testnet' | 'devnet' {
    return this.network;
  }

  /**
   * Transitional read filter for `onchainsnapshots` / `classifiedsnapshots`.
   * Composes two transitional clauses:
   *   1. Network — docs tagged with this process's network OR docs predating
   *      the `network` field.
   *   2. Capture stage — docs tagged `captureStage: 'complete'` OR docs
   *      predating the field. Excludes in-flight `'partial'` mainnet docs
   *      so every reader (`getLatestRaw`, `findSnapshotsBetween`, growth,
   *      classifiedOrLoad, …) sees only terminal snapshots during a mid-
   *      capture window.
   *
   * The captureStage clause spreads harmlessly into `classifiedsnapshots`
   * queries (those docs never have the field → match via `$exists: false`).
   *
   * Drop both `$exists: false` branches in a follow-up once backfill mongosh
   * has stamped every row:
   *   db.onchainsnapshots.updateMany(
   *     { captureStage: { $exists: false } },
   *     { $set: { captureStage: 'complete', captureProgressCursor: null } }
   *   )
   */
  private networkFilter(): Record<string, unknown> {
    return {
      $and: [
        { $or: [{ network: this.network }, { network: { $exists: false } }] },
        { $or: [{ captureStage: 'complete' }, { captureStage: { $exists: false } }] },
      ],
    };
  }

  /**
   * BSON-size ceiling enforced by `safeCreate` / `safeUpdateOne` on every
   * write to `onchainsnapshots`. 15 MiB leaves a 1 MiB headroom below the
   * 16 MiB MongoDB per-doc limit (16,777,216 bytes) so benign serialization
   * overhead doesn't trip us. Chosen after the 2026-04-24 testnet overflow
   * where a snapshot doc at 17,825,798 bytes threw during `bson.encodeUTF8Into`.
   */
  private static readonly BSON_SIZE_CEILING_BYTES = 15 * 1024 * 1024;

  /**
   * Read the PackageFact set belonging to a snapshot. Since the
   * 2026-04-25 backfill migrated every legacy embedded-packages doc
   * into the `packagefacts` sub-collection, persisted snapshots always
   * resolve via a `find({snapshotId})` query.
   *
   * In-memory shortcut: if the caller already has packages loaded
   * (e.g. `captureRaw` returns an object with `packages` inline before
   * the snapshot is persisted), return those directly. Avoids a
   * pointless DB round-trip for callers that haven't even written to
   * Mongo yet. Does NOT act as a legacy-doc fallback — every persisted
   * doc post-backfill has its facts in the sub-collection.
   */
  private async getPackages(
    snapshot: { _id?: unknown; packages?: PackageFact[] } | null | undefined,
  ): Promise<PackageFact[]> {
    if (!snapshot) return [];
    if (Array.isArray(snapshot.packages) && snapshot.packages.length > 0) {
      return snapshot.packages;
    }
    const snapshotId = (snapshot as { _id?: Types.ObjectId | string })._id;
    if (!snapshotId) return [];
    const docs = await this.pkgFactModel
      .find({ snapshotId })
      .lean()
      .exec();
    // Strip the sub-collection-only meta fields so the returned shape
    // matches the embedded PackageFact exactly — downstream consumers
    // don't need to know the facts live in a separate collection.
    return docs.map((d) => {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const { _id, snapshotId, network, createdAt, updatedAt, ...rest } = d as Record<string, unknown>;
      /* eslint-enable @typescript-eslint/no-unused-vars */
      return rest as unknown as PackageFact;
    });
  }

  /**
   * Insert a batch of PackageFacts into the sub-collection, stamping
   * `snapshotId` and `network` onto each. Idempotent-safe when the
   * `{ snapshotId, address }` unique index is in place — retrying a
   * partial-save batch after a transient error won't duplicate rows.
   *
   * Chunks at 1000 to stay well clear of Mongo's `maxWriteBatchSize`
   * (100k) and keep the insertMany RTT under a few hundred ms even on
   * the busiest testnet backfill ticks.
   */
  private async insertPackageFacts(
    snapshotId: Types.ObjectId,
    network: 'mainnet' | 'testnet' | 'devnet',
    batch: PackageFact[],
  ): Promise<void> {
    if (batch.length === 0) return;
    const CHUNK = 1000;
    for (let i = 0; i < batch.length; i += CHUNK) {
      const slice = batch.slice(i, i + CHUNK).map((p) => ({ ...p, snapshotId, network }));
      await this.pkgFactModel.insertMany(slice, { ordered: false });
    }
  }

  /**
   * Delete every PackageFact doc belonging to a snapshot. Called when a
   * partial mainnet snapshot is abandoned (cleaner shutdown or supplanted
   * by a newer complete run) — the sub-collection equivalent of
   * `ecoModel.deleteOne({_id})` on the header.
   */
  private async deletePackageFactsFor(snapshotId: Types.ObjectId): Promise<void> {
    await this.pkgFactModel.deleteMany({ snapshotId }).exec();
  }

  /**
   * Persist a schema-guard trip to Mongo so a future deploy / debugging
   * session can still see that a guard fired even after container logs
   * have rotated. Swallow write errors — alerting must never block the
   * caller that refused the oversize write.
   */
  private async logSchemaAlert(alert: {
    kind: string;
    collectionName: string;
    op: string;
    network?: string;
    sizeBytes?: number;
    thresholdBytes?: number;
    detail?: Record<string, unknown>;
    message: string;
  }): Promise<void> {
    try {
      await this.schemaAlertModel.create({
        kind: alert.kind,
        collectionName: alert.collectionName,
        op: alert.op,
        network: alert.network ?? this.network ?? 'unknown',
        sizeBytes: alert.sizeBytes ?? 0,
        thresholdBytes: alert.thresholdBytes ?? 0,
        detail: alert.detail ?? {},
        message: alert.message,
      });
    } catch (e) {
      this.logger.warn(`Failed to persist schemaAlert: ${(e as Error).message}`);
    }
  }

  /**
   * Oversize-aware `ecoModel.create` wrapper. Measures the BSON byte size
   * the doc will serialize to; if above `BSON_SIZE_CEILING_BYTES`, logs
   * loudly, writes a `schemaAlerts` record, and throws — so the caller
   * sees the failure AND a persistent record survives log rotation.
   *
   * Any doc that fails here is the signal that the 15 MiB ceiling is
   * being approached; we ratchet down the data shape rather than loosen
   * the ceiling.
   */
  private async safeCreate(
    doc: Partial<OnchainSnapshot> & Record<string, unknown>,
  ): Promise<OnchainSnapshot> {
    const size = BSON.calculateObjectSize(doc as Record<string, unknown>);
    if (size > EcosystemService.BSON_SIZE_CEILING_BYTES) {
      const detail: Record<string, unknown> = {
        packagesLen: Array.isArray(doc.packages) ? (doc.packages as unknown[]).length : undefined,
        network: doc.network,
        captureStage: doc.captureStage,
      };
      const message = `BSON size guard REFUSED onchainsnapshots create: ${size} bytes > ceiling ${EcosystemService.BSON_SIZE_CEILING_BYTES} — packages are supposed to live in the packagefacts sub-collection, do NOT embed them in the snapshot header doc`;
      this.logger.error(message);
      await this.logSchemaAlert({
        kind: 'bson-size-guard',
        collectionName: 'onchainsnapshots',
        op: 'create',
        network: typeof doc.network === 'string' ? doc.network : undefined,
        sizeBytes: size,
        thresholdBytes: EcosystemService.BSON_SIZE_CEILING_BYTES,
        detail,
        message,
      });
      throw new Error(message);
    }
    return this.ecoModel.create(doc as OnchainSnapshot);
  }

  /**
   * One-shot transition migration covering two consecutive testnet-cursor
   * field renames:
   *
   *   - 2026-04-25 (pagination-direction inversion): the old
   *     `backfillAfterCursor` encoded a forward-walk position from
   *     genesis; the next code walked newest→oldest via `before:`
   *     cursors. The old value was not a valid `before:` cursor
   *     (encoding is direction-specific) so it was discarded.
   *   - 2026-04-26 (two-pipeline refactor): `backfillBeforeCursor`
   *     itself is now obsolete — Pipeline B's stalest-first aggregation
   *     over `packagefacts` subsumes the work the backfill cursor used
   *     to drive. `lastTickKind` likewise gone — every tick runs the
   *     same A→B flow. We `$unset` both alongside `backfillAfterCursor`
   *     so old singletons decode cleanly under the new (smaller) schema.
   *
   * Idempotent — after first successful run the legacy fields are gone,
   * so every subsequent call is a no-op.
   *
   * NOTE: an earlier version of this migration ALSO deleted in-flight
   * `captureStage: 'partial'` snapshots + their packagefacts as a
   * defensive cleanup of forward-direction cursors. That was actively
   * harmful — the migration runs on every Nest boot, including forked
   * manual-trigger processes, so it could clobber a legitimate
   * concurrent capture mid-walk and leave orphan packagefacts behind
   * (observed 2026-04-25 night, 651 orphans created). Removed in favor
   * of letting the partial-resume flow handle stale cursors naturally:
   * `finalizeMainnetSnapshot` clears `captureProgressCursor` on
   * promote, so even a stuck legacy cursor self-resolves after one
   * wasted capture cycle. The "partial cleanup" was never load-bearing.
   */
  private async runPaginationInversionMigration(): Promise<void> {
    // `strict: false` is required for the `$unset` clauses to reach the
    // wire — Mongoose's default strict mode silently drops updates
    // referencing fields that no longer exist in the schema. The match
    // filter uses `$or` so we touch any singleton that still carries
    // either legacy field, and skip the no-op case for already-clean docs.
    const cursorMig = await this.testnetCursorModel
      .updateOne(
        {
          _id: 'testnet',
          $or: [
            { backfillAfterCursor: { $exists: true } as never },
            { backfillBeforeCursor: { $exists: true } as never },
            { lastTickKind: { $exists: true } as never },
          ],
        } as never,
        {
          $unset: {
            backfillAfterCursor: '',
            backfillBeforeCursor: '',
            lastTickKind: '',
          } as never,
        },
        { strict: false },
      )
      .exec();
    if (cursorMig.modifiedCount > 0) {
      this.logger.log(
        'testnet-cursor migration: dropped legacy fields (backfillAfterCursor / backfillBeforeCursor / lastTickKind) — two-pipeline flow stores no per-tick cursor state',
      );
    }
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    // Direction-flip migration runs before everything else on every boot.
    // Idempotent and cheap — one updateOne + one find on a ~25-doc
    // collection — so the "always run" overhead is negligible and gives
    // us safety against a second flip or a restore-from-backup scenario.
    try {
      await this.runPaginationInversionMigration();
    } catch (e) {
      this.logger.error(`pagination-inversion migration failed: ${(e as Error).message}`, e);
    }
    const isServeOnly = process.env.API_ROLE === 'serve';
    if (!isServeOnly) {
      const count = await this.ecoModel.countDocuments(this.networkFilter());
      if (count === 0) {
        this.logger.log('No ecosystem snapshot found, capturing in background...');
        this.capture().catch((e) => this.logger.error('Initial ecosystem capture failed', e));
        return;
      }
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
   * Lifecycle hook for graceful shutdown (SIGTERM / SIGINT). Docker's
   * default 10-sec grace period is nowhere near enough to finish an
   * in-flight capture, so we do NOT try to "drain" — the work is lost.
   * But we DO release held `CaptureLock`s so the next container boot
   * (or any other scanner replica) can start the next cycle immediately,
   * instead of waiting for the lock's TTL to expire (~3h mainnet, 2.5h
   * testnet).
   *
   * Called by Nest AFTER `app.enableShutdownHooks()` is in effect (see
   * `main.ts`). `Promise.allSettled` so one release failing doesn't
   * block the other.
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    this.logger.log(`Received ${signal ?? 'shutdown'}, releasing any held capture locks…`);
    const results = await Promise.allSettled([
      this.releaseCaptureLock('mainnet'),
      this.releaseCaptureLock('testnet'),
    ]);
    for (const [i, r] of results.entries()) {
      if (r.status === 'rejected') {
        const net = i === 0 ? 'mainnet' : 'testnet';
        this.logger.warn(`Failed to release ${net} capture lock on shutdown: ${(r.reason as Error).message}`);
      }
    }
  }

  /**
   * Ensure the latest `OnchainSnapshot` has a fresh-hash `ClassifiedSnapshot`.
   * Runs in the background from `onModuleInit` so boot doesn't stall on the
   * 1–2 s classify cost. Safe to call multiple times — the persist step
   * upserts and `classifyOrLoad` short-circuits when the hash already matches.
   */
  private async selfHealLatestClassified(): Promise<void> {
    const latest = await this.ecoModel.findOne(this.networkFilter()).sort({ createdAt: -1 }).lean().exec();
    if (!latest) return;
    const cached = await this.classifiedModel
      .findOne({ snapshotId: latest._id, ...this.networkFilter() })
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
    await this.persistClassified(latest._id, view, Date.now() - t0, (latest as { network?: string }).network);
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
    const snap = await this.ecoModel.findOne(this.networkFilter()).sort({ createdAt: -1 }).lean().exec();
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
    return this.ecoModel.findOne(this.networkFilter()).sort({ createdAt: -1 }).lean().exec();
  }

  /** Fetch raw snapshots in a `[from, to]` `createdAt` window. Used by the growth endpoint. */
  async findSnapshotsBetween(from: Date, to: Date) {
    return this.ecoModel
      .find({ createdAt: { $gte: from, $lte: to }, ...this.networkFilter() })
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
      | 'objectHolderCountDelta'
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
      /** Sum of per-type `objectHolderCount` across project `countTypes`. Null semantics mirror `uniqueHolders`. */
      objectHolderCount: number | null;
      objectHolderCountDelta: number;
      /** Sum of per-type live-object count across project `countTypes`. Null semantics mirror `uniqueHolders`. */
      objectCount: number | null;
      objectCountDelta: number;
      objectCountCapped: boolean;
      /** Count of `Parent`-owned observations during the holder walk (marketplace listings, dynamic-field wrappers). Null semantics mirror. */
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
      .findOne({ createdAt: { $lte: from }, ...this.networkFilter() })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const latestSnap = await this.ecoModel
      .findOne({ createdAt: { $lte: to }, ...this.networkFilter() })
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
          objectHolderCount: p.objectHolderCount ?? null,
          objectHolderCountDelta: (p.objectHolderCount ?? 0) - (prev?.objectHolderCount ?? 0),
          objectCount: p.objectCount ?? null,
          objectCountDelta: (p.objectCount ?? 0) - (prev?.objectCount ?? 0),
          objectCountCapped: p.objectCountCapped ?? false,
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
          objectHolderCount: u.objectHolderCount ?? 0,
          objectHolderCountDelta: (u.objectHolderCount ?? 0) - (prev?.objectHolderCount ?? 0),
          objectCount: u.objectCount ?? 0,
          objectCountDelta: (u.objectCount ?? 0) - (prev?.objectCount ?? 0),
          objectCountCapped: u.objectCountCapped ?? false,
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
      .findOne({ createdAt: { $lte: from }, ...this.networkFilter() })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const latest = await this.ecoModel
      .findOne({ createdAt: { $lte: to }, ...this.networkFilter() })
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

    // Resolve packages via the sub-collection-aware helper so growth math
    // works uniformly against legacy (embedded) and post-split (sub-collection)
    // snapshots.
    const baselinePackages = await this.getPackages(baseline);
    const latestPackages = await this.getPackages(latest);

    // Index the baseline by address for O(1) lookups while scanning `latest`.
    const baselineByAddr = new Map<string, PackageFact>();
    for (const p of baselinePackages) baselineByAddr.set(p.address, p);

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

    for (const pkg of latestPackages) {
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
      this.logger.log('Capture already in flight (in-process), skipping duplicate trigger');
      return;
    }
    // Set the in-process flag SYNCHRONOUSLY before awaiting the cross-process
    // lock acquisition. Otherwise a second `capture()` call in the same tick
    // wouldn't see `this.capturing` set yet and would race past step 1.
    this.capturing = true;
    let lockAcquired = false;
    this.logger.log('Capturing ecosystem snapshot...');
    const startedAt = Date.now();
    try {
      // Cross-process lock — protects against a manual bootstrap script
      // racing the scheduled cron, or a future HA scanner replica
      // duplicating work. Awaited inside the `try` so the `finally` path
      // always releases both the in-process flag and the cross-process lock.
      const lock = await this.acquireCaptureLock('mainnet', EcosystemService.MAINNET_LOCK_TTL_MS);
      if (!lock.acquired) {
        this.logger.log(
          `Mainnet capture lock held by ${lock.holder ?? 'unknown'} until ${lock.lockedUntil?.toISOString() ?? '?'}; skipping`,
        );
        return;
      }
      lockAcquired = true;

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
        // Promote-or-create: if `captureRaw` established a partial doc via
        // its checkpoint callbacks, flip it to `complete` with the final
        // fields in one atomic update. Otherwise (capture finished inside
        // a single checkpoint window — fewer than N packages on-chain, or
        // a resume that completed on the first page) fall back to the
        // historical `create`. In both branches the final doc is tagged
        // `captureStage: 'complete'` so readers pick it up immediately.
        const created = await this.finalizeMainnetSnapshot(raw, durationMs);
        // Precompute + persist the classified view so the first read after
        // this capture is O(1). Failures here are non-fatal — readers fall
        // back to classify-on-demand via `classifyOrLoad`. Keeps the
        // capture cron resilient to a transient Mongo error on write.
        try {
          const t0 = Date.now();
          const view = await this.classifyFromRaw(created);
          await this.persistClassified(created._id, view, Date.now() - t0, (created as { network?: string }).network);
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
      if (lockAcquired) {
        await this.releaseCaptureLock('mainnet').catch((e) =>
          this.logger.warn(`Failed to release mainnet capture lock: ${(e as Error).message}`),
        );
      }
    }
  }

  /**
   * Observe-only counterpart to `capture()`. Runs `captureRaw()` against
   * `this.graphqlUrl` (whichever network the service is bound to) and
   * returns aggregate stats in-memory — nothing is persisted, no classify
   * runs, no cache is invalidated. Used by the `dry-run-testnet` CLI to
   * smoke-test a testnet/devnet scan from the workstation before committing
   * to a persisted cron. Hard timeout via `Promise.race` — mirrors
   * `capture()`'s pattern so a hung GraphQL promise can't orphan the caller.
   */
  public async dryRunCapture(
    opts: { maxMinutes?: number } = {},
  ): Promise<{
    durationMs: number;
    network: string;
    graphqlUrl: string;
    packages: number;
    deployers: number;
    modules: number;
    events: number;
    uniqueSenders: number;
    txs: number;
    liveObjects: number;
    publishedAtCount: number;
    entryFunctionTotal: number;
    eventTypeTotal: number;
    displayCount: number;
    cappedPackages: number;
    cappedTypes: number;
  }> {
    const maxMinutes = opts.maxMinutes ?? 20;
    const startedAt = Date.now();
    this.logger.log(`[dry-run] starting capture against ${this.graphqlUrl} (timeout ${maxMinutes}min)…`);

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutMs = maxMinutes * 60 * 1000;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`dry-run exceeded ${maxMinutes}min timeout`)),
        timeoutMs,
      );
      timeoutHandle.unref();
    });

    let raw: Awaited<ReturnType<EcosystemService['captureRaw']>>;
    try {
      raw = await Promise.race([this.captureRaw(), timeout]);
    } catch (e) {
      throw new Error(`[dry-run] capture against ${this.graphqlUrl} failed: ${(e as Error).message}`);
    } finally {
      clearTimeout(timeoutHandle);
    }

    const durationMs = Date.now() - startedAt;

    // Aggregate counters — mirror the summary line that `capture()` logs so
    // a dry-run and a real cron produce comparable numbers. `deployers` is
    // the distinct-count (lowercased) to match how `fetchFull` clusters.
    // `liveObjects` sums `objectCount` across every per-type entry; the
    // `cappedPackages` / `cappedTypes` floors surface when the scanner hit
    // its per-scan page cap so the operator knows the totals are lower
    // bounds rather than ground truth.
    const deployers = new Set<string>();
    let modules = 0;
    let events = 0;
    let uniqueSenders = 0;
    let txs = 0;
    let liveObjects = 0;
    let publishedAtCount = 0;
    let entryFunctionTotal = 0;
    let eventTypeTotal = 0;
    let displayCount = 0;
    let cappedPackages = 0;
    let cappedTypes = 0;
    for (const p of raw.packages) {
      if (p.deployer) deployers.add(p.deployer.toLowerCase());
      modules += p.modules.length;
      if (p.publishedAt) publishedAtCount += 1;
      if (p.transactionsCapped) cappedPackages += 1;
      for (const m of p.moduleMetrics) {
        events += m.events;
        uniqueSenders += m.uniqueSenders;
        entryFunctionTotal += m.entryFunctions.length;
        eventTypeTotal += m.eventTypes.length;
      }
      for (const t of p.objectTypeCounts) {
        liveObjects += t.objectCount;
        if (t.objectCountCapped || t.objectHolderCountCapped) cappedTypes += 1;
      }
      if (p.fingerprint) {
        for (const s of p.fingerprint.identifiers) {
          if (s.startsWith('display.')) displayCount += 1;
        }
      }
      txs += p.transactions;
    }

    return {
      durationMs,
      network: this.network,
      graphqlUrl: this.graphqlUrl,
      packages: raw.packages.length,
      deployers: deployers.size,
      modules,
      events,
      uniqueSenders,
      txs,
      liveObjects,
      publishedAtCount,
      entryFunctionTotal,
      eventTypeTotal,
      displayCount,
      cappedPackages,
      cappedTypes,
    };
  }

  /**
   * Per-call URL override for the GraphQL client. Used exclusively by Phase 4c
   * (testnet priority-sharded capture) to target `graphql.testnet.iota.cafe`
   * without having to thread a URL parameter through every probe helper.
   *
   * When `captureTestnetTick()` enters its body it wraps the work in
   * `graphqlUrlContext.run(testnetUrl, …)`. Every `this.graphql()` call
   * transitively nested inside that `run()` — including the ~10 helper
   * methods (`countEvents`, `fetchEntryFunctions`, `probeIdentityFields`,
   * etc.) — picks up the testnet URL from the async context without any
   * signature change. Mainnet call paths don't use `run()`, so they see
   * `undefined` from `getStore()` and fall back to `this.graphqlUrl` as
   * before. Parallel mainnet+testnet captures work correctly: each async
   * execution tree carries its own context, no cross-talk.
   */
  private readonly graphqlUrlContext = new AsyncLocalStorage<string>();

  /**
   * Cross-process distributed lock for capture paths. See
   * `schemas/capture-lock.schema.ts` for the rationale — per-instance
   * `this.capturing` / `this.capturingByNetwork` flags can't coordinate
   * across Node processes, so when a manual bootstrap script races with
   * the scheduled cron (or a future HA deployment) we get duplicate work.
   *
   * `acquireCaptureLock` atomically reserves the lock via Mongo's
   * `updateOne` with a filter that only matches when no lock is held
   * or the held lock has expired. Returns true if we got it, false if
   * someone else is holding a live lock.
   *
   * Release via `$set` nulls in a `finally`. TTL is a safety valve —
   * if we crash before release, the next acquirer picks up after the
   * TTL passes.
   */
  private async acquireCaptureLock(
    network: string,
    ttlMs: number,
  ): Promise<{ acquired: boolean; holder?: string; lockedUntil?: Date }> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + ttlMs);
    const hostname = os.hostname();

    // Step 1 — ensure the singleton doc exists. Idempotent: `$setOnInsert`
    // only writes on insert, leaving an existing doc's lock state alone.
    await this.captureLockModel.updateOne(
      { _id: network },
      { $setOnInsert: { lockedUntil: null, lockedAt: null, holderHostname: null } },
      { upsert: true },
    ).exec();

    // Step 2 — atomic acquire. Filter matches only when the lock is
    // available (null or expired). Separate from the upsert because
    // `findOneAndUpdate` with upsert can race-duplicate on an existing
    // `_id`.
    const ack = await this.captureLockModel.updateOne(
      {
        _id: network,
        $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
      },
      { $set: { lockedUntil, lockedAt: now, holderHostname: hostname } },
    ).exec();

    if (ack.modifiedCount === 1) {
      this.acquiredLocks.add(network);
      return { acquired: true, lockedUntil };
    }

    // Lock is held by someone else — fetch the holder for diagnostics.
    const existing = await this.captureLockModel.findById(network).lean().exec();
    return {
      acquired: false,
      holder: existing?.holderHostname ?? 'unknown',
      lockedUntil: existing?.lockedUntil ?? undefined,
    };
  }

  private async releaseCaptureLock(network: string): Promise<void> {
    // Only release a lock that THIS process actually acquired. Otherwise
    // a manual halt lock applied externally (operator setting
    // `lockedUntil: <far-future>` to freeze a network) would be wiped by
    // any unrelated `releaseCaptureLock` call — including the shutdown
    // hook of a forked manual-trigger process. See `acquiredLocks` field.
    if (!this.acquiredLocks.has(network)) return;
    this.acquiredLocks.delete(network);
    await this.captureLockModel
      .updateOne(
        { _id: network },
        { $set: { lockedUntil: null, lockedAt: null, holderHostname: null } },
      )
      .exec();
  }

  // Lock TTLs — generously above the capture's worst-case duration so a
  // crashed lock-holder eventually releases.
  private static readonly MAINNET_LOCK_TTL_MS = 180 * 60 * 1000; // 125m hard timeout + 55m buffer
  private static readonly TESTNET_LOCK_TTL_MS = 150 * 60 * 1000; // 90m budget + 60m buffer

  /**
   * Transient-error retry policy for GraphQL. IOTA testnet's endpoint has a
   * hard 40s server-side timeout per query — individual `packages(first: 50, after)`
   * calls occasionally cross it under load, returning `{ errors: [{ message:
   * 'Query request timed out. Limit: 40s' }] }`. Observed 2026-04-24 02:09
   * during a backfill tick that then lost 69 min of probe work.
   *
   * Policy: retry on messages matching the timeout / connection-reset /
   * 5xx family, up to 3 attempts total with 2s → 4s backoff. Validation /
   * schema errors (non-matching messages) fail immediately so we don't
   * mask real bugs behind silent retries. Mainnet paths rarely trigger
   * this because mainnet's endpoint doesn't exhibit the 40s ceiling.
   */
  private static readonly GRAPHQL_MAX_ATTEMPTS = 3;
  private static readonly GRAPHQL_RETRYABLE_RE = /timed? ?out|timeout|ECONNRESET|ETIMEDOUT|socket hang up|5\d\d/i;

  private async graphql(query: string): Promise<any> {
    const url = this.graphqlUrlContext.getStore() ?? this.graphqlUrl;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= EcosystemService.GRAPHQL_MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const json: any = await res.json();
        if (json.errors?.length) throw new Error(json.errors[0].message);
        return json.data;
      } catch (e) {
        lastError = e as Error;
        const retryable = EcosystemService.GRAPHQL_RETRYABLE_RE.test(lastError.message);
        if (attempt < EcosystemService.GRAPHQL_MAX_ATTEMPTS && retryable) {
          const delayMs = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
          this.logger.warn(
            `GraphQL attempt ${attempt}/${EcosystemService.GRAPHQL_MAX_ATTEMPTS} failed against ${url}: ${lastError.message} — retrying in ${delayMs}ms`,
          );
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw lastError;
      }
    }
    /* istanbul ignore next — unreachable: the for-loop always exits via return (success) or throw (final retryable / non-retryable attempt). Kept as a TS/defense belt-and-braces. */
    throw lastError ?? new Error('graphql: unreachable retry-loop exit');
  }

  /**
   * Per-package entry-function probe. Returns `Map<moduleName, names[]>`
   * listing every module's PUBLIC + isEntry function names.
   *
   * Lives in its own query for a single reason: inlining `modules { functions }`
   * into the `packages(first: 50, ...)` paginator overshoots IOTA GraphQL's
   * 100k estimated-output-nodes cap (50×50×50=125 000) and the endpoint
   * rejects the whole query at parse time. Scoping to one package drops the
   * estimate to 1×50×50=2500 which passes.
   *
   * On GraphQL error returns an empty map — classification treats missing
   * per-module entries identically to "no public entry fns" (no hint).
   */
  private async fetchEntryFunctions(pkgAddress: string): Promise<Map<string, string[]>> {
    const byModule = new Map<string, string[]>();
    let data: any;
    try {
      data = await this.graphql(`{
        object(address: "${pkgAddress}") {
          asMovePackage {
            modules(first: 50) {
              nodes {
                name
                functions(first: 50) {
                  nodes { name visibility isEntry }
                }
              }
            }
          }
        }
      }`);
    } catch (e) {
      this.logger.warn(`fetchEntryFunctions: ${pkgAddress} — ${(e as Error).message}`);
      return byModule;
    }
    const mods = data?.object?.asMovePackage?.modules?.nodes ?? [];
    for (const mod of mods) {
      const names: string[] = [];
      for (const f of mod?.functions?.nodes ?? []) {
        if (f?.visibility === 'PUBLIC' && f?.isEntry) names.push(f.name);
      }
      byModule.set(mod.name, names);
    }
    return byModule;
  }

  /**
   * Collect all `0x2::display::Display<T>` objects on-chain, group their
   * concrete (non-templated) metadata fields by the inner package address,
   * return a `Map<pkgAddr, Array<{key, value}>>`. Display objects carry
   * the canonical project-declared metadata for a Move type (name,
   * description, image_url, project_url, link, creator) — complementary
   * to `probeIdentityFields` because:
   *
   *   - probeIdentityFields queries `objects(type: "<pkgAddr>")` and so
   *     cannot match `Display<T>` (its type starts with `0x2`, not pkgAddr).
   *   - logic-only packages with no owned objects register Display here
   *     anyway if the project set up Display for readability.
   *
   * Templated values (`{name}`, `{description}`) are filtered out because
   * they're the Display schema definition, not identifying content. A
   * concrete `https://iota.org` or `"Genesis NFT"` is kept; `{image_url}`
   * is dropped. Called once per capture; single paginated query, bounded
   * at 200 pages × 50 = 10 000 Display objects (mainnet today has ~2-3k
   * Display objects). Logs and returns empty on GraphQL error.
   */
  private async collectDisplayMetadata(): Promise<Map<string, Array<{ key: string; value: string }>>> {
    const DISPLAY_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::display::Display';
    const MAX_PAGES = 200;
    const TEMPLATE_ONLY = /^\{[^}]+\}$/; // entire value is one placeholder, e.g. `{name}`
    const innerTypeRe = /<([^>]+)>/; // extract `<...>` from the outer Display<T> repr
    const byPackage = new Map<string, Array<{ key: string; value: string }>>();
    let cursor: string | null = null;
    for (let i = 0; i < MAX_PAGES; i++) {
      const after = cursor ? `, after: "${cursor}"` : '';
      let data: any;
      try {
        data = await this.graphql(`{
          objects(filter: { type: "${DISPLAY_TYPE}" }, first: 50${after}) {
            nodes { asMoveObject { contents { type { repr } json } } }
            pageInfo { hasNextPage endCursor }
          }
        }`);
      } catch {
        break;
      }
      // Explicit guard over an optional-chain `??` here because ts-jest
      // instruments the compiled form of `a?.b ?? []` in a way istanbul
      // can't mark the default branch covered, bogusly dragging the
      // baseline down. Plain `if (!…)` sidesteps that.
      const objectsField = data.objects;
      if (!objectsField) break;
      const nodes = objectsField.nodes;
      if (!Array.isArray(nodes) || nodes.length === 0) break;
      for (const n of nodes) {
        const repr: string | undefined = n.asMoveObject?.contents?.type?.repr;
        const json = n.asMoveObject?.contents?.json;
        if (!repr || !json) continue;
        const match = innerTypeRe.exec(repr);
        if (!match) continue;
        // `match[1]` is a non-empty capture from `<([^>]+)>` — splitting and
        // taking index 0 always yields a non-empty string, no need to guard.
        const innerPkg = match[1].split('::')[0].toLowerCase();
        const contents = json?.fields?.contents;
        if (!Array.isArray(contents)) continue;
        const keep: Array<{ key: string; value: string }> = [];
        for (const entry of contents) {
          const key = entry?.key;
          const value = entry?.value;
          if (typeof key !== 'string' || typeof value !== 'string') continue;
          const trimmed = value.trim();
          if (!trimmed || TEMPLATE_ONLY.test(trimmed)) continue;
          keep.push({ key, value: trimmed });
        }
        if (keep.length === 0) continue;
        const bucket = byPackage.get(innerPkg);
        if (bucket) bucket.push(...keep);
        else byPackage.set(innerPkg, keep);
      }
      const pageInfo = objectsField.pageInfo;
      if (!pageInfo || !pageInfo.hasNextPage) break;
      const nextCursor = pageInfo.endCursor;
      if (!nextCursor) break;
      cursor = nextCursor;
    }
    return byPackage;
  }

  /**
   * Lightweight sample of distinct event-struct type names emitted by a
   * module. Reads up to 3 pages × 50 = 150 events and extracts the
   * trailing segment of each `type.repr` (so `<pkg>::<mod>::Swapped`
   * becomes `Swapped`). Used to enrich the Insights column with
   * "Emits Swapped, PoolCreated events"-style hints.
   *
   * Kept separate from `countEvents` because `countEvents` walks up to
   * 50k pages for totals; we only need a handful of pages to learn the
   * distinct-type vocabulary. The added call is ~1 round-trip per module;
   * at ~750 packages × ~3 modules avg it's low-cost against the cron's
   * overall budget. Short-circuits on GraphQL error (returns []).
   */
  private async sampleEventTypes(emittingModule: string, maxPages = 3): Promise<string[]> {
    const found = new Set<string>();
    let cursor: string | null = null;
    for (let i = 0; i < maxPages; i++) {
      const afterClause: string = cursor ? `, after: "${cursor}"` : '';
      let data: any;
      try {
        data = await this.graphql(`{
          events(filter: { emittingModule: "${emittingModule}" }, first: 50${afterClause}) {
            nodes { type { repr } }
            pageInfo { hasNextPage endCursor }
          }
        }`);
      } catch {
        break;
      }
      for (const n of data.events?.nodes ?? []) {
        const repr = n.type?.repr as string | undefined;
        if (!repr) continue;
        const short = repr.split('::').pop();
        if (short) found.add(short);
      }
      if (!data.events?.pageInfo?.hasNextPage) break;
      cursor = data.events?.pageInfo?.endCursor ?? null;
      if (!cursor) break;
    }
    return Array.from(found);
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
   * Stateless live-object count for a fully-qualified Move struct type.
   * Page-forward `objects(filter: { type })` from null cursor every call,
   * sum `nodes.length`. No persistent cursor state by design — live object
   * populations can shrink (burns, type-filter-leaving wraps), so a forward
   * cursor would over-count by missing removals. Mirrors `countEvents`'s
   * shape exactly.
   *
   * `maxPages` defaults to 200 (= 10k objects) — covers the long tail in one
   * scan. NFT-class outliers (Otterfly tiers, IotaPunks) hit the cap and
   * report `capped: true`; UI renders as `<n>+`. Bumping the cap is a
   * config call, not a code change to the helper itself.
   */
  private async countObjectsForType(
    type: string,
    maxPages = 200,
  ): Promise<{ count: number; capped: boolean }> {
    let total = 0;
    let cursor: string | null = null;

    for (let i = 0; i < maxPages; i++) {
      const afterClause: string = cursor ? `, after: "${cursor}"` : '';
      try {
        const data: any = await this.graphql(`{
          objects(filter: { type: "${type}" }, first: 50${afterClause}) {
            nodes { __typename }
            pageInfo { hasNextPage endCursor }
          }
        }`);
        total += data.objects.nodes.length;
        if (!data.objects.pageInfo.hasNextPage) return { count: total, capped: false };
        cursor = data.objects.pageInfo.endCursor;
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
    const snapshot = await this.ecoModel.findOne(this.networkFilter()).sort({ createdAt: -1 }).lean().exec();
    if (!snapshot) {
      throw new Error('No ecosystem snapshot exists yet — run a scan first.');
    }

    // Backfill runs over every raw package × module recorded in the snapshot.
    // Classification doesn't matter for sender drain — `ProjectSenders` is
    // keyed by `(packageAddress, module)`, which is stable regardless of
    // which ProjectDefinition the package ultimately maps to at read time.
    const snapPackages = await this.getPackages(snapshot);
    const packages = snapPackages.filter((p) => p.modules.length > 0);
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
            nodes { digest sender { address } }
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
        .map((n: any) => ({
          packageAddress,
          digest: n.digest,
          sender: typeof n.sender?.address === 'string' ? n.sender.address.toLowerCase() : null,
        }));

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
    const snapshot = await this.ecoModel.findOne(this.networkFilter()).sort({ createdAt: -1 }).lean().exec();
    if (!snapshot) {
      throw new Error('No ecosystem snapshot exists yet — run a scan first.');
    }

    const snapPackages = await this.getPackages(snapshot);
    const addresses = snapPackages.map((p) => p.address);
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
    const snapshot = await this.ecoModel.findOne(this.networkFilter()).sort({ createdAt: -1 }).lean().exec();
    if (!snapshot) {
      throw new Error('No ecosystem snapshot exists yet — run a scan first.');
    }

    const snapPackages = await this.getPackages(snapshot);
    const pairs: Array<{ packageAddress: string; type: string }> = [];
    for (const p of snapPackages) {
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
          // Two passes per type. Holder walk maintains the dedup'd
          // `project_holder_entries` collection (cheap on steady state — exits
          // on caught-up). Object walk is a stateless live count that re-pages
          // every scan because object populations can shrink (burns/wraps that
          // a forward cursor would miss). Run in parallel: independent GraphQL
          // shapes hitting the same `objects(filter:{type})` connection.
          const [holders, objects] = await Promise.all([
            this.updateHoldersForType(packageAddress, type),
            this.countObjectsForType(type),
          ]);
          results.push({
            type,
            objectHolderCount: holders.count,
            listedCount: holders.listedCount,
            objectHolderCountCapped: holders.capped,
            objectCount: objects.count,
            objectCountCapped: objects.capped,
          });
        } catch (e) {
          this.logger.warn(`captureObjectTypes: ${type} drain failed — ${(e as Error).message}`);
          results.push({
            type,
            objectHolderCount: 0,
            listedCount: 0,
            objectHolderCountCapped: false,
            objectCount: 0,
            objectCountCapped: false,
          });
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
   *
   * `network`-scoped: only defs tagged with the scan's network are considered
   * (default `'mainnet'` when absent for back-compat). Deployer-based
   * matching (`deployerAddresses`) is also skipped on non-mainnet scans —
   * keypairs don't carry across networks, so the registry can't route by
   * address off mainnet. Module/address/fingerprint matching still runs.
   */
  private matchProject(
    mods: Set<string>,
    address: string,
    deployer: string | null,
    network: 'mainnet' | 'testnet' | 'devnet',
    structNames: Set<string> | null = null,
  ): ProjectDefinition | null {
    const lowerAddr = address.toLowerCase();
    const lowerDeployer = deployer?.toLowerCase() ?? null;
    for (const def of ALL_PROJECTS) {
      if ((def.network ?? 'mainnet') !== network) continue;
      if (!hasSyncMatch(def)) continue;
      const { match } = def;

      if (match.packageAddresses?.length) {
        if (!match.packageAddresses.some((a) => a.toLowerCase() === lowerAddr)) continue;
      }
      if (match.deployerAddresses?.length) {
        // Skip deployer-based matching off mainnet — keypairs don't carry
        // across networks. Packages on testnet/devnet can still be claimed
        // via packageAddresses / module matchers / fingerprints.
        if (network !== 'mainnet') continue;
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
      if (match.objectTypes?.length) {
        // structNames carries the trailing `<StructName>` of every entry on the
        // package's `objectTypeCounts`. Caller passes `null` only when the
        // package's type list is unknown (legacy paths) — treat as a non-match
        // for any rule that requires structural shape, rather than silently
        // ignoring the criterion.
        if (!structNames) continue;
        if (!match.objectTypes.every((t) => structNames.has(t))) continue;
      }
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
  /**
   * Classify a module's entry-function set into coarse domain hints. Matches
   * on prefix / substring patterns; a package's hint is the first category
   * whose signature functions all show up in the combined entry-fn list.
   * Returns null when no hint applies (unknown shape / too sparse).
   *
   * Patterns come from common Move DeFi/NFT idioms — `swap` + `add_liquidity`
   * is nearly pathognomonic for DEXes; `mint` + `burn` for NFTs, etc.
   * Deliberately conservative — false "could be a DEX" is worse than silence.
   */
  private inferDomainFromEntryFunctions(entryFns: string[]): string | null {
    if (entryFns.length === 0) return null;
    const set = new Set(entryFns.map((n) => n.toLowerCase()));
    const has = (pat: string) => {
      for (const n of set) if (n === pat || n.includes(pat)) return true;
      return false;
    };
    // DEX — swap + liquidity pair. Covers Uniswap-style, Balancer-style.
    if (has('swap') && (has('add_liquidity') || has('remove_liquidity'))) return 'DEX-shaped (swap + liquidity entry fns)';
    // Lending / CDP — borrow/repay or liquidate.
    if ((has('borrow') && has('repay')) || has('liquidate')) return 'Lending-shaped (borrow/repay/liquidate)';
    // Staking — stake + unstake.
    if (has('stake') && (has('unstake') || has('withdraw'))) return 'Staking-shaped (stake/unstake)';
    // NFT mint/burn. The `mint` check is scoped to avoid matching `mint_admin_cap`.
    if (has('mint') && has('burn')) return 'NFT-shaped (mint + burn entry fns)';
    // Bridge / cross-chain.
    if (has('lock') && (has('unlock') || has('redeem'))) return 'Bridge-shaped (lock/unlock)';
    // Identity / credentials.
    if (has('issue') && (has('revoke') || has('verify'))) return 'Credential-shaped (issue/verify)';
    return null;
  }

  private buildClusterInsights(ctx: {
    packageCount: number;
    uniqueSenders: number;
    transactions: number;
    events: number;
    deployerAttributedProjects: { name: string; slug: string }[];
    deployerIsSender: boolean;
    deployerIsUnknown: boolean;
    /** Latest publish date across the cluster's packages — used to age the row. */
    latestPublishedAt: Date | null;
    /** Cross-cluster pairing: an attributed project published within ±10 min of this cluster's latest package. Empty when no pairing was found. */
    publishNeighbors: { name: string; slug: string; minutesDelta: number }[];
    /** Union of public entry-function names across the cluster's modules — fed to `inferDomainFromEntryFunctions`. */
    entryFunctions: string[];
    /** Union of distinct event-struct type names sampled from the cluster's modules — feeds both the domain matcher and an "Emits X, Y events" fallback insight. */
    eventTypes: string[];
    /** Top sender by TX count across the cluster's packages, with total sampled volume. `null` when no digests carry sender metadata (legacy / very new package). */
    topSender: { address: string; count: number; totalCount: number } | null;
    /** Now, injected so the age calc is deterministic in tests. */
    now: Date;
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

    // Cross-cluster pairing: an attributed project published within a few
    // minutes of the cluster's latest package is a strong "coordinated
    // multi-deployer launch" hint. Positive minutesDelta = cluster came
    // AFTER the attributed project; negative = before.
    if (ctx.publishNeighbors.length > 0) {
      const n = ctx.publishNeighbors[0];
      const whenWord = n.minutesDelta >= 0 ? 'after' : 'before';
      const mins = Math.abs(Math.round(n.minutesDelta));
      out.push(`Published ${mins} min ${whenWord} ${n.name}`);
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

    // Age tag — only emit for "brand new" packages (<=7 days). Older
    // clusters would spam this insight without adding signal; the cluster
    // row's sort/filter covers general age elsewhere.
    if (ctx.latestPublishedAt) {
      const ageMs = ctx.now.getTime() - ctx.latestPublishedAt.getTime();
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      if (ageDays < 1) {
        out.push('Deployed in the last 24 h');
      } else if (ageDays <= 7) {
        out.push(`Deployed ${ageDays} day(s) ago`);
      }
    }

    if (ctx.packageCount >= 5) {
      out.push(`${ctx.packageCount}-package footprint — likely a multi-contract protocol`);
    }

    // Top-sender concentration — surfaces "one wallet drove N% of TX"
    // insights that the presence-only deployerIsSender check can't. Only
    // emitted when we have a meaningful volume (≥10 TXs with recorded
    // sender) and the top wallet is ≥20% of that — otherwise the
    // concentration is too weak to be an insight vs noise.
    if (ctx.topSender && ctx.topSender.totalCount >= 10) {
      const pct = Math.round((ctx.topSender.count / ctx.topSender.totalCount) * 100);
      if (pct >= 20) {
        const addr = ctx.topSender.address;
        const short = addr.length > 14 ? `${addr.slice(0, 8)}…${addr.slice(-4)}` : addr;
        out.push(`Top sender ${short} drove ${pct}% of sampled TX`);
      }
    }

    const domain =
      this.inferDomainFromEntryFunctions(ctx.entryFunctions) ??
      this.inferDomainFromEventTypes(ctx.eventTypes);
    if (domain) {
      out.push(domain);
    } else if (ctx.eventTypes.length > 0) {
      // Fallback — no matched domain pattern, but the cluster still emits
      // events. Surface the top few names verbatim so a human can
      // recognize project-specific tokens (`Swapped` immediately reads
      // DEX even when the full pattern didn't match).
      const sampled = ctx.eventTypes.slice(0, 4).join(', ');
      out.push(`Emits ${sampled} event(s)`);
    }

    return out;
  }

  /**
   * Second-pass domain matcher keyed on event-struct type names instead of
   * entry-function names. Event names self-attest domain even more
   * reliably than entry fns — a project may have idiosyncratic public
   * fn naming but still emit the canonical `Swapped`/`Minted`/`Staked`.
   * Returns the same set of human-readable category strings as
   * `inferDomainFromEntryFunctions` so the Insights column stays uniform.
   */
  private inferDomainFromEventTypes(eventTypes: string[]): string | null {
    if (eventTypes.length === 0) return null;
    const set = new Set(eventTypes.map((n) => n.toLowerCase()));
    const hasAny = (...pats: string[]) => pats.some((p) => set.has(p));
    if (hasAny('swapped', 'swap', 'swapevent') && hasAny('liquidityadded', 'liquidityremoved', 'poolcreated')) {
      return 'DEX-shaped (swap + pool/liquidity events)';
    }
    if (hasAny('borrowevent', 'borrow', 'borrowed', 'liquidationevent', 'liquidated')) {
      return 'Lending-shaped (borrow/liquidation events)';
    }
    if (hasAny('staked', 'stakeevent') && hasAny('unstaked', 'unstakeevent', 'withdrawn')) {
      return 'Staking-shaped (stake/unstake events)';
    }
    if (hasAny('minted', 'mintevent', 'nftminted') && hasAny('burned', 'burnevent', 'nftburned')) {
      return 'NFT-shaped (mint/burn events)';
    }
    if (hasAny('locked', 'lockevent', 'tokenlocked') && hasAny('unlocked', 'unlockevent', 'redeemed')) {
      return 'Bridge-shaped (lock/unlock events)';
    }
    if (hasAny('issued', 'issueevent', 'credentialissued') && hasAny('revoked', 'verified', 'verifyevent')) {
      return 'Credential-shaped (issue/verify events)';
    }
    return null;
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

  private async matchByFingerprint(
    mods: Set<string>,
    address: string,
    network: 'mainnet' | 'testnet' | 'devnet',
  ): Promise<ProjectDefinition | null> {
    for (const def of ALL_PROJECTS) {
      if ((def.network ?? 'mainnet') !== network) continue;
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
  /**
   * Default checkpoint cadence for mainnet resumable captures. 50 packages
   * × ~3 sec/package ≈ ~2.5 min worst-case loss window if the container is
   * killed mid-walk. Smaller cadence → more Mongo writes, less loss; we
   * picked the per-page granularity as the sweet spot.
   */
  private static readonly MAINNET_CHECKPOINT_EVERY_N = 50;

  /**
   * Per-capture budget for the mainnet atomic sweep. Well under the 2h
   * cron interval so a runaway walk never collides with the next cron
   * fire. In normal operation mainnet finishes in ~40 min, leaving ~50
   * min of spare budget that `runGapClosing` consumes to re-probe stale
   * pkgs. If Starfish-era load tests or similar stress push the sweep
   * past this budget, the gap-WARN fires and we see the degradation.
   */
  private static readonly MAINNET_TICK_BUDGET_MS = 90 * 60 * 1000;

  private async captureRaw(): Promise<{
    packages: PackageFact[];
    totalStorageRebateNanos: number;
    networkTxTotal: number;
    txRates: Record<string, number>;
    /**
     * If the partial-save path created (or resumed) a partial snapshot doc,
     * its `_id`. `finalizeMainnetSnapshot` promotes that doc in place rather
     * than creating a fresh one — and more importantly, the packages already
     * live in `packagefacts` under this `_id`, so no re-insert is needed.
     * `null` when capture finished inside the first checkpoint window.
     */
    partialId: Types.ObjectId | null;
  }> {
    // Display metadata pre-pass: one paginated fetch of every
    // `0x2::display::Display<T>` object on chain, grouped by the inner-type
    // package address. Each package's per-object fingerprint probe below
    // can then fold in any concrete display fields (name/description/
    // image_url/project_url) that would otherwise be invisible — the
    // object-prefix filter used in `probeIdentityFields` misses Display
    // because its outer type lives under `0x2`, not the package address.
    const displayByPackage = await this.collectDisplayMetadata();

    // Framework filter (see doc-comment above) — any `0x000…0***` package
    // not explicitly claimed by a `ProjectDefinition` is skipped silently.
    const claimedAddresses = new Set<string>();
    for (const def of ALL_PROJECTS) {
      for (const addr of def.match.packageAddresses ?? []) {
        claimedAddresses.add(addr.toLowerCase());
      }
    }

    // Resume detection — find an abandoned partial from a prior crash.
    // Multiple partial docs shouldn't happen (capture is locked), but defend
    // anyway: keep the newest, delete the rest.
    const captureStart = new Date();
    const resume = await this.detectMainnetResume();
    const { resumeCursor, carriedForward } = resume;
    // Mutable across closures — each checkpoint either creates the partial
    // header doc (first hit) or updates the existing one. Scoped to this
    // captureRaw invocation; not shared with concurrent runs because the
    // capture lock serializes them.
    let partialId: Types.ObjectId | null = resume.partialId;

    // Checkpoint callback — on first hit with no partial yet, create the
    // partial header doc (packages-free, just cursor + lifecycle marker)
    // and insert the fresh batch into the `packagefacts` sub-collection
    // against that header's `_id`. Subsequent hits update the cursor and
    // append to the sub-collection. Splits packages out of the snapshot
    // doc so it never approaches the 16 MiB BSON ceiling.
    const onCheckpoint = async (batch: PackageFact[], cursorAt: string | null): Promise<void> => {
      if (!partialId) {
        const created = await this.safeCreate({
          network: 'mainnet',
          captureStage: 'partial',
          captureProgressCursor: cursorAt,
          createdAt: captureStart,
        });
        partialId = created._id as Types.ObjectId;
      } else {
        await this.ecoModel
          .updateOne(
            { _id: partialId },
            { $set: { captureProgressCursor: cursorAt, updatedAt: new Date() } },
          )
          .exec();
      }
      await this.insertPackageFacts(partialId, 'mainnet', batch);
    };

    const deadlineMs = captureStart.getTime() + EcosystemService.MAINNET_TICK_BUDGET_MS;
    const {
      probed: freshlyProbed,
      failedPackages,
      deadlineHit,
      wrapped,
    } = await this.probePaginator({
      startCursor: resumeCursor,
      displayByPackage,
      now: new Date(),
      network: 'mainnet',
      deadlineMs,
      claimedAddresses,
      onCheckpoint,
      checkpointEveryN: EcosystemService.MAINNET_CHECKPOINT_EVERY_N,
    });

    // Gap WARN: mainnet's atomic sweep exhausted the budget without
    // wrapping. Means the walk didn't reach every package — unusual
    // but possible under sustained load (Starfish stress, etc.).
    if (deadlineHit && !wrapped) {
      await this.logCaptureGap(
        'mainnet',
        {
          probedThisCapture: freshlyProbed.length,
          carriedForwardFromPartial: carriedForward.length,
          budgetMs: EcosystemService.MAINNET_TICK_BUDGET_MS,
        },
        `mainnet captureRaw exhausted ${EcosystemService.MAINNET_TICK_BUDGET_MS / 60000}min budget after ${freshlyProbed.length} freshly-probed pkgs without completing the sweep`,
      );
    }

    // Gap-closing: when the primary walk completes (wrapped=true) with
    // budget remaining, re-probe the stalest addresses. Uniform with
    // testnet per Decision 4. Mainnet's atomic sweep normally covers
    // every package within 40 min, so the staleness aggregate returns
    // empty on every normal tick — this is a safety net for the 1% of
    // cases where capacity is strained (load tests, degraded GraphQL,
    // etc.).
    let gapClosed: PackageFact[] = [];
    if (wrapped && Date.now() < deadlineMs) {
      const gc = await this.runGapClosing('mainnet', new Date(), deadlineMs, displayByPackage);
      gapClosed = gc.probed;
      if (gapClosed.length > 0) {
        this.logger.log(
          `Mainnet gap-closing probed ${gapClosed.length} stale pkgs (deadlineHit=${gc.deadlineHit} exhaustedCandidates=${gc.exhaustedCandidates})`,
        );
        // Persist gap-closed pkgs to the sub-collection. If a partial
        // was established, reuse its _id; otherwise create a placeholder
        // partial so the facts have an anchor until `finalizeMainnetSnapshot`
        // promotes it. This keeps the invariant "every packagefacts doc
        // has a real snapshotId" intact across the gap-closing path.
        if (!partialId) {
          const placeholder = await this.safeCreate({
            network: 'mainnet',
            captureStage: 'partial',
            captureProgressCursor: null,
            createdAt: captureStart,
          });
          partialId = placeholder._id as Types.ObjectId;
        }
        await this.insertPackageFacts(partialId, 'mainnet', gapClosed);
      }
    }

    // Final package list = previously-persisted carry-forward + this run's
    // freshly-probed + gap-closed re-probes. No dedup key needed between
    // carriedForward and freshlyProbed (new-run addresses are strictly
    // after the resume cursor); gap-closed may overlap carriedForward on
    // address, but those are intentionally re-probed with fresher data.
    const gapAddrs = new Set(gapClosed.map((p) => p.address.toLowerCase()));
    const packages: PackageFact[] = [
      ...carriedForward.filter((p) => !gapAddrs.has(p.address.toLowerCase())),
      ...freshlyProbed,
      ...gapClosed,
    ];

    // Sum storage rebate only from successfully-probed packages. Partial
    // inclusion of a failed package would make the total inconsistent
    // with the packages[] list.
    const totalStorageRebateNanos = packages.reduce((s, p) => s + Number(p.storageRebateNanos || 0), 0);

    if (failedPackages.length > 0) {
      this.logger.warn(
        `captureRaw: ${failedPackages.length} package(s) failed their probe and were skipped: ${failedPackages.map((f) => f.address).join(', ')}`,
      );
    }

    const checkpointData: any = await this.graphql(`{ checkpoint { networkTotalTransactions } }`);
    const networkTxTotal = Number(checkpointData.checkpoint.networkTotalTransactions);
    const daysLive = 332;
    const secondsLive = daysLive * 86400;

    this.logger.log(
      `captureRaw: ${packages.length} packages (${carriedForward.length} carried forward from partial, ${freshlyProbed.length} freshly probed), ` +
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
      partialId,
    };
  }

  /**
   * End-of-capture write: promote the in-flight partial doc (if any) to
   * `complete` with all terminal fields set, or fall back to a fresh
   * `create` when no partial was ever established (capture finished inside
   * one checkpoint window). Returns the persisted document so the caller
   * can hand it to `classifyFromRaw`.
   */
  private async finalizeMainnetSnapshot(
    raw: {
      packages: PackageFact[];
      totalStorageRebateNanos: number;
      networkTxTotal: number;
      txRates: Record<string, number>;
      partialId: Types.ObjectId | null;
    },
    durationMs: number,
  ): Promise<OnchainSnapshot & { _id: unknown }> {
    // `packages` is now tracked via the `packagefacts` sub-collection, not
    // embedded in the snapshot header. The header doc carries aggregates +
    // lifecycle fields only. This is what keeps us clear of the 16 MiB
    // BSON ceiling even as the ecosystem grows.
    const finalFields = {
      captureStage: 'complete' as const,
      captureProgressCursor: null,
      totalStorageRebateNanos: raw.totalStorageRebateNanos,
      networkTxTotal: raw.networkTxTotal,
      txRates: raw.txRates,
      captureDurationMs: durationMs,
    };

    if (raw.partialId) {
      // Promote the existing partial — its packagefacts are already in
      // place under `partialId` because every checkpoint wrote to the
      // sub-collection keyed by this id. No re-insert needed.
      const promoted = await this.ecoModel
        .findOneAndUpdate({ _id: raw.partialId }, { $set: finalFields }, { new: true })
        .exec();
      if (promoted) return promoted as OnchainSnapshot & { _id: unknown };
      // Defensive: partial doc vanished between checkpoint and finalize.
      // Fall through to the fresh-create path so we don't lose the capture.
      this.logger.warn(
        `finalizeMainnetSnapshot: partial ${String(raw.partialId)} vanished before promote; creating fresh terminal doc`,
      );
    }

    // No partial was ever created — capture finished inside the first
    // checkpoint window (fewer than `MAINNET_CHECKPOINT_EVERY_N` packages).
    // Pre-generate `_id` so packagefacts go in first; if the header create
    // then fails, a stale-id cleanup sweep can remove orphans, but no
    // partial header ever becomes visible without its package data.
    const newId = new Types.ObjectId();
    await this.insertPackageFacts(newId, this.network, raw.packages);
    return this.safeCreate({
      _id: newId,
      network: this.network,
      captureStage: 'complete',
      totalStorageRebateNanos: raw.totalStorageRebateNanos,
      networkTxTotal: raw.networkTxTotal,
      txRates: raw.txRates,
      captureDurationMs: durationMs,
    });
  }

  /**
   * Resume-point discovery for a mainnet capture. Looks for an existing
   * `captureStage: 'partial'` doc and decides whether to pick up where the
   * previous (crashed) run left off, or clear the slate and start fresh.
   *
   *   - No partial doc → fresh scan.
   *   - Single partial with non-null cursor → resume: seed the paginator
   *     from that cursor and carry its `packages[]` forward into the final
   *     snapshot.
   *   - Single partial with null cursor → "broken state" from a crash
   *     during promote (cursor had already been cleared when the partial
   *     was about to flip to complete). Can't resume usefully; delete and
   *     start fresh.
   *   - Multiple partials (shouldn't happen under the capture lock) → take
   *     the newest, log a warn, delete the older ones.
   */
  private async detectMainnetResume(): Promise<{
    resumeCursor: string | null;
    carriedForward: PackageFact[];
    partialId: Types.ObjectId | null;
  }> {
    const partials = await this.ecoModel
      .find({ network: 'mainnet', captureStage: 'partial' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (partials.length === 0) {
      return { resumeCursor: null, carriedForward: [], partialId: null };
    }

    const [newest, ...older] = partials;
    if (older.length > 0) {
      this.logger.warn(
        `captureRaw: found ${partials.length} partial mainnet snapshots (expected at most 1 under the capture lock); keeping newest ${String(newest._id)} and deleting ${older.length} older`,
      );
      const olderIds = older.map((o) => o._id);
      await this.ecoModel
        .deleteMany({ _id: { $in: olderIds } })
        .exec();
      // Also cascade-delete their orphaned packagefacts; leaving them behind
      // would count against a future snapshot if `_id` ever collided.
      await this.pkgFactModel
        .deleteMany({ snapshotId: { $in: olderIds } })
        .exec();
    }

    const cursor = (newest as { captureProgressCursor?: string | null }).captureProgressCursor ?? null;
    if (cursor === null) {
      this.logger.warn(
        `captureRaw: found partial mainnet snapshot ${String(newest._id)} with null captureProgressCursor — treating as broken-from-promote and deleting; starting fresh`,
      );
      await this.ecoModel.deleteOne({ _id: newest._id }).exec();
      await this.deletePackageFactsFor(newest._id as Types.ObjectId);
      return { resumeCursor: null, carriedForward: [], partialId: null };
    }

    // Carry-forward reads via getPackages() — pulls from packagefacts sub-
    // collection if the partial's checkpoints have already written there,
    // falls through to legacy embedded packages[] for docs predating the
    // split. Either way the same shape comes back.
    const carried: PackageFact[] = await this.getPackages(newest);
    this.logger.log(
      `captureRaw: resuming mainnet capture from partial ${String(newest._id)} — ${carried.length} packages carried forward, cursor=${cursor}`,
    );
    return {
      resumeCursor: cursor,
      carriedForward: carried,
      partialId: newest._id as Types.ObjectId,
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
   *
   * `raw.network` threads through as the scan network. Only project defs
   * with `def.network === raw.network` are considered; deployer-based
   * matching and team-deployer routing skip on non-mainnet scans. Emits a
   * WARN when a non-mainnet scan classifies zero packages — usually a
   * registry gap worth investigating.
   */
  private async classifyFromRaw(raw: {
    _id?: unknown;
    packages?: PackageFact[];
    totalStorageRebateNanos?: number;
    networkTxTotal: number;
    txRates: Record<string, number>;
    createdAt?: Date;
    network?: string;
  }) {
    const scanNetwork: 'mainnet' | 'testnet' | 'devnet' =
      raw.network === 'testnet' || raw.network === 'devnet' ? raw.network : 'mainnet';
    // Resolve packages via the sub-collection-aware helper. In-memory raw
    // objects (from `captureRaw`) carry `packages` inline and short-circuit
    // the sub-collection fetch. Persisted snapshots post-split carry no
    // embedded `packages` and go to the sub-collection; legacy embedded-
    // packages snapshots short-circuit back to the inline array.
    const rawPackages = await this.getPackages(raw);
    const projectMap = new Map<string, { def: ProjectDefinition; facts: PackageFact[]; splitDeployer?: string }>();
    // Unmatched packages grouped by deployer. `unknown` collects packages
    // whose deployer resolves to null (framework / legacy publish records).
    const unattributedByDeployer = new Map<string, PackageFact[]>();
    for (const pkg of rawPackages) {
      const mods = new Set(pkg.modules);
      const pkgDeployer = pkg.deployer;
      // Trailing `<StructName>` segment of every entry on the package's
      // type list. Test fixtures sometimes omit `objectTypeCounts`, so the
      // `?? []` guard is real (production schema defaults to []; in-memory
      // mocks bypass the schema). `.split('::').pop()!` is non-null by
      // construction — String.split always returns a non-empty array.
      const structNames = new Set(
        (pkg.objectTypeCounts ?? []).map((t) => t.type.split('::').pop()!),
      );
      let def = this.matchProject(mods, pkg.address, pkgDeployer, scanNetwork, structNames);
      // When the synchronous match is an aggregate bucket, consult fingerprint
      // first — a more-specific project may claim this package by `issuer`/`tag`.
      if (def?.splitByDeployer) {
        const fp = await this.matchByFingerprint(mods, pkg.address, scanNetwork);
        if (fp && fp.name !== def.name) def = fp;
      }
      if (!def) def = await this.matchByFingerprint(mods, pkg.address, scanNetwork);
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
        // split by deployer. Skipped on non-mainnet scans — keypairs don't
        // carry across networks, so a testnet aggregate bucket has no
        // team-deployer routing to apply.
        const candidateTeams =
          scanNetwork === 'mainnet'
            ? ALL_TEAMS.filter((t) =>
                t.deployers.some(
                  (d) => d.network === 'mainnet' && d.address.toLowerCase() === deployer,
                ),
              )
            : [];
        let routed = false;
        for (const team of candidateTeams) {
          const routingOnly = ALL_PROJECTS.find(
            (p) => p.teamId === team.id && isRoutingOnly(p) && (p.network ?? 'mainnet') === scanNetwork,
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
    for (const [, { def, facts: unsortedFacts, splitDeployer }] of projectMap) {
      // Sort by `publishedAt` ascending so `facts[0]` is the original
      // deployment and `facts[last]` is the newest upgrade — regardless
      // of iteration order from the paginator. Post-2026-04-25 the
      // paginator walks newest-first, so the pre-sort order would put
      // the newest pkg at index 0, inverting the first/latest semantic.
      // `publishedAt: null` (framework pkgs) sort first — stable enough
      // for those since they don't get upgraded.
      const facts = [...unsortedFacts].sort((a, b) => {
        const aT = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bT = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        if (aT !== bT) return aT - bT;
        // Stable fallback when publishedAt is null/equal (framework pkgs,
        // test fixtures): sort by address so iteration order is
        // deterministic regardless of the paginator direction.
        return a.address.localeCompare(b.address);
      });
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
      let objectHolderCount: number | null = null;
      let objectCount: number | null = null;
      let objectCountCapped = false;
      let marketplaceListedCount: number | null = null;
      let uniqueHolders: number | null = null;
      const typePairs: Array<{ packageAddress: string; type: string }> = [];
      if (countTypes.length > 0) {
        objectHolderCount = 0;
        objectCount = 0;
        marketplaceListedCount = 0;
        for (const pkg of facts) {
          for (const entry of (pkg.objectTypeCounts ?? [])) {
            if (countTypes.some((ct) => entry.type.endsWith(`::${ct}`))) {
              objectHolderCount += entry.objectHolderCount;
              objectCount += entry.objectCount ?? 0;
              if (entry.objectCountCapped) objectCountCapped = true;
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
      const knownDeployers = new Set(
        (team?.deployers ?? [])
          .filter((d) => d.network === scanNetwork)
          .map((d) => d.address.toLowerCase()),
      );
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

      // Latest publish timestamp across matched packages — used both as a
      // row-level field (dashboard / details) and as input to the unattributed
      // cluster's "published within N min of X" pairing.
      let latestPublishedMs: number | null = null;
      for (const p of facts) {
        if (!p.publishedAt) continue;
        const t = new Date(p.publishedAt).getTime();
        if (latestPublishedMs === null || t > latestPublishedMs) latestPublishedMs = t;
      }
      const projectPublishedAt = latestPublishedMs !== null ? new Date(latestPublishedMs).toISOString() : null;

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
        objectHolderCount,
        objectCount,
        objectCountCapped,
        marketplaceListedCount,
        uniqueWalletsReach,
        attribution: def.attribution ?? null,
        addedAt: def.addedAt ?? null,
        publishedAt: projectPublishedAt,
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

    // Publish-neighbor index for cross-cluster "published within N min of X"
    // pairing. Flat array — 95 attributed rows × 56 clusters is trivial to
    // scan linearly per cluster (~5k comparisons total) and avoids a sorted-
    // index build that'd be overkill at this scale.
    const attributedPublishIndex: Array<{ name: string; slug: string; publishedAtMs: number }> =
      projects
        .filter((p) => p.publishedAt)
        .map((p) => ({
          name: p.name,
          slug: p.slug,
          publishedAtMs: new Date(p.publishedAt as string).getTime(),
        }));

    // Bulk TX-volume-by-sender aggregation for unattributed clusters. One
    // pipeline per classify: match every unattributed package, group by
    // sender, count digests, then sort top-5 per package. At the cluster
    // level we merge across packages and pick the top concentration for an
    // "X drove N% of TX" insight. Forward-only-populated sender field means
    // pre-rollout digests are excluded via `$ne: null`; pct is computed
    // against the non-null denominator so the insight is honest.
    const unattributedPkgAddrs = unattributedRanked.flatMap((e) => e.facts.map((p) => p.address));
    const senderVolumeByPkg = new Map<string, Array<{ address: string; count: number }>>();
    if (unattributedPkgAddrs.length > 0) {
      const agg = await this.txDigestModel.aggregate([
        { $match: { packageAddress: { $in: unattributedPkgAddrs }, sender: { $ne: null } } },
        { $group: { _id: { pkg: '$packageAddress', sender: '$sender' }, count: { $sum: 1 } } },
        { $sort: { '_id.pkg': 1, count: -1 } },
      ]);
      for (const row of agg as Array<{ _id: { pkg: string; sender: string }; count: number }>) {
        const bucket = senderVolumeByPkg.get(row._id.pkg);
        const entry = { address: row._id.sender, count: row.count };
        if (bucket) bucket.push(entry);
        else senderVolumeByPkg.set(row._id.pkg, [entry]);
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
    for (const { deployer, facts: unsortedFacts, storageIota } of unattributedRanked) {
      // Same sort rationale as the attributed-projects loop above — chronological
      // order regardless of paginator direction, so `facts[0]` is original and
      // `facts[last]` is newest.
      const facts = [...unsortedFacts].sort((a, b) => {
        const aT = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bT = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        if (aT !== bT) return aT - bT;
        // Stable fallback when publishedAt is null/equal (framework pkgs,
        // test fixtures): sort by address so iteration order is
        // deterministic regardless of the paginator direction.
        return a.address.localeCompare(b.address);
      });
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

      // Latest publish date across this cluster's packages. Null when every
      // pkg predates the publishedAt field (legacy snapshot).
      let latestClusterPublishedMs: number | null = null;
      for (const p of facts) {
        if (!p.publishedAt) continue;
        const t = new Date(p.publishedAt).getTime();
        if (latestClusterPublishedMs === null || t > latestClusterPublishedMs) latestClusterPublishedMs = t;
      }
      const latestPublishedAt = latestClusterPublishedMs !== null ? new Date(latestClusterPublishedMs) : null;

      // Cross-cluster publish-time pairing — find attributed projects that
      // published within ±10 min of this cluster's latest package. Same-
      // deployer hits via `deployerAttributedProjects` are skipped here
      // (they're already a stronger "Same deployer as …" insight, avoid
      // double-counting).
      const publishNeighbors: { name: string; slug: string; minutesDelta: number }[] = [];
      if (latestPublishedAt) {
        const ms = latestPublishedAt.getTime();
        const sameDeployerSlugs = new Set(deployerAttributedProjects.map((p) => p.slug));
        for (const n of attributedPublishIndex) {
          if (sameDeployerSlugs.has(n.slug)) continue;
          const deltaMin = (ms - n.publishedAtMs) / 60_000;
          if (Math.abs(deltaMin) <= 10) {
            publishNeighbors.push({ name: n.name, slug: n.slug, minutesDelta: deltaMin });
          }
        }
        publishNeighbors.sort((a, b) => Math.abs(a.minutesDelta) - Math.abs(b.minutesDelta));
      }

      // Flatten the cluster's entry-function + event-type sets for domain-
      // hint matching. Deduped in Sets so repeats across modules don't
      // skew the matcher; presence is all that matters.
      const clusterEntryFunctions = new Set<string>();
      const clusterEventTypes = new Set<string>();
      for (const pkg of facts) {
        for (const mm of pkg.moduleMetrics) {
          for (const fn of (mm as any).entryFunctions ?? []) {
            clusterEntryFunctions.add(fn);
          }
          for (const et of (mm as any).eventTypes ?? []) {
            clusterEventTypes.add(et);
          }
        }
      }

      // Aggregate per-sender TX counts across the cluster's packages. The
      // bulk aggregation above already grouped by sender per package; merge
      // across packages here to get the cluster-level top. Skip the deployer
      // itself when computing "top external sender" — it gets its own
      // deployerIsSender insight already.
      const senderTotals = new Map<string, number>();
      for (const pkg of facts) {
        const rows = senderVolumeByPkg.get(pkg.address) ?? [];
        for (const r of rows) {
          senderTotals.set(r.address, (senderTotals.get(r.address) ?? 0) + r.count);
        }
      }
      let topSender: { address: string; count: number; totalCount: number } | null = null;
      if (senderTotals.size > 0) {
        let best: [string, number] | null = null;
        let total = 0;
        for (const [addr, cnt] of senderTotals) {
          total += cnt;
          if (deployer !== 'unknown' && addr === deployer.toLowerCase()) continue;
          if (!best || cnt > best[1]) best = [addr, cnt];
        }
        if (best) topSender = { address: best[0], count: best[1], totalCount: total };
      }

      const insights = this.buildClusterInsights({
        packageCount: facts.length,
        uniqueSenders,
        transactions,
        events,
        deployerAttributedProjects,
        deployerIsSender,
        deployerIsUnknown: deployer === 'unknown',
        latestPublishedAt,
        publishNeighbors,
        entryFunctions: Array.from(clusterEntryFunctions),
        eventTypes: Array.from(clusterEventTypes),
        topSender,
        now: new Date(),
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
        objectHolderCount: 0,
        objectCount: 0,
        objectCountCapped: false,
        marketplaceListedCount: 0,
        uniqueWalletsReach: uniqueSenders,
        sampleIdentifiers: identifiers,
        sampledObjectType: objectType,
        deployerAttributedProjects,
        deployerIsSender,
        insights,
        publishedAt: latestPublishedAt?.toISOString() ?? null,
      });
    }
    const totalUnattributedPackages = unattributed.reduce((s, c) => s + c.packages, 0);
    this.logger.log(
      `classifyFromRaw: ${projects.length} projects, ` +
        `${unattributed.length} unattributed cluster(s) / ${totalUnattributedPackages} package(s)`,
    );
    // Non-mainnet zero-match signal — usually a registry gap worth
    // investigating. A mainnet snapshot with zero matches is a genuine
    // bug; log at WARN here rather than ERROR so testnet-first iteration
    // (registry still being built out) doesn't spam alarms.
    if (scanNetwork !== 'mainnet' && projects.length === 0 && rawPackages.length > 0) {
      this.logger.warn(
        `classifyFromRaw: ${scanNetwork} snapshot with ${rawPackages.length} packages produced zero matches — registry likely missing testnet-tagged defs.`,
      );
    }

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
          objectHolderCount: null,
          objectCount: null,
          objectCountCapped: false,
          marketplaceListedCount: null,
          uniqueWalletsReach: 0,
          attribution: null,
          addedAt: null,
          publishedAt: null,
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
    // Propagated from the raw snapshot (`OnchainSnapshot.network`), not the
    // env — re-classifying an old mainnet snapshot after testnet capture
    // lands still writes `mainnet`. Falls back to `this.network` only when
    // the raw doc predates the field (backfill migrates those separately).
    network: string = this.network,
  ): Promise<void> {
    await this.classifiedModel
      .updateOne(
        { snapshotId },
        {
          $set: {
            snapshotId,
            network,
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
      .findOne({ snapshotId: snap._id, ...this.networkFilter() })
      .lean()
      .exec();
    const currentHash = this.computeRegistryHash();
    if (cached && cached.registryHash === currentHash) {
      return cached.view as Awaited<ReturnType<EcosystemService['classifyFromRaw']>>;
    }
    const t0 = Date.now();
    const view = await this.classifyFromRaw(snap);
    const durationMs = Date.now() - t0;
    await this.persistClassified(snap._id, view, durationMs, snap.network);
    return view;
  }

  // ===================== Testnet two-pipeline capture =====================
  //
  // See `plans/plan_testnet_tutorial_filter.md § Phase 2` for the full
  // architecture. Each tick fires two stages back-to-back:
  //
  //   - **Pipeline A — discovery.** Paginate `packages(last:50, before:)`
  //     newest-first. Per node we build a SHALLOW PackageFact (address,
  //     deployer, modules, publishedAt, storageRebateNanos) and stamp
  //     `isTutorial` from `isTutorialModuleSet`. No deep-probes here:
  //     `lastProbedAt` is left `null` as the signal "Pipeline B should
  //     pick this up." Bail conditions:
  //       * encountered an address already deep-probed within
  //         `TESTNET_FRESHNESS_WINDOW_MS` (i.e. we caught up),
  //       * `hasPreviousPage: false` (genesis),
  //       * `Date.now() >= deadlineMs`.
  //   - **Pipeline B — deep probe.** Aggregate `packagefacts` for every
  //     non-tutorial address on testnet (full sweep, no staleness
  //     ordering, no cap). Each candidate goes through `probeOnePackage`
  //     — `isTutorial: false` is guaranteed by the filter, so the early-
  //     return path can never fire and every probe runs the full
  //     pipeline. Probed in concurrency-15 batches via Promise.allSettled;
  //     bounded by the remaining tick budget after Pipeline A.
  //
  // The kind-union dispatcher (`tickCounter % 3` newest vs backfill) is
  // gone (Phase 2 deferred-cleanup commit, 2026-04-26): every tick is a
  // discovery+deep-probe pair, no persistent backfill cursor needed.
  // Stalest-first aggregation in Pipeline B subsumes the backfill walk.
  //
  // Non-goal: atomic point-in-time — testnet GraphQL is ~40× slower than
  // mainnet (12s vs 0.3s per `packages(last:50)` page), so full-fleet
  // atomic capture doesn't fit a cron cycle. Growth queries on testnet
  // reflect what was re-probed in between two snapshots, not literal
  // on-chain change.

  /**
   * Load or create the singleton `TestnetCursor` state doc. The `_id` is the
   * network literal (`'testnet'` today). `upsert: true` handles first boot;
   * subsequent ticks read the doc via `findById`.
   */
  private async loadTestnetCursor(): Promise<TestnetCursor> {
    const id = 'testnet';
    const existing = await this.testnetCursorModel.findById(id).exec();
    if (existing) return existing;
    const created = await this.testnetCursorModel.create({
      _id: id,
      tickCounter: 0,
      lastTickAt: null,
      lastTickPackagesProbed: 0,
    });
    return created;
  }

  /**
   * Probe one package — the full probe set `captureRaw` runs per-package.
   * Extracted so the testnet priority-sharded ticks can reuse the exact
   * shape without cloning the whole paginator. Returns a `PackageFact` with
   * `lastProbedAt: now` so the newest-tick freshness heuristic has an
   * explicit per-package watermark.
   */
  private async probeOnePackage(
    pkg: PackageInfo,
    displayByPackage: Map<string, Array<{ key: string; value: string }>>,
    now: Date = new Date(),
    network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
  ): Promise<PackageFact> {
    const deployer = pkg.previousTransactionBlock?.sender?.address?.toLowerCase() ?? null;
    const modules = (pkg.modules?.nodes || []).map((m) => m.name);
    const storageRebateNanos = Number(pkg.storageRebate || 0);
    const publishedIso = pkg.previousTransactionBlock?.effects?.timestamp ?? null;
    const publishedAt = publishedIso ? new Date(publishedIso) : null;

    // Phase A — testnet workshop/tutorial early-return. When the package's
    // module set matches a curated catalog signature, skip the deep-probe
    // pipeline (entry-fns, events, identity, tx counts, object-types) and
    // return a shallow PackageFact with only the cheap-discoverable fields.
    // The catalog is testnet-only (mainnet has no workshop population), so
    // mainnet/devnet captures always fall through to the full pipeline.
    // See `plans/plan_testnet_tutorial_filter.md`.
    if (isTutorialModuleSet(modules, network)) {
      return {
        address: pkg.address,
        deployer,
        storageRebateNanos,
        modules,
        moduleMetrics: [],
        objectHolderCount: 0,
        objectCount: 0,
        transactions: 0,
        transactionsCapped: false,
        objectTypeCounts: [],
        fingerprint: null,
        publishedAt,
        lastProbedAt: now,
        isTutorial: true,
      } as PackageFact;
    }

    const entryFunctionsByModule = await this.fetchEntryFunctions(pkg.address);
    const moduleMetrics: ModuleMetrics[] = [];
    for (const mod of modules) {
      const emittingModule = `${pkg.address}::${mod}`;
      const { count: events, capped: eventsCapped } = await this.countEvents(emittingModule);
      const uniqueSenders = await this.updateSendersForModule(pkg.address, mod);
      const eventTypes = events > 0 ? await this.sampleEventTypes(emittingModule) : [];
      moduleMetrics.push({
        module: mod,
        events,
        eventsCapped,
        uniqueSenders,
        entryFunctions: entryFunctionsByModule.get(mod) ?? [],
        eventTypes,
      });
    }

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
    const displayEntries = displayByPackage.get(pkg.address.toLowerCase()) ?? [];
    if (displayEntries.length > 0) {
      const seen = new Set(identifiers);
      for (const { key, value } of displayEntries) {
        const line = `display.${key}: ${value}`;
        if (!seen.has(line)) {
          identifiers = [...identifiers, line];
          seen.add(line);
        }
      }
    }
    const fingerprint: FingerprintSampleDoc | null =
      identifiers.length > 0 || objectType
        ? { sampledObjectType: objectType, identifiers }
        : null;

    const { total: transactions, capped: transactionsCapped } =
      await this.updateTxCountForPackage(pkg.address);

    const objectTypeCounts = await this.captureObjectTypesForPackage(pkg.address);
    const summedObjectHolderCount = objectTypeCounts.reduce((s, e) => s + e.objectHolderCount, 0);
    const summedObjectCount = objectTypeCounts.reduce((s, e) => s + e.objectCount, 0);

    return {
      address: pkg.address,
      deployer,
      storageRebateNanos,
      modules,
      moduleMetrics,
      objectHolderCount: summedObjectHolderCount,
      objectCount: summedObjectCount,
      transactions,
      transactionsCapped,
      objectTypeCounts,
      fingerprint,
      publishedAt,
      lastProbedAt: now,
      isTutorial: false,
    } as PackageFact;
  }

  /**
   * Fetch one page of packages from the GraphQL paginator. Lean shape —
   * IOTA GraphQL rejects any query whose estimated output nodes crosses
   * 100k, so inlining `modules { functions(first: 50) }` here (50×50×50
   * = 125 000) would be rejected; functions come from a per-package
   * second pass (`fetchEntryFunctions`) instead.
   *
   * Sole paginator entry-point used by `probePaginator` for every capture
   * path (mainnet + testnet ticks). Returns the paginator info so the
   * caller can feed it back as the next `after` cursor.
   */
  /**
   * Newest-first pagination over the IOTA `packages` connection. We use
   * `last:N, before:<cursor>` so page 1 (cursor=null) returns the newest
   * `N` packages on the network, page 2 continues backward in publish-time,
   * and `hasPreviousPage: false` marks genesis (end-of-walk).
   *
   * Why newest-first: the "newest tick" + "backfill tick" naming the
   * testnet priority-shard uses requires newest-first order to be
   * meaningful. Pre-2026-04-24 we paginated `first:N, after:` which is
   * oldest-first (from genesis forward) — the names were lying. See
   * `plans/plan_pagination_inversion_and_gap_closing.md` for the
   * investigation. Mainnet's atomic sweep doesn't care about order but
   * inherits the same helper; post-flip the newest packages get probed
   * first, which incidentally fixes the TWIN undercount
   * (`plans/TODO.md § Scanner snapshot lag`).
   *
   * Within a single page, GraphQL returns nodes oldest-first (Relay
   * convention: nodes in index order are oldest→newest within the window).
   * We reverse before returning so downstream iteration is uniformly
   * newest-first — otherwise `probePaginator`'s freshness-window check
   * would hit the oldest-in-page first and potentially bail before
   * reaching the actually-newest package.
   */
  private async fetchPackagePage(
    cursor: string | null,
    first = 50,
  ): Promise<{ nodes: PackageInfo[]; hasPreviousPage: boolean; startCursor: string | null }> {
    const beforeClause: string = cursor ? `, before: "${cursor}"` : '';
    const data: any = await this.graphql(`{
      packages(last: ${first}${beforeClause}) {
        nodes {
          address
          storageRebate
          modules { nodes { name } }
          previousTransactionBlock {
            sender { address }
            effects { timestamp }
          }
        }
        pageInfo { hasPreviousPage startCursor }
      }
    }`);
    // Reverse so nodes[0] is the newest-in-page (see doc-comment above).
    const nodes = ((data.packages.nodes as PackageInfo[]) ?? []).slice().reverse();
    return {
      nodes,
      hasPreviousPage: Boolean(data.packages.pageInfo?.hasPreviousPage),
      startCursor: (data.packages.pageInfo?.startCursor as string | null) ?? null,
    };
  }

  /**
   * Mainnet's atomic-sweep paginate-and-probe loop. Walks the
   * `packages` connection newest-first, probes each non-framework
   * package, and surfaces a checkpoint hook so the resumable-mainnet
   * flow can persist progress at page boundaries.
   *
   * Testnet does NOT use this helper anymore — the two-pipeline
   * `runTestnetDiscoveryTick` + `runTestnetDeepProbeTick` (Phase 2 of
   * `plans/plan_testnet_tutorial_filter.md`) replaced the
   * paginate-and-deep-probe-interleaved flow with a discovery walk
   * that builds shallow facts only, plus a full-sweep deep probe
   * over `packagefacts`. Mainnet kept this helper because its 751-pkg
   * fleet is small enough for a single atomic walk per cron cycle and
   * the resumable-checkpoint flow still buys crash-resilience.
   *
   * Behaviour:
   *   - Framework filter — addresses in the chain-primitive space
   *     (`0x0000…0***`) AND unclaimed by any project def are silently
   *     skipped.
   *   - Deadline — at the top of each page-fetch and after each
   *     successful probe; bails with `deadlineHit: true` and
   *     `nextCursor` set so the next tick can resume cleanly.
   *   - Each `probeOnePackage` is try/catch'd individually so one
   *     flaky probe doesn't discard hours of work.
   *   - When a page fetch fails (after `this.graphql`'s own retries
   *     are exhausted), returns with `error` set and `nextCursor` at
   *     the pre-fetch position so the next invocation resumes correctly.
   *
   * `onCheckpoint` + `checkpointEveryN` wire in the resumable-mainnet
   * flow: after every `checkpointEveryN` probed packages (counted since
   * the last checkpoint), the helper calls `onCheckpoint(batch, cursor)`
   * with the newly-probed tail and the paginator cursor that's safe to
   * resume from. Checkpoints fire only at page boundaries so the written
   * cursor always matches the position AFTER every package in `batch` —
   * a crash-resume from that cursor re-fetches the next page, not the
   * already-checkpointed one.
   */
  private async probePaginator(opts: {
    startCursor: string | null;
    displayByPackage: Map<string, Array<{ key: string; value: string }>>;
    now: Date;
    network: 'mainnet' | 'testnet' | 'devnet';
    deadlineMs: number;
    claimedAddresses: Set<string>;
    onCheckpoint?: (batch: PackageFact[], cursor: string | null) => Promise<void>;
    checkpointEveryN?: number;
  }): Promise<{
    probed: PackageFact[];
    nextCursor: string | null;
    wrapped: boolean;
    deadlineHit: boolean;
    error: Error | null;
    failedPackages: { address: string; error: string }[];
  }> {
    const {
      startCursor,
      displayByPackage,
      now,
      network,
      deadlineMs,
      claimedAddresses,
      onCheckpoint,
      checkpointEveryN,
    } = opts;
    const probed: PackageFact[] = [];
    const failedPackages: { address: string; error: string }[] = [];
    let cursor = startCursor;
    let wrapped = false;
    // Track how many probed packages have already been flushed via
    // `onCheckpoint` so each flush ships only the un-checkpointed tail.
    let lastCheckpointed = 0;

    const maybeCheckpoint = async (cursorAtBoundary: string | null): Promise<void> => {
      if (!onCheckpoint || !checkpointEveryN) return;
      if (probed.length - lastCheckpointed < checkpointEveryN) return;
      const batch = probed.slice(lastCheckpointed);
      lastCheckpointed = probed.length;
      await onCheckpoint(batch, cursorAtBoundary);
    };

    try {
      while (true) {
        if (Date.now() >= deadlineMs) {
          return { probed, nextCursor: cursor, wrapped: false, deadlineHit: true, error: null, failedPackages };
        }
        const page = await this.fetchPackagePage(cursor);
        // Nodes are newest-first within the page (see fetchPackagePage
        // doc-comment on the reverse).
        for (const info of page.nodes) {
          // Framework filter — silent skip when a 0x000…0*** address
          // hasn't been opted-in by any project def's packageAddresses.
          if (
            info.address.startsWith('0x000000000000000000000000000000000000000000000000000000000000000') &&
            !claimedAddresses.has(info.address.toLowerCase())
          ) {
            continue;
          }
          try {
            const fact = await this.probeOnePackage(info, displayByPackage, now, network);
            probed.push(fact);
          } catch (e) {
            const err = e as Error;
            this.logger.warn(`probePaginator: skipped ${info.address} — ${err.message}`);
            failedPackages.push({ address: info.address, error: err.message });
          }
          if (Date.now() >= deadlineMs) {
            return { probed, nextCursor: page.startCursor, wrapped: false, deadlineHit: true, error: null, failedPackages };
          }
        }
        // Page fully processed — advance cursor, then optionally
        // checkpoint with the post-advance cursor. Writing the
        // post-advance cursor means a crash-resume fetches the NEXT
        // page, not this one. Walk direction is newest → oldest;
        // `hasPreviousPage: false` marks genesis (oldest package).
        if (!page.hasPreviousPage) {
          wrapped = true;
          cursor = null;
          await maybeCheckpoint(cursor);
          break;
        }
        cursor = page.startCursor;
        if (!cursor) {
          // Defensive: hasPreviousPage:true with null startCursor —
          // treat as wrap so the next tick restarts cleanly.
          wrapped = true;
          await maybeCheckpoint(cursor);
          break;
        }
        await maybeCheckpoint(cursor);
      }
      return { probed, nextCursor: cursor, wrapped, deadlineHit: false, error: null, failedPackages };
    } catch (e) {
      return { probed, nextCursor: cursor, wrapped: false, deadlineHit: false, error: e as Error, failedPackages };
    }
  }

  /**
   * Staleness threshold for gap-closing: any package whose most recent
   * `lastProbedAt` in `packagefacts` is older than this gets re-probed
   * when a tick has spare budget. 24h is 4× the intended ~6h newest-tick
   * cycle: anything probed in the last day is fresh enough to skip;
   * older is genuinely stale and worth a fresh sample. Tunable.
   */
  private static readonly GAP_CLOSING_STALENESS_MS = 24 * 60 * 60 * 1000;

  /**
   * Max addresses to consider per gap-closing run. Bounded so the
   * aggregation query stays cheap; 500 at testnet's ~1s per probe gives
   * ~8 min of gap-closing work, which fits a typical spare-budget window.
   * If we ever exhaust this on a sustained basis, that's a signal to
   * bump or to reopen the parallel-workers conversation.
   */
  private static readonly GAP_CLOSING_MAX_CANDIDATES = 500;

  /**
   * Fetch a single package's `PackageInfo` shape (the same fields
   * `probeOnePackage` reads). Used by `runGapClosing` to probe a stale
   * address directly without paginating. Returns `null` if the package
   * was deleted / no longer exists — we then skip it.
   */
  private async fetchPackageByAddress(address: string): Promise<PackageInfo | null> {
    const data: any = await this.graphql(`{
      package(address: "${address}") {
        address
        storageRebate
        modules { nodes { name } }
        previousTransactionBlock {
          sender { address }
          effects { timestamp }
        }
      }
    }`);
    return (data?.package as PackageInfo | null) ?? null;
  }

  /**
   * Gap-closing pass. When a tick's primary walk (newest or atomic
   * sweep) finishes with budget remaining, query `packagefacts` for the
   * addresses with the stalest `max(lastProbedAt)` across all prior
   * snapshots in this network, and re-probe them targetedly (one
   * `package(address:)` query per pkg, no pagination). Budget-aware:
   * stops when `Date.now() >= deadlineMs` or the candidate list is
   * drained or exhausts `GAP_CLOSING_MAX_CANDIDATES`.
   *
   * Returns the freshly-probed facts for the caller to merge into the
   * snapshot's package set before save. Uniform for mainnet + testnet
   * per Decision 4: idle 99% of the time on mainnet (atomic sweeps
   * keep everything < 24h fresh) but present as a safety net for
   * stressed captures (Starfish-era load tests, for example).
   */
  private async runGapClosing(
    network: 'mainnet' | 'testnet' | 'devnet',
    now: Date,
    deadlineMs: number,
    displayByPackage: Map<string, Array<{ key: string; value: string }>>,
  ): Promise<{ probed: PackageFact[]; exhaustedCandidates: boolean; deadlineHit: boolean }> {
    const probed: PackageFact[] = [];
    if (Date.now() >= deadlineMs) {
      return { probed, exhaustedCandidates: false, deadlineHit: true };
    }
    const staleCutoff = new Date(now.getTime() - EcosystemService.GAP_CLOSING_STALENESS_MS);
    // Find addresses whose newest probe is older than the cutoff, sorted
    // stalest-first. Uses the `{address: 1}` index on packagefacts.
    const stale: Array<{ _id: string; latestProbe: Date }> = await this.pkgFactModel
      .aggregate([
        { $match: { network } },
        { $sort: { address: 1, lastProbedAt: -1 } },
        { $group: { _id: '$address', latestProbe: { $first: '$lastProbedAt' } } },
        { $match: { latestProbe: { $lt: staleCutoff } } },
        { $sort: { latestProbe: 1 } },
        { $limit: EcosystemService.GAP_CLOSING_MAX_CANDIDATES },
      ])
      .exec();
    if (stale.length === 0) {
      return { probed, exhaustedCandidates: true, deadlineHit: false };
    }
    this.logger.log(
      `gap-closing (${network}): ${stale.length} stale address(es) identified (threshold ${EcosystemService.GAP_CLOSING_STALENESS_MS / 3600000}h); probing stalest first`,
    );
    for (const row of stale) {
      if (Date.now() >= deadlineMs) {
        return { probed, exhaustedCandidates: false, deadlineHit: true };
      }
      try {
        const info = await this.fetchPackageByAddress(row._id);
        if (!info) {
          // Package disappeared from source (shouldn't happen on IOTA but
          // handle gracefully) — skip without failing the whole pass.
          continue;
        }
        const fact = await this.probeOnePackage(info, displayByPackage, now, network);
        probed.push(fact);
      } catch (e) {
        this.logger.warn(
          `gap-closing (${network}): skipped ${row._id} — ${(e as Error).message}`,
        );
      }
    }
    return { probed, exhaustedCandidates: true, deadlineHit: false };
  }

  /**
   * Persistent log of a gap event — newest-tick (or mainnet capture)
   * exhausted its budget without reaching the freshness window. Surfaces
   * as a WARN and a `schemaAlerts` doc so the fact survives container log
   * rotation. Match `BSON size guard` pattern.
   */
  private async logCaptureGap(
    network: 'mainnet' | 'testnet' | 'devnet',
    detail: Record<string, unknown>,
    message: string,
  ): Promise<void> {
    this.logger.warn(`GAP: ${message}`);
    await this.logSchemaAlert({
      kind: network === 'mainnet' ? 'mainnet-capture-gap' : 'testnet-newest-tick-gap',
      collectionName: 'onchainsnapshots',
      op: 'probe',
      network,
      sizeBytes: 0,
      thresholdBytes: 0,
      detail,
      message,
    });
  }

  /**
   * Pipeline A — discovery walk over testnet packages. Newest-first
   * pagination, no per-package deep-probing, no `displayByPackage`
   * lookups, no `probeOnePackage` calls. For each package node we
   * build a shallow `PackageFact` carrying only the fields cheaply
   * available from `fetchPackagePage`'s response — address, deployer,
   * modules, publishedAt, storageRebate — plus an `isTutorial` flag
   * via `isTutorialModuleSet`. Heavy fields default to empty/zero;
   * `lastProbedAt: null` is the signal Pipeline B uses to find these
   * facts (null sorts first under ascending `lastProbedAt`).
   *
   * Bail conditions:
   *   - **Freshness window** — encountered an address present in
   *     `previousByAddress` whose `lastProbedAt > now - freshnessWindowMs`.
   *     Means we've caught up with deep-probed history; everything beyond
   *     is older known territory that Pipeline B will reach if budget
   *     allows. Returns `hitFreshWindow: true`.
   *   - **Genesis** — `hasPreviousPage: false`. Returns `wrapped: true`.
   *   - **Deadline** — `Date.now() >= deadlineMs`. Returns `deadlineHit: true`.
   *
   * Each `fetchPackagePage` call is wrapped in try/catch; on retry-exhaust
   * we bail with whatever was discovered so far + an `error` field set, so
   * Pipeline B can still try in the remaining budget.
   */
  private async runTestnetDiscoveryTick(opts: {
    previousByAddress: Map<string, PackageFact>;
    freshnessWindowMs: number;
    deadlineMs: number;
    now: Date;
  }): Promise<{
    discovered: PackageFact[];
    hitFreshWindow: boolean;
    deadlineHit: boolean;
    wrapped: boolean;
    error: Error | null;
  }> {
    const { previousByAddress, freshnessWindowMs, deadlineMs, now } = opts;
    const discovered: PackageFact[] = [];
    const freshCutoff = now.getTime() - freshnessWindowMs;
    let cursor: string | null = null;
    let hitFreshWindow = false;
    let wrapped = false;

    try {
      while (true) {
        if (Date.now() >= deadlineMs) {
          return { discovered, hitFreshWindow, deadlineHit: true, wrapped, error: null };
        }
        const page = await this.fetchPackagePage(cursor);
        // Nodes are newest-first within the page (see `fetchPackagePage`
        // doc-comment on the reverse). Iteration order matches the
        // newest-first walk discovery expects.
        for (const info of page.nodes) {
          // Freshness watermark — stop as soon as we see a package
          // already deep-probed within the window. Note this is `null`-safe:
          // a previously-discovered shallow fact has `lastProbedAt: null`
          // which fails the `> freshCutoff` guard, so re-discovery of an
          // un-probed fact does NOT trip the window — only deep-probed
          // history qualifies as "caught up."
          const prev = previousByAddress.get(info.address.toLowerCase());
          if (prev && prev.lastProbedAt && new Date(prev.lastProbedAt).getTime() > freshCutoff) {
            hitFreshWindow = true;
            return { discovered, hitFreshWindow, deadlineHit: false, wrapped, error: null };
          }
          const modules = (info.modules?.nodes || []).map((m) => m.name);
          const deployer = info.previousTransactionBlock?.sender?.address?.toLowerCase() ?? null;
          const publishedIso = info.previousTransactionBlock?.effects?.timestamp ?? null;
          const fact: PackageFact = {
            address: info.address,
            deployer,
            storageRebateNanos: Number(info.storageRebate || 0),
            modules,
            moduleMetrics: [],
            objectHolderCount: 0,
            objectCount: 0,
            transactions: 0,
            transactionsCapped: false,
            objectTypeCounts: [],
            fingerprint: null,
            publishedAt: publishedIso ? new Date(publishedIso) : null,
            // `null` is the explicit signal that this fact has been
            // discovered but not deep-probed yet. Pipeline B's full-
            // sweep aggregation re-probes every non-tutorial address
            // each tick, so this row will be upgraded the same tick
            // it was discovered (delete-then-insert overwrite).
            lastProbedAt: null,
            isTutorial: isTutorialModuleSet(modules, 'testnet'),
          };
          discovered.push(fact);
          if (Date.now() >= deadlineMs) {
            return { discovered, hitFreshWindow, deadlineHit: true, wrapped, error: null };
          }
        }
        if (!page.hasPreviousPage) {
          wrapped = true;
          break;
        }
        cursor = page.startCursor;
        if (!cursor) {
          // Defensive: hasPreviousPage:true with null startCursor — treat
          // as wrap so the next tick restarts cleanly rather than spinning.
          wrapped = true;
          break;
        }
      }
      return { discovered, hitFreshWindow, deadlineHit: false, wrapped, error: null };
    } catch (e) {
      return { discovered, hitFreshWindow, deadlineHit: false, wrapped, error: e as Error };
    }
  }

  /**
   * Pipeline B — deep probe of every non-tutorial testnet fact. Reads
   * `packagefacts` filtered to `network: 'testnet', isTutorial: false`,
   * groups by address (full pool, no cap, no staleness ordering), and
   * re-probes each via `fetchPackageByAddress` + `probeOnePackage`.
   *
   * Mirrors mainnet's "every 2h, every package" semantics: each tick
   * re-walks the entire pool rather than picking off a stalest subset.
   * 7,798 non-tutorial packages × ~3-4s/probe ÷ concurrency-15 ≈ ~33 min,
   * comfortably inside the 90-min testnet tick budget.
   *
   * Tutorial-flagged packages never appear in the candidate set thanks to
   * the `isTutorial: false` filter on the aggregate match — `probeOnePackage`'s
   * early-return path is therefore unreachable here, and every probe runs
   * the full deep pipeline (entry-fns, events, identity, tx counts,
   * object-types).
   *
   * Concurrency-batched via `Promise.allSettled` so one slow/flaky address
   * doesn't stall the rest. Mirrors `backfillTestnetFromAddressList`'s
   * pattern. Per-batch deadline check honors the dynamic budget without
   * leaving in-flight probes stranded — we let the batch settle, then
   * bail on the next iteration.
   *
   * Returns probed facts for the caller to upsert into the new snapshot,
   * plus per-address failures for diagnostics.
   */
  private async runTestnetDeepProbeTick(opts: {
    now: Date;
    deadlineMs: number;
    displayByPackage: Map<string, Array<{ key: string; value: string }>>;
    concurrency?: number;
  }): Promise<{
    probed: PackageFact[];
    deadlineHit: boolean;
    exhaustedCandidates: boolean;
    failures: Array<{ address: string; error: string }>;
  }> {
    const { now, deadlineMs, displayByPackage } = opts;
    const concurrency = opts.concurrency ?? EcosystemService.TESTNET_DEEP_PROBE_CONCURRENCY;
    const probed: PackageFact[] = [];
    const failures: Array<{ address: string; error: string }> = [];
    if (Date.now() >= deadlineMs) {
      return { probed, deadlineHit: true, exhaustedCandidates: false, failures };
    }
    const candidates: Array<{ _id: string }> = await this.pkgFactModel
      .aggregate([
        { $match: { network: 'testnet', isTutorial: false } },
        // Full sweep — order doesn't matter when we re-probe the entire
        // pool every tick. No $sort, no $limit.
        { $group: { _id: '$address' } },
      ])
      .exec();
    if (candidates.length === 0) {
      return { probed, deadlineHit: false, exhaustedCandidates: true, failures };
    }
    this.logger.log(
      `testnet deep-probe: ${candidates.length} candidate address(es) (full sweep, concurrency=${concurrency})`,
    );
    for (let i = 0; i < candidates.length; i += concurrency) {
      if (Date.now() >= deadlineMs) {
        return { probed, deadlineHit: true, exhaustedCandidates: false, failures };
      }
      const batch = candidates.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(async (row) => {
          const info = await this.fetchPackageByAddress(row._id);
          if (!info) {
            // Package vanished from chain source — return null sentinel
            // so the outer loop can skip without recording a failure.
            return null;
          }
          return await this.probeOnePackage(info, displayByPackage, now, 'testnet');
        }),
      );
      for (let idx = 0; idx < results.length; idx++) {
        const r = results[idx];
        if (r.status === 'fulfilled') {
          if (r.value !== null) probed.push(r.value);
          // `null` => vanish-skip; nothing recorded.
        } else {
          const err = r.reason as Error;
          const message = err?.message ?? String(r.reason);
          this.logger.warn(`testnet deep-probe: skipped ${batch[idx]._id} — ${message}`);
          failures.push({ address: batch[idx]._id, error: message });
        }
      }
    }
    return { probed, deadlineHit: false, exhaustedCandidates: true, failures };
  }

  /**
   * Run one testnet capture tick — Pipeline A (discovery) followed by
   * Pipeline B (deep-probe stalest). Writes a new `OnchainSnapshot`
   * with `network: 'testnet', captureStage: 'complete'`, populates
   * `packagefacts` under that snapshot id, advances the diagnostic
   * cursor doc. Public for CLI/test access; cron hook below invokes
   * it via `testnetCron()` with the scanner-host guard.
   *
   * No Mongo write / no guard acquisition happens if the service is
   * bound to a non-mainnet network — meaning the testnet scanner
   * process would run this method; the mainnet-bound process's cron
   * hook is guarded by `this.network === 'mainnet'` so only the
   * scanner host fires it. (Web-host `API_ROLE=serve` gates schedule
   * registration out entirely.)
   */
  public async captureTestnetTick(): Promise<{
    discovered: number;
    deepProbed: number;
    totalPackagesInSnapshot: number;
    durationMs: number;
    wrapped: boolean;
    deadlineHit: boolean;
    hitFreshWindow: boolean;
  } | { skipped: true; reason: string }> {
    if (this.capturingByNetwork['testnet']) {
      this.logger.log('Testnet capture already in flight (in-process), skipping duplicate trigger');
      return { skipped: true, reason: 'in-flight' };
    }
    // Set the in-process flag SYNCHRONOUSLY before awaiting the lock so
    // a second captureTestnetTick() call in the same tick can't race past
    // the check above.
    this.capturingByNetwork['testnet'] = true;
    let lockAcquired = false;
    const startedAt = Date.now();
    // Dynamic deadline — `min(startedAt + 90min ceiling, nextMainnetCron - 5min buffer)`.
    // Testnet shares the Node event loop with the mainnet capture; concurrent
    // BSON serialization + heavy GraphQL walks stretch mainnet's 40-min
    // window and risk the sshd-banner-timeout gotcha. Capping testnet at
    // "5 min before next mainnet" guarantees no overlap regardless of
    // tick kind (newest/backfill) or manual-trigger timing — and uses as
    // much compute as is safe when mainnet is far off (e.g. a manual
    // trigger right after a mainnet capture finishes has ~75 min, vs. the
    // natural 19:00 UTC cron tick having ~55 min).
    const nextMainnet = EcosystemService.nextMainnetCronAt(new Date(startedAt));
    const mainnetBufferDeadline = nextMainnet.getTime() - EcosystemService.TESTNET_MAINNET_OVERLAP_BUFFER_MS;
    const ceilingDeadline = startedAt + EcosystemService.TESTNET_TICK_BUDGET_MS;
    const deadlineMs = Math.min(ceilingDeadline, mainnetBufferDeadline);
    const effectiveBudgetMin = Math.round((deadlineMs - startedAt) / 60000);
    const now = new Date(startedAt);

    // Scope every nested `this.graphql(...)` call to the testnet endpoint via
    // AsyncLocalStorage. Without this, helpers like `fetchEntryFunctions`
    // and `probeIdentityFields` (which call `this.graphql(query)`) would use
    // `this.graphqlUrl` = the mainnet URL on the scanner host — silently
    // writing mainnet data into testnet-tagged snapshots. Mainnet captures
    // running in parallel keep their own (empty) context and fall through
    // to `this.graphqlUrl`, so there is no cross-talk.
    const testnetUrl = GRAPHQL_URL_BY_NETWORK.testnet;
    return this.graphqlUrlContext.run(testnetUrl, async () => {
    try {
      // Invariant 5 guard: if a mainnet capture is actively running, skip
      // the testnet tick entirely. They share the Node event loop; running
      // both concurrently stretches mainnet's 40-min window and risks the
      // sshd-banner-timeout gotcha noted in global CLAUDE.md. The dynamic
      // deadline above prevents us from overrunning INTO the next mainnet
      // cron; this guard prevents us from starting UNDER an active one.
      const mainnetLock = await this.captureLockModel
        .findById('mainnet')
        .lean()
        .exec();
      if (mainnetLock?.lockedUntil && mainnetLock.lockedUntil > new Date()) {
        this.logger.log(
          `Testnet tick skipping — mainnet capture in flight (lockedUntil ${mainnetLock.lockedUntil.toISOString()})`,
        );
        return { skipped: true as const, reason: 'mainnet-active' };
      }

      // Cross-process lock — prevents a manual bootstrap from duplicating a
      // scheduled-cron tick (happened 2026-04-23: both contexts ran newest-
      // tick from tickCounter=0, wasting ~90min of probe work each).
      const lock = await this.acquireCaptureLock('testnet', EcosystemService.TESTNET_LOCK_TTL_MS);
      if (!lock.acquired) {
        this.logger.log(
          `Testnet capture lock held by ${lock.holder ?? 'unknown'} until ${lock.lockedUntil?.toISOString() ?? '?'}; skipping`,
        );
        return { skipped: true as const, reason: `cross-process lock held by ${lock.holder ?? 'unknown'}` };
      }
      lockAcquired = true;

      const state = await this.loadTestnetCursor();
      this.logger.log(
        `Testnet tick starting: tickCounter=${state.tickCounter} effectiveBudget=${effectiveBudgetMin}min`,
      );

      // Load previous testnet snapshot so we can:
      //   (a) check freshness in Pipeline A,
      //   (b) copy-forward un-touched packages into the new snapshot.
      const previousDoc = await this.ecoModel
        .findOne({ network: 'testnet' })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      const previousPackages: PackageFact[] = await this.getPackages(previousDoc);
      const previousByAddress = new Map<string, PackageFact>();
      for (const p of previousPackages) previousByAddress.set(p.address.toLowerCase(), p);

      // Display metadata pre-pass — same rationale as `captureRaw`. Cheap
      // compared to per-package probes; populates `display.*` identifiers
      // for the deep-probe pipeline.
      const displayByPackage = await this.collectDisplayMetadata();

      // Pre-generate the new snapshot id so Pipeline A and Pipeline B can
      // both write `packagefacts` rows under the same parent before the
      // header gets `safeCreate`d at the end. This mirrors the mainnet
      // pattern (`captureRaw` + `finalizeMainnetSnapshot`): facts first,
      // header last.
      const newId = new Types.ObjectId();

      // ----- Pipeline A: discovery -----
      const discovery = await this.runTestnetDiscoveryTick({
        previousByAddress,
        freshnessWindowMs: EcosystemService.TESTNET_FRESHNESS_WINDOW_MS,
        deadlineMs,
        now,
      });
      const { discovered, hitFreshWindow, wrapped } = discovery;
      let deadlineHit = discovery.deadlineHit;
      const discoveryError = discovery.error;
      if (discoveryError) {
        this.logger.error(
          `Testnet discovery aborted mid-walk after ${discovered.length} pkgs: ${discoveryError.message} — falling through to deep-probe with what we have`,
        );
      }

      // Persist Pipeline A's shallow facts immediately so a mid-tick
      // crash leaves something readable rather than an empty header.
      // `lastProbedAt: null` on every shallow fact keeps the deep-probe
      // ordering invariant.
      if (discovered.length > 0) {
        await this.insertPackageFacts(newId, 'testnet', discovered);
      }

      // Discovery-budget gap WARN: ran out of time before reaching
      // freshness window OR genesis. Means capacity is falling behind
      // testnet's production rate — log loudly and persist for ops
      // visibility once log rotation kicks in. Skip the warning when
      // discovery errored (already logged loudly above) — `deadlineHit`
      // there is incidental, not a capacity signal.
      if (deadlineHit && !hitFreshWindow && !wrapped && !discoveryError) {
        const oldestProbedAt = discovered.length > 0
          ? discovered[discovered.length - 1]?.publishedAt ?? null
          : null;
        await this.logCaptureGap('testnet', {
          probedThisTick: discovered.length,
          oldestProbedPublishedAt: oldestProbedAt,
          durationBudgetMs: deadlineMs - startedAt,
        }, `testnet discovery exhausted ${Math.round((deadlineMs-startedAt)/60000)}min budget after ${discovered.length} pkgs without reaching previously-probed range — coverage falling behind production rate`);
      }

      // ----- Pipeline B: deep probe stalest -----
      // Skip cleanly if we've already burned the budget. Otherwise hand
      // the rest of the tick to the stalest-first probe, including when
      // discovery errored — it might still find addresses we discovered
      // partially or in earlier ticks.
      let deepProbed: PackageFact[] = [];
      let deepProbeFailures: Array<{ address: string; error: string }> = [];
      if (Date.now() < deadlineMs) {
        const dp = await this.runTestnetDeepProbeTick({
          now,
          deadlineMs,
          displayByPackage,
        });
        deepProbed = dp.probed;
        deepProbeFailures = dp.failures;
        if (dp.deadlineHit) deadlineHit = true;
        if (deepProbed.length > 0) {
          this.logger.log(
            `Testnet deep-probe finished: probed=${deepProbed.length} failures=${deepProbeFailures.length} deadlineHit=${dp.deadlineHit} exhaustedCandidates=${dp.exhaustedCandidates}`,
          );
        }
      }

      // Pipeline B writes its results into this same snapshot. Some of
      // those addresses already have a shallow fact from Pipeline A
      // (the freshly-discovered case — null lastProbedAt sorted first
      // and got picked up immediately); the unique
      // `(snapshotId, address)` index would reject a second insert. So:
      // delete the shallow rows for those addresses, then insert the
      // deep-probed replacements. Two writes total but each one is
      // already covered by existing mocks/indexes — simpler than
      // introducing `bulkWrite(replaceOne, upsert: true)` for the same
      // effect.
      if (deepProbed.length > 0) {
        const deepProbedAddresses = deepProbed.map((p) => p.address);
        await this.pkgFactModel
          .deleteMany({ snapshotId: newId, address: { $in: deepProbedAddresses } })
          .exec();
        await this.insertPackageFacts(newId, 'testnet', deepProbed);
      }

      // ----- Copy-forward: anything we did NOT touch this tick -----
      // Preserves the older `lastProbedAt` (invariant: never rewinds
      // to null once set) and the heavy fields from the previous
      // snapshot's deep probe. Order doesn't matter here — these
      // addresses are disjoint from discovered ∪ deepProbed by
      // construction.
      const touchedAddresses = new Set<string>();
      for (const p of discovered) touchedAddresses.add(p.address.toLowerCase());
      for (const p of deepProbed) touchedAddresses.add(p.address.toLowerCase());
      const carriedForward = previousPackages.filter(
        (p) => !touchedAddresses.has(p.address.toLowerCase()),
      );
      if (carriedForward.length > 0) {
        await this.insertPackageFacts(newId, 'testnet', carriedForward);
      }

      // Build the totals header from the union of (discovered minus
      // deep-probed-already, deep-probed, carried-forward). The
      // discovered list still contains shallow rows that Pipeline B
      // overwrote in `packagefacts`; for the totals we want the
      // deep-probed shape to win.
      const deepProbedAddrSet = new Set(deepProbed.map((p) => p.address.toLowerCase()));
      const discoveredKept = discovered.filter(
        (p) => !deepProbedAddrSet.has(p.address.toLowerCase()),
      );
      const totalPackagesInSnapshot =
        discoveredKept.length + deepProbed.length + carriedForward.length;
      const totalStorageRebateNanos = [
        ...discoveredKept,
        ...deepProbed,
        ...carriedForward,
      ].reduce((s, p) => s + Number(p.storageRebateNanos || 0), 0);
      const durationMs = Date.now() - startedAt;

      await this.safeCreate({
        _id: newId,
        network: 'testnet',
        captureStage: 'complete',
        totalStorageRebateNanos,
        networkTxTotal: previousDoc?.networkTxTotal ?? 0,
        txRates: previousDoc?.txRates ?? {},
        captureDurationMs: durationMs,
      });

      // Diagnostic cursor advance — pure observability now that the
      // kind-union dispatcher is gone.
      await this.testnetCursorModel
        .updateOne(
          { _id: 'testnet' },
          {
            $set: {
              tickCounter: state.tickCounter + 1,
              lastTickAt: new Date(),
              lastTickPackagesProbed: discovered.length + deepProbed.length,
            },
          },
          { upsert: true },
        )
        .exec();

      this.logger.log(
        `Testnet tick done: discovered=${discovered.length} deepProbed=${deepProbed.length} total=${totalPackagesInSnapshot} wrapped=${wrapped} hitFreshWindow=${hitFreshWindow} deadlineHit=${deadlineHit} durationMs=${durationMs}`,
      );

      return {
        discovered: discovered.length,
        deepProbed: deepProbed.length,
        totalPackagesInSnapshot,
        durationMs,
        wrapped,
        deadlineHit,
        hitFreshWindow,
      };
    } finally {
      this.capturingByNetwork['testnet'] = false;
      if (lockAcquired) {
        await this.releaseCaptureLock('testnet').catch((e) =>
          this.logger.warn(`Failed to release testnet capture lock: ${(e as Error).message}`),
        );
      }
    }
    });
  }

  /**
   * One-shot bulk-probe entrypoint: take an explicit list of testnet package
   * addresses, probe each in parallel batches, and write the result into a
   * single fresh testnet snapshot. Used by the
   * `backfill-testnet-from-addresslist` CLI to rebuild testnet coverage
   * from scratch after the 2026-04-25 cross-network pagination walk
   * surfaced ~35k packages we'd missed (the apparent "5-month dead window"
   * Nov 2025 → Mar 2026 was actually peak activity — see
   * `plans/handoff_2026-04-25.md`).
   *
   * Behaviour:
   *  - Wraps every nested `this.graphql(...)` in
   *    `graphqlUrlContext.run(testnetUrl)` so helpers that read
   *    `this.graphqlUrl` (`fetchEntryFunctions`, `probeIdentityFields`,
   *    etc.) hit testnet, not mainnet — same pattern as `captureTestnetTick`.
   *  - Creates a `captureStage: 'partial'` snapshot up front, writes facts in
   *    chunks of `CHUNK_FOR_INSERT` as they're probed, promotes to
   *    `'complete'` only once all batches are done. The unique
   *    `(snapshotId, address)` index makes a resume re-insert idempotent.
   *  - Probes in concurrency-N batches via `Promise.allSettled` so one slow
   *    or flaky address doesn't stall the rest. Failures collected per-
   *    address with the error message, not re-thrown.
   *  - Does NOT acquire the capture lock — this is a manual one-shot, the
   *    caller is expected to halt the cron externally before invoking.
   *  - Does NOT touch existing testnet snapshots. The new snapshot stands
   *    alongside; cleanup is a separate explicit step once the operator has
   *    eyeballed the new one.
   */
  async backfillTestnetFromAddressList(
    addresses: string[],
    opts: {
      concurrency?: number;
      onProgress?: (done: number, total: number) => void;
    } = {},
  ): Promise<{
    snapshotId: Types.ObjectId;
    probed: number;
    failures: Array<{ address: string; error: string }>;
    durationMs: number;
  }> {
    const concurrency = opts.concurrency ?? 15;
    const CHUNK_FOR_INSERT = 1000;
    const testnetUrl = GRAPHQL_URL_BY_NETWORK.testnet;
    return this.graphqlUrlContext.run(testnetUrl, async () => {
      const startedAt = Date.now();
      const now = new Date(startedAt);
      const newId = new Types.ObjectId();

      await this.safeCreate({
        _id: newId,
        network: 'testnet',
        captureStage: 'partial',
        totalStorageRebateNanos: 0,
        networkTxTotal: 0,
        txRates: {},
        captureDurationMs: null,
      });

      const displayByPackage = await this.collectDisplayMetadata();
      const failures: Array<{ address: string; error: string }> = [];
      let probedCount = 0;
      let pendingInsert: PackageFact[] = [];
      let totalStorageRebateNanos = 0;

      for (let i = 0; i < addresses.length; i += concurrency) {
        const batch = addresses.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          batch.map(async (addr) => {
            const info = await this.fetchPackageByAddress(addr);
            if (!info) throw new Error('package not found on-chain');
            return await this.probeOnePackage(info, displayByPackage, now, 'testnet');
          }),
        );
        for (let idx = 0; idx < results.length; idx++) {
          const r = results[idx];
          if (r.status === 'fulfilled') {
            pendingInsert.push(r.value);
            totalStorageRebateNanos += Number(r.value.storageRebateNanos || 0);
            probedCount += 1;
          } else {
            failures.push({
              address: batch[idx],
              error: (r.reason as Error)?.message ?? String(r.reason),
            });
          }
        }
        if (pendingInsert.length >= CHUNK_FOR_INSERT) {
          await this.insertPackageFacts(newId, 'testnet', pendingInsert);
          pendingInsert = [];
        }
        opts.onProgress?.(probedCount + failures.length, addresses.length);
      }

      if (pendingInsert.length > 0) {
        await this.insertPackageFacts(newId, 'testnet', pendingInsert);
      }

      const durationMs = Date.now() - startedAt;
      await this.ecoModel
        .updateOne(
          { _id: newId },
          {
            $set: {
              captureStage: 'complete',
              captureDurationMs: durationMs,
              totalStorageRebateNanos,
            },
          },
        )
        .exec();

      this.logger.log(
        `backfillTestnetFromAddressList: snapshot ${newId.toString()} promoted to complete — probed=${probedCount} failed=${failures.length} durationMs=${durationMs}`,
      );

      return {
        snapshotId: newId,
        probed: probedCount,
        failures,
        durationMs,
      };
    });
  }

  /**
   * Cron entrypoint for the testnet priority-sharded tick. Fires every
   * odd UTC hour (between the mainnet even-hour runs) so neither network
   * blocks the other. Only the scanner-host process runs this — the
   * web-host's `API_ROLE=serve` gates all cron registration out via
   * `app.module.ts`'s conditional `ScheduleModule` wiring.
   *
   * The mainnet `capture()` cron and this one are independently guarded
   * (`this.capturing` vs `this.capturingByNetwork['testnet']`), so a
   * long-running mainnet scan never blocks testnet and vice versa.
   */
  @Cron('0 1-23/2 * * *', { name: 'testnet-capture' })
  async testnetCron() {
    if (process.env.NODE_ENV === 'test') return;
    if (process.env.API_ROLE === 'serve') return;
    try {
      await this.captureTestnetTick();
    } catch (e) {
      // Invariant 5: testnet failures never break mainnet. Log + swallow.
      this.logger.error(`Testnet cron tick failed: ${(e as Error).message}`, e);
    }
  }
}
