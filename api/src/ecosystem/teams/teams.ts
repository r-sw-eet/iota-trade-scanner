import { Team } from './team.interface';

/**
 * Team registry. Every project references exactly one team via `teamId`.
 *
 * A team groups:
 * - a real-world entity (IOTA Foundation, Virtue, Salus, …) OR an anonymous
 *   but observably-distinct developer (identified only by deployer address)
 * - one or more mainnet addresses that publish its packages
 * - one or more projects in the scanner
 *
 * Aggregate projects (NFT Collections, LayerZero OFT) have `teamId: null`
 * because they represent unrelated third-party deployments.
 */
export const ALL_TEAMS: Team[] = [
  // IOTA Foundation — identity stack
  {
    id: 'if-identity',
    name: 'IOTA Foundation (Identity)',
    description: 'IOTA Foundation identity stack — full Identity package, Web-of-Trust, and Credentials.',
    urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
    deployers: ['0x45745c3d1ef637cb8c920e2bbc8b05ae2f8dbeb28fd6fb601aea92a31f35408f'],
  },
  {
    id: 'if-notarization',
    name: 'IOTA Foundation (Notarization)',
    description: 'IOTA Foundation dynamic notarization contracts.',
    urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
    deployers: [
      '0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f',
      '0xedb0c77b6393a11b4c29b7914410e468680e3bc8110e99a40c203038c9335fc2',
    ],
  },
  {
    id: 'if-tlip',
    name: 'IOTA Foundation (TLIP)',
    description: 'Trade Logistics Information Pipeline — IF flagship trade digitization.',
    urls: [{ label: 'TLIP', href: 'https://tlip.io' }],
    deployers: ['0xd7e2de659109e51191f733479891c5a2e1e46476ab4bafe1f663755f145d5176'],
  },
  {
    id: 'if-traceability',
    name: 'IOTA Foundation (Traceability)',
    description: 'IOTA Foundation traceability stack.',
    urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
    deployers: [
      '0x46365ba3a2eab8639d41f8ff2be3adf50e384db5c7d81b0d726bfea5674fb3f5',
      '0x8009891c7a1f173f03b72a674c9a65016c65250813b00f0b20df8d23f1c8a639',
      '0xd604621407ca777658c5834c90c36a432b38f9ace39fe951a87c03f800515bbe',
    ],
  },

  // DeFi
  {
    id: 'pools-finance',
    name: 'Pools Finance',
    description: 'DEX + farming on IOTA Rebased. AMM router, pools, and farming contracts.',
    urls: [{ label: 'Website', href: 'https://pools.finance' }],
    deployers: [
      '0x519ebf6b900943042259f34bb17a6782061c5b6997d6c545c95a03271956800c',
      '0xeadab2493d7aff3ac3951e545e9c61bef93dee1915e18aff50414d72067f88e7',
    ],
  },
  {
    id: 'pools-farming',
    name: 'Pools Farming',
    description: 'Farming contracts — separate deployer from Pools Finance core.',
    deployers: ['0x21303d10b1369c414f297a6297e48d6bce07bec58f251ea842c7b33779283542'],
  },
  {
    id: 'virtue',
    name: 'Virtue Money',
    description: 'First native stablecoin (VUSD) protocol on IOTA — CDP, stability pool, flash loans.',
    urls: [
      { label: 'App', href: 'https://virtue.money' },
      { label: 'Docs', href: 'https://docs.virtue.money' },
    ],
    deployers: ['0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0'],
  },
  {
    id: 'virtue-pool',
    name: 'Virtue Pool (separate deployer)',
    description: 'Virtue-pool balance/accounting module, deployed separately from the core Virtue team.',
    deployers: ['0xf67d0193e9cd65c3c8232dbfe0694eb9e14397326bdc362a4fe9d590984f5a12'],
  },
  {
    id: 'swirl',
    name: 'Swirl',
    description: 'Liquid staking on IOTA.',
    deployers: ['0x043b7d4d89c36bfcd37510aadadb90275622cf603344f39b29648c543742351c'],
  },

  // Identity (non-IF)
  {
    id: 'oid',
    name: 'OID Identity',
    description: 'On-chain identity and credit scoring.',
    deployers: [
      '0x59dadd46e10bc3d890a0d20aa3fd1a460110eab5d368922ac1db02883434cc43',
      '0xbca71c7ae4b8f78e8ac038c4c8aca89d74432a6def0d6395cc5b5c898c66b596',
    ],
  },

  // Trade
  {
    id: 'salus',
    name: 'Salus Platform',
    description: 'Commodity tokenization — Digital Warehouse Receipts (DWRs) as NFTs with SHA-384 doc anchoring.',
    urls: [
      { label: 'Platform', href: 'https://salusplatform.com' },
      { label: 'Beta Nexus', href: 'https://nexus-beta.salusplatform.com' },
    ],
    deployers: ['0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225'],
  },

  // Bridges
  {
    id: 'ibtc',
    name: 'iBTC',
    description: 'Bitcoin bridge for IOTA.',
    deployers: ['0x95ec54247e108d3a15be965c5723fee29de62ab445c002fc1b8a48bfc6fb281e'],
  },
  {
    id: 'layerzero',
    name: 'LayerZero',
    description: 'LayerZero core endpoint protocol on IOTA.',
    urls: [{ label: 'Website', href: 'https://layerzero.network' }],
    deployers: ['0x8a81a6096a81fe2b722541bc19eb30e6c025732638375c362f07ea48979fd30a'],
  },
  {
    id: 'wormhole-foundation',
    name: 'Wormhole Foundation',
    description: 'Wormhole cross-chain messaging + the Pyth price-feed integration on IOTA (shared deployer).',
    urls: [
      { label: 'Wormhole', href: 'https://wormhole.com' },
      { label: 'Pyth', href: 'https://pyth.network' },
    ],
    deployers: ['0x610a7c8f0e7cb73d3c93d1b4919de1b76fc30a8efa8e967ccdbb1f7862ee6d27'],
  },

  // Oracles
  {
    id: 'switchboard',
    name: 'Switchboard',
    description: 'Switchboard oracle network on IOTA.',
    urls: [{ label: 'Website', href: 'https://switchboard.xyz' }],
    deployers: ['0x55f1256ec64d7c4eacb1a5e24932b9face3cdf9400f8d828001b2da0494e7404'],
  },

  // NFT
  {
    id: 'tradeport',
    name: 'Tradeport',
    description: 'NFT marketplace + NFT launchpad on IOTA (shared deployer).',
    urls: [{ label: 'Website', href: 'https://tradeport.xyz' }],
    deployers: [
      '0x20d666d8e759b3c0c3a094c2bac81794e437775c7e4d3d6fe33761ae063385f7',
      '0xae24ce73cd653c8199bc24afddc0c4ddbf0e9901d504c3b41066a6a396e8bf1e',
    ],
  },

  // Anonymous studios (identified only by deployer)
  {
    id: 'studio-b8b1',
    name: 'Studio 0xb8b1380e',
    description: 'Prolific anonymous developer — games (Chess, Tic-Tac-Toe, 2048), Gift Drop, and Vault.',
    deployers: ['0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6'],
  },
  {
    id: 'studio-0a0d',
    name: 'Studio 0x0a0d4c9a',
    description: 'Anonymous deployer behind Marketplace Escrow + Token Sale contracts.',
    deployers: ['0x0a0d4c9a9f935dac9f9bee55ca0632c187077a04d0dffcc479402f2de9a82140'],
  },

  // Single-project teams (name = project for now; rename when team identity known)
  {
    id: 'gambling',
    name: 'IOTA Flip / Roulette',
    description: 'On-chain gambling contracts.',
    deployers: ['0xbe95685023788ea57c6633564eab3fb919847ecd1234448e38e8951fbd4b6654'],
  },
  {
    id: 'easy-publish',
    name: 'Easy Publish',
    deployers: ['0x0dce85b04ae7d67de5c6785f329aac1c429cd9321724d64ba5961d347575db97'],
  },
  {
    id: 'points-system',
    name: 'Points System',
    deployers: ['0xd6a54ff7f851b58c19729c11d210d46fd46d702b9d9caff78747de1914c934ee'],
  },
  {
    id: 'bolt-protocol',
    name: 'Bolt Protocol',
    deployers: ['0x1d4ec616351c6be450771d2b291c41579177218da6c5735f2c80af8661f36da3'],
  },
  {
    id: 'staking-generic',
    name: 'Staking (generic)',
    deployers: ['0x9bd84e617831511634d8aca9120e90b07ba9e4fd920029e1fe4c887fc8599841'],
  },
];

/** Look up a team by its id. Returns undefined if not found. */
export function getTeam(id: string | null | undefined): Team | undefined {
  if (!id) return undefined;
  return ALL_TEAMS.find((t) => t.id === id);
}

/** Find the team that claims the given deployer address (lowercased compare). */
export function getTeamByDeployer(address: string): Team | undefined {
  const lower = address.toLowerCase();
  return ALL_TEAMS.find((t) => t.deployers.some((d) => d.toLowerCase() === lower));
}
