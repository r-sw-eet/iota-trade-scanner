import { ProjectDefinition } from '../project.interface';

export const truvid: ProjectDefinition = {
  name: 'TruvID',
  layer: 'L1',
  category: 'Notarization',
  description: 'Video-authenticity-proof webapp anchored on IOTA Rebased — captures video with NTP timestamps + GPS + ECDSA P-256 signatures (claims eIDAS compliance), generates a legal-format authenticity certificate, mints an IOTA NFT as the immutable on-chain anchor for each proof. Branded `TrueVid — Preuve d\'Authenticité` in the UI. 7 single-module `nft_minter2` packages at one deployer; app lives at `truvid.vercel.app` (single-file PWA), source at `github.com/oio7764/Truvid`. Solo-developer project under anonymous GitHub handle `oio7764`.',
  urls: [
    { label: 'App', href: 'https://truvid.vercel.app' },
    { label: 'GitHub', href: 'https://github.com/oio7764/Truvid' },
  ],
  teamId: 'truvid',
  match: {
    deployerAddresses: ['0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a'],
  },
  attribution: `
On-chain evidence: every package deployed by \`0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a\` — 7 packages, all single-module \`nft_minter2\` with struct \`NFT\`. Seven upgrade versions of one product.

Product-name self-attestation: minted NFTs carry \`name: "TruvID"\` / \`"TruvID Genesis"\` and \`description: "standard document proof"\` / \`"First TruvID proof NFT with IPFS metadata."\`. Field shape observed on latest package \`0xe38b3780ee46920b95e0624d1e8447f7bd2206f55680a0bf564f9cff64b297df\`:
\`\`\`
{
  name: "TruvID" | "TruvID Genesis" | "",
  description: "standard document proof" | "First TruvID proof NFT with IPFS metadata." | "",
  image_url: "https://gateway.pinata.cloud/ipfs/<CID>" | "/api/proof/files/<timestamp>-TruvID.png",
  metadata_url: "ipfs://Qm<CID>" | "/api/proof/files/<timestamp>-proof-metadata.json"
}
\`\`\`

**App identification:** the relative \`/api/proof/files/<timestamp>-TruvID.png\` URL fragment traces back to [\`truvid.vercel.app\`](https://truvid.vercel.app) — a single-file HTML PWA titled \`TrueVid - Preuve d'Authenticité\` (French-language video-authenticity-proof app). HTML probe surfaced the feature set: NTP timestamp, GPS geolocation, ECDSA P-256 signing, WebM video capture, eIDAS-compliance claim, authenticity-certificate generation. The IOTA NFT is the on-chain anchor for each off-chain-signed video proof — same pattern as Salus (on-chain pointer, off-chain artifact).

**Source confirmation:** repo [\`github.com/oio7764/Truvid\`](https://github.com/oio7764/Truvid) (\`homepage: truvid.vercel.app\`, created 2026-02-16, single commit "Create index.html"). Solo developer under anonymous handle \`oio7764\`.

**Repo-vs-chain separation:** the published repo contains only \`index.html\` (20 KB) — no Move sources, no IOTA SDK calls, no wallet-connect, no mint flow in the HTML (greps for \`iota\` / \`move\` / \`mainnet\` / \`@iota/\` / \`graphql\` return zero hits). The 7 Move packages and 5+ minted NFTs on mainnet were deployed and minted out-of-band (CLI or unreleased backend), not from the published frontend. The published code is the demo shell; the on-chain footprint is a parallel thread.

**Contract surface:** 2 structs (\`NFT\` \`{store, key}\`, \`NFT_MINTER2\` \`{drop}\` — OTW), 2 functions (\`init\` private, \`mint(String, String, String, String, &mut TxContext)\` public entry). No access control, no admin cap, no hash anchoring on-chain, no events, no burn/update. Anyone can \`mint()\` with arbitrary strings. The on-chain portion intentionally minimal — the crypto / timestamping / geo / certificate work lives in the app.

Match rule: deployer catch-all on \`0x295ee21b…\`. Module name \`nft_minter2\` is too generic to use as a standalone fingerprint (other unrelated deployers could reuse it) and only a subset of minted NFTs have \`"TruvID"\` prefix in the \`name\` field (many are empty string per the probe), so a fingerprint with \`fields.name prefix\` wouldn't reliably catch everything either. Deployer-based match is the cleanest rule — all 7 packages belong to this one product, the deployer has no off-topic packages.

\`isCollectible: false\` (default) — these are proof-of-video RWA anchor NFTs, not PFP collectibles. Visible on the dashboard regardless of the "Hide collectibles" toggle.

Category \`Notarization\` — specifically video notarization (video evidence with legal-format certificate). Sits next to IF's own \`Notarization\` (\`dynamic_notarization\`) product in the Trade / Enterprise section; TruvID is a third-party / non-IF solo-dev take on the same problem space.

See \`teams/trade/truvid.ts\` for the full ruled-out-candidates table (Truv, Truvid-video-ads, TrueID, TruVideo, parked \`truvid.*\` domains) and the \`oio7764\` developer profile.
`.trim(),
};
