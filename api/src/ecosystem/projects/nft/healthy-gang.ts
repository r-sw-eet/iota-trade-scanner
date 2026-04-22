import { ProjectDefinition } from '../project.interface';

export const healthyGang: ProjectDefinition = {
  name: 'Healthy Gang',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Collection',
  description: 'Small hand-minted PFP collection on IOTA Rebased — fruit-themed named editions (sampled: `Healthy Gang #2 - Strawberry`). Pure collectible: name + IPFS media, no utility, no RWA anchor. Shipped from the `studio-cb69` deployer (same address that mints Ghost Lights / Tanapaz / Toma Rajadão / Tranquilidade Drops — see the studio aggregate for the full footprint). Marked `isCollectible` so the dashboard\'s "Hide collectibles" toggle can keep it out of the real-usecases view.',
  urls: [],
  teamId: 'studio-cb69',
  isCollectible: true,
  match: {
    fingerprint: {
      type: 'iota_healthy_gang_::Nft',
      fields: {
        name: { prefix: 'Healthy Gang #' },
      },
    },
  },
  countTypes: ['iota_healthy_gang_::Nft'],
  attribution: `
On-chain evidence: Move package from deployer \`0xcb6956e9f7f2515054241b74a1c0b545b4e813d0e5e15f9bb827870b3d63724c\` containing a module named \`iota_healthy_gang_\` (note the trailing underscore — atypical, suggests a test-deploy module name that stuck) whose \`Nft\` struct is minted with a \`name\` field prefixed \`Healthy Gang #\`.

Sampled object in the 2026-04 snapshot: type \`0xafe4bcec7e3f005192686b3bf9db1c64a7bbca659dcae8e5eec4718727f85a73::iota_healthy_gang_::Nft\`, fields \`{ name: "Healthy Gang #2 - Strawberry", media_url: "ipfs://bafybeiefnmgpulnjuxbo34zn55ivjohn5ggrubj5ocqda5bigzto6graje" }\`.

Fingerprint-only match (not sync — the def has no \`packageAddresses\` / \`deployerAddresses\` / module rule, so it's only reachable via \`matchByFingerprint\`). Packages from the \`studio-cb69\` deployer are synchronously caught by the studio aggregate (\`Studio 0xcb6956e9\` project), which sets \`splitByDeployer: true\` — that triggers the fingerprint-override escape hatch in \`fetchFull\`, which consults \`matchByFingerprint\` and reclassifies any package whose \`<pkg>::iota_healthy_gang_::Nft\` probe matches the \`Healthy Gang #\` prefix to this row instead.

No public website, no marketplace listing, no social handle traced for "Healthy Gang" — small private / community mint from a Lusophone-adjacent anonymous operator. Team attribution is deliberately the synthetic \`studio-cb69\` pending operator identification (one of the deployer's modules is \`droppzz_test_iota\`, possibly pointing at an operator handle, but unconfirmed).

This is a pure PFP collectible — \`isCollectible: true\` flags it so users can hide it via the dashboard's "Hide collectibles" toggle while keeping real-usecase NFTs (RWA anchors like Salus DWRs, ObjectID authenticity tokens, TruvID document proofs) visible.
`.trim(),
};
