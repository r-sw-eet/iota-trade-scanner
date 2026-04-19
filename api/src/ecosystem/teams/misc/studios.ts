import { Team } from '../team.interface';

export const studio49c4: Team = {
  id: 'studio-49c4',
  name: 'Studio 0x49c4e917',
  description: 'Anonymous deployer running a phishing-spray NFT airdrop campaign on IOTA Rebased. 3 packages: `voucher::PandabyteTicket` (597 sprayed to 597 unique wallets), `ticket::KilnTicket` (Kiln-brand impersonation; the real Kiln validator service is at `kiln.fi`, not the phishing `kilnstake.net`), and an unused `my_token` OTW template. All NFTs carry `url` fields pointing at non-resolving impersonation domains (`pandabyte.org`, `kilnstake.net`) — classic mass-airdrop-to-phishing pattern: scammer sprays NFTs, recipient sees "claim your reward" metadata, visits site, wallet drains.',
  deployers: ['0x49c4e917a0d6ca7da640b0267123e5416457e88651e06a79f99dc2fd7b88dbbf'],
  attribution: `
Synthetic team id for a phishing-spray operation, not a legitimate project. Evidence:

**Two "reward event" NFT collections, both impersonating or inventing brands:**
- \`voucher::PandabyteTicket\` (package \`0xe0c9aa20…\`) — all 597 sampled NFTs carry \`name: "PANDABYTE Reward Ticket"\`, \`description: "PANDABYTE Reward Event 2025 is Live at https://pandabyte.org"\`, same IPFS image.
- \`ticket::KilnTicket\` (package \`0x7a5f3b3d…\`) — NFTs carry \`name: "Kiln Giveaway"\`, \`description: "3000 IOTA Kiln Reward Event 2025 is Live at https://kilnstake.net"\`, different IPFS image. Kiln is a real enterprise-staking provider running IOTA validators (\`docs.kiln.fi/v1/kiln-products/validators/protocols/iota-iota\`), so the NFT is trading on Kiln's brand equity for credibility — but \`kilnstake.net\` is NOT Kiln's site (the real one is \`kiln.fi\`).

**Both target domains do not resolve** (verified 2026-04-19 via DNS lookup):
- \`pandabyte.org\` → \`Could not resolve host\`
- \`kilnstake.net\` → \`Could not resolve host\`

**Spray distribution fingerprint:** the 597 \`PandabyteTicket\` objects are held at **597 distinct wallet addresses**, each owning exactly 1 — the canonical "airdrop to a wide random audience" pattern, not the "user-claimed mint" pattern a legit giveaway would produce. Typical phishing playbook: spray a thousand wallets → recipient sees the NFT in their inventory → follows the link → connects wallet to a wallet-draining "claim" page.

**Third package \`my_token\`** ships an empty OTW template (\`MY_TOKEN\` with only \`drop\` ability) — probably scaffolding for a third prong of the campaign not yet rolled out, or leftover test deploy.

Kept as a synthetic \`studio-49c4\` team rather than a named brand because the operator intentionally obscures itself behind non-functional domains. The Studio label preserves the attribution "this deployer exists, it's running scams" without legitimising the scam-brand names.
`.trim(),
};

export const studio5451: Team = {
  id: 'studio-5451',
  name: 'Studio 0x545160c9',
  description: 'Anonymous solo-developer deployer behind a vehicle-title RWA NFT pilot. 3 single-module `car_nft` packages shipping a sophisticated architecture: shared `Config` object with an admin address + 32-byte backend public key (for off-chain signed updates like mileage / TC / ownership transfer) + VIN registry table. Currently 1 minted NFT — a 2019 Ford Fiesta demo (VIN `WF0JXXGAHJKD30348` — the `WF0` WMI prefix = Ford Werke Germany). Probably a dev\'s demo / pilot of vehicle-title tokenization, but no public website, docs, or GitHub repo found.',
  deployers: ['0x545160c945b6acbf1b8a295cd488294f17144b0324786d049953e168e783c8a9'],
  attribution: `
Synthetic team id pending confirmed operator identification. On-chain footprint is 3 packages at deployer \`0x545160c945b6acbf1b8a295cd488294f17144b0324786d049953e168e783c8a9\`, all single-module \`car_nft\` with a consistent 4-struct signature: \`CAR_NFT\` (OTW, \`drop\`), \`CarNFT\` (\`store, key\`, the actual NFT), \`Config\` (\`store, key\`, shared admin object), and \`NFTMinted\` event.

**Architecture (from the shared Config object at \`0x53ef69b913824da3b0d3f9443e1437584a7e90ab1554bcfa42bb2854505334cc\`):**
- \`owner\`: \`0x545160c945b6acbf1b8a295cd488294f17144b0324786d049953e168e783c8a9\` (same as deployer — deployer is the admin account).
- \`backend_pubkey\`: 32-byte public key (likely Ed25519). Off-chain backend signs update payloads (e.g. mileage increments, TC-status changes, ownership transfers); contract verifies the signature against this key before mutating on-chain state. Sophisticated pattern — matches the shape of a production automotive-telemetry design.
- \`vin_registry\`: table indexing VIN → NFT object (size \`1\` currently, only the one demo car).
- \`status\`: \`"1"\` (active).

**Sampled NFT (the one minted token at \`0x4fd91228194c5206771c17fe0a9c4904924f589835c7f611fc6f3755c5113eb4\`):**
\`\`\`
{ brand: "FORD", model: "FIESTA", vin: "WF0JXXGAHJKD30348",
  fuel: "ICE", power: "86", year: "2019", mileage: "53000",
  last_maintenance_date: "NA", last_TC_status: "Pending",
  image_url: "ipfs://bafy…/fordFiesta.jpeg",
  current_owner: "0xac2f1630d4606846525dab09b6f77a94e217b8a31c7757b013730b754f66146b" }
\`\`\`

**Origin / jurisdiction hints:**
- \`last_TC_status\` — "TC" = Contrôle Technique (French) / Technische Kontrolle (German) / Tecnica Controllo (Italian) — standardized European periodic vehicle inspection terminology. Field name doesn't appear in US/UK automotive contexts, so European dev.
- VIN WMI \`WF0\` = Ford Werke GmbH (Cologne, Germany) — actual car manufactured for the German / continental European market.
- Field names in English, IPFS media on web3.storage — international developer, not a specific market vertical.

**Public surface: none found** (2026-04-19 web search). No dedicated domain, no GitHub repo, no IOTA Foundation showcase entry, no visible product brand. Reads as a lone developer's RWA-vehicle-title demo / pilot — the architecture (backend pubkey + signed updates + VIN registry) is too sophisticated for a quick-and-dirty experiment, but at only 1 minted NFT the pilot hasn't moved past proof-of-concept.

**Upgrade to a named-brand team later if:** operator identity surfaces via a GitHub commit, blog post, or IOTA community channel linking this deployer to a real vehicle-title product. Meanwhile \`studio-5451\` stays as the placeholder team id.
`.trim(),
};

export const studio295e: Team = {
  id: 'studio-295e',
  name: 'Studio 0x295ee21b',
  description: 'Anonymous solo-developer deployer behind the on-chain "TruvID" product — 7 packages, all single-module `nft_minter2` with struct `NFT`. On-chain self-identifies as TruvID (video-authenticity / notarization). Operator identity not confirmed; circumstantial trail points at an anonymous GitHub-hosted PWA at `truvid.vercel.app` but the public frontend has zero on-chain wiring, so the link between the two is not proven by the published artifacts alone.',
  deployers: ['0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a'],
  attribution: `
Synthetic team id pending confirmed operator identification. On-chain footprint is 7 packages at deployer \`0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a\`, all single-module \`nft_minter2\` with struct \`NFT\` — successive upgrade versions of one product that self-identifies in minted NFTs as "TruvID" / "TruvID Genesis".

**Investigation trail (2026-04-19):**

**1. On-chain self-attestation.** Every minted NFT carries \`name: "TruvID"\` / \`"TruvID Genesis"\` / \`""\` and \`description: "standard document proof"\` / \`"First TruvID proof NFT with IPFS metadata."\` / \`""\`. 5+ NFTs minted to date, all owned by the deployer address itself (admin-held initial-mint pattern). First package stored name/image_url as raw byte arrays; later packages switched to plain strings — typical working-dev iteration across the 7 upgrade versions. Contract shape is extremely thin: 2 structs (\`NFT\` \`{store, key}\`, \`NFT_MINTER2\` OTW), 2 functions (\`init\` private, public \`mint(String, String, String, String, &mut TxContext)\`), no access control, no hash anchoring, no events.

**2. TruvID-candidate domains checked.** The URL fragment \`/api/proof/files/<timestamp>-TruvID.png\` embedded in some minted NFTs is a relative path — no host in the on-chain data. We walked the plausible TruvID-* domain space:
- \`truvid.com\` — unrelated video-ad-tech platform.
- \`truvid.io\` / \`truvid.app\` / \`truvid.co\` — parked domains, identical sedo-style landing pages.
- \`truvid.xyz\` / \`truvid.network\` / \`truvid.finance\` / \`truvid.dev\` / \`truvidapp.com\` / \`iotatruvid.com\` — DNS-unregistered.
- \`truvid.vercel.app\` — **live hit.** Serves a single-file HTML PWA titled \`TrueVid - Preuve d'Authenticité\` (French-language video-authenticity-proof app). Feature labels in the UI: NTP-atomic-server timestamp, GPS geolocation, ECDSA P-256 signature, \`Conforme eIDAS\` compliance claim, \`CERTIFICAT D'AUTHENTICITÉ\` generation, WebM video encoding. Repo \`homepage\` field on GitHub matches (\`truvid.vercel.app\`), so this Vercel deployment is the canonical app surface for the GitHub-hosted TruvID codebase.

**3. Vercel / GitHub findings.**
- Source: [\`github.com/oio7764/Truvid\`](https://github.com/oio7764/Truvid), created 2026-02-16, single commit "Create index.html", no README, no license (= all-rights-reserved by default). Repo contains only \`index.html\` (20 KB) — no Move sources, no IOTA SDK, no wallet-connect, no mint flow. Full keyword scan over the HTML returns zero hits for \`iota\` / \`move\` / \`mainnet\` / \`graphql\` / \`@iota/\` / \`0x...\` / \`mint(\` / \`wallet\` / \`ipfs\` / \`pinata\`. JS block has no \`fetch\` / \`axios\` / \`XMLHttpRequest\` — only \`navigator.mediaDevices.getUserMedia\` (camera) and \`navigator.geolocation.getCurrentPosition\` (GPS). HTML is in fact **truncated mid-function** inside \`toggleRecord()\` with no closing \`</script>\` / \`</body>\` — the dev pushed an unfinished file. The ECDSA / NTP / eIDAS UI labels are text, not wired-up functionality.
- Developer: GitHub user [\`oio7764\`](https://github.com/oio7764). Anonymous account (joined 2024-01-30, privacy-protected email, no name / bio / social links / company / blog / location). Two total public repos: this \`Truvid\` (IOTA) and \`fideo-web\` (FIDÉO, video-authenticity-proof anchored to Bitcoin via OpenTimestamps — different architecture since Bitcoin has no VM, so this is best read as a parallel experiment exploring a different anchoring model, not a migration away from IOTA).

**4. Truv (US fintech, formerly branded TruvID) checked and ruled out.** Google AI-mode flagged Truv / truv.com as the most likely "formerly-TruvID" match. Probed: \`truv.com\` / \`api.truv.com\` / \`app.truv.com\` — \`/api/proof/files/\` paths all 404, no such subdomain for \`api.truv.com\`. Truv's own marketing has zero mentions of IOTA, blockchain, NFTs, Move, or Rebased (product is consumer-permissioned income / employment / asset verification via OAuth-style flows with payroll and bank providers). Their GitHub org \`truvhq\` has no IOTA code. A regulated fintech handling payroll data also would never ship a permissionless \`mint()\` function with no access control. Not the operator.

**5. Other name-collision candidates ruled out.** \`webid-solutions.com\` (TrueID WebID, identity verification) and \`truvideo.com\` (TruVideo, automotive-service video communication) — both different products, both have \`/api/proof/files/\` path returning 404.

**App logic vs. contract logic — conceptual match:** the Vercel app's stated use case (capture a video, sign it off-chain with ECDSA, generate a legal-format certificate, anchor it immutably somewhere) is consistent with the contract's shape (public \`mint\` taking 4 strings — name / description / image_url / metadata_url — and producing an immutable NFT receipt). The NFT filename convention embedded in some mints (\`/api/proof/files/<unix-ms>-TruvID.png\`) matches the expected Node/Express-style backend pattern you'd get from a Vercel-deployed TruvID app. Conceptual fit is strong.

**App logic vs. contract logic — gap:** the **published** Vercel/GitHub frontend has no on-chain wiring at all. No wallet-connect, no \`fetch\` to IOTA GraphQL, no mint call, no IOTA SDK import. The 7 on-chain packages + 5+ minted NFTs were produced entirely out-of-band — via IOTA CLI or an unreleased backend not present in the public repo. We can't prove from the public artifacts alone that the \`oio7764\` GitHub account is the same entity that controls the \`0x295ee21b…\` deployer key. The alignment is circumstantial (same product name, same URL scheme in NFT fields, same conceptual use case) but not contract-level.

**Net:** attribution is kept as synthetic \`studio-295e\` pending stronger confirmation. The public TruvID app at \`truvid.vercel.app\` and the GitHub repo at \`github.com/oio7764/Truvid\` are the best public-web surface for this on-chain footprint, but the mint flow itself isn't in either of them — so the on-chain TruvID could be the \`oio7764\` developer wiring up mints privately, or it could be a different party using the same product name. Additional evidence (e.g. a public commit that connects a wallet, a social post by \`oio7764\` confirming the deployer address, direct outreach) would be needed to promote this to a named-brand team.
`.trim(),
};

export const studioCb69: Team = {
  id: 'studio-cb69',
  name: 'Studio 0xcb6956e9',
  description: 'Anonymous multi-collection NFT deployer — ships a handful of small hand-minted PFP collections (Healthy Gang, Ghost Lights, Tanapaz, Toma Rajadão, Tranquilidade Drops) plus ~25 keyboard-mash test-deploy modules. No public brand presence; `droppzz_test_iota` appears in the module list, possibly pointing at a "Droppzz" operator handle but unconfirmed.',
  deployers: ['0xcb6956e9f7f2515054241b74a1c0b545b4e813d0e5e15f9bb827870b3d63724c'],
  attribution: `
Synthetic team id pending a real operator identification. On-chain footprint is 33 packages from deployer \`0xcb6956e9f7f2515054241b74a1c0b545b4e813d0e5e15f9bb827870b3d63724c\`, with module names split roughly two ways:

**Named / plausible-collection modules** (5 identified): \`iota_healthy_gang_\` (Healthy Gang PFPs — sampled \`name: "Healthy Gang #2 - Strawberry"\`, IPFS media), \`ghost_lights\`, \`tanapaz\`, \`toma_rajadao\` (Portuguese slang), \`tranquilidade_drops\` (Portuguese — "tranquility drops"). Portuguese-language signature suggests a Brazilian / Lusophone-community operator.

**Keyboard-mash / test-deploy modules** (~20+): \`fdsfsd\`, \`asdadas\`, \`dasdasdsa\`, \`jlkjlkjljlk\`, \`jhhjhkhkhkjj\`, \`djkjsakdjsahkj\`, \`dslkmkkvlmsdlvk\`, \`kfjsdlkfjslkjflksd\`, \`klzjdljkjzlckjlzx\`, \`lkdasjljdasldjslak\`, \`fds_mflsdmlfdskmlk\`, \`lkdsmlfkmsdlfsdmkl\`, and more. Looks like a single developer hammering on the deploy flow between real mints.

Operator-handle hint: one of the modules is \`droppzz_test_iota\` — "Droppzz" may be the operator's self-identification, though no "Droppzz" brand is findable via public web search as of 2026-04. Could be private, never-launched, or a handle used only in IOTA community channels. Left as a TODO follow-up.

No public website, no social presence, no marketplace listing found for any of the 5 named collections. The one sampled NFT (Healthy Gang #2 - Strawberry) has a raw IPFS media URL and no branding metadata.

Why its own team rather than rolling into \`NFT Collections\` aggregate: the canonical \`NFT Collections\` bucket matches packages whose module set is exactly \`{nft}\` — this deployer's packages use per-collection module names (\`iota_healthy_gang_\`, \`ghost_lights\`, etc.), so the aggregate doesn't catch them. A dedicated deployer-based aggregate under this synthetic team keeps the activity visible while narrower fingerprint defs (one per identified collection) can carve out labeled rows.
`.trim(),
};

export const studioB8b1: Team = {
  id: 'studio-b8b1',
  name: 'Studio 0xb8b1380e',
  description: 'Multi-brand dev-shop deployer shipping 37 packages across KrillTube (decentralized video), GiveRep (SocialFi reputation, IOTA side), an on-chain games portfolio (Chess / Tic Tac Toe / 2048), and shared infrastructure (vault, gas_station, gift drop). Single-team vs. dev-shop ownership is an open question — evidence leans single-team, not conclusive.',
  deployers: ['0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6'],
  attribution: `
Previously registered as a generic "anonymous developer." Partial identification 2026-04-17 via live-object inspection — the deployer ships code for multiple branded products, making it a dev-shop / multi-tenant infrastructure publisher rather than a single anonymous studio.

**Identified brands:**

- **KrillTube** ([x]) — Decentralized video platform at \`krill.tube\`.
  - On-chain evidence: \`tunnel::CreatorConfig\` objects carry metadata like \`"KrillTube Video - eb13e51b-9e01-424a-87a7-ca4e80111218"\`. Operator address \`0xba1e07d0a5db4ed0aab5ada813c3abb8a58f4d34ba19b153f19c70d6e163020d\` administers the tunnel/KrillTube infrastructure.
  - Product: watch-to-earn + upload-to-earn video platform using a "Krill" token. Content stored on Walrus (encrypted). Mascot Krilly.
  - Packages: \`tunnel\`, \`demo_krill_coin\`.

- **GiveRep** ([x]) — SocialFi reputation platform at \`giverep.com\`.
  - On-chain evidence: \`giverep_claim::Pool\`, \`giverep_claim::SuperAdmin\` objects shared by multiple users.
  - Product: converts social-media engagement (X/Twitter) into on-chain $REP points. Launched late April 2025.
  - Primary deployment on Sui; IOTA is the secondary deployment (IOTA Foundation's Ambassador Program migrated to GiveRep).
  - Confirmed via press: "Over 750,000 $IOTA (~$108K USD) distributed to LiquidLink users via GiveRep campaigns" (LiquidLink cross-integration).

**Unbranded products at the same deployer:**

- **Games portfolio:** Chess (3 versions), Tic Tac Toe (3 versions with AdminCap, Treasury, Game, Trophy structs), 2048 Game (with \`campaign_rewards\` module + RewardCapStore). Multiple individual player creator addresses visible as Game creators — anyone-can-play on-chain games.
- **Infrastructure utilities:** vault (multiple variants — different creators have their own VaultManagers), \`gas_station\`, \`giftdrop_iota\` (multiple versions).

**Attribution interpretation:**

Not one team with one brand — a dev shop or dApp kit publisher servicing multiple products. Three plausible stories:

1. **Single team, multiple products.** Same dev team iterates on GiveRep, launches KrillTube, ships on-chain games as showcase / hackathon outputs.
2. **Dev shop operating multiple clients.** One technical team with several product brands sharing a deployer key.
3. **Shared IOTA Foundation-adjacent infrastructure.** IOTA Foundation's Ambassador Program uses GiveRep on IOTA; KrillTube may be IF-affiliated; the deployer could be an IF-adjacent contractor.

Evidence leans (1): \`tic_tac_iota::AdminCap\` is owned directly by the deployer \`0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6\`, and Chess/2048 Treasury objects are shared-object-administered by the deployer. That suggests the deployer directly administrates the games (not handed off to other teams). Not conclusive.
`.trim(),
};

export const studio0a0d: Team = {
  id: 'studio-0a0d',
  name: 'Studio 0x0a0d4c9a (Clawnera / Spec Weekly)',
  description: 'Operated by GitHub user Moron1337 — CLAWNERA marketplace, CLAW meme-coin, SPEC launchpad, and an IOTA Discord #speculations community presence. Meme-coin adjacent; formally a one-person / small-community operation with no registered company.',
  urls: [
    { label: 'CLAW sale', href: 'https://buy.claw-coin.com' },
    { label: 'SPEC sale', href: 'https://buy.spec-coin.cc' },
    { label: 'GitHub (Moron1337)', href: 'https://github.com/Moron1337' },
  ],
  deployers: [
    '0x0a0d4c9a9f935dac9f9bee55ca0632c187077a04d0dffcc479402f2de9a82140',
    '0x4468c8ddb42728fd1194033c1dd14ffd015f0d81e4b5329ddc11793c989f3f39',
  ],
  logo: '/logos/clawnera.png',
  attribution: `
Previously 🟠 UNVERIFIED and attributed to a synthetic "Studio 0x0a0d4c9a" label. Hard-linked 2026-04-18 via downstream-dependency scan + coin-metadata icon probing.

Scanning all 747 mainnet packages for \`linkage\` pointing at Studio 0a0d packages returned zero external downstream customers — but the reverse direction broke the case. Three \`spec_sale_v2\` packages depend on \`spec_coin\` at a DIFFERENT deployer (\`0x4468c8ddb42728fd1194033c1dd14ffd015f0d81e4b5329ddc11793c989f3f39\`, SPEC-coin-only, 2 packages) — logically the same team using a dedicated token key.

Chain of evidence:

1. SPEC CoinMetadata icon URL: \`raw.githubusercontent.com/Moron1337/SPEC/main/Spec.png\`.
2. CLAW CoinMetadata icon URL: \`raw.githubusercontent.com/Moron1337/CLAW/main/logo/claw.png\`.
3. GitHub user \`Moron1337\` has 4 public repos: \`SPEC\`, \`CLAW\`, \`openclaw-iota-wallet\`, **\`clawnera-bot-market\`**.
4. \`clawnera-bot-market\` README (MIT-licensed, v0.1.97 of 2026-04-15) embeds the exact on-chain type \`0x7a38b9af32e37eb55133ec6755fa18418b10f39a86f51618883aa5f466e828b6::claw_coin::CLAW_COIN\` — which is package #10 in our Studio 0a0d inventory. **Direct contract-address match in an MIT-licensed README** — strongest possible single attribution signal.
5. The repo's workflow (seller / buyer / request-buyer / request-seller / reviewer / operator + listings + bids + orders + juror voting + dispute evidence) maps module-for-module to Studio 0a0d's 15 commerce packages: \`order_escrow\`, \`dispute_quorum\`, \`manifest_anchor\`, \`reputation\`, \`review\`, \`tier\`, \`milestone_escrow\`, \`bond\`, \`deadline_ext\`, \`escrow\`, \`listing_deposit\`, \`mutual_cancel\`, \`order_mailbox\`, \`payment_assets\`, \`rewards\`, \`admin\`.
6. Both tokens use 1,337-based max supply (SPEC: 1.337e12, CLAW: 1.337e19 = 1337 × 10^16 at 6 decimals) — meme-coin / leet numerology signature consistent with a single operator.

Brand names revealed:
- **Marketplace:** CLAWNERA (previously unknown on-chain).
- **Token:** CLAW (symbol; "Claw Coin" name; icon \`claw.png\`).
- **Launchpad:** SPEC (sale UI at \`buy.spec-coin.cc\` states the project was "born in the speculative depths of the #speculations channel on IOTA Discord"; meme-coin disclaimer).
- **Operator handle:** \`Moron1337\` (GitHub).
- **Public presence:** Spec Weekly YouTube channel (\`youtube.com/c/SpecWeekly\`, tagline "Speculation for IOTA, Shimmer, and Crypto degenerates") + IOTA Discord \`#speculations\`.
- **Company:** no formal team — reads as a one-person / small community-run meme-coin project.

Kept the synthetic team id \`studio-0a0d\` rather than renaming to \`clawnera\` pending confirmation the operator wants to be surfaced under the Clawnera brand publicly on our site; the team name surfaces the brand so users see it.
`.trim(),
};
