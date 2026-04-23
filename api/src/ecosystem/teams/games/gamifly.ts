import { Team } from '../team.interface';

export const gamifly: Team = {
  id: 'gamifly',
  name: 'Gamifly',
  description: 'Web3 sports-gaming platform on IOTA Rebased, built by Aylab. Flagship product is Cricket Fly — a Play2Win Web3 cricket game targeting Pakistani cricket fans. On-chain NFT surface is in-game cosmetics / access tokens: four collection families (Aylab, Isla, Otterfly, Chamillion) totalling 9 packages across the one `0xfe407119…` deployer, all serving art from the `gamifly-nft` Google Cloud Storage bucket. IOTA Foundation-partnered launch; not IF-operated.',
  urls: [
    { label: 'Tournaments (gamifly.xyz)', href: 'https://www.gamifly.xyz' },
    { label: 'Cricket Fly (Play Store)', href: 'https://play.google.com/store/apps/details?id=com.alabs.cricket.scifi.league' },
    { label: 'Aylab (developer)', href: 'https://aylab.io' },
    { label: 'IOTA × Gamifly launch coverage', href: 'https://www.ainvest.com/news/iota-launches-cricket-themed-nft-initiative-pakistan-gamifly-2508/' },
  ],
  deployers: [{ address: '0xfe407119a75c69efebc82764e22e99429c3f5723f9b2e19c848789d8167e2cdb', network: 'mainnet' }],
  logo: '/logos/gamifly.png',
  attribution: `
Real-brand team, press-verified IOTA Foundation partnership, full attribution chain:

**Brand chain (what links the on-chain deployer to the public brand):**
- All 9 packages at deployer \`0xfe407119a75c69efebc82764e22e99429c3f5723f9b2e19c848789d8167e2cdb\` mint NFTs whose \`url.url\` field points at \`https://storage.googleapis.com/gamifly-nft/...\` — the \`gamifly-nft\` Google Cloud Storage bucket is the single smoking-gun link from the on-chain footprint to the Gamifly brand.
- Sampled asset names follow the internal theme: \`aylab_nft_1.png\`, \`aylab_nft_2.png\`, \`aylab_nft_3.png\`, \`islamabad_gold.png\`, \`islamabad_silver.png\` (explains why the on-chain modules are \`isla_gold\` / \`isla_silver\` — "Isla" is a truncation of Islamabad, Pakistan's capital; consistent with Gamifly's Pakistani-cricket-fans positioning), \`otter_fly_nft_1.png\` through \`_3.png\`, \`chamillion_nft.png\`.
- Operator: **Aylab** — a Web3 marketing agency (per \`aylab.io\`: "multi-channel, full-funnel Web3 marketing agency helping crypto, DeFi & NFT projects scale user acquisition and revenue fast") that builds Gamifly as its flagship gaming product. Explains the \`aylab_1/2/3\` module names (Aylab's own branded collections) shipped from the same deployer.

**Public product surfaces:**
- \`www.gamifly.xyz\` — Gamifly tournaments + MiniPay / mchamp.xyz game-discovery integration. Primary tournament platform.
- \`gamifly.io\` / \`gamifly.com\` — both Sedo-parked domain placeholders, not the real Gamifly surfaces (Gamifly doesn't own them).
- Google Play: \`com.alabs.cricket.scifi.league\` — "Cricket Fly x Gamifly" Android app ("alabs" = Aylab's Android package namespace).
- Aylab developer site: \`aylab.io\`.

**IOTA Foundation partnership:** press coverage (ainvest.com, HYPE Sports Innovation, cryptonews.net) confirms IOTA Foundation's launch partnership with Gamifly specifically for a cricket-themed NFT initiative in Pakistan, featuring NFTs of real Pakistani cricketers (Abrar Ahmad, Shadab Khan, Fazalhaq Farooqi). Gamifly's native utility token is **GMF** (not tracked separately here — not observed as an on-chain Coin type on IOTA mainnet in the 2026-04 snapshot; could live elsewhere or be pre-launch). Gamifly is the IOTA-partner brand, not an IF-operated product (so \`isIotaFoundationFamily\` is false / unset).

**On-chain footprint — 9 single-module packages, one per collection drop:**

| Module        | Package (first deploy)                                               | Struct          | Sample name      | Asset URL pattern                                                  |
|---------------|----------------------------------------------------------------------|-----------------|------------------|--------------------------------------------------------------------|
| \`aylab_1\`     | \`0x18f7a02f87e3611870a057e150b5e7313f0087e4df199ac982ea57f38d6b3b30\` | \`Aylab1NFT\`     | "Aylab 1"        | \`…/gamifly-nft/aylab_nft_1.png\`                                    |
| \`aylab_2\`     | \`0x850390d6d33626f132214b5c99ccda5363f502ccd7dc61f9b7685b505ebd079d\` | \`Aylab2NFT\`     | "Aylab 2"        | \`…/gamifly-nft/aylab_nft_2.png\`                                    |
| \`aylab_3\`     | \`0xbf1e1f471d7f7b54e1c13ffbd0cb96d72b12c206cb27663bc130edaf45599b95\` | \`Aylab3NFT\`     | "Aylab 3"        | \`…/gamifly-nft/aylab_nft_3.png\`                                    |
| \`isla_gold\`   | \`0xcc7b56e4a9207043db88a627004107d7b9842fe4727b8ea56f3a9e269c209ae9\` | \`IslaGoldNFT\`   | "Isla Gold"      | \`…/gamifly-nft/islamabad_gold.png\`                                 |
| \`isla_silver\` | \`0x2d91f8cdf578aafd67e2dbbcdc4c94643dc6057bf74b3758e8d3d719679bf8d0\` | \`IslaSilverNFT\` | "Isla Silver"    | \`…/gamifly-nft/islamabad_silver.png\`                               |
| \`otterfly_1\`  | \`0x35fa18242ac21488acad5214cad9df140ecfc2fd86591458a6bc65afa92b8eab\` | \`OtterFly1NFT\`  | "Otterfly 1"     | \`…/gamifly-nft/otter_fly_nft_1.png\`                                |
| \`otterfly_2\`  | \`0x2d8ae580ee457e3d9c86508da8659d877ee49c01f19c231907dbadeba6eeb78e\` | \`OtterFly2NFT\`  | "Otterfly 2"     | \`…/gamifly-nft/otter_fly_nft_2.png\`                                |
| \`otterfly_3\`  | \`0x467c17f519710abef65fb131fbf5698e93ec5f0afc08593aa7199d430dcbc337\` | \`OtterFly3NFT\`  | "Otterfly 3"     | \`…/gamifly-nft/otter_fly_nft_3.png\`                                |
| \`chamillion\`  | \`0x2d08391591c8f0d7e3ff87ef66d21f72da7ab8bf933b56efc398324334dff267\` | \`ChamillionNFT\` | "Chamillion"     | \`…/gamifly-nft/chamillion_nft.png\`                                 |

All 9 packages have a single module + an \`NFTMinted\` event struct; clean standardized shape. Packages are fanned into **4 theme-grouped project rows** on the dashboard (Aylab, Isla, Otterfly, Chamillion) rather than 9 individual rows, because the 1-2-3 numbered variants are the same conceptual drop in multiple editions; grouping keeps the row count manageable without hiding the branded families.

**Logo:** PNG extracted from the wrapped-SVG served at \`www.gamifly.xyz/images/gamifly_logo.svg\` (the site's "SVG" is actually a 1386×1380 base64-encoded PNG wrapped in SVG chrome). Decoded and tight-cropped to 256×256 transparent-canvas PNG for use as \`/logos/gamifly.png\`.
`.trim(),
};
