import { Team } from '../team.interface';

export const cyberperp: Team = {
  id: 'cyberperp',
  name: 'CyberPerp',
  description: 'GMX-fork perpetuals DEX. Primary deployment is IOTA EVM (L2, tracked via DefiLlama); this team entry covers CyberPerp\'s IOTA L1 Move companion (11 packages: perps fork, CYB coin, OFT wrapper, swap/yield-farm, market).',
  urls: [
    { label: 'Website', href: 'https://cyberperp.io' },
    { label: 'Docs', href: 'https://docs.cyberperp.io' },
    { label: 'DefiLlama', href: 'https://defillama.com/protocol/cyberperp' },
  ],
  deployers: [{ address: '0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0', network: 'mainnet' }],
  logo: '/logos/cyberperp.svg',
  attribution: `
Deployer \`0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0\` identified as CyberPerp's IOTA L1 deployer via on-chain fingerprint + product match. Its 11 packages include a 4-package 19-module GMX-style perpetuals signature (\`delegates, liquidity_pool, market, price_oracle, pyth, referral, rewards_manager, router_*, trading, trading_calc, utils, vault, vault_type\`), a \`cyb\` single-module coin package (the CYB token literal), a 14-module \`oft_*\` wrapper (LayerZero OFT for bridging CYB cross-chain), and 2 DEX/yield-farm packages + 3 standalone market-only packages.

CyberPerp's public site (cyberperp.io, docs.cyberperp.io) markets the product as a GMX-fork perps DEX on IOTA EVM; the IOTA L1 packages are the MoveVM companion (native IOTA derivatives + CYB-token bridging). DefiLlama tracks the L2 EVM deployment separately — the L1 Move row and the L2 EVM row are both genuine and NOT double-counted (layer-specific TVL/volume).

Registry history: this deployer was previously mislabeled as Virtue's main deployer. The \`{liquidity_pool, delegates}\` rule our Virtue def used actually matched this 19-module CyberPerp GMX fork — fixed 2026-04-18 alongside Virtue's remediation.
`.trim(),
};
