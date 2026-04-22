import { ProjectDefinition } from '../project.interface';

/**
 * Kamui VRF — IOTA Rebased deployment of Mangekyou Labs' multi-chain
 * verifiable-random-function service. Single package primitive exposing a
 * subscription-based randomness coordinator + request ledger + demo consumer.
 */
export const kamuiVrf: ProjectDefinition = {
  name: 'Kamui VRF',
  layer: 'L1',
  category: 'Oracle',
  subcategory: 'VRF',
  description: 'IOTA Rebased deployment of Kamui — verifiable random function (VRF) service by Mangekyou Labs. Single package at `0xc871ca37…` shipping `coordinator` (VRF config + per-consumer Subscription), `request` (RequestRecord ledger), `kamui_iota_vrf` (brand-labelled VRF logic), `demo_consumer` (example integration). Small early-stage footprint on mainnet (6 events, 2 senders, 11 TXs); promotes infrastructure-primitive visibility even at low current volume — VRF is a building block for on-chain games, lotteries, and provably-fair NFT drops.',
  urls: [
    { label: 'Kamui on HackQuest', href: 'https://www.hackquest.io/projects/Kamui-GntkNn' },
    { label: 'Kamui (Solana flagship)', href: 'https://github.com/mangekyou-labs/kamui' },
    { label: 'Mangekyou Labs GitHub', href: 'https://github.com/mangekyou-labs' },
  ],
  teamId: 'kamui',
  match: {
    deployerAddresses: ['0xb5de96379d9eb22739de93b983de28b8c7cbbf8c8f0ddf1390c090f7f6eb74db'],
    all: ['kamui_iota_vrf'],
  },
  attribution: `
On-chain evidence: Move package on deployer \`0xb5de96379d9eb22739de93b983de28b8c7cbbf8c8f0ddf1390c090f7f6eb74db\` shipping a module named \`kamui_iota_vrf\` — explicit brand self-labelling following Mangekyou Labs' multi-chain naming convention (\`kamui\` → Solana flagship, \`kamui-ink\` → Ink zkEVM port, \`kamui_iota_vrf\` → this IOTA deployment).

**Package shape.** Single package \`0xc871ca37099f0d2fa47b4e9ed0b0b18b8f03cf9ac3bd3da60f5b788e69265126\` with 4 modules:

| Module | Role |
|---|---|
| \`coordinator\` | Creates \`coordinator::Coordinator\` (shared VRF config) and \`coordinator::Subscription\` (per-consumer balance + request quota). |
| \`request\` | Creates \`request::RequestRecord\` (one per randomness request, used for on-chain fulfillment + verification audit). |
| \`kamui_iota_vrf\` | Core VRF logic — brand-labelled module containing the ECVRF verifier + output generation. |
| \`demo_consumer\` | Creates \`demo_consumer::DemoConsumer\` — example integration showing a dApp how to consume VRF output. |

Architecture matches the canonical Kamui VRF shape observed in \`mangekyou-labs/kamui\`'s Solana repo (\`kamui-program\` + \`example-vrf-game\` + \`crosschain-prover\` layout).

**Brand confidence.** Strong circumstantial, short of direct self-attestation (🟡 not [x]):
- [x] Module name \`kamui_iota_vrf\` is explicit brand + chain self-labelling.
- [x] \`{coordinator, request, consumer}\` trio matches Mangekyou Labs' VRF architectural pattern across chains.
- [ ] No blog post / commit / social post from Mangekyou Labs naming \`0xb5de9637…\` as the IOTA Kamui deployer. A public \`kamui-iota\` repo in the Mangekyou Labs org was also not visible from anonymous search — may be private, renamed, or part of the main \`kamui\` repo's \`crosschain-prover\` subpath.

**Volume context.** 11 TXs + 6 events + 2 unique senders is early-stage or pilot-scale; the dashboard will rank this low on activity. That's fine — VRF is an *infrastructure primitive*, so it should be visible (dApps may be integrating it) regardless of its current volume. Other primitives like \`Switchboard Oracle\` and \`Pyth Oracle\` are precedent for the "list infrastructure, accept low current-period TX counts" pattern.

**Match rule design.** \`deployerAddresses\` pin + \`all: ['kamui_iota_vrf']\` — the brand-explicit module name is the tight guard. A false-positive on this rule would require an unrelated deployer to publish a module named \`kamui_iota_vrf\`, which is implausible (brand collision).

\`isCollectible: false\` — functional VRF service, not a collectible. Stays visible regardless of the "Hide collectibles" toggle.

Category \`Oracle\` — sibling to \`switchboardOracle\` and \`pythOracle\`. VRF sits under "oracle" broadly because the coordinator signs off-chain randomness attestations that become on-chain data, matching the general oracle pattern. If an "Infrastructure / VRF" category is desirable later, promote together with \`switchboard\` and \`pyth\` into finer sub-categories.

Upgrade to [x] named-brand attribution once Mangekyou Labs publishes the deployer address publicly, opens a visible \`kamui-iota\` repo, or the \`kamuipoc.vercel.app\` UI wires up IOTA wallet-connect with a referenced deployer.
`.trim(),
};
