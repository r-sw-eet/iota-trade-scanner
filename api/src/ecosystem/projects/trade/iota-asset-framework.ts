import { ProjectDefinition } from '../project.interface';

export const iotaAssetFramework: ProjectDefinition = {
  name: 'Identity Asset Framework',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Framework',
  description: 'IOTA Foundation governance-over-on-chain-assets primitive. Multi-controller registry with borrow / config / delete / transfer / upgrade proposals, plus migration tooling and permissioned public VCs. A distinct IF product from Notarization, shipped at the same deployer.',
  urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
  teamId: 'iota-foundation',
  match: { all: ['asset', 'multicontroller', 'controller_proposal'] },
  attribution: `
On-chain evidence: Move package containing \`asset\`, \`multicontroller\`, and \`controller_proposal\` modules simultaneously. Two packages on mainnet match (16-module and 17-module variants), both deployed by the IOTA Foundation Notarization deployer \`0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f\`.

The 16/17-module set is a complete governance-over-assets primitive: \`asset, borrow_proposal, config_proposal, controller, controller_proposal, delete_proposal, identity, migration, migration_registry, multicontroller, permissions, public_vc, transfer_proposal, update_value_proposal, upgrade_proposal, utils\`. Shared deployer with Notarization puts it inside the \`iota-foundation\` team; the 3-module match is tight enough that no non-IF deployer matches — verified by whole-mainnet scan.
`.trim(),
};
