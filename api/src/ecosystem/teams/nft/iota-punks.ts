import { Team } from '../team.interface';

export const iotaPunks: Team = {
  id: 'iota-punks',
  name: 'IOTAPUNKS',
  description: 'Community-driven collectible NFT project inspired by CryptoPunks but re-imagined with traits modelled on well-known figures from the IOTA Foundation / community (character names like "Holger" in the NFT traits confirm this). 32×32 algorithmically-generated pixel-art PFPs. 15,555 total planned per the team\'s site (`iotapunks.com` — tagline: "soon is now"); 89 minted on IOTA Rebased mainnet so far. Originally distributed in the Stardust era (Figment Marketplace listing for old IOTA EVM), now re-materialised on Rebased L1 Move.',
  urls: [
    { label: 'Website', href: 'https://iotapunks.com/' },
    { label: 'Discord', href: 'https://discord.gg/62dMNp6HXX' },
    { label: 'Twitter', href: 'https://x.com/IotaPunks_71' },
    { label: 'Figment Marketplace (legacy EVM)', href: 'https://www.figment.exchange/collections/0xa29b4352c170077ced94cd4d45d1de0f519841a6' },
  ],
  deployers: [{ address: '0x8bfa0f4ba8ab9b2849e8fb99bcd4d43b9fdab2cf84f20e5d7a117ad74ab165ea', network: 'mainnet' }],
  logo: '/logos/iotapunks.png',
  attribution: `
Brand attribution via \`iotapunks.com\`: the site's \`og:title\` is "IOTAPUNKS - soon is now", its \`og:description\` matches the on-chain product shape exactly ("community-driven collectibles NFT project … using Cryptopunk as base design to then combine them"), and the project's Twitter handle \`@IotaPunks_71\` + Discord invite \`discord.gg/62dMNp6HXX\` surface a live community presence.

**On-chain footprint:** 1 package at deployer \`0x8bfa0f4ba8ab9b2849e8fb99bcd4d43b9fdab2cf84f20e5d7a117ad74ab165ea\`, package \`0x65034c5392fbc59cc5b6d20a4e5980a0dc4cd65fe6c5762d8f5b4fe0c9e2cd31\`, single module \`iotapunks\`. Full struct set: \`IOTAPUNKS\` (OTW, \`drop\`), \`IotaPunk\` (the NFT, \`store, key\`), \`Collection\` (\`key\`), \`AdminCap\` (\`store, key\`), \`RelayerCap\` (\`key\`), \`Traits\` (\`drop, store\`), plus events \`PunkMinted\` / \`TeamPunkMinted\` / \`ImageBaseUrlUpdated\` / \`CollectionFrozen\` / \`SwapStatusChanged\`.

**Shared Collection object** (\`0x588554523e1350e3f466f206f6b19849e11d79d8a26fd789bac66a744f561643\`) surfaces:
- \`total_minted: "89"\` (of 15,555 planned per the site)
- \`image_base_url: "ipfs://bafybeihw47umnrf6b6kuzpqivxdl3y7w4575qpe3upt47lbt6ql3fgjaae/"\` (IPFS-hosted collection images)
- \`swap_open: true\` — the contract supports a swap mechanism (likely for old-chain → Rebased migration)
- \`frozen: false\`

**NFT field shape (example \`IOTAPUNKS #13167\`):**
\`\`\`
{ token_id: "13167",
  name: "IOTAPUNKS #13167",
  image_url: "ipfs://<CID>/13167.png",
  traits: { edition, background, characters, hair, beard, style,
            clothing_color, headwear, facewear, ranking, rarity } }
\`\`\`
Traits map cleanly to classic PFP attributes. The \`characters\` field is the giveaway for the IF-figures concept — sampled NFT had \`characters: "Holger"\`, likely referencing Holger Köther (then IOTA Foundation Director of Partnerships) or a similar community figure.

**Ecosystem context:** IOTAPUNKS predates Rebased — the legacy Figment Marketplace listing for IOTA EVM (chain ID \`0xa29b4352c170077ced94cd4d45d1de0f519841a6\`) shows the original 2022-era drop; the site mentions the transition to live on-chain NFTs "once IOTAEVM (L-2) allows minting". The current L1 Move deployment at \`0x8bfa0f4b…\` is the Rebased-era materialisation, with minting ramping up gradually (89 / 15,555 at 2026-04 snapshot).

**Ownership:** community-driven / anonymous team collective rather than a single identifiable founder. No formal Ltd or legal entity found on the site. Project uses its own domain + social channels; classification as its own team (\`iota-punks\`, \`isIotaFoundationFamily: false\`) rather than rolled into iota-foundation — the content references IF figures but the project itself is independent fan/community work, not IF-operated.
`.trim(),
};
