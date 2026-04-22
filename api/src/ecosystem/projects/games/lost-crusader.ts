import { ProjectDefinition } from '../project.interface';

/**
 * Lost Crusader — daily \`ArcaneDust\` claim event on mainnet-integrated
 * Q1 2026 grant-phase browser MMO. Base deployer \`0x6df6623e…\` handles the
 * daily user-self-claim mint via module \`arcane_dust\` (struct \`ArcaneDust\`,
 * soulbound). Sibling project \`lostCrusaderReviveSpells\` below covers the
 * higher-tier Golden Arcane Dust + Revive Spell + Brewing Stand items on
 * deployer \`0x3d9ccdc7…\`.
 */
export const lostCrusaderArcaneDust: ProjectDefinition = {
  name: 'Lost Crusader — Arcane Rush',
  layer: 'L1',
  category: 'Game',
  addedAt: '2026-04-22',
  description: 'Daily-claim mini-game for the Q1 2026 IOTA-grant-phase MMO "Lost Crusader" — users sign in at `arcanerush.lostcrusader.xyz` and claim one soulbound `ArcaneDust` NFT per day as proof of continued participation. On-chain description: "A measure of daily devotion from the Lost Crusader. This Arcane Dust is a non-transferable token from the Arcane Rush event, redeemable once per day as proof of your continued participation." Single package at `0x2938b2bd…` (module `arcane_dust`, struct `ArcaneDust`, `NFTMinted`/`NFTBurned`/`NFTCounter` events). Early grant-phase footprint — 1,195 TXs, 41 unique senders.',
  urls: [
    { label: 'Arcane Rush', href: 'https://arcanerush.lostcrusader.xyz' },
    { label: 'Lost Crusader', href: 'https://lostcrusader.xyz' },
  ],
  teamId: 'lost-crusader',
  match: {
    deployerAddresses: ['0x6df6623e596eae138a7db195b2241398c50c4fd30d8f6a22214d42b2386a5a83'],
    all: ['arcane_dust'],
  },
  countTypes: ['arcane_dust::ArcaneDust'],
  attribution: `
**On-chain self-attestation** ([x] gold-standard). Every minted \`ArcaneDust\` NFT (type \`0x2938b2bd…::arcane_dust::ArcaneDust\`) carries the description string:

> *"A measure of daily devotion from the Lost Crusader. This Arcane Dust is a non-transferable token from the Arcane Rush event, redeemable once per day as proof of your continued participation"*

The string names both brand tokens — "Lost Crusader" (the game, \`lostcrusader.xyz\`) and "Arcane Rush" (the in-game event, \`arcanerush.lostcrusader.xyz\`). See \`lost-crusader\` team attribution for the full public-web evidence chain.

**Package shape.** Single package \`0x2938b2bdb74233ad0bc7dc42d982e1aca2ec92369938c5d67659c229669daf21\` on deployer \`0x6df6623e596eae138a7db195b2241398c50c4fd30d8f6a22214d42b2386a5a83\`. Module \`arcane_dust\`. Structs:

| Struct | Role |
|---|---|
| \`ARCANE_DUST\` | OTW witness. |
| \`ArcaneDust\` | The daily soulbound token (\`key\` only — intentionally non-storable / non-transferable). |
| \`NFTCounter\` | Per-collection mint counter. |
| \`NFTMinted\` / \`NFTBurned\` | Event trail. |

Sampled \`ArcaneDust\` objects on mainnet (3 hits):

\`\`\`
{ name: "Arcane Dust",
  description: "A measure of daily devotion from the Lost Crusader. …",
  image_url: "https://ipfs.io/ipfs/bafybeihbxahik73rdrnm7eki5z2lwgfe5a7q5ilwpkvujpw5a5fu55byze",
  token_id: "699" / "49" / "847",
  minter: "0x514fb47a…" / "0x0fa66b10…" / "0x92f6e89c…" }
\`\`\`

The \`minter\` field diversity across sampled NFTs confirms user-self-claim (each participant signs their own mint) — not an admin-sprayed airdrop.

**Activity (2026-04-22 prod capture):** 1 package, 1,195 TXs, 41 unique senders. Early grant-phase footprint; roadmap puts Alpha Launch in Q2 2026 so the user base is expected to scale in the following quarter.

**Match rule.** \`deployerAddresses\` pin on \`0x6df6623e…\` + \`all: ['arcane_dust']\` single-element module guard. Deployer only ships this one package today; the module-pin guards against future unrelated deployments under the same admin.

\`isCollectible: false\` — utility NFT with game semantics (daily participation proof, soulbound / non-transferable, consumed by the game's progression logic), not a pure PFP. Stays visible in the "real usecases" view.

\`countTypes: ['arcane_dust::ArcaneDust']\` — participates in Items + Holders counts on the project detail page.

Category \`Game\` — sibling to the existing on-chain games portfolio (\`chess\`, \`ticTacToe\`, \`game2048\`, \`iotaFlip\`).
`.trim(),
};

/**
 * Lost Crusader — higher-tier Revive Spells + Golden Arcane Dust on the
 * second deployer \`0x3d9ccdc7…\`. 3 packages shipping \`arcane_dust\`
 * (struct \`SoulboundNFT\` "Golden Arcane Dust", Pinata-hosted art) and
 * \`revive_spell\` (struct \`ReviveSpell\` "Revival Potion" + \`BrewingStand\`
 * shared brewing-timer object).
 */
export const lostCrusaderReviveSpells: ProjectDefinition = {
  name: 'Lost Crusader — Revive Spells',
  layer: 'L1',
  category: 'Game',
  addedAt: '2026-04-22',
  description: 'Higher-tier crafting / revive layer for Lost Crusader. 3 packages on deployer `0x3d9ccdc7…`: one shipping `arcane_dust::SoulboundNFT` ("Golden Arcane Dust — Mint exclusive Arcane Dust"), two shipping `revive_spell` (struct `ReviveSpell` "Revival Potion" + `BrewingStand` shared brewing-timer object). The `BrewingStand.current_brew_start` field points to an active brew in progress — live brewing mechanic. 480 TXs, 3 unique senders — early grant-phase state.',
  urls: [
    { label: 'Lost Crusader', href: 'https://lostcrusader.xyz' },
    { label: 'Play (PWA)', href: 'https://play.lostcrusader.xyz' },
  ],
  teamId: 'lost-crusader',
  match: {
    deployerAddresses: ['0x3d9ccdc73e28657eb07aeb7dbf8fbd72ef599d21bdbeb15d3215cdc8ea15e208'],
    any: ['arcane_dust', 'revive_spell'],
  },
  countTypes: [
    'arcane_dust::SoulboundNFT',
    'revive_spell::ReviveSpell',
  ],
  attribution: `
**On-chain evidence.** 3 packages on deployer \`0x3d9ccdc73e28657eb07aeb7dbf8fbd72ef599d21bdbeb15d3215cdc8ea15e208\`:

| Package | Module | Notable structs |
|---|---|---|
| \`0x31f55b75…\` | \`arcane_dust\` | \`SoulboundNFT\`, \`MintRegistry\`, OTW \`ARCANE_DUST\` |
| \`0x26aa677c…\` | \`revive_spell\` | \`ReviveSpell\`, \`BrewingStand\`, OTW \`REVIVE_SPELL\` |
| \`0x9ecd5a88…\` | \`revive_spell\` | \`ReviveSpell\`, \`BrewingStand\`, OTW \`REVIVE_SPELL\` (upgrade version of \`0x26aa677c…\`) |

**Sampled \`SoulboundNFT\` objects** (Golden Arcane Dust):

\`\`\`
{ name: "Golden Arcane Dust",
  description: "Mint exclusive Arcane Dust",
  url: "https://amethyst-written-tiglon-733.mypinata.cloud/ipfs/bafybeihmjdroklwdjwbhzyqvfrzmtiiqpvl22aljddvgwzoamjp2hbkqhm" }
\`\`\`

First minted Golden Arcane Dust is owned by the deployer itself (\`0x3d9ccdc7…\`) — admin-minted initial supply pattern. A second sample owned by \`0x77b72f20…\` (user-redeemed). Pinata (ephemeral IPFS pinning service) hosts the art, consistent with indie-game rapid-iteration media workflow.

**Sampled \`ReviveSpell\` object** (Revival Potion):

\`\`\`
{ name: "Revival Potion",
  image_url: "https://amethyst-written-tiglon-733.mypinata.cloud/ipfs/bafkreidc566my5xi2zpv4blqv4lcgwm5zjc5rpnnqolhypxhkt2dfel3dm" }
\`\`\`

Two samples owned by distinct user wallets (\`0xd6f8e397…\`, \`0x514fb47a…\`). Consumable game item — revive mechanic for dead characters.

**\`BrewingStand\` shared object probe.** Single \`BrewingStand\` in existence, held as \`AddressOwner\` by the deployer \`0x3d9ccdc7…\` (admin-operated). Sampled state: \`current_brew_start: 1769344288032\` — an active brew timer in milliseconds since Unix epoch (probed 2026-04-22) — confirming the brewing mechanic is live and producing items during the grant phase.

**Activity (2026-04-22 prod capture):** 3 packages, 480 TXs, 6 events, 3 unique senders. Pre-alpha / grant-phase scale.

**Match rule.** \`deployerAddresses\` pin on \`0x3d9ccdc7…\` + \`any: ['arcane_dust', 'revive_spell']\` — catches all 3 packages on this deployer. Module-name \`arcane_dust\` overlaps with the sibling base \`ArcaneDust\` rule (\`lostCrusaderArcaneDust\` above), but since each rule also pins its respective deployer, there's no cross-matching. If a Lost Crusader contractor ever redeploys to a new address, the module-names pair would still route correctly via \`lost-crusader\` team-deployer routing — but a new address would need to be added to \`deployerAddresses\` first.

\`isCollectible: false\` — utility game items with in-game mechanics (brewing, revive), not PFPs.

\`countTypes\` — counts both \`SoulboundNFT\` (Golden Arcane Dust) and \`ReviveSpell\` (Revival Potion) on the detail page.

Category \`Game\` — sibling to the base \`lostCrusaderArcaneDust\` row on the same team.
`.trim(),
};
