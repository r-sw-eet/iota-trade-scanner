/* eslint-disable no-console */
/**
 * One-shot survey: find candidate "scaffold" clusters across the latest
 * mainnet snapshot.
 *
 * A scaffold cluster = a deployer that publishes ≥2 packages where SOME
 * (but not all) share a non-trivial set of struct types (size ≥2). The
 * with-scaffold subset is a candidate for a dedicated project def keyed
 * on `match.objectTypes`; the without-scaffold subset stays where it is.
 *
 * Born out of the TWIN/IF-Testing shared-deployer split (2026-04-25):
 * `0x164625…9abe` publishes 18 packages — 8 carry the
 * `MigrationState`+`UpgradeCapRegistry` scaffold (TWIN), 10 don't (IF
 * Testing fixtures). The same shape likely exists on other shared
 * deployers; this script's job is to surface them all in one pass.
 *
 * Reads from local Mongo (`MONGODB_URI` env or `mongodb://localhost:27019/scanner`).
 * Handles both the legacy embedded `OnchainSnapshot.packages[]` and the
 * post-2026-04-24 split `packagefacts` collection.
 *
 * Run: `npx ts-node -r tsconfig-paths/register scripts/scan-scaffold-clusters.ts`
 */
import { MongoClient, Db } from 'mongodb';
import { ALL_PROJECTS, ProjectDefinition } from '../src/ecosystem/projects';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27019/scanner';

interface PackageSlim {
  address: string;
  deployer: string | null;
  modules: string[];
  structNames: Set<string>;
}

/** Reproduce the synchronous matcher from ecosystem.service.ts so the script
 *  reflects post-objectTypes routing — including any future scaffold-keyed defs. */
function matchProject(pkg: PackageSlim): ProjectDefinition | null {
  const lowerAddr = pkg.address.toLowerCase();
  const lowerDeployer = pkg.deployer?.toLowerCase() ?? null;
  const mods = new Set(pkg.modules);
  for (const def of ALL_PROJECTS) {
    if ((def.network ?? 'mainnet') !== 'mainnet') continue;
    const { match } = def;
    const hasSync =
      (match.packageAddresses?.length ?? 0) > 0 ||
      (match.deployerAddresses?.length ?? 0) > 0 ||
      (match.exact?.length ?? 0) > 0 ||
      (match.all?.length ?? 0) > 0 ||
      (match.any?.length ?? 0) > 0 ||
      (match.minModules ?? 0) > 0 ||
      (match.objectTypes?.length ?? 0) > 0;
    if (!hasSync) continue;

    if (match.packageAddresses?.length && !match.packageAddresses.some((a) => a.toLowerCase() === lowerAddr)) continue;
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
    if (match.objectTypes?.length && !match.objectTypes.every((t) => pkg.structNames.has(t))) continue;
    return def;
  }
  return null;
}

async function loadLatestSnapshotPackages(db: Db): Promise<PackageSlim[]> {
  const snap = await db
    .collection('onchainsnapshots')
    .find({}, { projection: { _id: 1, packages: 1, network: 1 } })
    .sort({ _id: -1 })
    .limit(1)
    .next();
  if (!snap) throw new Error('no snapshots found');

  const network = (snap as any).network ?? 'mainnet';
  if (network !== 'mainnet') {
    console.error(`WARN: latest snapshot is network=${network}; this script targets mainnet shape but proceeding anyway.`);
  }

  const toSlim = (p: any): PackageSlim => {
    const structNames = new Set<string>();
    for (const tc of p.objectTypeCounts ?? []) {
      const last = String(tc.type).split('::').pop();
      if (last) structNames.add(last);
    }
    return {
      address: String(p.address),
      deployer: p.deployer ? String(p.deployer) : null,
      modules: (p.modules ?? []).map(String),
      structNames,
    };
  };

  const embedded = (snap as any).packages;
  if (Array.isArray(embedded) && embedded.length > 0) {
    console.error(`Latest snapshot _id=${(snap as any)._id} (embedded packages: ${embedded.length})`);
    return embedded.map(toSlim);
  }

  const facts = await db
    .collection('packagefacts')
    .find(
      { snapshotId: (snap as any)._id },
      { projection: { address: 1, deployer: 1, modules: 1, objectTypeCounts: 1 } },
    )
    .toArray();
  console.error(`Latest snapshot _id=${(snap as any)._id} (split packagefacts: ${facts.length})`);
  if (facts.length === 0) {
    throw new Error('no packages found on the latest snapshot (neither embedded nor in packagefacts)');
  }
  return facts.map(toSlim);
}

interface Cluster {
  deployer: string;
  scaffold: string[];
  with: PackageSlim[];
  without: PackageSlim[];
  attributionWith: Map<string, number>;
  attributionWithout: Map<string, number>;
}

/** For one deployer's packages, enumerate candidate scaffolds (sets of struct
 *  names of size ≥2 that split the deployer's packages into a non-empty
 *  with-group and a non-empty without-group). Greedy — picks the largest
 *  scaffold that maximises the with-group size. */
function findCandidateScaffolds(pkgs: PackageSlim[]): { scaffold: string[]; with: PackageSlim[]; without: PackageSlim[] }[] {
  // Universal struct names — present on every package; not useful as a split signal.
  const universal = new Set<string>();
  if (pkgs.length > 0) {
    for (const s of pkgs[0].structNames) {
      if (pkgs.every((p) => p.structNames.has(s))) universal.add(s);
    }
  }

  // Count how many packages each non-universal struct name appears on.
  const counts = new Map<string, number>();
  for (const p of pkgs) {
    for (const s of p.structNames) {
      if (universal.has(s)) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }

  // Discriminating struct names = appear on ≥2 but not all of the deployer's packages.
  const discriminating = [...counts.entries()]
    .filter(([, n]) => n >= 2 && n < pkgs.length)
    .map(([s]) => s);

  // Try every 2-subset of discriminating names as a candidate scaffold.
  // Stop at 2-subsets — larger scaffolds reduce to a 2-subset of themselves.
  const seen = new Set<string>();
  const candidates: { scaffold: string[]; with: PackageSlim[]; without: PackageSlim[] }[] = [];
  for (let i = 0; i < discriminating.length; i++) {
    for (let j = i + 1; j < discriminating.length; j++) {
      const a = discriminating[i];
      const b = discriminating[j];
      const key = [a, b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const withGroup: PackageSlim[] = [];
      const withoutGroup: PackageSlim[] = [];
      for (const p of pkgs) {
        if (p.structNames.has(a) && p.structNames.has(b)) withGroup.push(p);
        else withoutGroup.push(p);
      }
      if (withGroup.length < 2 || withoutGroup.length < 1) continue;
      candidates.push({ scaffold: [a, b].sort(), with: withGroup, without: withoutGroup });
    }
  }

  // Dedup: if scaffold {A,B} produces the same with-group as {A,C}, both are
  // really pointing at the same cluster — keep the one whose scaffold is more
  // discriminating (i.e. its types appear on the FEWEST other packages — most
  // narrowly identifying). Implemented by grouping on with-group address-set.
  const byWithGroup = new Map<string, typeof candidates[number][]>();
  for (const c of candidates) {
    const key = c.with.map((p) => p.address).sort().join(',');
    if (!byWithGroup.has(key)) byWithGroup.set(key, []);
    byWithGroup.get(key)!.push(c);
  }
  const deduped: typeof candidates = [];
  for (const group of byWithGroup.values()) {
    // Same with-group, multiple scaffolds — merge their scaffold types into one
    // (since all of them are collectively distinctive of this cluster).
    const allTypes = new Set<string>();
    for (const c of group) for (const t of c.scaffold) allTypes.add(t);
    deduped.push({ scaffold: [...allTypes].sort(), with: group[0].with, without: group[0].without });
  }

  // Sort by with-group size descending, then by scaffold size descending.
  deduped.sort((a, b) => b.with.length - a.with.length || b.scaffold.length - a.scaffold.length);
  return deduped;
}

(async () => {
  const client = await MongoClient.connect(MONGODB_URI);
  try {
    const db = client.db();
    const pkgs = await loadLatestSnapshotPackages(db);
    console.error(`Loaded ${pkgs.length} packages.`);

    // Group by deployer; skip null-deployer (framework / legacy) and singletons.
    const byDeployer = new Map<string, PackageSlim[]>();
    for (const p of pkgs) {
      if (!p.deployer) continue;
      const d = p.deployer.toLowerCase();
      if (!byDeployer.has(d)) byDeployer.set(d, []);
      byDeployer.get(d)!.push(p);
    }

    const allClusters: Cluster[] = [];
    for (const [deployer, group] of byDeployer.entries()) {
      if (group.length < 2) continue;
      const scaffolds = findCandidateScaffolds(group);
      for (const s of scaffolds) {
        const attributionWith = new Map<string, number>();
        const attributionWithout = new Map<string, number>();
        for (const p of s.with) {
          const def = matchProject(p);
          const name = def?.name ?? '(unattributed)';
          attributionWith.set(name, (attributionWith.get(name) ?? 0) + 1);
        }
        for (const p of s.without) {
          const def = matchProject(p);
          const name = def?.name ?? '(unattributed)';
          attributionWithout.set(name, (attributionWithout.get(name) ?? 0) + 1);
        }
        allClusters.push({
          deployer,
          scaffold: s.scaffold,
          with: s.with,
          without: s.without,
          attributionWith,
          attributionWithout,
        });
      }
    }

    console.error(`Found ${allClusters.length} candidate scaffold clusters across ${byDeployer.size} deployers.`);
    console.error('');

    // Rank clusters: actionable first.
    // 1. Mis-routing (with-group and without-group attributed to different projects → likely split candidate).
    // 2. Orphan scaffold (with-group is fully unattributed → candidate for a new def).
    // 3. Same-attribution (informational — scaffold confirms a single project's structural fingerprint).
    type Bucket = 'mis-routing' | 'orphan-with' | 'orphan-without' | 'same-attribution';
    const bucketize = (c: Cluster): Bucket => {
      const withNames = new Set([...c.attributionWith.keys()].filter((n) => n !== '(unattributed)'));
      const withoutNames = new Set([...c.attributionWithout.keys()].filter((n) => n !== '(unattributed)'));
      const withOnlyOrphan = c.attributionWith.has('(unattributed)') && withNames.size === 0;
      const withoutOnlyOrphan = c.attributionWithout.has('(unattributed)') && withoutNames.size === 0;
      if (withOnlyOrphan && withoutNames.size > 0) return 'orphan-with';
      if (withoutOnlyOrphan && withNames.size > 0) return 'orphan-without';
      const overlap = [...withNames].some((n) => withoutNames.has(n));
      if (withNames.size > 0 && withoutNames.size > 0 && !overlap) return 'mis-routing';
      return 'same-attribution';
    };

    const buckets: Record<Bucket, Cluster[]> = {
      'mis-routing': [],
      'orphan-with': [],
      'orphan-without': [],
      'same-attribution': [],
    };
    for (const c of allClusters) buckets[bucketize(c)].push(c);

    const fmtAddr = (s: string) => `${s.slice(0, 12)}…`;
    const fmtAttr = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${c}× ${n}`).join(', ');

    const printBucket = (label: string, list: Cluster[]) => {
      if (list.length === 0) return;
      console.log(`\n=== ${label} (${list.length}) ===`);
      for (const c of list) {
        console.log(`\nDeployer ${fmtAddr(c.deployer)}  scaffold=[${c.scaffold.join(', ')}]`);
        console.log(`  WITH    (${c.with.length}): ${fmtAttr(c.attributionWith)}`);
        console.log(`           ${c.with.slice(0, 6).map((p) => fmtAddr(p.address)).join(' ')}${c.with.length > 6 ? ` …+${c.with.length - 6}` : ''}`);
        console.log(`  WITHOUT (${c.without.length}): ${fmtAttr(c.attributionWithout)}`);
        console.log(`           ${c.without.slice(0, 6).map((p) => fmtAddr(p.address)).join(' ')}${c.without.length > 6 ? ` …+${c.without.length - 6}` : ''}`);
      }
    };

    printBucket('MIS-ROUTING (different attribution between with/without — likely split candidate)', buckets['mis-routing']);
    printBucket('ORPHAN-WITH (scaffold-bearing packages unattributed — candidate for new def)', buckets['orphan-with']);
    printBucket('ORPHAN-WITHOUT (without-scaffold packages unattributed — could clarify routing)', buckets['orphan-without']);
    printBucket('SAME-ATTRIBUTION (scaffold confirms an existing project — informational)', buckets['same-attribution']);
  } finally {
    await client.close();
  }
})();
