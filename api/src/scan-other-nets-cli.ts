/**
 * Discovery scan for IOTA testnet / devnet. Pages the most recent deployments,
 * clusters by deployer, probes a few Move objects per cluster for identifying
 * fields (tag / name / issuer / url / …), and emits the result.
 *
 * Intended as a "new on testnet this week" triage feed: teams frequently deploy
 * to testnet before mainnet, so this is where we spot projects *before* they
 * surface in `scan-unattributed-cli.ts`. Output is NOT auto-promoted into
 * `projects/` or `teams/` — deployer addresses don't carry over between
 * networks, so every row is a lead for manual review, not an attribution.
 *
 *   npx ts-node --transpile-only src/scan-other-nets-cli.ts testnet
 *   npx ts-node --transpile-only src/scan-other-nets-cli.ts devnet --table
 *   npx ts-node --transpile-only src/scan-other-nets-cli.ts testnet --pages 16 --top 20
 *
 * NOTE: This file carries its own (trimmed) copy of `probeIdentityFields`,
 * mirroring the duplication already called out in TODO.md's "Dedupe probe
 * logic" item. When the probes move to `api/src/ecosystem/probes/`, fold this
 * CLI in alongside `EcosystemService` and `scan-unattributed-cli.ts`.
 */

const ENDPOINTS: Record<string, string> = {
  testnet: 'https://graphql.testnet.iota.cafe',
  devnet: 'https://graphql.devnet.iota.cafe',
  mainnet: 'https://graphql.mainnet.iota.cafe',
};

const FRAMEWORK_PREFIX = '0x0000000000000000000000000000000000000000000000000000000000000';

interface Args {
  net: string;
  pages: number;
  top: number;
  probe: number;
  table: boolean;
}

function parseArgs(argv: string[]): Args {
  const pos = argv.filter((a) => !a.startsWith('--'));
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const net = pos[0] ?? 'testnet';
  if (!ENDPOINTS[net]) {
    throw new Error(`unknown network "${net}" — expected one of ${Object.keys(ENDPOINTS).join(', ')}`);
  }
  return {
    net,
    pages: Number(flag('pages') ?? 8),
    top: Number(flag('top') ?? 15),
    probe: Number(flag('probe') ?? 12),
    table: argv.includes('--table'),
  };
}

interface PackageInfo {
  address: string;
  storageRebate: string;
  modules: { nodes: { name: string }[] };
  previousTransactionBlock: { sender: { address: string } | null } | null;
}

async function graphql(url: string, query: string): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json: any = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

/**
 * Page backwards from the most recent deployment. `last:` + `before:` is the
 * opposite of `getAllPackages`'s `first:` + `after:` drain — we only want the
 * tail of the list since older testnet packages are noise that won't change
 * between runs.
 */
async function fetchRecentPackages(url: string, pages: number): Promise<PackageInfo[]> {
  const packages: PackageInfo[] = [];
  let cursor: string | null = null;
  for (let p = 0; p < pages; p++) {
    const before: string = cursor ? `, before: "${cursor}"` : '';
    const data: any = await graphql(url, `{
      packages(last: 50${before}) {
        nodes {
          address
          storageRebate
          modules { nodes { name } }
          previousTransactionBlock { sender { address } }
        }
        pageInfo { hasPreviousPage startCursor }
      }
    }`);
    packages.push(...data.packages.nodes);
    if (!data.packages.pageInfo.hasPreviousPage) break;
    cursor = data.packages.pageInfo.startCursor;
  }
  return packages;
}

async function probeIdentityFields(url: string, pkgAddress: string): Promise<{ identifiers: string[]; objectType: string | null }> {
  const identifierKeys = new Set([
    'tag', 'name', 'issuer', 'project', 'protocol',
    'collection_name', 'collection', 'title', 'symbol', 'ticker',
    'brand', 'url', 'website', 'publisher', 'creator', 'author',
  ]);
  const idents = new Set<string>();
  let sampledType: string | null = null;
  try {
    const data: any = await graphql(url, `{
      objects(filter: { type: "${pkgAddress}" }, first: 30) {
        nodes { asMoveObject { contents { type { repr } json } } }
      }
    }`);
    for (const n of data.objects?.nodes ?? []) {
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
        if (idents.size >= 6) break;
      }
      if (idents.size >= 6) break;
    }
  } catch {
    // best-effort probe; skip on GraphQL error
  }
  return { identifiers: Array.from(idents), objectType: sampledType };
}

interface Cluster {
  deployer: string;
  packageCount: number;
  storageIota: number;
  firstPackageAddress: string;
  latestPackageAddress: string;
  modules: string[];
  sampleIdentifiers: string[];
  sampledObjectType: string | null;
}

function shortAddr(addr: string): string {
  if (!addr || addr === 'unknown') return 'unknown';
  return `${addr.slice(0, 10)}…${addr.slice(-4)}`;
}

function renderTable(net: string, clusters: Cluster[], meta: { totalPkgs: number; totalDeployers: number; elapsed: string }): string {
  const lines: string[] = [];
  lines.push(`\n## ${net}  —  ${meta.totalPkgs} recent pkgs · ${meta.totalDeployers} deployers · ${meta.elapsed}s\n`);
  lines.push('| # | Deployer | Pkgs | Storage (IOTA) | Sample modules | Sample identifiers |');
  lines.push('|---|---|---:|---:|---|---|');
  clusters.forEach((c, i) => {
    const mods = c.modules.slice(0, 4).join(', ') + (c.modules.length > 4 ? ', …' : '');
    const idents = c.sampleIdentifiers.slice(0, 3).join(' · ') || '—';
    lines.push(`| ${i + 1} | \`${shortAddr(c.deployer)}\` | ${c.packageCount} | ${c.storageIota.toFixed(3)} | ${mods} | ${idents} |`);
  });
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = ENDPOINTS[args.net];
  const t0 = Date.now();
  console.error(`[${args.net}] paging last ${args.pages} pages from ${url}...`);
  const pkgs = await fetchRecentPackages(url, args.pages);
  console.error(`[${args.net}]   ${pkgs.length} packages`);

  const byDeployer = new Map<string, PackageInfo[]>();
  for (const pkg of pkgs) {
    if (pkg.address.startsWith(FRAMEWORK_PREFIX)) continue;
    const dep = pkg.previousTransactionBlock?.sender?.address?.toLowerCase() ?? 'unknown';
    const bucket = byDeployer.get(dep);
    if (bucket) bucket.push(pkg);
    else byDeployer.set(dep, [pkg]);
  }

  const ranked = [...byDeployer.entries()]
    .map(([deployer, packages]) => {
      const sortedPkgs = [...packages].sort((a, b) => Number(a.storageRebate) - Number(b.storageRebate));
      const storageIota = packages.reduce((s, p) => s + Number(p.storageRebate || 0), 0) / 1_000_000_000;
      const mods = new Set<string>();
      for (const pkg of packages) for (const m of pkg.modules?.nodes ?? []) mods.add(m.name);
      return { deployer, packages: sortedPkgs, storageIota, modules: Array.from(mods) };
    })
    .sort((a, b) =>
      b.packages.length !== a.packages.length
        ? b.packages.length - a.packages.length
        : b.storageIota - a.storageIota,
    )
    .slice(0, args.top);

  const clusters: Cluster[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    const latest = r.packages[r.packages.length - 1];
    const first = r.packages[0];
    let identifiers: string[] = [];
    let objectType: string | null = null;
    if (i < args.probe) {
      for (const pkg of [...r.packages].reverse()) {
        const probe = await probeIdentityFields(url, pkg.address);
        if (probe.identifiers.length > 0 || probe.objectType) {
          identifiers = probe.identifiers;
          objectType = probe.objectType;
          break;
        }
      }
    }
    clusters.push({
      deployer: r.deployer,
      packageCount: r.packages.length,
      storageIota: Math.round(r.storageIota * 10000) / 10000,
      firstPackageAddress: first.address,
      latestPackageAddress: latest.address,
      modules: r.modules.slice(0, 20),
      sampleIdentifiers: identifiers,
      sampledObjectType: objectType,
    });
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  if (args.table) {
    console.log(renderTable(args.net, clusters, {
      totalPkgs: pkgs.length,
      totalDeployers: byDeployer.size,
      elapsed,
    }));
  } else {
    console.log(JSON.stringify({
      net: args.net,
      scannedAt: new Date().toISOString(),
      totalRecentPackages: pkgs.length,
      totalDeployers: byDeployer.size,
      elapsedSeconds: Number(elapsed),
      clusters,
    }, null, 2));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
