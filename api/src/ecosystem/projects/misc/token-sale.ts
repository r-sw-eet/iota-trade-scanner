import { ProjectDefinition } from '../project.interface';

export const tokenSale: ProjectDefinition = {
  name: 'Token Sale',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Token',
  description: 'SPEC Launchpad — token-sale infrastructure on IOTA Rebased. v1 spec_sale_multicoin and v2 spec_sale_v2 iterations. Launchpad brand for Studio 0x0a0d4c9a (Moron1337 / Spec Weekly); SPEC is the first token sold through it.',
  urls: [
    { label: 'SPEC sale', href: 'https://buy.spec-coin.cc' },
    { label: 'GitHub (Moron1337)', href: 'https://github.com/Moron1337' },
  ],
  teamId: 'studio-0a0d',
  match: { any: ['spec_sale_multicoin', 'spec_sale_v2'] },
  attribution: `
On-chain evidence: Move package containing at least one of \`spec_sale_multicoin\` or \`spec_sale_v2\`. The two module names correspond to the v1 (multicoin) and v2 iterations of the same launchpad contract; \`module:any\` covers both.

The \`spec_sale_v2\` packages declare a non-stdlib dependency on \`spec_coin\` at deployer \`0x4468c8ddb42728fd1194033c1dd14ffd015f0d81e4b5329ddc11793c989f3f39\` (SPEC-coin-only) — that secondary deployer is now registered on the same \`studio-0a0d\` team. The SPEC coin's CoinMetadata icon URL (\`raw.githubusercontent.com/Moron1337/SPEC/main/Spec.png\`) ties the launchpad to GitHub user Moron1337. The public sale UI at \`buy.spec-coin.cc\` states SPEC was "born in the speculative depths of the #speculations channel on IOTA Discord" with a meme-coin disclaimer.

Follow-up (not yet applied): one additional \`spec_packs\` module shipped by Studio 0a0d is uncaptured by this rule (expand \`any\` to include \`spec_packs\` when we next touch this file).

Previously attributed to a generic anonymous "Studio 0x0a0d4c9a"; updated 2026-04-18 after the downstream-dependency scan cracked Studio 0a0d's operator identity (see team attribution for the full Moron1337/Clawnera chain of evidence).
`.trim(),
};
