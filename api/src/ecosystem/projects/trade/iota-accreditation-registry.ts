import { ProjectDefinition } from '../project.interface';

export const iotaAccreditationRegistry: ProjectDefinition = {
  name: 'Accreditation Registry',
  layer: 'L1',
  category: 'Identity',
  subcategory: 'Credentials',
  description: 'IOTA Foundation credential-issuer attestation registry. Authorities publish accreditations with structured property-shape vocabulary (name, value, shape); consumers verify credentials against the on-chain registry.',
  urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
  teamId: 'iota-foundation',
  match: { all: ['accreditation', 'property', 'property_value'] },
  attribution: `
On-chain evidence: Move package containing \`accreditation\`, \`property\`, and \`property_value\` modules simultaneously. Single package on mainnet matches (7 modules: \`accreditation, main, property, property_name, property_shape, property_value, utils\`), deployed by the IOTA Foundation Notarization deployer \`0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f\`.

Credential-issuer-style registry with property-shape vocabulary — a distinct IF product adjacent to Notarization / Identity, shipped from the same deployer. 3-module match is unique on mainnet (no non-IF deployer ships any of the three names in combination).
`.trim(),
};
