import { Team } from '../team.interface';

export const truvid: Team = {
  id: 'truvid',
  name: 'TruvID',
  description: 'Third-party document-proof / notarization NFT service on IOTA Rebased. Mints tamper-evident proof NFTs with IPFS-anchored metadata — standard-document-proof use case. Public web surface is currently minimal; product self-identifies on-chain via every minted NFT\'s `name: "TruvID"` / `"TruvID Genesis"` and `description` fields. Not an IOTA Foundation product — IF ships its own Notarization service separately.',
  deployers: ['0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a'],
  attribution: `
Verified on-chain product name, unverified operator. The team's single public signal is the on-chain self-identification of every minted NFT as "TruvID" — no findable website, no GitHub repo, no IOTA Foundation showcase page, no public social presence (verified 2026-04 via web search: \`truvid.com\` is an unrelated video-ad platform; \`truvid.xyz\` / \`truvid.io\` / \`truvid.app\` do not resolve).

The team id \`truvid\` is taken from the on-chain product branding and kept as the canonical team name; can be renamed if a parent-operator entity is later identified. Related but distinct: the IOTA Foundation ships its own Notarization product (the \`dynamic_notarization\` module at deployer \`0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f\`) — TruvID is a separate third-party deployment, not an IF product.

**On-chain footprint:** 7 packages at deployer \`0x295ee21bc224c1d2ccd8dd9ec966688bdb7d1ca3a8f2a8550694a4debe13559a\`, all single-module \`nft_minter2\` with struct \`NFT\`. Seven upgrade versions of one module — very clean single-product deployer.

**Decisive artifacts observed (2026-04 live probe):**
- \`name\` fields: \`"TruvID"\`, \`"TruvID Genesis"\`, or empty string (varies per NFT).
- \`description\` fields: \`"standard document proof"\`, \`"First TruvID proof NFT with IPFS metadata."\`, or empty.
- \`image_url\` values include relative paths like \`/api/proof/files/1773975498823-TruvID.png\` — implies a backend web service at \`<some-host>/api/proof/files/\` with a timestamp-based filename convention. The exact host domain isn't surfaced in any Move field.
- \`metadata_url\` values are either IPFS CIDs (\`ipfs://Qm...\`) or relative \`/api/proof/files/<timestamp>-proof-metadata.json\` paths. IPFS metadata fetched for \`QmPf5eQvYcaHUqamntiXGM9BHNNimBbnaRbM3f1xyvv9Dc\` contained only name/description/image/attributes — no operator identifier.
- All minted NFTs are currently owned by the deployer address itself — admin-held initial-mint pattern with transfers not yet made, or deployer-as-service-holder.

**Attribution completeness caveats:** We can confidently label this row as "TruvID" per the on-chain branding every NFT carries, but we can't yet name the organization / individual behind it. The \`/api/proof/files/...\` URL fragment implies a public web surface but not its domain. Left as a TODO to chase via IOTA Discord / GitHub code search / direct outreach.
`.trim(),
};
