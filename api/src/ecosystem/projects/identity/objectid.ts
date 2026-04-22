import { ProjectDefinition } from '../project.interface';

export const objectid: ProjectDefinition = {
  name: 'ObjectID',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Application',
  description: 'Object-authenticity platform linking physical goods (via GS1 codes and document anchors) to on-chain identities and credit. Showcased on iota.org as a product-authenticity solution.',
  urls: [
    { label: 'Website', href: 'https://objectid.io' },
    { label: 'IOTA showcase', href: 'https://www.iota.org/learn/showcases/objectID' },
  ],
  teamId: 'objectid',
  match: { deployerAddresses: [
    '0x59dadd46e10bc3d890a0d20aa3fd1a460110eab5d368922ac1db02883434cc43',
    '0xbca71c7ae4b8f78e8ac038c4c8aca89d74432a6def0d6395cc5b5c898c66b596',
  ] },
  attribution: `
Previously registered as "OID Identity" based on the \`{oid_credit, oid_identity}\` module pair. Verified as ObjectID via the IOTA Foundation showcase page (iota.org/learn/showcases/objectID) and objectid.io, which describe a product-authenticity platform linking GS1-coded physical goods to on-chain attestations.

Match rule switched from the 2-module pair (which only caught 4 of 12 mainnet packages) to a deployer-based rule: everything published by either of ObjectID's two known deployer keys. The 12-package footprint spans core identity/credit (4 packages), documents (3), allowlist/utils (4), and the OIDGs1IHub package (1) — all published from the same two deployers, no collisions with non-ObjectID projects.
`.trim(),
};
