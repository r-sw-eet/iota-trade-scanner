import { ProjectDefinition } from '../project.interface';

export const truvid: ProjectDefinition = {
  name: 'TruvID',
  layer: 'L1',
  category: 'Notarization',
  description: '7 packages at a single anonymous deployer, all single-module `nft_minter2` with struct `NFT`. On-chain-minted tokens self-identify as `name: "TruvID"` / `"TruvID Genesis"` with `description: "standard document proof"` / `"First TruvID proof NFT with IPFS metadata."` — the shape of an on-chain anchor for off-chain-signed proofs. Circumstantial evidence links this deployer to an anonymous solo-developer video-authenticity PWA; full findings in the `studio-295e` team attribution. Operator identity unconfirmed.',
  urls: [],
  teamId: 'studio-295e',
  match: {
    deployerAddresses: ['0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a'],
  },
  attribution: `
On-chain evidence: every package deployed by \`0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a\` — 7 packages, all single-module \`nft_minter2\` with struct \`NFT\`. Successive upgrade versions of one product.

Product-name self-attestation: minted NFTs carry \`name: "TruvID"\` / \`"TruvID Genesis"\` / \`""\` and \`description: "standard document proof"\` / \`"First TruvID proof NFT with IPFS metadata."\` / \`""\`. Field shape observed via live probe (2026-04) on latest package \`0xe38b3780ee46920b95e0624d1e8447f7bd2206f55680a0bf564f9cff64b297df\`:
\`\`\`
{
  name: "TruvID" | "TruvID Genesis" | "",
  description: "standard document proof" | "First TruvID proof NFT with IPFS metadata." | "",
  image_url: "https://gateway.pinata.cloud/ipfs/<CID>" | "/api/proof/files/<timestamp>-TruvID.png",
  metadata_url: "ipfs://Qm<CID>" | "/api/proof/files/<timestamp>-proof-metadata.json"
}
\`\`\`

Contract surface: 2 structs (\`NFT\` \`{store, key}\`, \`NFT_MINTER2\` \`{drop}\` OTW), 2 functions (\`init\` private, \`mint(String, String, String, String, &mut TxContext)\` public entry). No access control, no admin cap, no hash anchoring on-chain, no events, no burn/update. Anyone can \`mint()\` with arbitrary strings. The on-chain portion is intentionally minimal — shape is consistent with "lightweight anchor for an off-chain-signed artifact" (same pattern as Salus, minus the SHA-hash field Salus puts on-chain).

Match rule: deployer catch-all on \`0x295ee21b…\`. Module name \`nft_minter2\` is too generic to use as a standalone fingerprint (other unrelated deployers could reuse it) and only a subset of minted NFTs have \`"TruvID"\` prefix in the \`name\` field (many are empty string per the probe), so a fingerprint with \`fields.name prefix\` wouldn't reliably catch everything either. Deployer-based match is the cleanest rule — all 7 packages belong to this one product, the deployer has no off-topic packages.

\`isCollectible: false\` (default) — these are proof-anchor RWA NFTs, not PFP collectibles. Visible on the dashboard regardless of the "Hide collectibles" toggle.

Category \`Notarization\` — driven by the on-chain \`description\` self-labelling as "document proof". Same category as IF's own \`Notarization\` (\`dynamic_notarization\`) product; TruvID is a separate third-party deployment, not an IF product.

Team: synthetic \`studio-295e\` (\`Studio 0x295ee21b\`) — the full investigation trail, ruled-out candidates (\`truvid.com\` video-ad / Truv fintech / parked truvid.* domains / TrueID / TruVideo), Vercel-app findings, and the public-frontend-vs-on-chain-wiring gap that prevented promoting this to a named-brand team all live in \`teams/misc/studios.ts\` \`studio295e\`.
`.trim(),
};
