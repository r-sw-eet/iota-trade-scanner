import { ProjectDefinition } from '../project.interface';

export const cyberperp: ProjectDefinition = {
  name: 'CyberPerp (L1 Move)',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Perpetuals',
  description: 'CyberPerp\'s IOTA L1 Move deployment — GMX-style perpetuals, CYB token, and LayerZero OFT wrapper. CyberPerp\'s primary deployment is on IOTA EVM (L2, shown separately via DefiLlama); this row covers the L1 Move companion only. Both layers are tracked independently — TVL / volume are layer-specific and not double-counted.',
  urls: [
    { label: 'Website', href: 'https://cyberperp.io' },
    { label: 'Docs', href: 'https://docs.cyberperp.io' },
  ],
  teamId: 'cyberperp',
  match: { deployerAddresses: ['0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0'] },
  attribution: `
On-chain evidence: deployer-match rule pinned to CyberPerp's single IOTA L1 deployer \`0x14effa2d3435b7c462a969db6995003cfd3db97f403ad9dd769d0a36413fc3e0\`. All 11 L1 Move packages at this deployer — the 19-module GMX-fork perps (4 upgrade versions), the \`cyb\` coin module, the 14-module OFT wrapper, 2 swap/yield-farm packages, and 3 market-only packages — are CyberPerp components.

Single-row approach chosen over sub-project splits (Perps / Swap / CYB / OFT) for readability: users looking at the L1 Move scanner expect one CyberPerp line, not four. The disclaimer above makes the L1/L2 split explicit so CyberPerp rows on the scanner (L1 via Move + L2 via DefiLlama) aren't misread as double-counting.
`.trim(),
};
