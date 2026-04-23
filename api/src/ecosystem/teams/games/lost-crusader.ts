import { Team } from '../team.interface';

/**
 * Lost Crusader — MMO game in the Q1 2026 "Grant Phase" of IOTA mainnet
 * integration. Site `lostcrusader.xyz`; in-game daily-claim mini-site at
 * `arcanerush.lostcrusader.xyz`; PWA at `play.lostcrusader.xyz`.
 *
 * Attribution anchored by the exact on-chain description string embedded in
 * every minted \`ArcaneDust\` NFT:
 *
 *   *"A measure of daily devotion from the Lost Crusader. This Arcane Dust
 *    is a non-transferable token from the Arcane Rush event, redeemable
 *    once per day as proof of your continued participation"*
 *
 * The "Lost Crusader" + "Arcane Rush" brand pair is the game's own
 * marketing language (lostcrusader.xyz's roadmap lists "Join the Arcane
 * Rush" as a Q1 2026 milestone), so the on-chain string is an explicit
 * brand self-attestation.
 */
export const lostCrusader: Team = {
  id: 'lost-crusader',
  name: 'Lost Crusader',
  description: 'Browser-based MMO of "conflict and faith" (studio name not published). Roadmap: Q4 2025 Build Phase → Q1 2026 Grant Phase (IOTA mainnet integration) → Q2 2026 Alpha Launch (Season 0 + Android soft-launch) → Q3 2026 NFT Collection + brand partnership. In-game daily-claim event "Arcane Rush" issues `ArcaneDust` soulbound tokens as proof-of-daily-participation. Sibling `ReviveSpell` + "Golden Arcane Dust" ship from a second deployer for higher-tier / revive-mechanic items.',
  urls: [
    { label: 'Lost Crusader gateway', href: 'https://lostcrusader.xyz' },
    { label: 'Play (PWA)', href: 'https://play.lostcrusader.xyz' },
    { label: 'Arcane Rush', href: 'https://arcanerush.lostcrusader.xyz' },
    { label: 'X (@_LostCrusader)', href: 'https://x.com/hellothisislost' },
    { label: 'Instagram', href: 'https://instagram.com/lostcrusader28' },
  ],
  deployers: [
    // Daily-claim Arcane Dust (base event token)
    { address: '0x6df6623e596eae138a7db195b2241398c50c4fd30d8f6a22214d42b2386a5a83', network: 'mainnet' },
    // Golden Arcane Dust + Revive Spells (higher-tier items + brewing stand)
    { address: '0x3d9ccdc73e28657eb07aeb7dbf8fbd72ef599d21bdbeb15d3215cdc8ea15e208', network: 'mainnet' },
  ],
  attribution: `
Attribution is gold-standard via on-chain brand self-labeling cross-referenced with the game's own public site. Every minted \`ArcaneDust\` NFT (struct \`<pkg>::arcane_dust::ArcaneDust\`) carries the description string:

> *"A measure of daily devotion from the Lost Crusader. This Arcane Dust is a non-transferable token from the Arcane Rush event, redeemable once per day as proof of your continued participation"*

Verifiable on mainnet (2026-04-22 GraphQL probe of \`objects(filter: { type: "0x2938b2bd…::arcane_dust::ArcaneDust" })\`). The string names both brand tokens — "Lost Crusader" (the game) and "Arcane Rush" (the in-game event).

**Public-web confirmation:**
- **\`lostcrusader.xyz\`** (main gateway) — game site. Roadmap section names "Join the Arcane Rush" as a Q1 2026 milestone; phase sequence is Q4 2025 Build Phase → **Q1 2026 The Grant Phase (Mainnet integration)** → Q2 2026 Alpha Launch → Q3 2026 Growth Surge (NFT Collection) → Q4 2026 Ecosystem Expansion. The Q1 2026 "Grant Phase (Mainnet integration)" line-item directly matches the observed 2026-Q1 on-chain activity — the NFT contracts are the Mainnet integration that the roadmap names.
- **\`arcanerush.lostcrusader.xyz\`** (PWA via fetch-js probe) — serves "✨ Claim your dust before the day is over ✨" and an "✅ You can mint now!" button gated by Login/Sign Up. Matches the \`ArcaneDust\` contract's "redeemable once per day" mechanic.
- **\`play.lostcrusader.xyz\`** (PWA auth flow probe) — OTP + wallet sync authentication entry point.
- Instagram \`@lostcrusader28\`, X \`@_LostCrusader\` (aka \`@hellothisislost\`), Discord invite code \`JSj9yftHdu\` — social handles surfaced via the Arcane Rush PWA's footer links.

**Studio identity: NOT disclosed.** The gateway site's footer reads only "© 2026 Lost Crusader. All Rights Reserved" — no publisher / studio / parent company is named. Attribution is by the *product brand* rather than an underlying studio. ToS / Privacy Policy link to Google Docs rather than on-site pages — consistent with an indie game team running lean infrastructure during grant phase.

**IOTA Foundation grant:** lostcrusader.xyz's own roadmap labels 2026 Q1 as "The Grant Phase — Mainnet integration." Not explicitly confirmed by an IOTA Foundation announcement (2026-04-22 web search for \`"Lost Crusader" IOTA Foundation grant Q1 2026\` returned no blog/press links), but self-described as grant-phase work by the game itself. \`isIotaFoundationFamily\` **not set** — grant recipient is not IF-family. The game is an independent indie build.

**Deployer split:**

**\`0x6df6623e596eae138a7db195b2241398c50c4fd30d8f6a22214d42b2386a5a83\`** — base \`ArcaneDust\` deployer. 1 package \`0x2938b2bd…\` with module \`arcane_dust\` (struct \`ArcaneDust\`, event trail \`NFTMinted\`/\`NFTBurned\`/\`NFTCounter\`, OTW \`ARCANE_DUST\`). 1,195 TXs, 41 unique senders, diverse \`minter\` addresses on sampled NFTs — user-self-claim mint pattern (each user signs their own daily mint). Sampled token IDs 49, 699, 847; image served from IPFS \`bafybeihbxahik73rdrnm7eki5z2lwgfe5a7q5ilwpkvujpw5a5fu55byze\`.

**\`0x3d9ccdc73e28657eb07aeb7dbf8fbd72ef599d21bdbeb15d3215cdc8ea15e208\`** — Golden Arcane Dust + Revive Spells deployer. 3 packages shipping modules \`arcane_dust\` (struct \`SoulboundNFT\`, name "Golden Arcane Dust", description "Mint exclusive Arcane Dust", Pinata-hosted image) and \`revive_spell\` (structs \`ReviveSpell\` "Revival Potion" + \`BrewingStand\` shared brewing-timer object). The \`BrewingStand.current_brew_start\` timestamp reads \`1769344288032\` — an active brew in progress. Shape: higher-tier crafting / revive mechanics layered on top of the base Arcane Dust claim.

**Attribution confidence — [x] gold-standard.** On-chain description self-attests to the "Lost Crusader" + "Arcane Rush" brand pair, both of which are live product brands at publicly-discoverable URLs (\`lostcrusader.xyz\` + \`arcanerush.lostcrusader.xyz\`). Not a speculative brand match — the strings are literal and unambiguous.
`.trim(),
};
