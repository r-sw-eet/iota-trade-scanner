/**
 * One-shot read-only scan: emits the `unattributed` clusters that would be
 * produced by `EcosystemService.fetchFull`, as a JSON array on stdout.
 * Shares the production match/probe logic but skips Mongo and Nest bootstrap
 * so it can be piped into `scripts/seed-from-prod.sh`.
 *
 *   npx ts-node --transpile-only src/scan-unattributed-cli.ts > unattributed.json
 */
import { ALL_PROJECTS, ProjectDefinition } from './ecosystem/projects';
import { ALL_TEAMS } from './ecosystem/teams';
import type { UnattributedCluster } from './ecosystem/ecosystem.service';

const GRAPHQL_URL = 'https://graphql.mainnet.iota.cafe';

interface PackageInfo {
  address: string;
  storageRebate: string;
  modules: { nodes: { name: string }[] };
  previousTransactionBlock: { sender: { address: string } | null } | null;
}

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

async function graphql(query: string): Promise<any> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json: any = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

function matchProject(mods: Set<string>, address: string, deployer: string | null): ProjectDefinition | null {
  const lowerAddr = address.toLowerCase();
  const lowerDeployer = deployer?.toLowerCase() ?? null;
  for (const def of ALL_PROJECTS) {
    if (!hasSyncMatch(def)) continue;
    const { match } = def;
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
    return def;
  }
  return null;
}

async function matchByFingerprint(mods: Set<string>, address: string): Promise<ProjectDefinition | null> {
  for (const def of ALL_PROJECTS) {
    const fp = def.match.fingerprint;
    if (!fp) continue;
    const fpModule = fp.type.split('::')[0];
    if (!mods.has(fpModule)) continue;
    try {
      const data: any = await graphql(`{
        objects(filter: { type: "${address}::${fp.type}" }, first: 1) {
          nodes { asMoveObject { contents { json } } }
        }
      }`);
      const fields = data.objects?.nodes?.[0]?.asMoveObject?.contents?.json;
      if (!fields) continue;
      if (fp.issuer && String(fields.issuer ?? '').toLowerCase() !== fp.issuer.toLowerCase()) continue;
      if (fp.tag && fields.tag !== fp.tag) continue;
      return def;
    } catch {}
  }
  return null;
}

async function probeIdentityFields(pkgAddress: string): Promise<{ identifiers: string[]; objectType: string | null }> {
  const identifierKeys = new Set([
    'tag', 'name', 'issuer', 'project', 'protocol',
    'collection_name', 'collection', 'title', 'symbol', 'ticker',
    'brand', 'url', 'website', 'publisher', 'creator', 'author',
  ]);
  const idents = new Set<string>();
  let sampledType: string | null = null;
  try {
    const data: any = await graphql(`{
      objects(filter: { type: "${pkgAddress}" }, first: 3) {
        nodes { asMoveObject { contents { type { repr } json } } }
      }
    }`);
    const nodes = data.objects?.nodes ?? [];
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
        if (trimmed.toLowerCase().startsWith('0x') && trimmed.length > 40) continue;
        idents.add(`${k}: ${trimmed}`);
        if (idents.size >= 20) break;
      }
      if (idents.size >= 20) break;
    }
  } catch {}
  return { identifiers: Array.from(idents), objectType: sampledType };
}

async function main() {
  console.error('Paging all mainnet packages...');
  const packages: PackageInfo[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 2000; page++) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const data: any = await graphql(`{
      packages(first: 50${afterClause}) {
        nodes { address storageRebate modules { nodes { name } } previousTransactionBlock { sender { address } } }
        pageInfo { hasNextPage endCursor }
      }
    }`);
    packages.push(...data.packages.nodes);
    if (!data.packages.pageInfo.hasNextPage) break;
    cursor = data.packages.pageInfo.endCursor;
  }
  console.error(`  ${packages.length} packages`);

  const claimedAddresses = new Set<string>();
  for (const def of ALL_PROJECTS) {
    for (const addr of def.match.packageAddresses ?? []) claimedAddresses.add(addr.toLowerCase());
  }

  const unattributedByDeployer = new Map<string, PackageInfo[]>();
  for (const pkg of packages) {
    if (pkg.address.startsWith('0x000000000000000000000000000000000000000000000000000000000000000')
      && !claimedAddresses.has(pkg.address.toLowerCase())) continue;
    const mods = new Set((pkg.modules?.nodes || []).map((m) => m.name));
    const pkgDeployer = pkg.previousTransactionBlock?.sender?.address ?? null;
    let def = matchProject(mods, pkg.address, pkgDeployer);
    if (def?.splitByDeployer) {
      const fp = await matchByFingerprint(mods, pkg.address);
      if (fp && fp.name !== def.name) def = fp;
    }
    if (!def) def = await matchByFingerprint(mods, pkg.address);
    if (def) continue;
    // Team-deployer routing mirrors ecosystem.service.ts — when a package
    // would split by deployer and that deployer is a known team's, it's
    // routed into the team's routing-only project rather than unattributed.
    const deployer = pkgDeployer?.toLowerCase() ?? null;
    if (deployer) {
      const candidateTeams = ALL_TEAMS.filter((t) => t.deployers.some((d) => d.toLowerCase() === deployer));
      let routed = false;
      for (const team of candidateTeams) {
        const routingOnly = ALL_PROJECTS.find((p) => p.teamId === team.id && !hasSyncMatch(p));
        if (routingOnly) { routed = true; break; }
      }
      if (routed) continue;
    }
    const key = deployer ?? 'unknown';
    const bucket = unattributedByDeployer.get(key);
    if (bucket) bucket.push(pkg);
    else unattributedByDeployer.set(key, [pkg]);
  }
  console.error(`  ${unattributedByDeployer.size} unattributed deployer clusters`);

  const ranked = [...unattributedByDeployer.entries()]
    .map(([deployer, pkgs]) => {
      const sortedPkgs = [...pkgs].sort((a, b) => Number(a.storageRebate) - Number(b.storageRebate));
      const storageIota = pkgs.reduce((s, p) => s + Number(p.storageRebate || 0), 0) / 1_000_000_000;
      return { deployer, packages: sortedPkgs, storageIota };
    })
    .sort((a, b) => (b.packages.length - a.packages.length) || (b.storageIota - a.storageIota));

  const PROBE_CAP = 50;
  const out: UnattributedCluster[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const { deployer, packages, storageIota } = ranked[i];
    const firstPkg = packages[0];
    const latestPkg = packages[packages.length - 1];
    const modulesUnion = new Set<string>();
    for (const pkg of packages) for (const m of pkg.modules?.nodes ?? []) modulesUnion.add(m.name);
    let identifiers: string[] = [];
    let objectType: string | null = null;
    if (i < PROBE_CAP) {
      const p = await probeIdentityFields(latestPkg.address);
      identifiers = p.identifiers;
      objectType = p.objectType;
    }
    out.push({
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
  console.log(JSON.stringify(out));
}

main().catch((e) => { console.error(e); process.exit(1); });
