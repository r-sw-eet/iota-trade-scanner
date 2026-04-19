import { ProjectDefinition } from '../project.interface';

export const swirl: ProjectDefinition = {
  name: 'Swirl V2',
  layer: 'L1',
  category: 'Liquid Staking',
  description: 'Current (V2) Swirl liquid staking protocol on IOTA Rebased — users stake IOTA and receive stIOTA (Move type `cert::CERT`), a reward-bearing LST that accrues validator rewards while remaining tradeable and usable as DeFi collateral (Virtue accepts it for VUSD CDPs). 9 packages across two deployers shipping the 5-module `{cert, math, native_pool, ownership, validator_set}` codebase audited by Hacken for Ankr\'s Asphere team. V1 (`{pool, riota}`) is tracked as a separate project under the same team so the V1→V2 migration stays visible on-chain.',
  urls: [
    { label: 'App', href: 'https://swirlstake.com' },
    { label: 'Docs', href: 'https://docs.swirlstake.com' },
  ],
  teamId: 'swirl',
  match: {
    deployerAddresses: [
      '0x119191cd04c303b5cd872868a1898fe205c1eb9eaee9fb97c1ee87c943e40066', // V2 primary
      '0x13b068af67f69cc9d4f85f33af1ad5d2d5800b4e8148e3c6a9a39bb018a73040', // V2 secondary
    ],
  },
  attribution: `
On-chain evidence: every package from Swirl's V2 deployers — primary \`0x119191cd04c303b5cd872868a1898fe205c1eb9eaee9fb97c1ee87c943e40066\` (7 pkgs) and secondary \`0x13b068af67f69cc9d4f85f33af1ad5d2d5800b4e8148e3c6a9a39bb018a73040\` (2 pkgs). All 9 packages ship the 5-module signature \`{cert, math, native_pool, ownership, validator_set}\` — the architecture Hacken's audit describes as "a liquid staking system for IOTA, combining modules for validator management, staking operations, mathematical utilities, and a reward-bearing CERT token that appreciates in value to reflect accumulated staking rewards". The mapping is 1:1: "validator management" → \`validator_set\`, "staking operations" → \`native_pool\`, "mathematical utilities" → \`math\`, "reward-bearing CERT token" → \`cert\`.

Confirmation chain: package \`0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c\` (the V2 primary's first deployment) is independently labeled as Swirl's stIOTA contract by external explorers (iotascan.com). Its Move type \`<pkg>::cert::CERT\` is what Virtue's CDP module accepts as collateral on-chain — consistent with Virtue's docs listing "stIOTA" as a supported collateral asset.

Split from V1: V1 (the \`{pool, riota}\` 4-package deployment at \`0x043b7d4d…2351c\`) is tracked as its own project "Swirl V1" under the same \`swirl\` team. The two architectures share no deployers, no modules, and no cross-package calls — they're architecturally independent codebases sharing a brand, not a versioned continuation. Keeping them on separate rows surfaces the V1→V2 migration on the dashboard while the team-level rollup still aggregates both.

Match rule: deployer catch-all across both V2 deployers. Simpler than enumerating 9 package addresses and automatically catches future V2 upgrades without scanner edits.

History: originally \`{exact: [pool, riota]}\` here (V1-only, 4 of 13 packages). A separate "Swirl Validator" attempt with \`{cert, native_pool, validator}\` was dropped 2026-04-18 because Swirl ships \`validator_set\` (plural), not \`validator\`. V2 was discovered 2026-04-19 when the TX-effects probe surfaced cluster \`0x119191cd…\` creating \`0x346778…::cert::CERT\` — that single ident bridged Hacken's audit description to a concrete deployer. On the same day, the def was split into V1 and V2 rows under one team per the architectural-distinct-versions modeling rule.
`.trim(),
};

export const swirlV1: ProjectDefinition = {
  name: 'Swirl V1',
  layer: 'L1',
  category: 'Liquid Staking',
  description: 'Swirl\'s original (V1) liquid staking deployment — 4 on-chain packages with the 2-module `{pool, riota}` core. `pool` is the staking vault, `riota` is the receipt token (internally called "rIOTA"). Superseded by Swirl V2, which rebuilds the protocol around a 5-module architecture and a new `cert::CERT` token externally branded as stIOTA. Listed separately so residual V1 activity (unmigrated stakers, redemptions) stays visible as the migration completes.',
  urls: [
    { label: 'App', href: 'https://swirlstake.com' },
    { label: 'Docs', href: 'https://docs.swirlstake.com' },
  ],
  teamId: 'swirl',
  match: {
    deployerAddresses: [
      '0x043b7d4d89c36bfcd37510aadadb90275622cf603344f39b29648c543742351c',
    ],
  },
  attribution: `
On-chain evidence: every package from Swirl's V1 deployer \`0x043b7d4d89c36bfcd37510aadadb90275622cf603344f39b29648c543742351c\` — 4 packages, all with the 2-module signature \`{pool, riota}\`. Four upgrade versions of the same liquid-staking core: \`pool\` is the staking vault (Hacken's audit tags it "Liquidity Pool"), \`riota\` is the receipt-token type (a.k.a. "rIOTA" internally). No off-topic packages on this deployer — clean single-product footprint.

This is Swirl's original deployment, predating the V2 rewrite to the \`{cert, math, native_pool, ownership, validator_set}\` architecture. V2 is tracked as the "Swirl V2" project — see that entry for the post-rewrite Hacken audit mapping and the stIOTA / CERT token evidence.

Why split from V2: disjoint deployers, disjoint module sets, no cross-package calls between V1 and V2 — they're architecturally independent codebases that share a team and a brand, not a versioned continuation. Splitting keeps the V1→V2 migration visible: any residual rIOTA activity (stakers who haven't migrated, redemptions) lives on these 4 packages, while all current-product activity ships under V2. The team page carries the shared Hacken-audit provenance (Ankr / Asphere / "StakeFi" internal codename) that covers both architectures.
`.trim(),
};
