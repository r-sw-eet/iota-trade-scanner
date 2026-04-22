import { ProjectDefinition } from '../project.interface';

/**
 * IOTA EVM L2 anchor on Rebased mainnet — the L1 Move package that anchors
 * IOTA's ISC-powered EVM L2 (Chain ID 8822) back into the L1 ledger. Gold-standard
 * attribution: IOTA's own documentation publishes the package address verbatim,
 * so this is as close to self-attestation as an ecosystem row gets.
 */
export const iotaEvmAnchor: ProjectDefinition = {
  name: 'IOTA EVM Anchor',
  layer: 'L1',
  category: 'Infrastructure',
  subcategory: 'EVM Anchor',
  description: 'L1 anchor for the IOTA EVM L2 (Chain ID 8822) — the ISC `anchor` + `assets_bag` + `request` primitive published at `0x1b33a3cf…` by the IOTA Foundation. Official IOTA docs name this exact address as the mainnet IOTA EVM Package ID. User-facing side of the anchor: retail traffic bridging assets between L1 and the EVM, L2 blocks being finalized via the anchor object, and ISC request objects recording user actions. Live activity: 500k+ TXs (hits the backfill floor — real count higher), 11.8k events, 2,908 unique senders — one of the top-activity unattributed clusters on the network, now gold-standard attributed.',
  urls: [
    { label: 'IOTA EVM', href: 'https://blog.iota.org/iotas-evm-mainnet-launch/' },
    { label: 'IOTA EVM Networks & Chains (docs)', href: 'https://docs.iota.org/developer/iota-evm/getting-started/networks-and-chains' },
    { label: 'EVM Explorer', href: 'https://explorer.evm.iota.org' },
    { label: 'EVM Bridge Toolkit', href: 'https://evm-bridge.iota.org' },
  ],
  teamId: 'iota-foundation',
  match: {
    packageAddresses: ['0x1b33a3cf7eb5dde04ed7ae571db1763006811ff6b7bb35b3d1c780de153af9dd'],
    all: ['anchor', 'assets_bag', 'request'],
  },
  attribution: `
Gold-standard attribution via official IOTA documentation. The IOTA EVM "Networks & Chains" page at \`docs.iota.org/developer/iota-evm/getting-started/networks-and-chains\` publishes the mainnet values verbatim:

> **IOTA EVM**
> Base Token: IOTA Token
> Protocol: ISC / EVM
> Chain ID: 8822
> RPC URL: \`https://json-rpc.evm.iotaledger.net\`
> Explorer: \`https://explorer.evm.iota.org\`
> Additional Info:
> — Chain ID: \`0x0dc448563a2c54778215b3d655b0d9f8f69f06cf80a4fc9eada72e96a49e409d\`
> — **Package ID: \`0x1b33a3cf7eb5dde04ed7ae571db1763006811ff6b7bb35b3d1c780de153af9dd\`**

On-chain scan confirms exactly that package exists, shipped by deployer \`0x8779ca52589fd6f4ca1776b63b200a7b8f9fd71f2c4d386a987dfdb24569fc5e\`, with the canonical ISC L2-anchor module signature: \`anchor\`, \`assets_bag\`, \`request\`. These three are verbatim names from the \`iotaledger/isc\` codebase — \`anchor::Anchor\` is the root L2-chain state object, \`assets_bag\` the native-asset bag pattern for L1↔L2 transfers, \`request\` the request-to-L2 object a user creates when they want the L2 to execute something on their behalf.

**Triangulation:**
- [x] IOTA's docs publish \`0x1b33a3cf…\` as the mainnet IOTA EVM Package ID.
- [x] On-chain scan confirms the package exists at deployer \`0x8779ca52…\`.
- [x] 3-module signature (\`anchor, assets_bag, request\`) matches the public \`iotaledger/isc\` L2-anchor vocabulary.
- [x] Live activity (500k+ TXs, 2,908 unique senders) matches "production L2 anchor" expectations — third-party speculative / abandoned ISC deployments would not see this volume.
- [x] Deployer \`0x8779ca52…\` is single-purpose: publishes only this one package. Consistent with IF dedicating a key to the L2 anchor.

**Scope.** This row represents the **L1-side** anchor contract. The actual L2 EVM state (smart contracts, tokens, DEXes deployed on IOTA EVM like MagicSea / Graphene / Symmio / Wagmi / Iolend / Velocimeter) is enumerated separately via the DefiLlama "IOTA EVM" protocol feed — those show up under the site's "L2" section. This row makes the **L1 anchor side** visible: ISC \`request\` objects being created, \`anchor\` state updates being executed, \`assets_bag\` transfers happening on L1.

**Deployer registered on \`iota-foundation\` team.** Edit 2026-04-22 adds \`0x8779ca52…\` so the team-deployer routing resolves correctly and \`anomalousDeployers\` detection doesn't flag this package as unknown-deployer activity.

**Match rule.** \`packageAddresses\` pin (the one docs-published address) + \`all: ['anchor', 'assets_bag', 'request']\` as a belt-and-suspenders module check — if IF ever redeploys the L2 anchor (e.g. L2 upgrade that requires a new L1 contract), the module-name rule would still catch the new address routing-only via the \`iota-foundation\` team.

\`isCollectible: false\` — functional L2-anchor infrastructure, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

Category \`Chain Primitive\` — sibling to \`iotaFramework\` (core L1 framework), \`stardustFramework\` (Stardust emulation runtime), \`stardustMigratedTokens\` / \`legacyMigrationHistory\` (migration artifacts). The IOTA EVM anchor fits here because it's genesis-scale shared infrastructure, not a single-product row.
`.trim(),
};
