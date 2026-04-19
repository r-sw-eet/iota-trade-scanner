import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { EcosystemSnapshot } from './schemas/ecosystem-snapshot.schema';
import { ProjectSenders } from './schemas/project-senders.schema';
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

  constructor(
    @InjectModel(EcosystemSnapshot.name) private ecoModel: Model<EcosystemSnapshot>,
    @InjectModel(ProjectSenders.name) private senderModel: Model<ProjectSenders>,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const count = await this.ecoModel.countDocuments();
    if (count === 0) {
      this.logger.log('No ecosystem snapshot found, capturing in background...');
      this.capture().catch((e) => this.logger.error('Initial ecosystem capture failed', e));
    }
  }

  async getLatest() {
    return this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
  }

  // Refresh every 6 hours
  @Cron('0 */6 * * *')
  async capture() {
    this.logger.log('Capturing ecosystem snapshot...');
    try {
      const data = await this.fetchFull();
      await this.ecoModel.create(data);
      this.logger.log(`Ecosystem snapshot saved: ${data.totalProjects} projects, ${data.totalEvents} events`);
    } catch (e) {
      this.logger.error('Ecosystem capture failed', e);
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
   *
   * On first encounter we set the cursor to the current end of events (no
   * historical backfill — that's a separate one-time job). Subsequent scans
   * fetch only events after the stored cursor.
   */
  private async updateSendersForModule(packageAddress: string, module: string): Promise<string[]> {
    const emittingModule = `${packageAddress}::${module}`;
    let record = await this.senderModel.findOne({ packageAddress, module });

    if (!record) {
      // Anchor cursor at current end so future scans only see new events.
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
      return [];
    }

    await this.pageForwardSenders(record, emittingModule, 100);
    return record.senders;
  }

  /**
   * Drain all historical events for a (package, module) starting from cursor=null.
   * Designed to be invoked from a one-shot CLI; resumes if interrupted.
   * Returns the total unique sender count.
   */
  async backfillSendersForModule(packageAddress: string, module: string): Promise<number> {
    const emittingModule = `${packageAddress}::${module}`;
    let record = await this.senderModel.findOne({ packageAddress, module });

    if (!record) {
      // Backfill mode: cursor=null = page from the very first event.
      record = await this.senderModel.create({
        packageAddress,
        module,
        cursor: null,
        senders: [],
        eventsScanned: 0,
      });
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

    return record.senders.length;
  }

  async backfillAllSenders(
    onProgress?: (info: { project: string; module: string; senders: number }) => void,
  ): Promise<{ totalProjects: number; totalModules: number; totalSenders: number }> {
    const snapshot = await this.ecoModel.findOne().sort({ createdAt: -1 }).lean().exec();
    if (!snapshot) {
      throw new Error('No ecosystem snapshot exists yet — run a scan first.');
    }

    const projects = snapshot.l1.filter((p) => p.latestPackageAddress && p.modules?.length);
    let totalModules = 0;
    let totalSenders = 0;

    for (const p of projects) {
      for (const mod of p.modules!) {
        const count = await this.backfillSendersForModule(p.latestPackageAddress!, mod);
        totalModules += 1;
        totalSenders += count;
        onProgress?.({ project: p.name, module: mod, senders: count });
      }
    }

    return { totalProjects: projects.length, totalModules, totalSenders };
  }

  /**
   * Pages forward from `record.cursor`, accumulating senders. Mutates and saves
   * `record`. Returns the number of events scanned in this call.
   */
  private async pageForwardSenders(record: ProjectSenders, emittingModule: string, maxPages: number): Promise<number> {
    let cursor = record.cursor;
    const senders = new Set(record.senders);
    const before = senders.size;
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
          if (addr) senders.add(addr);
        }
        scanned += nodes.length;
        cursor = data.events?.pageInfo?.endCursor ?? cursor;
        if (!data.events?.pageInfo?.hasNextPage) break;
      } catch {
        break;
      }
    }

    if (scanned > 0 || senders.size !== before) {
      record.senders = Array.from(senders);
      record.cursor = cursor;
      record.eventsScanned += scanned;
      await record.save();
    }
    return scanned;
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

  private async fetchFull() {
    const allPackages = await this.getAllPackages();

    // Framework packages (0x1, 0x2, 0x3, …) are skipped by default because
    // their generic module names would collide with too many matchers. But
    // packages explicitly claimed via `packageAddresses` in a ProjectDefinition
    // are allowed through — e.g. native staking on 0x3.
    const claimedAddresses = new Set<string>();
    for (const def of ALL_PROJECTS) {
      for (const addr of def.match.packageAddresses ?? []) {
        claimedAddresses.add(addr.toLowerCase());
      }
    }

    const projectMap = new Map<string, { def: ProjectDefinition; packages: PackageInfo[]; splitDeployer?: string }>();
    // Unmatched packages grouped by deployer. `unknown` collects packages
    // whose deployer resolves to null (framework / legacy publish records).
    const unattributedByDeployer = new Map<string, PackageInfo[]>();
    for (const pkg of allPackages) {
      if (pkg.address.startsWith('0x000000000000000000000000000000000000000000000000000000000000000')
        && !claimedAddresses.has(pkg.address.toLowerCase())) continue;
      const mods = new Set((pkg.modules?.nodes || []).map((m) => m.name));
      const pkgDeployer = pkg.previousTransactionBlock?.sender?.address ?? null;
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
        const deployer = pkg.previousTransactionBlock?.sender?.address?.toLowerCase() ?? 'unknown';
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
            (p) => p.teamId === team.id && !hasSyncMatch(p),
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
      if (existing) { existing.packages.push(pkg); } else { projectMap.set(mapKey, { def, packages: [pkg], splitDeployer }); }
    }

    const projects: Project[] = [];
    for (const [, { def, packages, splitDeployer }] of projectMap) {
      const latestPkg = packages[packages.length - 1];
      const latestMods = (latestPkg.modules?.nodes || []).map((m) => m.name);
      const totalStorage = packages.reduce((sum, p) => sum + Number(p.storageRebate || 0), 0) / 1_000_000_000;

      // Sum events (and accumulate senders) across every package in the
      // project's set — not just the latest. Move events are scoped by the
      // emitting package's address: when a package is upgraded, the new
      // address gets its own event stream, and events on the old address
      // stay bound there forever. Querying only `latestPackageAddress`
      // silently drops historical activity (e.g. TWIN's 2000+ `store_data`
      // events on the prior `0xf951…cc13` package address). Same rationale
      // for deployer-matched projects (LayerZero, Tradeport, ObjectID, etc.)
      // where the project's `packages` set contains sibling packages, not
      // only an upgrade chain.
      let events = 0;
      let eventsCapped = false;
      const projectSenders = new Set<string>();
      for (const pkg of packages) {
        const pkgMods = (pkg.modules?.nodes || []).map((m) => m.name);
        for (const mod of pkgMods) {
          const result = await this.countEvents(`${pkg.address}::${mod}`);
          events += result.count;
          if (result.capped) eventsCapped = true;
          const senders = await this.updateSendersForModule(pkg.address, mod);
          senders.forEach((s) => projectSenders.add(s));
        }
      }
      // The `modules` snapshot field stays as the latest package's module
      // set — that's the current API surface, not a union across versions.
      const mods = latestMods;

      const team = getTeam(def.teamId) ?? null;
      const detectedDeployers = [
        ...new Set(
          packages
            .map((p) => p.previousTransactionBlock?.sender?.address?.toLowerCase())
            .filter((a): a is string => !!a),
        ),
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

      const firstPkg = packages[0]; // original deployment — address never changes
      const addrPrefix = firstPkg.address.slice(2, 8);
      projects.push({
        slug: `${addrPrefix}-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        name: displayName, layer: def.layer, category: def.category,
        description: def.description, urls: def.urls,
        packages: packages.length,
        packageAddress: firstPkg.address,
        latestPackageAddress: latestPkg.address,
        storageIota: Math.round(totalStorage * 10000) / 10000,
        events, eventsCapped, modules: mods,
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
        uniqueSenders: projectSenders.size,
        attribution: def.attribution ?? null,
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
          modules: [],
          tvl: chainTvl,
          tvlShared: null,
          tvlSharedWith: null,
          isCollectible: false,
          logo: null,
          logoWordmark: null,
          team: null,
          disclaimer: null,
          detectedDeployers: [],
          anomalousDeployers: [],
          uniqueSenders: 0,
          attribution: null,
        });
      }
    } catch (e) {
      this.logger.warn('DefiLlama fetch failed, L2 data unavailable', e);
    }

    projects.sort((a, b) => b.events - a.events);

    // Build unattributed clusters: one row per deployer, ranked so the loudest
    // unknowns (most packages, then biggest on-chain footprint) rise to the
    // top. Probe only the top N to keep the scan cheap — no point probing
    // long-tail one-off deployers on every 6-hour cycle.
    const UNATTRIBUTED_PROBE_CAP = 50;
    const unattributedRanked = [...unattributedByDeployer.entries()]
      .map(([deployer, packages]) => {
        const sortedPkgs = [...packages].sort((a, b) => Number(a.storageRebate) - Number(b.storageRebate));
        const storageIota = packages.reduce((s, p) => s + Number(p.storageRebate || 0), 0) / 1_000_000_000;
        return { deployer, packages: sortedPkgs, storageIota };
      })
      .sort((a, b) => {
        if (b.packages.length !== a.packages.length) return b.packages.length - a.packages.length;
        return b.storageIota - a.storageIota;
      });

    const unattributed: UnattributedCluster[] = [];
    for (let i = 0; i < unattributedRanked.length; i++) {
      const { deployer, packages, storageIota } = unattributedRanked[i];
      const firstPkg = packages[0];
      const latestPkg = packages[packages.length - 1];
      const modulesUnion = new Set<string>();
      for (const pkg of packages) {
        for (const m of pkg.modules?.nodes ?? []) modulesUnion.add(m.name);
      }
      let identifiers: string[] = [];
      let objectType: string | null = null;
      if (i < UNATTRIBUTED_PROBE_CAP) {
        // Pass 1 — object-based probe across all packages (heaviest → lightest).
        // Capture the first objectType seen as a fallback signal, but only
        // short-circuit on identifiers — a probe that returns objectType but
        // no idents (e.g. an internal Registry/Cap object whose fields are all
        // addresses) tells us the package owns *something* but doesn't give us
        // brand information, so we keep looking. The cluster's `latestPkg`
        // may be a deploy-but-uninstantiated upgrade while an earlier package
        // owns the objects we can read identity fields from.
        for (const pkg of [...packages].reverse()) {
          const probe = await this.probeIdentityFields(pkg.address);
          if (probe.objectType && !objectType) objectType = probe.objectType;
          if (probe.identifiers.length > 0) {
            identifiers = probe.identifiers;
            if (probe.objectType) objectType = probe.objectType;
            break;
          }
        }
        // Pass 2 — fallback for logic-only packages (e.g. CDP-style protocols
        // where the package contains stability_pool / borrow_incentive logic
        // but never owns objects of its own types). Reads TX effects to harvest
        // sibling-package types (`vusd::VUSD`, `cert::CERT`, …) as identity
        // signal. Runs whenever pass 1 didn't surface identifiers, even if it
        // captured an objectType — because the objectType alone (e.g. an
        // internal Registry) usually isn't brand-revealing.
        if (identifiers.length === 0) {
          for (const pkg of [...packages].reverse()) {
            const probe = await this.probeTxEffects(pkg.address);
            if (probe.identifiers.length > 0) {
              identifiers = probe.identifiers;
              if (!objectType && probe.objectType) objectType = probe.objectType;
              break;
            }
          }
        }
      }
      unattributed.push({
        deployer,
        packages: packages.length,
        firstPackageAddress: firstPkg.address,
        latestPackageAddress: latestPkg.address,
        storageIota: Math.round(storageIota * 10000) / 10000,
        modules: Array.from(modulesUnion).slice(0, 20),
        sampleIdentifiers: identifiers,
        sampledObjectType: objectType,
      });
    }
    const totalUnattributedPackages = unattributed.reduce((s, c) => s + c.packages, 0);
    this.logger.log(
      `Unattributed: ${unattributed.length} deployer cluster(s), ${totalUnattributedPackages} package(s)`,
    );

    const checkpointData: any = await this.graphql(`{ checkpoint { networkTotalTransactions } }`);
    const networkTxTotal = Number(checkpointData.checkpoint.networkTotalTransactions);
    const daysLive = 332;
    const secondsLive = daysLive * 86400;

    return {
      l1: projects.filter((p) => p.layer === 'L1'),
      l2: projects.filter((p) => p.layer === 'L2'),
      unattributed,
      totalProjects: projects.length,
      totalEvents: projects.reduce((sum, p) => sum + p.events, 0),
      totalStorageIota: Math.round(projects.reduce((sum, p) => sum + p.storageIota, 0) * 10000) / 10000,
      totalUnattributedPackages,
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
}
