import { Team } from '../team.interface';

/**
 * Studio 0x6ff423cb — anonymous deployer of a Virtue-adjacent points
 * primitive. 6 packages shipping `config` + `point` (+ `point_manager`) module
 * sets, with struct `VirtuePointWitness` — brand name in the struct suggests
 * this is either a Virtue-internal unreleased product, a Virtue contractor
 * build, or a third-party points overlay targeting Virtue users.
 *
 * **Strongest single signal:** the deployer wallet \`0x6ff423cb…\` is the
 * **first user of Virtue's CDP** on mainnet. GraphQL event log shows
 * \`PositionUpdated{debtor: 0x6ff423cb…, deposit: 40000000000, borrow: 10000}\`
 * on 2025-06-25 minutes after Virtue's first on-chain activity — canonical
 * "insider test position" shape.
 *
 * Attribution is circumstantial. No public announcement, no brand presence
 * (no points.virtue.money / virtuepoints.xyz domain, no official Virtue
 * mention). Kept synthetic until Virtue publishes the points program or a
 * third-party brand surfaces.
 */
export const studio6ff4: Team = {
  id: 'studio-6ff4',
  name: 'Studio 0x6ff423cb (Virtue Points)',
  description: 'Anonymous deployer of a Virtue-adjacent points primitive. 6 packages shipping `config` + `point` (+ `point_manager`) with struct `VirtuePointWitness`. Strongest single signal: the deployer wallet was the first user of Virtue\'s CDP on mainnet (opened a test CDP at `0xf67d0193…::cdp` on 2025-06-25) — canonical insider shape. No public brand presence (no `points.virtue.money`, no Virtue-points landing page). Likely a Virtue-internal unreleased points system or a close-collaborator build.',
  deployers: [{ address: '0x6ff423cb66243ef1fb02dff88aeed580362e2b28f59b92e10b81074b49bea4e1', network: 'mainnet' }],
  attribution: `
Synthetic team id pending a public points-program announcement. On-chain footprint is 6 upgrade-versioned packages at \`0x6ff423cb66243ef1fb02dff88aeed580362e2b28f59b92e10b81074b49bea4e1\`, all sharing a tight module signature:

| Module | Structs |
|---|---|
| \`config\` | \`AdminCap\`, \`GlobalConfig\` (managers + version registry) |
| \`point\` | \`PointHandler\`, **\`VirtuePointWitness\`** |
| \`point_manager\` (3/6 pkgs) | \`Config\`, \`PointManager\` |

The struct name \`VirtuePointWitness\` is the tell — **a points system tied to Virtue**. The Move witness pattern (zero-field, \`drop\`-only struct) is how a points protocol declares "only this module can mint its points." The \`GlobalConfig.managers\` registers the deployer \`0x6ff423cb…\` as a manager; the \`AdminCap.registry\` pins the CERT coin type: \`0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT\` — **Virtue's liquid-staking cert token** (the same type Virtue users mint when they stake IOTA via Virtue's framework).

**Smoking-gun insider-deployer signal.** The deployer wallet \`0x6ff423cb…\` is the **first user of Virtue's CDP on mainnet**. GraphQL event probe (sender-filtered events from this address) returns:

- \`2025-06-25T07:12:43.971Z\` — Pyth \`PriceFeedUpdateEvent\` (IOTA price feed) + Virtue oracle \`PriceAggregated<IOTA>\`.
- \`2025-06-25T07:12:43.971Z\` — **\`cdp::events::PositionUpdated\`** with \`debtor: 0x6ff423cb66243ef1fb02dff88aeed580362e2b28f59b92e10b81074b49bea4e1\`, \`deposit: 40000000000\` (40 IOTA), \`borrow: 10000\` (0.01 VUSD), \`memo: "manage"\`.
- \`2025-06-25T07:12:43.971Z\` — \`vusd::Mint<VirtueCDP>\` with \`module_supply: 78326886\`, \`total_supply: 78326886\` (this mint IS the 78.3M-base-unit total supply — i.e. the global Virtue CDP's first-ever VUSD mint).

So the deployer wallet's very first Virtue interaction minted VUSD bootstrap supply. That is the canonical "insider team member testing their own protocol" shape — Virtue founders, Virtue contractors, or someone collaborating closely enough to own the genesis CDP position. A third-party integrator building retroactively against Virtue would not own the first-ever VUSD mint.

**Deployer wallet holdings.** \`CERT\` + \`UpgradeCap\` + \`config::AdminCap\` + \`VUSD\` — a small Virtue-ecosystem inventory consistent with an insider dev wallet, not an end-user wallet or a treasury.

**Product status.** Zero events emitted from \`point\` / \`point_manager\` modules so far — no on-chain points have been awarded yet. The registry/config objects exist and the deployer holds admin caps, but the user-facing points-award path hasn't fired. This is consistent with a **pre-launch / dev-state product** — Virtue's public site (\`virtue.money\` + \`docs.virtue.money\` as of 2026-04-22) contains no mention of a points program, so the system is either (a) unreleased, (b) soft-launched without web visibility, or (c) on hold.

**Web-search probes (2026-04-22):**
- \`"virtue money points program"\` → zero results about a Virtue Money points program; only Virtue Poker (unrelated 2021 poker-token project).
- \`"virtue" IOTA "bank" module borrow_incentive staking dApp\` → Virtue docs + ecosystem coverage; no points-program mention.
- Virtue's public docs (\`docs.virtue.money/resources/technical-resources\`) — lists 5 canonical contract addresses (Framework, VUSD Treasury, Oracle, CDP, Stability Pool), no points system.

**Why synthetic rather than folded into the \`virtue\` team:** without Virtue's direct self-attestation, rolling this deployer into \`virtue\`'s roster would be guessing. The deployer's \`0x6ff423cb…\` address is NOT one of the Virtue-canonical docs-listed addresses; it's a different wallet. Two equally plausible reads of the insider pattern: (a) it's a Virtue founder's personal dev wallet running an experimental points overlay that may ship later, (b) it's a close-collaborator / contractor building a points product intended for Virtue users. Either way the safe classification is synthetic-studio until Virtue claims it publicly — identical to the approach used for \`studio-295e\` (TruvID, strong circumstantial link to a Vercel app but short of confirmed deployer-identity self-attestation).

**Upgrade paths.** Promote to \`virtue\` team (or a dedicated named team) if (a) Virtue's website adds a \`points.virtue.money\` / \`app.virtue.money/points\` page with a visible deployer reference, (b) Virtue announces the points program via blog / X, (c) an independent brand surfaces claiming this deployer.

**Sibling team — \`studio-b9cf\` (bank).** The sister target in this investigation is deployer \`0xb9cf086f…\`, which ships a generic multi-asset coin-bank (module \`bank\`, stores IOTA + VUSD + CERT + IBTC). Both deployers share the Virtue-DeFi thematic context and both transact in \`CERT\`, but the admin wallets are structurally different (each holds its own \`bank::AdminCap\` / \`config::AdminCap\` locally) and there's no cross-module reference between them. Kept as two separate synthetic teams rather than one combined — no evidence yet they're one operator.
`.trim(),
};

/**
 * Studio 0xb9cf086f — anonymous operator of a generic multi-asset coin-bank.
 * Single-module `bank` package shipping a small custodial vault with
 * IOTA / VUSD / CERT / IBTC balances and a permit-gated deposit-withdraw
 * flow. Fewer than 5 known permit holders; reads as a single-team
 * LP / MM / treasury-management construction rather than a user-facing
 * product.
 *
 * No brand presence surfaces. Kept synthetic.
 */
export const studioB9cf: Team = {
  id: 'studio-b9cf',
  name: 'Studio 0xb9cf086f (Multi-Asset Bank)',
  description: 'Anonymous operator of a generic multi-asset coin-bank on IOTA Rebased. Single package, single `bank` module — permit-gated `deposit<T> / withdraw<T>` flow holding IOTA (64.9k), CERT (3,950, Virtue LST), VUSD (1,097, Virtue stablecoin), and IBTC (2.6M base units). Fewer than 5 known permit holders, including the deployer + a small circle of known-recipient wallets. Small-scale insider / LP / treasury-management shape, not a user-facing product. No public brand surfaces.',
  deployers: [{ address: '0xb9cf086f7e5e7932901b00e13310cd4ea53fe891722deaea4fbe50b348efc92e', network: 'mainnet' }],
  attribution: `
Synthetic team id pending operator identification. On-chain footprint is 1 package at \`0xb9cf086f7e5e7932901b00e13310cd4ea53fe891722deaea4fbe50b348efc92e\` (\`0x9d2108dc73f5ebf2b35135154d0b2237a4e882b357cd901040c2cd21d9bcce86\`, module \`bank\`).

**Architecture — generic permit-gated multi-asset coin-bank.** Struct set:

| Struct | Role |
|---|---|
| \`BANK\` | OTW witness. |
| \`AdminCap\` | Operator capability (held by the deployer itself). |
| \`Bank\` | Shared root object — holds typed balances as dynamic fields keyed by \`BalanceKey<T>\`. |
| \`Permit\` | Per-address permission object issued by admin; required to \`deposit\`/\`withdraw\`. |
| \`BalanceKey<T>\` | Dynamic-field key tagging a \`Balance<T>\` stored inside the Bank. |

Function signatures confirm the generic shape: \`deposit<T>(bank: &mut Bank, permit: &Permit, coin: Coin<T>, ctx: &TxContext)\` + \`withdraw<T>(bank: &mut Bank, permit: &Permit, amount: u64, ctx: &mut TxContext) → Coin<T>\` + \`issue_permit(bank: &Bank, permit: &Permit, recipient: address, ctx: &mut TxContext)\` + \`burn_permit(permit: Permit, ctx: &TxContext)\`.

**Live balances (2026-04-22 dynamic-field probe on the \`Bank\` shared object at \`0x36f63a98…\`):**

| Coin type | Balance (base units) | Interpretation |
|---|---|---|
| IOTA (\`0x2::iota::IOTA\`) | \`64,959,467,924,702\` | ~64.96 IOTA (9 decimals) |
| CERT (\`0x346778…::cert::CERT\`) | \`3,950,898,670,993\` | ~3.95k CERT (Virtue LST) |
| VUSD (\`0xd3b63e…::vusd::VUSD\`) | \`1,097,492,292\` | ~1.1k VUSD (Virtue stablecoin) |
| IBTC (\`0x387c45…::ibtc::IBTC\`) | \`2,636,997\` | ~2.6 IBTC |

Heterogeneous IOTA-ecosystem DeFi asset mix. Deployer wallet \`0xb9cf086f…\` separately holds \`Coin<IOTA>\` + \`Coin<VUSD>\` + \`Coin<CYB>\` (CyberPerp) + \`Coin<TLN_TOKEN>\` (TokenLabs) + the \`bank::AdminCap\` — consistent with a cross-protocol DeFi operator wallet.

**Permit / activity shape.** The first few \`PermitCreated\` events issue permits to (a) the deployer itself and (b) a handful of addresses including \`0x68189637…\` and \`0xccefcb51…\` — the same addresses that dominate \`Deposited\` / \`Withdrawn\` events (running deposits / withdrawals of 100k-200k IOTA at a time over April 8 2026). **Fewer than a dozen distinct addresses** ever interact with the bank. This is not a public-facing retail product; it reads as a small-team LP / market-maker / treasury-management vault where permits gate a known set of trusted cooperators.

**Web-search probes (2026-04-22):** nothing specific surfaces for "multi-asset vault IOTA Rebased" / "IOTA DeFi bank" / variants. No branded landing page, no docs site, no announcement.

**Why synthetic rather than folded into \`virtue\`:** the bank is generic — it happens to hold Virtue-ecosystem assets (CERT + VUSD) alongside IOTA + IBTC, but it's not a Virtue-specific construction. Attributing the deployer to \`virtue\` without direct self-attestation would be guessing.

**Sibling team — \`studio-6ff4\` (Virtue Points).** Covered in sibling team def \`studio-6ff4\` above. Both teams share a Virtue-DeFi thematic context and transact in CERT; admin wallets are distinct and there's no cross-module reference, so they're kept as two separate synthetic teams until stronger linkage surfaces.

**Upgrade paths.** Promote to a named team if (a) a public dApp / MM / treasury brand surfaces referencing this deployer, (b) the permit-recipient wallet set maps to a known team via their own on-chain activity (e.g. one of them becomes identifiable as an Echo / LiquidLink / CyberPerp treasury wallet).
`.trim(),
};
