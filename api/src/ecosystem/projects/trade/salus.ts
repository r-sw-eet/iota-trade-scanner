import { ProjectDefinition } from '../project.interface';

export const salus: ProjectDefinition = {
  name: 'Salus Platform',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Application',
  industries: ['Luxury'],
  description: 'Tokenizes physical commodities — metal ore, raw materials — as Digital Warehouse Receipts (DWRs) on IOTA mainnet. Each NFT anchors a SHA-384 hash of the off-chain document, proving authenticity without storing the file on-chain. Supports financing, marketplace listings, and title transfers of commodity-backed assets.',
  urls: [
    { label: 'Platform', href: 'https://salusplatform.com' },
    { label: 'Beta Nexus', href: 'https://nexus-beta.salusplatform.com' },
    { label: 'IOTA showcase', href: 'https://www.iota.org/learn/showcases/salus' },
    { label: 'IOTA blog', href: 'https://blog.iota.org/trade-finance-reinvented/' },
  ],
  teamId: 'salus',
  match: {
    packageAddresses: ['0xf5e4f55993ef59fe3b61da5e054ea2a060cd78e34ca47506486ac8a7c9c7a90f'],
    fingerprint: {
      type: 'nft::NFT',
      issuer: '0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225',
      tag: 'salus',
    },
  },
  attribution: `
On-chain evidence:
- Primary: package at exact address \`0xf5e4f55993ef59fe3b61da5e054ea2a060cd78e34ca47506486ac8a7c9c7a90f\`.
- Fingerprint: Move object of type \`<pkg>::nft::NFT\` whose \`issuer\` field equals Salus's deployer \`0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` and whose \`tag\` field equals \`"salus"\`.

Strong organization-level + Move-object self-attestation. No single source publishes the specific package address, but the chain of evidence is comprehensive:

- **IOTA Foundation endorsement:** IOTA's Technology Showcase has a dedicated Salus page (\`iota.org/learn/showcases/salus\`) and a feature blog post at \`blog.iota.org/trade-finance-reinvented\`.
- **Partnership coverage:** Bitget, CoinTrust, ChainCatcher, Blockchain.News, MEXC, and RootData all published launch coverage describing Salus tokenizing DWRs and Bills of Lading as IOTA NFTs for critical-mineral supply chains.
- **Visual attestation:** Salus publishes images of their on-chain NFTs on X/Twitter; anyone can cross-check a shown NFT's address against the scanner's \`0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` deployer.
- **On-chain self-attestation:** every Move object of type \`<pkg>::nft::NFT\` minted by Salus contains \`issuer\` and \`tag\` fields populated with \`0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` and \`"salus"\` respectively — the contract writes its own identity into each minted token.

Scan of deployer \`0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225\` reveals **60 distinct package addresses**, all with a single module named \`nft\`. Unusual pattern: rather than one package upgraded 60 times (which would preserve the original address with version bumps), Salus publishes a *new* package per batch of DWRs. The hardcoded \`packageAddresses\` catches one specific instance; everything else is rescued via the fingerprint rule — textbook case for why the fingerprint primitive exists.

Fingerprint probe verified live — sampled object fields on \`0xf5e4f55993ef59fe3b61da5e054ea2a060cd78e34ca47506486ac8a7c9c7a90f::nft::NFT\`:
\`\`\`
id:               0x59e6523564f5d77da0aea9ac1ddf62e41c506535ba43bbc31ae5919093a1cd99
issuer:           0x4876d3fca2cb61ce39d4f920ad0705f5921995642c69201ee5adfa8f94c34225
tag:              "salus"
immutable_metadata, metadata, issuerIdentity, ownerIdentity: (populated)
\`\`\`

All 60 packages successfully attribute to Salus in the live snapshot. The hardcoded \`packageAddresses\` is technically redundant (fingerprint would catch it) but serves as a canonical pointer and ensures attribution if someone ever queries an NFT-less instance (fingerprint requires a live minted object to probe).
`.trim(),
};
