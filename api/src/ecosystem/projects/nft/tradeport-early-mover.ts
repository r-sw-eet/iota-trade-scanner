import { ProjectDefinition } from '../project.interface';

/**
 * Tradeport's promotional "Proof of Early Mover: IOTA" NFT, issued to
 * celebrate their IOTA mainnet launch (Oct 2025). Separate project row
 * from the marketplace stack so the one-off promo drop's TX / sender
 * counts don't conflate with marketplace activity metrics.
 */
export const tradeportEarlyMover: ProjectDefinition = {
  name: 'Tradeport — Proof of Early Mover',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Marketplace',
  description: 'Promotional NFT issued by Tradeport to celebrate their IOTA mainnet launch (October 2025). Single package with one `proof_of_early_mover__iota` module; NFT metadata: name "Proof of Early Mover: IOTA", description "The very beginning of the IOTA NFT era". 131 TXs from one admin minting wallet — one-off campaign drop, not marketplace product activity.',
  addedAt: '2026-04-22',
  urls: [
    { label: 'Collection on Tradeport', href: 'https://www.tradeport.xyz/iota/collection/proof-of-early-mover-iota' },
    { label: 'Tradeport IOTA launch blog', href: 'https://www.tradeport.xyz/blog/tradeport-now-supports-iota-a-new-era-for-onchain-innovation' },
  ],
  teamId: 'tradeport',
  isCollectible: true,
  match: {
    packageAddresses: ['0x876bd726b14b1640a73d9a3f18a8f09d6feda09ceb977a34a5ef62402e42c40a'],
  },
  attribution: `
On-chain evidence: single package \`0x876bd726b14b1640a73d9a3f18a8f09d6feda09ceb977a34a5ef62402e42c40a\` shipping one module \`proof_of_early_mover__iota\` with struct \`Nft\`. Sampled NFT metadata:
- \`name: "Proof of Early Mover: IOTA"\`
- \`description: "The very beginning of the IOTA NFT era"\`
- \`media_url: "ipfs://bafybeifje3eyjxsmlll7h6s42yjhcjvsybrmtq4k35capge4r3e4bend2q"\`

**Attribution chain (decisive):**

1. **Collection is hosted on Tradeport's own marketplace** at \`tradeport.xyz/iota/collection/proof-of-early-mover-iota\` — they surface it on their IOTA collection index alongside the other NFT drops they list.
2. **Tradeport's own social announcement** (X post \`status/1978522182587191333\`): *"TradePort now supports IOTA … to celebrate, we're dropping an Early Mover NFT."*
3. **Module naming convention \`proof_of_early_mover__iota\`** — the double-underscore chain suffix matches Tradeport's multi-chain pattern, where the same "Early Mover" module/series is reused per chain (Tradeport operates on Aptos, Sui, Movement, and now IOTA). The \`__iota\` suffix is self-labelling for chain-of-deployment.
4. **Tradeport's IOTA launch blog** at \`tradeport.xyz/blog/tradeport-now-supports-iota-a-new-era-for-onchain-innovation\` — same announcement window, same "new era for IOTA NFT" language mirrored in the NFT description.

**Separate project row rationale.** The deployer \`0x68e65b6b00aba9486e3c2209c4db382e8503fd26bce62eb3844121a58da6eb48\` is not in Tradeport's marketplace-code deployer list (\`0x20d6…\` Deployer A, \`0xae24…\` Deployer B, \`0x4ecf…\` Deployer C for the kiosk-rules republish). Reads as Tradeport's **promo-mint wallet** — a common pattern for launchpads to separate the "ship product code" key from the "mint promotional collections" key so a compromised promo-mint key can't touch marketplace contracts. Giving this promo drop its own project row (not folded into the \`tradeport\` marketplace row) keeps the one-off 131-TX campaign legible instead of distorting marketplace-activity metrics.

**Activity shape.** 131 TXs, 3 events, 1 unique sender (the admin minting to recipients). No retail mint flow — minted directly to claimers by the operator. Single-module package, no upgrade versions, no follow-up deploys from this wallet.

\`isCollectible: true\` — promotional collectible NFT, not utility. Hidden by the dashboard's "Hide collectibles" toggle.

**Match rule.** \`packageAddresses\` pin on the single package address. Narrower than a \`deployerAddresses\` catch-all so future promo packages from the same wallet get a conscious registry review before being auto-attributed — we want to label each promo drop individually on the dashboard, not silently bucket all future drops under one row.

Team routing: deployer is listed on the \`tradeport\` team (as the promo-mint wallet). Any future packages from this deployer that don't match a narrower rule surface under the Tradeport team in aggregate.
`.trim(),
};
