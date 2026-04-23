import { Team } from '../team.interface';

export const salus: Team = {
  id: 'salus',
  name: 'Salus Platform',
  description: 'Commodity-tokenization platform — mints Digital Warehouse Receipts (DWRs) and Bills of Lading as IOTA NFTs for critical-mineral supply chains. Publishes a new Move package per batch rather than upgrading one, so the registry anchors attribution via a fingerprint rule.',
  urls: [
    { label: 'Platform', href: 'https://salusplatform.com' },
    { label: 'Beta Nexus', href: 'https://nexus-beta.salusplatform.com' },
  ],
  deployers: [{ address: '0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225', network: 'mainnet' }],
  logo: '/logos/salus.png',
  attribution: `
Strong organization-level + Move-object self-attestation. No single source publishes the specific package address the way Virtue's or Switchboard's docs do, but the chain of evidence is comprehensive:

- **IOTA Foundation endorsement:** IOTA's Technology Showcase has a dedicated Salus page (\`iota.org/learn/showcases/salus\`) and a feature blog post at \`blog.iota.org/trade-finance-reinvented\`.
- **IOTA-Salus partnership coverage:** Bitget, CoinTrust, ChainCatcher, Blockchain.News, MEXC, and RootData all published launch coverage describing Salus tokenizing DWRs and Bills of Lading as IOTA NFTs for critical-mineral supply chains.
- **Salus Platform's own site** (\`salusplatform.com\`) describes the product — minerals-focused trade-finance platform built on IOTA.
- **Visual attestation:** Salus publishes images of their on-chain NFTs (DWR receipts) on their X/Twitter account. Anyone can cross-check a shown NFT's address against the scanner's \`0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` deployer.
- **On-chain self-attestation:** every Move object of type \`<pkg>::nft::NFT\` minted by Salus contains \`issuer\` and \`tag\` fields populated with \`0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` and \`"salus"\` respectively — the contract writes its own identity into each minted token.

Scan of deployer \`0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` reveals 60 distinct package addresses, all with a single module named \`nft\`. Unusual pattern: rather than one package upgraded 60 times (which would preserve the original address with version bumps), Salus publishes a *new* package per batch of DWRs. The registry's \`packageAddresses\` hardcode of one specific address (\`0xf5e4f55993ef59fe3b61da5e054ea2a060cd78e34ca47506486ac8a7c9c7a90f\`) catches that one instance; everything else is rescued via the fingerprint rule.

Fingerprint probe verified live — sampled object fields:
\`\`\`
id:               0x59e6523564f5d77da0aea9ac1ddf62e41c506535ba43bbc31ae5919093a1cd99
issuer:           0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225
tag:              "salus"
immutable_metadata, metadata, issuerIdentity, ownerIdentity: (populated)
\`\`\`

Triangulation:
- [x] IOTA Foundation's own showcase page endorses Salus as an IOTA partner.
- [x] Multiple independent news outlets published the Salus-on-IOTA launch story.
- [x] Fingerprint probe confirms each Salus-minted NFT carries self-attestation linking the token to the deployer address.
- [x] 60 packages, all same single-module \`nft\` pattern, all same deployer, all with matching fingerprint.
- [x] No other deployer on IOTA mainnet mints NFT objects with \`issuer=0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` and \`tag="salus"\`.

Open question (not a verification issue): why a new package per batch instead of upgrading one? Plausible reasons — each batch is a distinct legal trade instrument (one DWR per package), publishing is cheaper than upgrading for very small packages, or regulatory/provenance reasons isolate audit trails per trade. None affect attribution.
`.trim(),
};
