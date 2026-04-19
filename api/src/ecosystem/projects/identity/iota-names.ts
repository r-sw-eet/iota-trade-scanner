import { ProjectDefinition } from '../project.interface';

export const iotaNames: ProjectDefinition = {
  name: 'IOTA Names',
  layer: 'L1',
  category: 'Name Service',
  description: 'Native name service for IOTA Rebased — users register `.iota` domains that map human-readable handles to addresses, replacing long hex IDs in UX flows. Implemented by the IOTA Foundation at `github.com/iotaledger/iota-names` with a TypeScript SDK (`@iota/iota-names-sdk`). Sampled registrations surface enterprise / trade-finance use cases (e.g. `kenyaportsauthority.iota`, `hapaglloyd.iota`, `nnpc.iota`, `onchainidentity.iota`) alongside community/dev names — same audience as the broader IF identity stack.',
  urls: [
    { label: 'App', href: 'https://iotanames.com' },
    { label: 'GitHub', href: 'https://github.com/iotaledger/iota-names' },
    { label: 'Mainnet v1 release', href: 'https://github.com/iotaledger/iota-names/releases' },
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
Gold-standard attribution: the IOTA Foundation's own GitHub release **\`[Mainnet] iota-names v1\`** (published 2026-01-19 at \`github.com/iotaledger/iota-names/releases\`, Apache-2.0) *explicitly publishes* the canonical on-chain identifiers used by this row.

Released identifiers, verbatim from the GitHub release body:
- **Package ID:** \`0x6d2c743607ef275bd6934fe5c2a7e5179cca6fbd2049cfa79de2310b74f3cf83\`
- **IotaNames Object ID:** \`0xa14e5d0481a7aa346157078e6facba3cd895d97038cd87b9f2cc24b0c6102d75\`
- **RegistryTable ID:** \`0xa773cef7d762871354f6ae19ad174dfb1153d2d247c4886ada0b5330b9543b57\`
- **ReverseRegistryTable ID:** \`0x18fa62ab8b0ab95ae61088082bd5db796863016fda8f3205b1ea7d13b1792317\`

The released Package ID is the *exact* package whose \`<pkg>::name_registration::NameRegistration\` type our fingerprint probes against — direct one-to-one match between IF's public release artifact and the scanner's on-chain signature. The other three IDs are the protocol's shared registry Move objects (the IotaNames root + forward/reverse name tables); they're not packages and not part of the match rule, but serve as additional proof that this deployer is the one IF points at in their own release notes.

On-chain signature: the deployer \`0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1\` ships exactly 6 packages in the live mainnet snapshot, every one carrying a \`name_registration\` module. Sampled objects of type \`<pkg>::name_registration::NameRegistration\` all have a \`name_str\` field ending in \`.iota\`. No off-topic packages on this deployer — clean single-product footprint consistent with IF's one-deployer-per-product pattern elsewhere (Identity stack, Notarization, Traceability).

Identity chain (IF-operated):
- **Source repository:** \`github.com/iotaledger/iota-names\` — published under the \`iotaledger\` GitHub organization (Apache-2.0) alongside the IOTA Identity, Notarization, Traceability, and Asset Framework repos. The repo README describes IOTA-Names as "a protocol native name service for IOTA that implements a mapping table in the ledger that maps human readable names to addresses".
- **Official SDK:** \`@iota/iota-names-sdk\` on npm — scope \`@iota\` is reserved for IF-published packages; the SDK documents basic name registration, setting name record data, coupons, command center operations, and subnames.
- **Public app surface:** \`iotanames.com\` (mainnet) / \`testnet.iotanames.com\` (testnet terms-of-service page is referenced from the repo) — matches the IF-convention of subdomain-per-network for its product UIs.

Match rule: deployer catch-all on \`0xfc684adb…3af1\` + fingerprint \`{type: name_registration::NameRegistration, fields.name_str.suffix: .iota}\`. Deployer sync-matches all 6 current packages; the fingerprint is belt-and-suspenders for any future IOTA-Names redeploy from a new IF address (it'd still attribute automatically via the object-level \`.iota\`-suffix signature, no scanner edit required).

Live-sample names (from the 2026-04 snapshot's cluster probe — first 20 of the live set): \`nnpc.iota\`, \`xyz.iota\`, \`ei-wallet.iota\`, \`nationalportauthorities.iota\`, \`namespace.iota\`, \`smartcontracts.iota\`, \`import.iota\`, \`antigravitor.iota\`, \`power.iota\`, \`enwadi.iota\`, \`onchainidentity.iota\`, \`kenyaportsauthority.iota\`, \`quest.iota\`, \`receivables.iota\`, \`web3.iota\`, \`gelb.iota\`, \`hapaglloyd.iota\`, \`digitalmarkets.iota\`, \`interest.iota\`, \`shiva.iota\`. The mix of enterprise / trade-finance labels (Kenya Ports Authority, Hapag-Lloyd, NNPC, "nationalportauthorities", "receivables") matches the audience IOTA targets through TLIP and the Accreditation Registry — consistent with IF operating the service.

Team: \`iota-foundation\` (same team that owns the Identity stack, Notarization, Traceability, Accreditation Registry, and Asset Framework). Deployer added to \`teams/misc/iota-foundation.ts\` alongside the other IF-operated addresses.

Triangulation:
- [x] IOTA Foundation GitHub release \`[Mainnet] iota-names v1\` publishes the canonical Package ID — matches our fingerprint's \`<pkg>::name_registration::NameRegistration\` probe exactly.
- [x] Source repo hosted under \`iotaledger\` GitHub org (same org as all other IF products on the scanner).
- [x] SDK published under the reserved \`@iota\` npm scope.
- [x] Deployer ships only \`name_registration\`-module packages (6/6) — no off-topic footprint.
- [x] Every sampled \`NameRegistration\` object has a \`.iota\`-suffix \`name_str\` field — matches the \`.iota\` TLD branding.
`.trim(),
};
