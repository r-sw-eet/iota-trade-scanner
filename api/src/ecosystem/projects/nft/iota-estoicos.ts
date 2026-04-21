import { ProjectDefinition } from '../project.interface';

export const iotaEstoicos: ProjectDefinition = {
  name: 'IOTA Estoicos',
  layer: 'L1',
  category: 'NFT',
  description: 'Pre-launch philosophy-themed PFP collection on IOTA Rebased — 7 upgrade versions of the `estoicos` module from an anonymous deployer, but only 1 NFT minted so far (`IOTA Estoicos Genesis OG NFT #1`). Name is Portuguese / Spanish for "stoics". Image hosted on ImgBB (free image host) — placeholder-tier infrastructure. No public brand / site / socials surface — dev iterating on the contract pre-drop.',
  urls: [],
  teamId: 'studio-457d',
  isCollectible: true,
  match: {
    deployerAddresses: ['0x457dfa6b2594e250535af12d886f77ae3a32db63785830949927e8247f8c8a38'],
    all: ['estoicos'],
  },
  countTypes: ['estoicos::EstoicosNFT'],
  attribution: `
Matches the 7 packages on the studio-457d deployer whose module is \`estoicos\` — all 7 are upgrade versions of the same codebase, so they cleanly roll into one project row.

Struct set: \`EstoicosNFT\` (\`key\` only — the NFT can live on-chain but cannot be wrapped inside other \`store\`-requiring containers) + \`NFTMinted\` event. Minimal shape.

Sampled NFT: \`name: "IOTA Estoicos"\`, \`description: "IOTA Estoicos Genesis OG NFT"\`, \`number: "1"\`, \`image_url: "https://i.ibb.co/N6R3vPyL/estoicos.png"\`. Only 1 NFT minted across all 7 package versions — collection is firmly pre-launch.

Match rule: \`deployerAddresses\` + \`all: ['estoicos']\` (single-element) — pins the deployer AND requires the \`estoicos\` module name. Deployer appears to have only these 7 packages so the module-pin is redundant today, but futureproofs against the dev adding new unrelated modules later.

\`isCollectible: true\` — PFP collection (philosophy-themed), hidden by the "Hide collectibles" toggle. Team \`studio-457d\` is synthetic pending operator identification — promote to a named brand team if the collection launches publicly and we find a site / Twitter / Discord.
`.trim(),
};
