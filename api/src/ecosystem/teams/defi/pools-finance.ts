import { Team } from '../team.interface';

export const poolsFinance: Team = {
  id: 'pools-finance',
  name: 'Pools Finance',
  description: 'First native DEX on IOTA Rebased — constant-product AMM with pool staking. LP-stake / farming primitives ship inside the audited AMM package (`stake*` modules), not as a separate farming contract.',
  urls: [{ label: 'Website', href: 'https://pools.finance' }],
  deployers: [
    '0x519ebf6b900943042259f34bb17a6782061c5b6997d6c545c95a03271956800c',
    '0xeadab2493d7aff3ac3951e545e9c61bef93dee1915e18aff50414d72067f88e7',
  ],
  logo: '/logos/pools-finance.svg',
  logoWordmark: '/logos/pools-finance-wordmark.svg',
  attribution: `
Gold-standard attribution via Zokyo's public audit report (github.com/zokyo-sec/audit-reports/blob/main/Pools%20Finance/Pools_Finance_Zokyo_audit_report_May12_2025.pdf), which names the private \`Pools-Finance/pools-protocol\` repo at a specific commit and audits ten Move source files: \`amm_config, amm_entries, amm_math, amm_router, amm_stable_utils, amm_swap, amm_utils, stake, stake_config, stake_entries\`. On-chain, exactly two deployers ship packages with that 10-module signature — both addresses listed here. \`0x519e…800c\` is the primary deployer (9 upgrade versions); \`0xeada…88e7\` is the original v0 deployer (1 package), now dormant.

**Correction (2026-04-18):** a third deployer \`0x21303d10…3542\` was previously tracked here as the "farming" deployer based on the \`irt\` module name. Re-investigation (IRT CoinMetadata query + \`app.pools.finance\` bundle grep) proved this address is **IotaRoyale's**, not Pools Finance's — IRT is IotaRoyale's native token ("Token nativo de IotaRoyale"), and the Pools app bundle contains zero references to it. Removed here and re-attributed to a standalone \`iotaroyale\` team. Pools Finance is now 2-deployer, both gold-standard.
`.trim(),
};
