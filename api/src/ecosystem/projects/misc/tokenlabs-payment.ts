import { ProjectDefinition } from '../project.interface';

export const tokenlabsPayment: ProjectDefinition = {
  name: 'TokenLabs Payment',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Payments',
  description: 'Simple payment primitive by TokenLabs. Utility module for direct on-chain transfers with attached metadata; paired with TLN for in-ecosystem settlements.',
  urls: [{ label: 'Website', href: 'https://tokenlabs.network' }],
  teamId: 'tokenlabs',
  match: {
    deployerAddresses: ['0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c'],
    all: ['simple_payment'],
  },
  attribution: `
On-chain evidence: Move package containing a \`simple_payment\` module AND published by TokenLabs' admin/operator deployer \`0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c\`. Using \`deployerAddresses + all\` composition rather than \`{exact: [simple_payment]}\` because the module name \`simple_payment\` is generic enough that an unrelated future team could ship the same single-module package — pinning the deployer eliminates that risk.
`.trim(),
};
