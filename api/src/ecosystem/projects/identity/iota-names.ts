import { ProjectDefinition } from '../project.interface';

export const iotaNames: ProjectDefinition = {
  name: 'IOTA Names',
  layer: 'L1',
  category: 'Name Service',
  description: 'Native name service for IOTA Rebased — users register `.iota` domains that map human-readable handles to addresses, replacing long hex IDs in UX flows. Implemented by the IOTA Foundation at `github.com/iotaledger/iota-names` with a TypeScript SDK (`@iota/iota-names-sdk`). Sampled registrations surface enterprise / trade-finance use cases (e.g. `kenyaportsauthority.iota`, `hapaglloyd.iota`, `nnpc.iota`, `onchainidentity.iota`) alongside community/dev names — same audience as the broader IF identity stack.',
  urls: [
    { label: 'GitHub', href: 'https://github.com/iotaledger/iota-names' },
    { label: 'SDK (npm)', href: 'https://www.npmjs.com/package/@iota/iota-names-sdk' },
  ],
  teamId: 'iota-foundation',
  match: {
    deployerAddresses: [
      '0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1',
    ],
    fingerprint: {
      type: 'name_registration::NameRegistration',
      fields: {
        name_str: { suffix: '.iota' },
      },
    },
  },
  attribution: `
On-chain evidence: matches every package deployed by IOTA Foundation's IOTA-Names deployer \`0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1\` (6 packages in the live snapshot). Every package ships a \`name_registration\` module whose \`NameRegistration\` struct records a registered domain; sampled objects of type \`<pkg>::name_registration::NameRegistration\` all carry a \`name_str\` field ending in \`.iota\`.

Identity chain (IF-operated):
- **Source repository:** \`github.com/iotaledger/iota-names\` — published under the \`iotaledger\` GitHub organization alongside the IOTA Identity, Notarization, Traceability, and Asset Framework repos. The repo README describes IOTA-Names as "a protocol native name service for IOTA that implements a mapping table in the ledger that maps human readable names to addresses".
- **Official SDK:** \`@iota/iota-names-sdk\` on npm — scope \`@iota\` is reserved for IF-published packages; the SDK documents basic name registration, setting name record data, coupons, command center operations, and subnames.
- **Rebased deployer signature:** the deployer ships exactly these 6 packages, all sharing the \`name_registration\` module — no off-topic footprint. Consistent with IF's one-deployer-per-product pattern elsewhere (Identity stack, Notarization, Traceability).

Fingerprint: type \`name_registration::NameRegistration\` + \`fields.name_str\` suffix \`.iota\`. Redundant with the deployer rule today (both catch the same 6 packages) but serves as belt-and-suspenders: any future IOTA-Names redeploy from a new IF address still attributes automatically via the object-level \`.iota\`-suffix signature, no scanner edit required.

Live-sample names (from the 2026-04 snapshot's cluster probe — first 20 of the live set): \`nnpc.iota\`, \`xyz.iota\`, \`ei-wallet.iota\`, \`nationalportauthorities.iota\`, \`namespace.iota\`, \`smartcontracts.iota\`, \`import.iota\`, \`antigravitor.iota\`, \`power.iota\`, \`enwadi.iota\`, \`onchainidentity.iota\`, \`kenyaportsauthority.iota\`, \`quest.iota\`, \`receivables.iota\`, \`web3.iota\`, \`gelb.iota\`, \`hapaglloyd.iota\`, \`digitalmarkets.iota\`, \`interest.iota\`, \`shiva.iota\`. The mix of enterprise / trade-finance labels (Kenya Ports Authority, Hapag-Lloyd, NNPC, "nationalportauthorities", "receivables") matches the audience IOTA targets through TLIP and the Accreditation Registry — consistent with IF operating the service.

Team: \`iota-foundation\` (same team that owns the Identity stack, Notarization, Traceability, Accreditation Registry, and Asset Framework). Deployer added to \`teams/misc/iota-foundation.ts\` alongside the other IF-operated addresses.
`.trim(),
};
