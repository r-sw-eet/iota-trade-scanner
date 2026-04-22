import { ProjectDefinition } from '../project.interface';

export const nativeStaking: ProjectDefinition = {
  name: 'Native Staking',
  layer: 'L1',
  category: 'Infrastructure',
  subcategory: 'Chain Primitive',
  description: 'Protocol-level staking, validator management, and epoch transitions on the IOTA system package (0x3). Every user who delegates IOTA to a validator (via Firefly or any wallet) interacts with these modules. Includes timelocked staking used for Stardust migration unlocks.',
  urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
  disclaimer: 'Chain primitive, not an ecosystem dapp. Represents native staking activity across the IOTA Foundation system package.',
  teamId: 'iota-foundation',
  match: {
    packageAddresses: [
      '0x0000000000000000000000000000000000000000000000000000000000000003',
    ],
  },
  attribution: `
On-chain evidence: exact package address \`0x0000000000000000000000000000000000000000000000000000000000000003\` (the IOTA staking system package).

System package 0x3 is the protocol-level staking / validator-management / epoch-transition primitive, genesis-installed. Same deployment model as \`0x0000000000000000000000000000000000000000000000000000000000000002\` — no deployer address, matched by literal address, attributed to the consolidated \`iota-foundation\` team. Every IOTA staker's delegation (via Firefly or any wallet) flows through this package.
`.trim(),
};
