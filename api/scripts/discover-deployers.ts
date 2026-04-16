/* eslint-disable no-console */
import { ALL_PROJECTS, ProjectDefinition } from '../src/ecosystem/projects';

const GRAPHQL_URL = 'https://graphql.mainnet.iota.cafe';

interface PkgNode {
  address: string;
  modules: { nodes: { name: string }[] };
  previousTransactionBlock: { sender: { address: string } | null } | null;
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

async function getAllPackages(): Promise<PkgNode[]> {
  const out: PkgNode[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 40; i++) {
    const after = cursor ? `, after: "${cursor}"` : '';
    const data: any = await graphql(`{
      packages(first: 50${after}) {
        nodes {
          address
          modules { nodes { name } }
          previousTransactionBlock { sender { address } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`);
    out.push(...data.packages.nodes);
    if (!data.packages.pageInfo.hasNextPage) break;
    cursor = data.packages.pageInfo.endCursor;
  }
  return out;
}

function matchProject(mods: Set<string>, address: string): ProjectDefinition | null {
  const lowerAddr = address.toLowerCase();
  for (const def of ALL_PROJECTS) {
    const { match } = def;
    if (match.packageAddresses?.length) {
      if (match.packageAddresses.some((a) => a.toLowerCase() === lowerAddr)) return def;
      continue;
    }
    if (match.exact) {
      const expected = new Set(match.exact);
      if (mods.size === expected.size && [...expected].every((m) => mods.has(m))) return def;
      continue;
    }
    if (match.all && !match.all.every((m) => mods.has(m))) continue;
    if (match.any && !match.any.some((m) => mods.has(m))) continue;
    if (match.minModules && mods.size < match.minModules) continue;
    return def;
  }
  return null;
}

(async () => {
  console.error('Fetching all mainnet packages...');
  const pkgs = await getAllPackages();
  console.error(`Got ${pkgs.length} packages. Matching against ${ALL_PROJECTS.length} project defs...`);

  const byProject = new Map<string, { deployers: Set<string>; packages: string[] }>();
  for (const pkg of pkgs) {
    if (pkg.address.startsWith('0x00000000000000000000000000000000000000000000000000000000000000')) continue;
    const deployer = pkg.previousTransactionBlock?.sender?.address;
    if (!deployer) continue;
    const mods = new Set((pkg.modules?.nodes || []).map((m) => m.name));
    const def = matchProject(mods, pkg.address);
    if (!def) continue;
    if (!byProject.has(def.name)) byProject.set(def.name, { deployers: new Set(), packages: [] });
    const entry = byProject.get(def.name)!;
    entry.deployers.add(deployer.toLowerCase());
    entry.packages.push(pkg.address);
  }

  const result: Record<string, { deployers: string[]; packageCount: number; samplePackages: string[] }> = {};
  for (const [name, { deployers, packages }] of [...byProject.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    result[name] = {
      deployers: [...deployers].sort(),
      packageCount: packages.length,
      samplePackages: packages.slice(0, 3),
    };
  }
  console.log(JSON.stringify(result, null, 2));
})();
