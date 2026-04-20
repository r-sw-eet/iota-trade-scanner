import { Team } from '../team.interface';

export const layerzero: Team = {
  id: 'layerzero',
  name: 'LayerZero',
  description: 'LayerZero V2 omnichain interoperability protocol on IOTA Rebased. Operates the IOTA L1 Move deployment (eid 30423) — EndpointV2, ULN302 message library, ZRO token, PTB-builder infrastructure, OApp framework, separate DVN worker and Executor worker deployments, per-DVN-operator identity packages (Nethermind / LayerZero Labs / USDT0 / Luganodes / Horizen), and a standalone Executor price-feed oracle. 38 packages total across 5 deployers.',
  urls: [
    { label: 'Website', href: 'https://layerzero.network' },
    { label: 'IOTA L1 docs', href: 'https://docs.layerzero.network/v2/deployments/chains/iota-l1' },
    { label: 'Deployments API', href: 'https://metadata.layerzero-api.com/v1/metadata/deployments' },
    { label: 'IOTA L1 DVN directory', href: 'https://metadata.layerzero-api.com/v1/metadata/dvns' },
  ],
  deployers: [
    // Protocol contracts (Endpoint, ULN, OApp, PTB builders, ZRO token, worker libs)
    '0x8a81a6096a81fe2b722541bc19eb30e6c025732638375c362f07ea48979fd30a',
    // DVN worker package publisher (one codebase instantiated 5× — Nethermind, LZ Labs, USDT0, Luganodes, Horizen)
    '0x622796305d71e976f19d0183f43fd225310421542d0eb62cf0e878478d535422',
    // Executor worker package publisher (LayerZero Labs Executor instance)
    '0x76f89ad2e913444040485b557c0dfee9e7a868dc9527ec7a6f363490c7e63651',
    // LayerZero Labs admin / ops account — publishes per-DVN-operator
    // identity packages at the 5 operator canonical addresses (Nethermind,
    // LZ Labs, USDT0, Luganodes, Horizen). Each published package has a
    // single `dvn_layerzero` module and its address matches the
    // `cap_type.Package.pos0` field on the corresponding DVN instance.
    '0x9004e1e4c6dcc42d1b73269db48d510192665677fcad2079a3c7d1e9e971d34e',
    // Executor pricing-oracle publisher. Single package (`price_feed` +
    // `price_feed_witness`) feeding the off-chain Executor's cross-chain
    // fee quotes — see `layerZeroPriceFeed` project for on-chain evidence.
    '0x6bf30187819863e878e9be862161941b07658012130f5519e34d728c03f143be',
  ],
  logo: '/logos/layerzero.png',
  attribution: `
Gold-standard attestation via LayerZero's own metadata API (\`metadata.layerzero-api.com/v1/metadata/deployments\`), which publishes IOTA L1 under chainKey \`iotal1-mainnet\`:

\`\`\`json
{
  "eid": "30423",
  "chainKey": "iotal1",
  "chainType": "iotamove",
  "chainLayer": "L1",
  "chainStatus": "ACTIVE",
  "stage": "mainnet",
  "endpointV2":    { "address": "0xb8e0cd76cb8916c48c03320e43d46c3775edd6f17ce7fbfad6c751289dcb1735" },
  "sendUln302":    { "address": "0x042e3bb837e5528e495124542495b9df5016acd011d89838ae529db5a814499e" },
  "receiveUln302": { "address": "0x042e3bb837e5528e495124542495b9df5016acd011d89838ae529db5a814499e" },
  "executor":      { "address": "0x29b691f9496eea6df8f4d77ceacee5949e92e7e51b2e3c2e6cd70eef5237e99a" },
  "version": 2
}
\`\`\`

Plus the human-readable chain page at \`docs.layerzero.network/v2/deployments/chains/iota-l1\` (eid 30423, explicitly describing IOTA L1 as a Move-based deployment "separate from IOTA EVM L2, EID 30284"), and the IOTA-L1 developer overview at \`docs.layerzero.network/v2/developers/iota/overview\`.

On-chain: deployer \`0x8a81a6096a81fe2b722541bc19eb30e6c025732638375c362f07ea48979fd30a\` publishes 22 packages, all LayerZero V2 components:

- **endpointV2** \`0xb8e0cd76cb8916c48c03320e43d46c3775edd6f17ce7fbfad6c751289dcb1735\` — 18 modules: \`endpoint_quote, endpoint_send, endpoint_v2, lz_compose, lz_receive, message_lib_manager, message_lib_quote, message_lib_send, message_lib_set_config, message_lib_type, messaging_channel, messaging_composer, messaging_fee, messaging_receipt, oapp_registry, outbound_packet, timeout, utils\`. Exact match to the API.
- **sendUln302 / receiveUln302** \`0x042e3bb837e5528e495124542495b9df5016acd011d89838ae529db5a814499e\` — modules \`executor_config, oapp_uln_config, receive_uln, send_uln, uln_302, uln_config\`. Exact match.
- **ZRO token** (\`zro\` module): \`0xed5b4c39309e0af02a84c27a23ecd3f0d8dc825b2297c2b2e23bfeeac4f05698\`.
- **Call pattern primitives** (LayerZero's Move-specific IPC): \`call\`, \`call_cap\`, \`multi_call\`, \`argument\`, \`function\`, \`move_call\`, \`move_calls_builder\`.
- **Workers / DVN / Executor infra:** \`dvn_assign_job\`, \`dvn_get_fee\`, \`dvn_verify\`, \`executor_assign_job\`, \`executor_get_fee\`, \`worker_registry\`, \`worker_common\`, \`worker_info_v1\`, \`fee_recipient\`, \`packet_v1_codec\`, \`worker_options\`.
- **Message libraries:** \`simple_message_lib\`, \`blocked_message_lib\`.
- **PTB builders** (for LayerZero's Programmable Transaction Block construction on Move): \`endpoint_ptb_builder\`, \`uln_302_ptb_builder\`, \`simple_msglib_ptb_builder\`, \`blocked_msglib_ptb_builder\`, \`set_worker_ptb\`, \`msglib_ptb_builder_info\`.
- **OApp framework:** \`endpoint_calls\`, \`enforced_options\`, \`oapp\`, \`oapp_info_v1\`, \`oapp_peer\`, \`ptb_builder_helper\`.
- **View packages:** \`endpoint_views\`, \`uln_302_views\`.
- **Utilities:** \`buffer_reader, buffer_writer, bytes32, hash, package, table_ext\`, \`estimate_fee\`, \`package_whitelist_validator\`.

The executor address \`0x29b691f9496eea6df8f4d77ceacee5949e92e7e51b2e3c2e6cd70eef5237e99a\` is an operational account, not a package deployer (confirmed via \`packages(…)\` query: zero packages at that address). Consistent with LayerZero's architecture where the Executor is an off-chain worker identity.

**DVN + Executor worker deployments** (added 2026-04-19 — 2 additional deployers, 10 packages, separate row on dashboard as "LayerZero Workers"):

- **DVN worker package publisher** \`0x622796305d71e976f19d0183f43fd225310421542d0eb62cf0e878478d535422\` — 5 packages, single codebase instantiated 5× on mainnet. The created DVN objects each carry a \`worker.worker_cap.cap_type.Package.pos0\` field naming the DVN operator's address. Mapping (cross-referenced with the LayerZero metadata API at \`metadata.layerzero-api.com/v1/metadata/dvns\` under chainName \`iotal1\`):

  | DVN object                                                           | cap pkg (operator address)                                           | Operator         |
  |----------------------------------------------------------------------|----------------------------------------------------------------------|------------------|
  | \`0x491ffda87bcbb42f2b5928782e20d69b3f64fd2f60bb497c8466f8d4c6d1ab4a\` | \`0x50e159c13f1222f7eea85c718f67b20146ef2485f844b23ffa15719adc97080a\` | Nethermind       |
  | \`0x54f65453b21def69d3249eca6ab92f861d941e1f7fc6ba8461240d966435d652\` | \`0x02f42267433102ff09d5111fbedd375204bda05e6afe19e38e137fa97fc7dbfd\` | Luganodes        |
  | \`0x75b513e1474a6c51e0eb941c575ed770eecd30ffce9cad029c911ab780789ba7\` | \`0xa560697328ccb5dc3f3f8e8a2c41e282827060da7a29971d933e9aa405c2ba7f\` | LayerZero Labs   |
  | \`0x95371e0b0f53a61e68ceff95ac715897feded9482dc79f65ee0d681a3c9ddce9\` | \`0xcefb342d62280f06a3d5673abe82f49675b6cd5c86211b2adc0c93e56fa388f5\` | Horizen          |
  | \`0xcc4cce1a6fc515da0584d74813bc0cf47b548c7d64644f73687fe1c38cd4bbd1\` | \`0x1f4fa24418593ee8087cb62203c7405e7cb7234edc42494aeface57c1f42eeac\` | USDT0            |

  All 5 objects are at \`vid: 423\`, pointing at ULN \`0x042e3bb837e5528e495124542495b9df5016acd011d89838ae529db5a814499e\` (the same ULN package as the protocol deployer publishes — correct composition). The DVN worker deployer is LayerZero Labs — they ship the worker bytecode; each operator gets their own instance configured with their unique package-cap.

- **Executor worker package publisher** \`0x76f89ad2e913444040485b557c0dfee9e7a868dc9527ec7a6f363490c7e63651\` — 5 packages, single Executor instance created: \`0x87862030fcd8cb44e67ee8ea02506e28290b6e0669e75efb8c09d587a40438f6\`. The instance's \`worker.worker_cap.cap_type.Package.pos0\` = \`0x29b691f9496eea6df8f4d77ceacee5949e92e7e51b2e3c2e6cd70eef5237e99a\` — exactly the executor address published in the LayerZero metadata API (\`metadata.layerzero-api.com/v1/metadata/deployments\` → iotal1 → executor). This confirms the deployer as LayerZero Labs' Executor worker publisher.

Both worker deployers are included here (not split out as separate teams) because a single LayerZero-Labs-published codebase underpins all DVN workers regardless of operator, and the Executor is LZ's own worker. Per-operator DVN counts can be recovered from the cap-pkg mapping above if we want finer-grained rows later.

- **Per-DVN-operator identity packages** deployer \`0x9004e1e4c6dcc42d1b73269db48d510192665677fcad2079a3c7d1e9e971d34e\` (LayerZero Labs admin / ops account — same address that appears as the \`deposit_address\` and \`active_admins[0]\` in every DVN instance's shared config). Publishes 5 packages, each shipping a single \`dvn_layerzero\` module AT the DVN-operator canonical address — i.e. the package address IS the operator's on-chain ID, and the corresponding DVN instance's \`worker_cap.cap_type.Package.pos0\` field references it. 4 of the 5 match operators in LayerZero's public DVN directory (\`metadata.layerzero-api.com/v1/metadata/dvns\` under \`iotal1\`):

  | Per-operator package                                                 | Operator (from DVN directory)                       |
  |----------------------------------------------------------------------|-----------------------------------------------------|
  | \`0x50e159c13f1222f7eea85c718f67b20146ef2485f844b23ffa15719adc97080a\` | Nethermind                                          |
  | \`0x1f4fa24418593ee8087cb62203c7405e7cb7234edc42494aeface57c1f42eeac\` | USDT0                                               |
  | \`0x02f42267433102ff09d5111fbedd375204bda05e6afe19e38e137fa97fc7dbfd\` | Luganodes                                           |
  | \`0xcefb342d62280f06a3d5673abe82f49675b6cd5c86211b2adc0c93e56fa388f5\` | Horizen                                             |
  | \`0xdb6a2d1932e2d03f037b7a56903aa20ca633bdec0fcb7db521f48dd4569e8ef1\` | (unknown — not listed in the DVN directory; may be a deprecated / retired DVN or a bootstrap/test identity) |

  LayerZero Labs' own DVN cap pkg \`0xa560697328ccb5dc3f3f8e8a2c41e282827060da7a29971d933e9aa405c2ba7f\` is NOT published from this admin account — it's self-deployed separately, consistent with LZ Labs owning their own DVN identity rather than having an admin publish it on their behalf.

Triangulation:
- [x] LayerZero's own metadata API names \`iotal1-mainnet\` with eid 30423, chainLayer L1, chainType iotamove.
- [x] The API publishes 3 addressable components (endpointV2 + sendUln302/receiveUln302 pointing at the same ULN package + executor as an account).
- [x] On-chain scan confirms 2 of the 3 API-published addresses are at deployer \`0x8a81a6096a81fe2b722541bc19eb30e6c025732638375c362f07ea48979fd30a\`; the 3rd is an account (non-package).
- [x] 22 packages at the protocol deployer, all LayerZero V2 components with matching module names.
- [x] 5 packages at DVN worker deployer \`0x62279630…\` create 5 \`dvn::DVN\` instances whose worker-cap packages exactly match the 5 DVN operators LayerZero's metadata API lists for \`iotal1\` (Nethermind, Luganodes, LayerZero Labs, Horizen, USDT0).
- [x] 5 packages at Executor worker deployer \`0x76f89ad2…\` create 1 \`executor_worker::Executor\` instance whose worker-cap package exactly matches LayerZero's published executor address \`0x29b691f9…\`.
- [x] Zero off-topic packages at any of the 3 LayerZero deployers; no LayerZero-adjacent modules (\`messagelib\`, \`endpoint\`, \`lz_compose\`, \`dvn\`, \`executor_worker\`) appear at any other deployer on IOTA mainnet.

LayerZero OFT tokens are NOT routed to this team — they're deployed by third parties (e.g. Virtue) and live in the \`layerZeroOft\` aggregate bucket instead.
`.trim(),
};
