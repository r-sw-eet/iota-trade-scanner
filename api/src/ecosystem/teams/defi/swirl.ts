import { Team } from '../team.interface';

export const swirl: Team = {
  id: 'swirl',
  name: 'Swirl',
  description: 'First liquid staking protocol on IOTA Rebased. Operated by Ankr\'s enterprise-services arm Asphere; internal codename "StakeFi". Users stake IOTA and receive stIOTA (rIOTA internally), a rebasing LST used as DeFi collateral across the ecosystem.',
  urls: [
    { label: 'App', href: 'https://swirlstake.com' },
    { label: 'Docs', href: 'https://docs.swirlstake.com' },
  ],
  deployers: [
    '0x043b7d4d89c36bfcd37510aadadb90275622cf603344f39b29648c543742351c', // V1 — {pool, riota} architecture
    '0x119191cd04c303b5cd872868a1898fe205c1eb9eaee9fb97c1ee87c943e40066', // V2 — {cert, math, native_pool, ownership, validator_set} architecture (primary)
    '0x13b068af67f69cc9d4f85f33af1ad5d2d5800b4e8148e3c6a9a39bb018a73040', // V2 — same architecture, secondary deployer
  ],
  logo: '/logos/swirl.svg',
  attribution: `
Gold-standard attribution via Hacken's audit report linked directly from Swirl's docs (\`docs.swirlstake.com\`). Audit front matter:

- Customer: **ANKR** (Ankr's enterprise-services arm, Asphere, is publicly identified as Swirl's co-engineer in launch coverage at Bitget, CryptoNews, CryptoRank).
- Internal product name: **"StakeFi"** — "a project that implements a liquid staking system for IOTA, combining modules for validator management, staking operations, mathematical utilities, and a reward-bearing CERT token that appreciates in value to reflect accumulated staking rewards."
- Website: \`http://swirlstake.com/\`
- Platform: IOTA
- Language: Move
- Repository: \`github.com/Ankr-network/stakefi-iota-smart-contract\`
- Commit audited: \`e18946f\` · Remediation commit: \`1541f5d\`
- Auditor: Hacken OÜ, Tallinn, Estonia — March 25, 2025.

The chain of branding: Swirl (public) = StakeFi (Ankr's internal codename) = the audited codebase at \`Ankr-network/stakefi-iota-smart-contract\`. All three labels are explicitly bridged by the Hacken report.

**Two on-chain architectures across three deployers (13 packages total), split into two project rows under this team:**

- **V1 — project "Swirl V1" (4 pkgs):** deployer \`0x043b7d4d89c36bfcd37510aadadb90275622cf603344f39b29648c543742351c\` — 2-module signature \`{pool, riota}\`. \`pool\` is the staking vault, \`riota\` is the receipt-token type (a.k.a. "rIOTA" internally). Four upgrade versions of the same core.
- **V2 primary — project "Swirl V2" (7 pkgs):** deployer \`0x119191cd04c303b5cd872868a1898fe205c1eb9eaee9fb97c1ee87c943e40066\` — 5-module signature \`{cert, math, native_pool, ownership, validator_set}\`. This is the architecture the Hacken audit actually describes ("validator management, staking operations, mathematical utilities, and a reward-bearing CERT token"). The \`cert\` module ships the public-facing token type \`<pkg>::cert::CERT\`, externally branded as stIOTA.
- **V2 secondary — project "Swirl V2" (2 pkgs):** deployer \`0x13b068af67f69cc9d4f85f33af1ad5d2d5800b4e8148e3c6a9a39bb018a73040\` — same V2 architecture, two upgrade versions.

V1 and V2 have disjoint deployers, disjoint module sets, and no cross-package calls — two architecturally independent codebases sharing a brand and a team, not a versioned continuation. Split into separate project rows on 2026-04-19 so the V1→V2 migration stays visible on-chain; team-level rollup still aggregates both.

V2 confirmation chain: package \`0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c\` (the V2 primary's first deployment) is independently labeled "Staked IOTA / Swirl" on iotascan.com. The Move type \`0x346778…::cert::CERT\` is what Virtue's CDP module accepts as collateral on-chain (visible in Virtue's TX effects), matching Virtue's docs which list "stIOTA" as a supported collateral asset. The V2 module set is exactly what Hacken describes — "validator management" → \`validator_set\`, "staking operations" → \`native_pool\`, "mathematical utilities" → \`math\`, "reward-bearing CERT token" → \`cert\`.

Triangulation:
- [x] Swirl's docs link to the Hacken audit as their official security review.
- [x] Hacken names Ankr as the customer and "StakeFi … liquid staking system for IOTA" as the audited product, describing the exact V2 module set.
- [x] Press coverage (Bitget, CryptoNews) confirms Ankr's Asphere co-engineers Swirl.
- [x] V1 deployer publishes only \`{pool, riota}\` packages; V2 deployers publish only the 5-module set; no overlap, no off-topic packages.
- [x] V2 primary's first package (\`0x346778…\`) is independently labeled as Swirl's stIOTA contract by external explorers, and its CERT type is referenced by Virtue's CDP integration.
`.trim(),
};
