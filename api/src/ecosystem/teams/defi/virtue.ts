import { Team } from '../team.interface';

export const virtue: Team = {
  id: 'virtue',
  name: 'Virtue Money',
  description: 'First native stablecoin (VUSD) protocol on IOTA Rebased — CDP architecture. Single-deployer team; 36 packages across the Framework / VUSD Treasury / Oracle / CDP / Stability Pool components and their upgrades, rule packages, and incentive add-ons.',
  urls: [
    { label: 'App', href: 'https://virtue.money' },
    { label: 'Docs', href: 'https://docs.virtue.money' },
  ],
  deployers: [{ address: '0xf67d0193e9cd65c3c8232dbfe0694eb9e14397326bdc362a4fe9d590984f5a12', network: 'mainnet' }],
  logo: '/logos/virtue.svg',
  logoWordmark: '/logos/virtue-wordmark.svg',
  attribution: `
Gold-standard attribution: Virtue's own docs publish the five canonical contract addresses at \`docs.virtue.money/resources/technical-resources\` — Framework \`0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b\`, VUSD Treasury \`0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f\`, Oracle \`0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf\`, CDP \`0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22\`, Stability Pool \`0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b\`. All five are deployed by this single team deployer. MoveBit audit (github.com/Virtue-CDP/virtue-audits/blob/main/Virtue-Audit-Movebit-20250710.pdf) confirms source at \`github.com/Virtue-CDP/move-contracts\`, July 10 2025 — independent certification of the repo/deployer link.

**Correction (2026-04-18):** a second deployer \`0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0\` was previously tracked here as Virtue's main deployer. It's actually **CyberPerp's** L1 Move deployer — its 11 packages include a 19-module GMX-style perps fork (\`delegates, liquidity_pool, market, price_oracle, trading, …\`), a \`cyb\` coin module, and CyberPerp's OFT wrapper. Removed here and re-attributed to a standalone \`cyberperp\` team. The Virtue project match rule was rewritten at the same time: it previously used \`{all: [liquidity_pool, delegates]}\`, which matched CyberPerp's GMX fork, not Virtue.
`.trim(),
};
