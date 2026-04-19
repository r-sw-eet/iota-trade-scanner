import { Team } from '../team.interface';

export const apeDao: Team = {
  id: 'ape-dao',
  name: 'ApeDAO',
  description: 'Community-centered joint-investment DAO in the IOTA and Shimmer ecosystem — DeFi-focused, governed by Ape-branded NFTs. Two generations of governance NFTs deployed on Rebased L1: **OG Ape** (1,074 supply, senior-tier) and **Lil\' Ape** (5,370 supply, newer/larger-pool tier). Both carry voting weight in DAO proposals. Native token APEin trades on ShimmerSea. A predecessor BAYC-derivative collection "REMIX! Club" (5,550 NFTs) lives on ShimmerEVM — the IOTA-side collections migrated here.',
  urls: [
    { label: 'Website', href: 'https://apedao.finance/' },
    { label: 'Medium blog', href: 'https://0xapedao.medium.com' },
    { label: 'Lightpaper', href: 'https://0xapedao.medium.com/all-eyes-on-the-apedao-lightpaper-45a4e88656de' },
    { label: 'REMIX! Club on OpenSea (legacy Shimmer)', href: 'https://opensea.io/collection/ape-dao-remix' },
  ],
  deployers: ['0x03ce67aaa3f321f24c07ffd864f719c922283de2d2880a03986c217dc2a3419b'],
  logo: '/logos/apedao.png',
  attribution: `
Brand attribution via public-web presence: \`apedao.finance\` is the DAO's main site; press coverage across CoinGecko, DappRadar, OpenSea, and IOTA-community news establishes ApeDAO as a DeFi hub for the IOTA/Shimmer ecosystem, governed by Ape NFTs with voting weight for both OG Ape and Lil' Ape holders.

**On-chain footprint:** 2 packages at deployer \`0x03ce67aaa3f321f24c07ffd864f719c922283de2d2880a03986c217dc2a3419b\`:

| Package                                                              | Module        | Total supply | Role                                              |
|----------------------------------------------------------------------|---------------|-------------:|---------------------------------------------------|
| \`0x2b148b762c93eabea3e1feeca52fc32e2cc9dce359054a9d7a7977230b5b75b6\` | \`ogape_nft\`   |        1,074 | OG Ape — senior-tier PFP, DAO voting weight       |
| \`0x809a8f9da21b396de77ba4d5a71217404036dd3de067442441b95a3548d5ea7b\` | \`lilape_nft\`  |        5,370 | Lil' Ape — newer/larger PFP tier, DAO voting      |

Both packages share an identical struct shape: \`MintCap\` (admin), \`NFTCollection\` (shared, tracks edition-to-id mapping + total_supply), the NFT struct itself (\`OGApeNFT\` / \`LilApeNFT\` with \`store, key\`), an OTW witness (\`OGAPE_NFT\` / \`LILAPE_NFT\`, \`drop\`), \`Traits\` (\`store\`), and \`MintingComplete\` / \`NFTMinted\` events. Clean production-scale collection architecture, **NOT** a synthetic studio experiment — 6,444 total NFTs minted across the two collections.

**Trait schemas** (cross-referenced between OG + Lil'):
- **OG Ape:** accessories, background, clothes, eyes, fur, hand, head, mouth — classic 8-attribute PFP layout.
- **Lil' Ape:** accessories, back, background, clothes, eyes, fur, hand, head, mouth — same plus a \`back\` slot for accessories like backpacks / wings / etc.

**Self-referencing branding:** some Lil' Ape accessories explicitly mention the DAO — e.g. \`accessories: "ApeDAO Necklace"\` and \`accessories: "FOMO Chain"\`. That's the smoking-gun link from on-chain metadata to the ApeDAO brand.

**Cross-ecosystem presence:** original community was on Shimmer (their REMIX! Club collection of 5,550 NFTs on ShimmerEVM at OpenSea contract \`0xfb61bd914d4cd5509ecbd4b16a0f96349e52db3d\`). The Rebased L1 Move deployment here is the canonical home for the OG + Lil' Ape collections now.

**Team flagged \`isIotaFoundationFamily: false\`** (unset) — community-driven DAO, not IF-operated.
`.trim(),
};
