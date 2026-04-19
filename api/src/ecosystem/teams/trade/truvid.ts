import { Team } from '../team.interface';

export const truvid: Team = {
  id: 'truvid',
  name: 'TruvID',
  description: 'Video-authenticity-proof webapp by anonymous solo developer `oio7764` (GitHub). Branded `TrueVid — Preuve d\'Authenticité` in the app UI; deployed at `truvid.vercel.app` as a single-file HTML PWA. Captures video with NTP timestamps + GPS + ECDSA P-256 signature, claims eIDAS compliance, mints an immutable IOTA NFT as the on-chain anchor for each video proof.',
  urls: [
    { label: 'App', href: 'https://truvid.vercel.app' },
    { label: 'GitHub', href: 'https://github.com/oio7764/Truvid' },
    { label: 'Dev profile', href: 'https://github.com/oio7764' },
  ],
  deployers: ['0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a'],
  attribution: `
Full attribution chain resolved 2026-04-19:

**Developer:** GitHub user [\`oio7764\`](https://github.com/oio7764) — anonymous account (joined 2024-01-30, privacy-protected email, no name / bio / social links, 2 total public repos). Solo dev. Not a company, not an IOTA Foundation project, not related to any of the similarly-named brands (\`truvid.com\` video ad platform; US fintech Truv / formerly TruvID; TrueID WebID; TruVideo KFZ; all ruled out separately).

**Source + hosting:** single-commit repo [\`github.com/oio7764/Truvid\`](https://github.com/oio7764/Truvid) (created 2026-02-16, one commit "Create index.html", no README, no license = all-rights-reserved by default). Repo metadata \`homepage\` field points at [\`truvid.vercel.app\`](https://truvid.vercel.app) — confirmed canonical app host. Single-file HTML PWA (~20 KB), French-language UI.

**What the app does** (extracted from live HTML at \`truvid.vercel.app\`):
- Title: \`TrueVid - Preuve d'Authenticité\` (Preuve d'authenticité vidéo = video authenticity proof).
- Captures video in WebM with NTP-atomic-server timestamp (\`Timestamp NTP\`, \`Heure serveur atomique\`).
- Embeds GPS geolocation (\`Géolocalisation GPS\`, \`Coordonnées certifiées\`).
- Signs the proof with \`Signature ECDSA\` / \`ECDSA P-256\`.
- Claims \`Conforme eIDAS\` compliance (EU electronic-signature regulation → \`Valeur juridique\` / legal value).
- Generates a \`CERTIFICAT D'AUTHENTICITÉ\` (certificate) alongside the video, downloadable / shareable.
- IOTA NFT is minted as the immutable on-chain anchor for each proof (minting happens separately — not wired into the published HTML, see below).

**On-chain role:** the NFT is just a pointer. The off-chain app does the heavy lifting (ECDSA signing, NTP timestamp, GPS, certificate generation); the NFT is a write-once receipt that \`(name, description, image_url, metadata_url)\` existed at the time the mint TX landed. This matches the extremely thin Move contract shipped at \`0x295ee21b…559a\`: two functions total (\`init\`, public \`mint\` with 4 string params), no access control, no hash anchoring.

**Repo-vs-chain separation:** worth noting — the published \`github.com/oio7764/Truvid\` repo contains **only \`index.html\`**. No Move sources, no IOTA SDK calls, no wallet connect, no mint flow in the HTML (greps for \`iota\` / \`move\` / \`mainnet\` / \`graphql\` / \`@iota/\` / \`0x…\` all return zero hits). The 7 Move packages and 5+ minted NFTs on mainnet were deployed / minted separately — via the IOTA CLI or an unreleased backend not in this repo. The published frontend is the demo shell; the on-chain footprint was pushed out-of-band.

**Related project by the same developer:** the same \`oio7764\` account created a second video-authenticity app [\`fideo-web\`](https://github.com/oio7764/fideo-web) → [\`fideo-web.vercel.app\`](https://fideo-web.vercel.app) on 2026-04-07 (rebranded "FIDÉO"), anchored to Bitcoin via OpenTimestamps instead of IOTA. Different architecture (Bitcoin has no VM — FIDÉO uses pure SHA-hash Merkle timestamping, not an NFT contract) so it's not a migration away from IOTA — more likely a parallel experiment exploring a different anchoring model. Mentioned here as a pointer if someone wants to compare the two designs, not as evidence that TruvID is dead.

**Checked and ruled out** (2026-04-19) — none of these is the operator:
- \`truvid.com\` → unrelated video-ad-tech platform.
- \`truv.com\` (US fintech Truv, originally TruvID-branded) → income-verification SaaS, no IOTA presence, \`/api/proof/files/\` path 404s on all their subdomains, GitHub at \`truvhq\` has no IOTA code.
- \`truvid.io\` / \`truvid.app\` / \`truvid.co\` → parked domains (identical sedo-style landing pages).
- \`truvid.xyz\` / \`truvid.network\` / \`truvid.finance\` / \`truvid.dev\` / \`truvidapp.com\` / \`iotatruvid.com\` → DNS-unregistered.
- \`webid-solutions.com\` (TrueID WebID) / \`truvideo.com\` (KFZ service videos) → different products; \`/api/proof/files/\` paths 404.

The \`/api/proof/files/<timestamp>-TruvID.png\` URL fragments embedded in some minted NFTs were originally served by the Vercel backend at \`truvid.vercel.app\` and have since been stripped (Vercel serverless has no persistent filesystem, so file artifacts were ephemeral and 404 now); newer mints use Pinata IPFS gateway URLs directly.

**Attribution completeness:** developer handle / app / canonical URL / source repo / on-chain-vs-frontend separation all confirmed. Real-name identity behind \`oio7764\` not available — account is intentionally anonymous. Good enough for the attribution row; deeper doxxing isn't warranted.
`.trim(),
};
