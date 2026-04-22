import { ProjectDefinition } from '../project.interface';

export const iotaNames: ProjectDefinition = {
  name: 'IOTA Names',
  layer: 'L1',
  category: 'Name Service',
  description: 'Native name service for IOTA Rebased — users register `.iota` domains that map human-readable handles to addresses, replacing long hex IDs in UX flows. Codebase is IF-maintained at `github.com/iotaledger/iota-names` (Apache-2.0) with a TypeScript SDK at `@iota/iota-names-sdk`; commercial service at `iotanames.com` is operated by **Rising Phoenix 2 Ltd** (British Virgin Islands; privacy contact at `privacy@iota.org` — IF-operated BVI wrapper). Sampled registrations surface enterprise / trade-finance use cases (`kenyaportsauthority.iota`, `hapaglloyd.iota`, `nnpc.iota`, `onchainidentity.iota`) alongside community names.',
  urls: [
    { label: 'App', href: 'https://iotanames.com' },
    { label: 'Docs', href: 'https://docs.iotanames.com' },
    { label: 'GitHub', href: 'https://github.com/iotaledger/iota-names' },
    { label: 'Mainnet v1 release', href: 'https://github.com/iotaledger/iota-names/releases' },
    { label: 'SDK (npm)', href: 'https://www.npmjs.com/package/@iota/iota-names-sdk' },
  ],
  logo: '/logos/iota-names.svg',
  logoWordmark: '/logos/iota-names-wordmark.svg',
  teamId: 'rising-phoenix-2',
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
Gold-standard on-chain attribution, with a subtlety about who *operates* the service: the codebase is IF-maintained, but the \`iotanames.com\` service is commercially operated by **Rising Phoenix 2 Ltd** (separate legal entity; see the \`iota-names\` team attribution for the full operator chain + ToS extract).

**Released identifiers** — verbatim from the IF GitHub release \`[Mainnet] iota-names v1\` (2026-01-19, Apache-2.0, \`github.com/iotaledger/iota-names/releases\`):
- **Package ID:** \`0x6d2c743607ef275bd6934fe5c2a7e5179cca6fbd2049cfa79de2310b74f3cf83\`
- **IotaNames Object ID:** \`0xa14e5d0481a7aa346157078e6facba3cd895d97038cd87b9f2cc24b0c6102d75\`
- **RegistryTable ID:** \`0xa773cef7d762871354f6ae19ad174dfb1153d2d247c4886ada0b5330b9543b57\`
- **ReverseRegistryTable ID:** \`0x18fa62ab8b0ab95ae61088082bd5db796863016fda8f3205b1ea7d13b1792317\`

The released Package ID is the *exact* package whose \`<pkg>::name_registration::NameRegistration\` type our fingerprint probes — direct one-to-one match between the IF release artifact and the scanner's on-chain signature. The other three IDs are the protocol's shared registry Move objects (IotaNames root + forward/reverse name tables).

**On-chain signature:** deployer \`0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1\` ships 6 packages in the live mainnet snapshot, all containing a \`name_registration\` module. Sampled \`NameRegistration\` objects all have \`name_str\` ending in \`.iota\`. No off-topic packages — clean single-product footprint.

**Service / code split:**
- **Code (IF-maintained):** \`github.com/iotaledger/iota-names\` — published under the \`iotaledger\` GitHub org alongside IOTA Identity / Notarization / Traceability / Asset Framework. README: "a protocol native name service for IOTA that implements a mapping table in the ledger that maps human readable names to addresses".
- **SDK (IF-maintained):** \`@iota/iota-names-sdk\` on npm — reserved \`@iota\` scope; supports name registration, record data, coupons, command center, subnames.
- **Service (Rising Phoenix 2 Ltd):** \`iotanames.com\` + \`testnet.iotanames.com\`. ToS explicitly names Rising Phoenix 2 Ltd as the operator. App hero media served from \`files.iota.org/media/iota-names/\` (IF's own CDN), suggesting tight IF-Rising-Phoenix operational alignment but retaining the separate-legal-entity structure.

**Match rule:** deployer catch-all on \`0xfc684adb…3af1\` + fingerprint \`{type: name_registration::NameRegistration, fields.name_str.suffix: .iota}\`. Deployer sync-matches all 6 current packages; the fingerprint is belt-and-suspenders for any future redeploy from a new address (it'd still attribute automatically via the object-level \`.iota\`-suffix signature, no scanner edit required).

**Live-sample names** (from the 2026-04 cluster probe — first 20 of the set): \`nnpc.iota\`, \`xyz.iota\`, \`ei-wallet.iota\`, \`nationalportauthorities.iota\`, \`namespace.iota\`, \`smartcontracts.iota\`, \`import.iota\`, \`antigravitor.iota\`, \`power.iota\`, \`enwadi.iota\`, \`onchainidentity.iota\`, \`kenyaportsauthority.iota\`, \`quest.iota\`, \`receivables.iota\`, \`web3.iota\`, \`gelb.iota\`, \`hapaglloyd.iota\`, \`digitalmarkets.iota\`, \`interest.iota\`, \`shiva.iota\`. Enterprise / trade-finance labels (Kenya Ports Authority, Hapag-Lloyd, NNPC, "nationalportauthorities", "receivables") match the audience IOTA targets through TLIP and the Accreditation Registry.

Triangulation:
- [x] IF GitHub release \`[Mainnet] iota-names v1\` publishes the canonical Package ID — matches our fingerprint's probe exactly.
- [x] Source repo hosted under \`iotaledger\` GitHub org (same org as all other IF-maintained products).
- [x] SDK published under the reserved \`@iota\` npm scope.
- [x] App CDN is \`files.iota.org\` (IOTA Foundation's official file server).
- [x] Deployer ships only \`name_registration\`-module packages (6/6) — no off-topic footprint.
- [x] Every sampled \`NameRegistration\` object has a \`.iota\`-suffix \`name_str\` field — matches the \`.iota\` TLD branding.
- [x] Service operator identified via \`iotanames.com\` ToS as Rising Phoenix 2 Ltd; placed under its own team \`iota-names\` (IF-adjacent pattern like TLIP / TWIN Foundation) rather than under \`iota-foundation\`.
`.trim(),
};
