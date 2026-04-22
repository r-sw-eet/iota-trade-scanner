import { ProjectDefinition } from '../project.interface';

export const identityWot: ProjectDefinition = {
  name: 'Identity (WoT)',
  layer: 'L1',
  category: 'Identity',
  subcategory: 'Framework',
  description: 'Web of Trust variant of IOTA Identity. Decentralized identity verification where trust relationships between entities are recorded on-chain, forming a verifiable trust graph. Lighter than the full-stack Identity deployment — no file vault, no mailbox.',
  urls: [
    { label: 'IOTA Foundation', href: 'https://www.iota.org/products/identity' },
    { label: 'GitHub', href: 'https://github.com/iotaledger/identity' },
  ],
  teamId: 'iota-foundation',
  match: { all: ['wot_identity', 'wot_trust'] },
  attribution: `
On-chain evidence: Move package with both \`wot_identity\` and \`wot_trust\` modules.

Catches 20 of the 24 IOTA Identity packages at IF deployer \`0x45745c3d1ef637cb8c920e2bbc8b05ae2f8dbeb28fd6fb601aea92a31f35408f\` — everything containing both \`wot_identity\` + \`wot_trust\`:
- WoT-basic \`{wot_identity, wot_trust}\` — 6 upgrade versions.
- WoT + identity_registry \`{identity_registry, wot_identity, wot_trust}\` — 4 versions.
- WoT + wot_identity_registry \`{wot_identity, wot_identity_registry, wot_trust}\` — 4 versions.
- WoT + mailbox \`{mailbox, wot_identity, wot_identity_registry, wot_trust}\` — 6 versions.

Priority in \`ALL_PROJECTS\` puts \`identityFull\` first, so this rule only fires when the 3-module full-stack signature (\`{wot_identity, file_vault, mailbox}\`) doesn't match. Same \`iota-foundation\` team, same deployer. Attested at the canonical IF repo \`github.com/iotaledger/identity\` ("Decentralized Identity standards … DID and Verifiable Credentials by W3C for the IOTA MoveVM").
`.trim(),
};
