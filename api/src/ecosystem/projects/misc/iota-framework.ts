import { ProjectDefinition } from '../project.interface';

export const iotaFramework: ProjectDefinition = {
  name: 'Framework',
  layer: 'L1',
  category: 'Infrastructure',
  subcategory: 'Chain Primitive',
  description: 'Core framework package (0x2) powering kiosk trades, display updates, coin operations, transfer policies, and object management on IOTA Rebased. Every on-chain action that touches coins, NFTs, or shared objects routes through these modules.',
  urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
  disclaimer: 'Chain primitive, not an ecosystem dapp. Represents framework-level activity across the IOTA Foundation system package.',
  teamId: 'iota-foundation',
  match: {
    packageAddresses: [
      '0x0000000000000000000000000000000000000000000000000000000000000002',
    ],
  },
  attribution: `
On-chain evidence: exact package address \`0x0000000000000000000000000000000000000000000000000000000000000002\` (the IOTA system framework package).

System package 0x2 is assigned by the chain itself to the IOTA framework (kiosk trades, display metadata, coin operations, transfer policies). There is no "deployer" in the conventional sense — system packages are genesis-installed, so we match by literal address and attribute to the consolidated \`iota-foundation\` team. Not an ecosystem dapp; a chain primitive that receives activity from every coin/NFT/shared-object op.
`.trim(),
};
