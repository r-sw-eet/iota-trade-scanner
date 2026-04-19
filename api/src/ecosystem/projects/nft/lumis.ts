import { ProjectDefinition } from '../project.interface';

export const lumis: ProjectDefinition = {
  name: 'Lumis',
  layer: 'L1',
  category: 'NFT',
  description: 'MagicSea\'s 3,333-supply community PFP collection (symbols of friendship, originally airdropped to long-time ShimmerSea community members). Re-materialised on IOTA Rebased L1 Move. Lumi holders get $LUM fair-launch whitelist + governance voice. 3-trait PFP shape (`background` / `body` / `face`), with rare variants (Lumi Pirate, Lumi Bot, golden/bronze/silver). Single package at `0x6a1e3e9c…`, module `lumi_nft`. Not a dumb collectible exactly — carries DAO utility — but stays `isCollectible: true` for dashboard consistency with other governance-NFT rows (ApeDAO Apes).',
  urls: [
    { label: 'Lumis docs', href: 'https://docs.magicsea.finance/protocol/nft-marketplace/lumis' },
    { label: 'MagicSea', href: 'https://app.magicsea.finance/' },
  ],
  teamId: 'magicsea',
  isCollectible: true,
  match: {
    deployerAddresses: ['0xddcfad87825d172c5810da3989d687d860142ca007f5d64264068c6bd4267af4'],
    all: ['lumi_nft'],
  },
  attribution: `
Matches the single package at MagicSea's deployer \`0xddcfad87825d172c5810da3989d687d860142ca007f5d64264068c6bd4267af4\` whose module is \`lumi_nft\` — \`0x6a1e3e9cac9e24442bdf7f6b53919e72b134f7931cbd850a13451f346d3987a0\`. Struct set mirrors other production PFP collections on Rebased (OG Ape, Lil' Ape, IOTAPUNKS): \`LumiNFT\` (the NFT, \`store, key\`), \`LUMI_NFT\` (OTW witness, \`drop\`), shared \`NFTCollection\` object, \`MintCap\`, \`Traits\` (\`store\`), plus \`MintingComplete\` and \`NFTMinted\` events.

**Collection object:** \`0x084428b754711c2036e0a1646134a9177ecf0a2d132b77f5e4dcfea390f15b5d\`, \`total_supply: 3333\`, full \`edition_to_id\` table. Matches MagicSea's documented 3,333-supply figure (docs.magicsea.finance/protocol/nft-marketplace/lumis).

**Sampled NFTs:**
- Lumi #2639 — traits \`{ background: "Red", body: "Guess", face: "Enraged" }\`, image \`ipfs://bafybeifhpq3f2enefzxdzw7brtyo42y624kakntvlpn3gm7h46eg22mt4u\`
- Lumi #202 — traits \`{ background: "Purple", body: "Leup", face: "Yawn" }\`, image \`ipfs://bafybeiaydpxff3bju2qsdgso5ckjkie6s3qcmabzrwlinb2swymzu2lg64\`

The minimalist 3-trait shape and one-image-per-NFT pattern (no shared image directory — each Lumi has its own IPFS CID) is distinctive: whereas ApeDAO's Apes share a common IPFS folder with numbered files, each Lumi is individually pinned. Matches MagicSea's described "no two identical Lumis" uniqueness angle.

Match rule: deployer-pin + \`all: ['lumi_nft']\` (single-element) — same tight pattern used for the ApeDAO collections on their multi-module deployer. Here there's only one package on MagicSea's Rebased deployer so far, but the module-pin future-proofs against MagicSea adding other Move modules at this address later.

\`isCollectible: true\` — PFP collection with governance utility; hidden by the "Hide collectibles" toggle, consistent with the ApeDAO / IOTAPUNKS treatment. Team \`magicsea\` carries the full brand context (evolution from TangleSea → ShimmerSea → MagicSea, native $LUM + $MAGIC tokens, Magic-LUM lock-boosted staking, ShimmerEVM origin).
`.trim(),
};
