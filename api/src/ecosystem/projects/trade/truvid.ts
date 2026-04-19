import { ProjectDefinition } from '../project.interface';

export const truvid: ProjectDefinition = {
  name: 'TruvID',
  layer: 'L1',
  category: 'Notarization',
  description: 'Third-party document-proof / notarization NFT service on IOTA Rebased — mints tamper-evident proof NFTs with IPFS-anchored metadata. Every minted NFT carries `name: "TruvID"` / `"TruvID Genesis"` + a `description` like `"standard document proof"`. 7 packages at a single deployer, all shipping module `nft_minter2` with struct `NFT`. Public web surface is currently unlocated (no findable site / GitHub / IOTA Foundation showcase), but on-chain self-attestation is unambiguous. Distinct from IF\'s own Notarization product.',
  urls: [],
  teamId: 'truvid',
  match: {
    deployerAddresses: ['0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a'],
  },
  attribution: `
On-chain evidence: every package deployed by \`0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a\` — 7 packages, all with a single module \`nft_minter2\` exposing an \`NFT\` struct. Successive upgrade versions of one product.

Product-name identification: every minted NFT's Move-object fields carry \`name: "TruvID"\`, \`"TruvID Genesis"\`, or empty, and \`description: "standard document proof"\` / \`"First TruvID proof NFT with IPFS metadata."\`. On-chain self-attestation — the contract writes its own product name into each minted token.

Field shape observed via live probe (2026-04) on latest package \`0xe38b3780ee46920b95e0624d1e8447f7bd2206f55680a0bf564f9cff64b297df\`:
\`\`\`
{
  name: "TruvID" | "TruvID Genesis" | "",
  description: "standard document proof" | "First TruvID proof NFT with IPFS metadata." | "",
  image_url: "https://gateway.pinata.cloud/ipfs/<CID>" | "/api/proof/files/<timestamp>-TruvID.png",
  metadata_url: "ipfs://Qm<CID>" | "/api/proof/files/<timestamp>-proof-metadata.json"
}
\`\`\`

Relative URL fragments (\`/api/proof/files/...\`) imply TruvID runs a backend web service that stores proof images/metadata server-side alongside the IPFS copies — but the exact host domain isn't surfaced on-chain (no \`website\` / \`external_url\` / issuer field). First package \`0x28ed6ab3a757b6255f40685d8aa328c649cb60b730bc5fa7c8e44be84a4407b7\` stored \`name\` / \`image_url\` as raw byte arrays; later packages switched to plain string fields — consistent with a working-developer iteration between v1 and v7.

Match rule: deployer catch-all on \`0x295ee21b…\`. Module name \`nft_minter2\` is too generic to use as a standalone fingerprint (other unrelated deployers could reuse it) and only a subset of minted NFTs have \`"TruvID"\` prefix in the \`name\` field (many are empty string per the probe), so a fingerprint with \`fields.name prefix\` wouldn't reliably catch everything either. Deployer-based match is the cleanest rule — all 7 packages belong to this one product, the deployer has no off-topic packages.

\`isCollectible: false\` (default) — these are proof-of-document RWA NFTs, not PFP collectibles. Visible on the dashboard regardless of the "Hide collectibles" toggle.

Category \`Notarization\` — same class as IF's \`Notarization\` (\`dynamic_notarization\`) product. TruvID is a third-party / non-IF notarization option; the two rows sit next to each other in the Trade / Enterprise section.

Team: \`truvid\` — standalone team file, based on on-chain self-branding. See \`teams/trade/truvid.ts\` for the operator-identification gap (TODO to chase via IOTA Discord / GitHub code search / direct outreach).
`.trim(),
};
