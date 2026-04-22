import { ProjectDefinition } from '../project.interface';

/**
 * Virtue-adjacent points primitive — 6 packages at \`0x6ff423cb…\` shipping
 * \`config\` + \`point\` (+ \`point_manager\`) with struct \`VirtuePointWitness\`.
 * Deployer is the first-ever user of Virtue's CDP on mainnet; strongest
 * available signal that this is a Virtue-insider or close-collaborator
 * build. Currently pre-launch — zero point events emitted, no public
 * announcement. Kept on synthetic \`studio-6ff4\` pending Virtue's claim.
 */
export const virtuePoints: ProjectDefinition = {
  name: 'Virtue Points',
  layer: 'L1',
  category: 'Social',
  subcategory: 'Incentive',
  addedAt: '2026-04-22',
  description: 'Pre-launch points primitive tied to Virtue (the IOTA stablecoin protocol). 6 upgrade-versioned packages at deployer `0x6ff423cb…` with struct `VirtuePointWitness` + `PointHandler` + `PointManager`. Deployer wallet owned Virtue\'s first-ever CDP position on 2025-06-25 (the genesis 78.3M-unit VUSD mint) — strongest circumstantial signal that this is a Virtue-internal / close-collaborator build, not an unrelated third party. No points awarded on-chain yet; Virtue\'s public site has no visible points page.',
  urls: [
    { label: 'Virtue (ecosystem target)', href: 'https://virtue.money' },
  ],
  teamId: 'studio-6ff4',
  match: {
    deployerAddresses: ['0x6ff423cb66243ef1fb02dff88aeed580362e2b28f59b92e10b81074b49bea4e1'],
    any: ['point', 'point_manager'],
  },
  attribution: `
**On-chain shape.** 6 upgrade-versioned packages on deployer \`0x6ff423cb66243ef1fb02dff88aeed580362e2b28f59b92e10b81074b49bea4e1\`, each shipping a tight module set:

| Module | Structs |
|---|---|
| \`config\` | \`AdminCap\`, \`GlobalConfig\` (\`versions\`, \`managers\` registry) |
| \`point\` | \`PointHandler\`, **\`VirtuePointWitness\`** |
| \`point_manager\` (in 3/6 pkgs) | \`Config\`, \`PointManager\` |

The struct name \`VirtuePointWitness\` is the brand tell — a witness-pattern (zero-field, \`drop\`-only) that a points protocol uses to declare "only this module may mint its points," and the name explicitly references Virtue.

Live state (2026-04-22 GraphQL probes of the latest pkg's shared \`GlobalConfig\` at \`0x2e072340…\`):

\`\`\`
{ versions: { contents: [2] },
  managers: { contents: [
    "0x6ff423cb66243ef1fb02dff88aeed580362e2b28f59b92e10b81074b49bea4e1"
  ] } }
\`\`\`

One registered manager — the deployer itself. The \`AdminCap\` object (held by the same deployer) has its \`registry\` field populated with an entry keyed by \`346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT\` — **Virtue's liquid-staking cert token**, confirming the points system is built around CERT positions.

**Deployer is Virtue's genesis CDP user.** GraphQL event probe on \`sender: 0x6ff423cb…\` returns the first events on this wallet:

- \`2025-06-25T07:12:43.971Z\` — Pyth \`PriceFeedUpdateEvent\` (IOTA) + Virtue oracle \`PriceAggregated<IOTA>\`.
- \`2025-06-25T07:12:43.971Z\` — \`cdp::events::PositionUpdated\` with \`debtor: 0x6ff423cb…\`, \`deposit: 40 IOTA\`, \`borrow: 0.01 VUSD\`, \`memo: "manage"\`.
- \`2025-06-25T07:12:43.971Z\` — \`vusd::Mint<VirtueCDP>\` with \`module_supply: 78326886\` = \`total_supply: 78326886\`. **This mint IS the global VUSD supply at that point.**

So this deployer's very first transaction opened the first-ever Virtue CDP and minted the genesis VUSD supply. That's the canonical "insider team member" pattern — Virtue founders, Virtue-core contractors, or someone deeply coordinated with Virtue. A third-party integrator building retroactively against Virtue would not own Virtue's genesis CDP position.

**Pre-launch / dev-state.** Zero events emitted from \`point\` / \`point_manager\` modules to date — no user points have been awarded. The objects exist and the deployer holds the admin caps, but the user-facing award path hasn't fired. Virtue's public product surface (\`virtue.money\`, \`docs.virtue.money\`, \`app.virtue.money\`) contains no mention of a points program as of 2026-04-22.

**Web-search probes (2026-04-22):**
- \`"virtue money points program"\` → returns only Virtue Poker (unrelated 2021 project).
- \`"virtue" IOTA "bank" module borrow_incentive staking dApp\` → Virtue docs / ecosystem coverage; no points-program mention.
- No \`points.virtue.money\` / \`virtuepoints\` site.

**Why not folded into the \`virtue\` project row:** without Virtue's direct self-attestation, rolling this deployer into Virtue's roster would be guessing. The \`0x6ff423cb…\` deployer is NOT one of Virtue's 5 docs-listed canonical addresses (Framework, VUSD Treasury, Oracle, CDP, Stability Pool) — it's a separate wallet. The synthetic \`studio-6ff4\` team id preserves the "this is tied to Virtue but not publicly claimed by Virtue" ambiguity cleanly. Upgrade to \`virtue\` / a dedicated named team when Virtue publicly claims or announces the points program.

**Attribution confidence — 🟡 strong circumstantial.**
- [x] Struct name \`VirtuePointWitness\` is brand-explicit.
- [x] On-chain registration binds the system to Virtue's \`CERT\` coin type.
- [x] Deployer owned Virtue's first-ever CDP / genesis VUSD mint — strongest-possible insider signal.
- [ ] Virtue has not publicly announced a points program or claimed this deployer address. Short of the self-attestation bar used for [x] attributions like \`virtue\` itself.

**Match rule.** \`deployerAddresses\` pin + \`any: ['point', 'point_manager']\` — the deployer-pin is safe (this address ships only the points cluster as of 2026-04-22), and the module-name check means generic modules like \`config\` don't false-positive into the match. Places after the existing \`virtue\` / \`virtueStabilityPool\` rules in \`ALL_PROJECTS\` by ordering but they use different deployer addresses so there's no actual priority collision — the two projects are on disjoint deployer sets.

\`isCollectible: false\` — functional incentives primitive, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

Category \`Incentives\` — new category, distinct from \`Stablecoin / CDP\` (the \`virtue\` row's slot) to signal this is a separate building block layered on top of Virtue.
`.trim(),
};

/**
 * Generic multi-asset coin-bank on deployer \`0xb9cf086f…\`. Single-module
 * package with permit-gated deposit/withdraw across IOTA / VUSD / CERT /
 * IBTC. Small-scale insider / LP / treasury-management shape. No public
 * brand.
 */
export const multiAssetBank: ProjectDefinition = {
  name: 'Multi-Asset Bank',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Vault',
  addedAt: '2026-04-22',
  description: 'Generic multi-asset coin-bank on IOTA Rebased — single package, single `bank` module with permit-gated `deposit<T> / withdraw<T>` flow. Holds IOTA (~65k), CERT (~3.95k), VUSD (~1.1k), IBTC (~2.6 base units) in typed dynamic-field balances keyed by `BalanceKey<T>`. Fewer than a dozen permit holders ever, dominated by 2-3 recipient wallets. Small-team LP / MM / treasury-management shape, not a user-facing retail product. No public brand surfaces.',
  urls: [],
  teamId: 'studio-b9cf',
  match: {
    deployerAddresses: ['0xb9cf086f7e5e7932901b00e13310cd4ea53fe891722deaea4fbe50b348efc92e'],
    all: ['bank'],
  },
  attribution: `
**On-chain shape.** Single package \`0x9d2108dc73f5ebf2b35135154d0b2237a4e882b357cd901040c2cd21d9bcce86\` (module \`bank\`) on deployer \`0xb9cf086f7e5e7932901b00e13310cd4ea53fe891722deaea4fbe50b348efc92e\`.

**Architecture — permit-gated multi-asset coin-bank.** Struct set: \`BANK\` (OTW), \`AdminCap\`, \`Bank\` (shared root), \`Permit\` (per-recipient permission object), \`BalanceKey<T>\` (typed dynamic-field key). Function signatures:

\`\`\`
public fun create_bank(cap: &AdminCap, ctx: &mut TxContext)
public fun issue_permit(bank: &Bank, permit: &Permit, to: address, ctx: &mut TxContext)
public fun burn_permit(permit: Permit, ctx: &TxContext)
public fun deposit<T>(bank: &mut Bank, permit: &Permit, coin: Coin<T>, ctx: &TxContext)
public fun withdraw<T>(bank: &mut Bank, permit: &Permit, amount: u64, ctx: &mut TxContext): Coin<T>
public fun balance_of<T>(bank: &Bank): u64
\`\`\`

\`Bank\` stores typed balances as dynamic fields keyed by \`BalanceKey<T>\` — one \`Balance<T>\` per coin type the bank holds.

**Live balances (2026-04-22 dynamic-field probe on the \`Bank\` shared object at \`0x36f63a98…\`):**

| Coin type | Balance | Notes |
|---|---|---|
| IOTA | \`64,959,467,924,702\` | ~64.96 IOTA (9 dec) |
| CERT (Virtue LST) | \`3,950,898,670,993\` | ~3.95k CERT (9 dec) |
| VUSD (Virtue stablecoin) | \`1,097,492,292\` | ~1.1k VUSD (6 dec) |
| IBTC | \`2,636,997\` | ~2.6 IBTC (assuming 6 dec) |

Heterogeneous Virtue-ecosystem asset mix.

**Activity pattern — small-team LP / treasury, not retail.**
- \`BankCreated\` (2026-04-08T10:07:52Z) — deployer creates the bank.
- \`PermitCreated\` sequence — early permits are issued to the deployer itself (\`issued_to = issued_by = 0xb9cf086f…\`), then to \`0x68189637…\`, \`0xccefcb51…\`, \`0xbe7b2862…\`, \`0x6aa418b9…\` — 5 distinct addresses over the first few days.
- \`Deposited\` events: dominated by \`0x68189637…\` and \`0xccefcb51…\` depositing 100-200k IOTA at a time.
- \`Withdrawn\` events: same 2 wallets withdrawing comparable sizes.

Reads as an insider / cooperative-LP vault where the admin grants \`Permit\`s to a handful of trusted cooperators, each of whom can then freely deposit/withdraw. Not a public-retail shape (no open-signup, no frontend surface found), not a passive yield vault (withdrawals are active, not reward-streamed).

**Deployer wallet holdings** (\`0xb9cf086f…\`): \`Coin<IOTA>\`, \`Coin<VUSD>\`, \`Coin<CYB>\` (CyberPerp), \`Coin<TLN_TOKEN>\` (TokenLabs), plus the \`bank::AdminCap\`. Cross-protocol DeFi operator wallet.

**Web-search probes (2026-04-22):** "IOTA DeFi bank multi-asset vault" / variants → no branded landing page, no docs site, no announcement. Kept synthetic.

**Match rule.** \`deployerAddresses\` pin + \`all: ['bank']\` single-element module guard — the deployer only ships this one package as of 2026-04-22; the module pin guards against future unrelated deployments under the same admin.

\`isCollectible: false\` — functional vault, not a collectible.

Category \`Vault\` — new category, distinct from \`Stablecoin / CDP\` / \`DEX\` / \`Staking\`. Closest existing precedent is \`BoltEarth\` (sibling concept of permissioned treasury-management contracts). Re-categorise if a broader DeFi vault segment emerges on IOTA.

**Relationship to \`virtuePoints\` (sibling project on \`studio-6ff4\`):** both projects deal in Virtue's CERT token, but the admin wallets are distinct and there's no cross-module reference between the point/config system and this bank. Kept on separate synthetic teams (\`studio-6ff4\` vs. \`studio-b9cf\`) — no evidence yet they share an operator.
`.trim(),
};
