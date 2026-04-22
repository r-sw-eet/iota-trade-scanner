import { ProjectDefinition } from '../project.interface';

/**
 * LayerZero V2 Counter-example OApp — the canonical tutorial OApp from
 * LayerZero's dev docs. Dev/test scale (21 TXs, 2 senders). Separate
 * project row from `layerZero` so the tutorial-deploy doesn't distort
 * protocol-activity metrics.
 */
export const layerZeroCounterExample: ProjectDefinition = {
  name: 'LayerZero Counter (Example OApp)',
  layer: 'L1',
  category: 'Bridge',
  description: 'LayerZero V2\'s canonical tutorial OApp on IOTA L1 — a `counter` Move package demonstrating how to build an Omnichain Application (OApp) on top of LayerZero\'s EndpointV2 + OApp framework. Single package at deployer `0xbd261819…` with modules `counter, counter_ptb_builder, msg_codec, options_builder`. Each counter transaction composes with the protocol deployer\'s EndpointV2 + OApp + Worker packages. Dev/test scale (21 TXs, 2 senders) — not production activity, but a concrete demonstration that the full V2 stack is live and integrable on IOTA.',
  addedAt: '2026-04-22',
  urls: [
    { label: 'LayerZero IOTA L1 overview', href: 'https://docs.layerzero.network/v2/developers/iota/overview' },
    { label: 'LayerZero V2 OApp docs', href: 'https://docs.layerzero.network/v2/developers/iota/build/oapp/overview' },
  ],
  teamId: 'layerzero',
  match: {
    packageAddresses: ['0x980f5583d170c4cd532f1ef9df3186b2bb52e8d9912d87e9edd3a3f30c39a11c'],
  },
  attribution: `
On-chain evidence: single package \`0x980f5583d170c4cd532f1ef9df3186b2bb52e8d9912d87e9edd3a3f30c39a11c\` at deployer \`0xbd261819c7c6fb67593a96769072bf98b1fc048ccb342208da926f69f28a8724\`. Modules: \`counter, counter_ptb_builder, msg_codec, options_builder\`. 21 TXs, 3 events, 2 unique senders — dev/test scale.

**Identified as the canonical LayerZero V2 Counter-example OApp** (the tutorial OApp LayerZero documents for new integrators).

Evidence chain:

1. **Module naming is exact match to LayerZero's reference OApp.** \`counter\` is LayerZero's canonical tutorial OApp (the "Counter OApp" referenced throughout their OApp documentation and repo). \`counter_ptb_builder\` is the Move-specific Programmable Transaction Block helper that wraps it (LayerZero's IOTA / Move docs explicitly describe a "PTB builder" pattern for every OApp on Move chains). \`msg_codec\` + \`options_builder\` are the two standard helpers every LayerZero OApp ships (message encoding + option-byte construction for Endpoint quote/send calls).

2. **TX-effect objects compose with the LayerZero V2 protocol stack.** Every transaction from this package co-creates objects at the protocol deployer (\`0x8a81a6…\`, already attributed on the \`layerzero\` team):
   - \`0xb8e0cd…::endpoint_v2::EndpointV2\` + \`oapp_registry::OAppRegistration\` + \`messaging_channel::{Channel, ChannelKey, MessagingChannel}\` + \`messaging_composer::{ComposerRegistration, ComposeQueue, MessageKey}\`
   - \`0x2b14fe…::oapp::{OApp, AdminCap}\`
   - \`0xd33a7a…::worker_common::AdminCap\`
   - \`0x56a262…::bytes32::Bytes32\`

   All four co-created-object deployers are already documented on the \`layerzero\` team (protocol deployer ships them as part of the V2 stack). The counter-package's interaction pattern with them is exactly what LayerZero's OApp-deploy script produces: register OApp → open messaging channel → push a counter message through the Endpoint.

3. **LayerZero metadata API confirms V2 is live on IOTA L1.** \`metadata.layerzero-api.com/v1/metadata/deployments\` publishes \`iotal1-mainnet\` with EID 30423 + endpointV2 + sendUln302/receiveUln302 + executor addresses. The Counter OApp is the standard integrator smoke-test on any LayerZero-supported chain; having it deployed on IOTA L1 is consistent with the chain being production-live.

**Why a separate project row from \`layerZero\` (the protocol row):**

- The protocol row catches all 22 packages at the protocol deployer \`0x8a81a6…\` (EndpointV2, ULN302, OApp framework, PTB builders, ZRO, workers, views, utilities). Real end-user cross-chain messaging activity surfaces there.
- The Counter example ships from a **different** deployer (\`0xbd261819…\` — likely an LZ engineer's test wallet or a canonical tutorial-deploy key), not the protocol key. Folding its 21 TXs into the protocol row would silently inflate the protocol's dev-only activity into the production metric.
- Keeping it as its own project row under the same \`layerzero\` team gives an honest breakdown: production-protocol activity vs. example/tutorial deploys. Same pattern as \`layerZeroPriceFeed\` and \`layerZeroWorkers\` — separate rows, same team.

**Match rule design.** \`packageAddresses\` pin on the single package address. Narrower than \`deployerAddresses\` catch-all because this deployer may ship other test packages (additional tutorial OApps, upgraded counter versions) that warrant individual review rather than silent catch-all. If a v2 Counter lands, add its address explicitly.

**Operator identification gap.** The counter deployer \`0xbd261819…\` is separate from LayerZero Labs' other 5 known deployers (protocol \`0x8a81a6…\`, DVN-worker \`0x622796…\`, Executor-worker \`0x76f89a…\`, LZ Labs admin \`0x9004e1…\`, Price feed \`0x6bf301…\`). It's **likely** an LZ engineer's test wallet — the module naming is too specific for a random community deploy, and the protocol composition is non-trivial. But we don't have a direct LZ commit / statement naming this deployer. Confidence: high that it's LayerZero-family (counter-example deploy pattern), medium on whether it's LZ Labs proper or an LZ-authorized contributor. Team-level \`isIotaFoundationFamily: false\` inherited from \`layerzero\` (LayerZero Labs is not IF-operated).
`.trim(),
};
