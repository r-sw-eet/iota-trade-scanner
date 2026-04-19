import { Team } from '../team.interface';

export const magicsea: Team = {
  id: 'magicsea',
  name: 'MagicSea',
  description: 'Native DEX on ShimmerEVM (and, via DefiLlama, on IOTA EVM L2) that evolved from "TangleSea" → "ShimmerSea" → MagicSea. Runs an AMM, a Liquidity-Book (LB) DEX, an NFT marketplace, and a native utility + governance token `$LUM` + `$MAGIC` with lock-boosted staking. Distinct on-chain products on IOTA Rebased L1 so far: **Lumis** — the 3,333-supply community PFP collection that was first minted on ShimmerEVM and has been re-materialised on Rebased L1 Move. Lumis holders get fair-launch whitelist access + governance voice.',
  urls: [
    { label: 'Website', href: 'https://app.magicsea.finance/' },
    { label: 'Docs', href: 'https://docs.magicsea.finance/' },
    { label: 'Medium blog', href: 'https://magicseadex.medium.com/' },
    { label: 'Lumis docs', href: 'https://docs.magicsea.finance/protocol/nft-marketplace/lumis' },
  ],
  deployers: ['0xddcfad87825d172c5810da3989d687d860142ca007f5d64264068c6bd4267af4'],
  logo: '/logos/magicsea.png',
  attribution: `
Named-brand attribution via docs.magicsea.finance/protocol/nft-marketplace/lumis, which is the canonical MagicSea doc page for the Lumis NFT collection. The on-chain Lumis collection matches the documented shape exactly: 3,333 total supply, 3-trait PFP (\`background\`, \`body\`, \`face\`), community-distributed, governance-adjacent utility.

**On-chain footprint so far (Rebased L1):** 1 package at deployer \`0xddcfad87825d172c5810da3989d687d860142ca007f5d64264068c6bd4267af4\`, package \`0x6a1e3e9cac9e24442bdf7f6b53919e72b134f7931cbd850a13451f346d3987a0\`, single module \`lumi_nft\`. Full struct set: \`LumiNFT\` (\`store, key\`), \`LUMI_NFT\` (OTW, \`drop\`), \`NFTCollection\` (shared), \`MintCap\` (admin), \`Traits\` (helper), \`MintingComplete\` / \`NFTMinted\` events — same production-scale collection architecture as ApeDAO's Apes + IOTAPUNKS. Collection object \`0x084428b754711c2036e0a1646134a9177ecf0a2d132b77f5e4dcfea390f15b5d\` tracks \`total_supply: 3333\` with full \`edition_to_id\` table.

**Ecosystem evolution (per MagicSea's own Medium posts):** TangleSea was the original ShimmerSea community team; they renamed their DEX to MagicSea and their governance/utility token stack now spans \`$LUM\` + \`$MAGIC\` (with Magic-LUM lock-boosted staking). Lumis were never sold during their original distribution — they were airdropped to community members who had been with (what's now) MagicSea for years. The on-chain Rebased deployment here mirrors that original ShimmerEVM mint.

**Rarity / distribution signals from the docs:** most Lumis share the same utility tier but a few are explicitly rare (Lumi Pirate, Lumi Bot, golden / bronze / silver Lumi). Those show up in the on-chain \`traits\` as specific trait-value combinations (probably via the \`body\` or \`face\` slot).

**Other MagicSea products currently tracked:** the DefiLlama-derived L2 rows \`MagicSea AMM\` and \`MagicSea LB\` on IOTA EVM (see \`ProjectLogo.vue\`'s \`l2LogoMap\`). Rebased L1 Move does not host the DEX core — only the Lumis collection so far. If MagicSea ever ships a Move-native swap contract on L1, it should be added to this team's deployer list.
`.trim(),
};
