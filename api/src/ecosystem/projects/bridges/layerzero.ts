import { ProjectDefinition } from '../project.interface';

export const layerZero: ProjectDefinition = {
  name: 'LayerZero',
  layer: 'L1',
  category: 'Bridge',
  description: 'LayerZero V2 protocol contracts on IOTA Rebased — EndpointV2, ULN302 send+receive message libraries, ZRO token, OApp framework, PTB builders, worker-interface libs (dvn_assign_job / executor_assign_job / worker_registry / worker_common). 22 packages at the protocol deployer `0x8a81a6…`. Separate DVN + Executor worker deployments tracked as the sibling "LayerZero Workers" row under the same team.',
  urls: [
    { label: 'Website', href: 'https://layerzero.network' },
    { label: 'IOTA L1 docs', href: 'https://docs.layerzero.network/v2/deployments/chains/iota-l1' },
    { label: 'Deployments API', href: 'https://metadata.layerzero-api.com/v1/metadata/deployments' },
  ],
  teamId: 'layerzero',
  match: { deployerAddresses: ['0x8a81a6096a81fe2b722541bc19eb30e6c025732638375c362f07ea48979fd30a'] },
  attribution: `
On-chain evidence: deployer-match rule pinned to LayerZero's IOTA L1 deployer \`0x8a81a6096a81fe2b722541bc19eb30e6c025732638375c362f07ea48979fd30a\`. All 22 packages at this deployer are LayerZero V2 components.

Gold-standard attestation: LayerZero's own metadata API (metadata.layerzero-api.com/v1/metadata/deployments) publishes IOTA L1 under chainKey \`iotal1-mainnet\`, eid 30423, chainType \`iotamove\`, chainLayer L1. The API names specific package addresses — \`endpointV2: 0xb8e0cd76cb8916c48c03320e43d46c3775edd6f17ce7fbfad6c751289dcb1735\`, \`sendUln302 / receiveUln302: 0x042e3bb837e5528e495124542495b9df5016acd011d89838ae529db5a814499e\`, \`executor: 0x29b691f9496eea6df8f4d77ceacee5949e92e7e51b2e3c2e6cd70eef5237e99a\` — and 2 of the 3 are at this deployer (the executor is an operational account, not a package deployer). LayerZero's docs at docs.layerzero.network/v2/developers/iota/overview confirm the Move architecture ("Programmable Transaction Blocks and the Call pattern") that the on-chain module inventory matches exactly.

Previously matched via \`{any: [endpoint_quote, lz_compose]}\`, which only caught 1 of 22 packages (the EndpointV2 core). Switched to \`deployerAddresses\` for full coverage — catches ZRO token, ULN302, DVN/Executor workers, PTB builders, OApp framework, message libraries, views, and utilities without risking future false positives on generic module names.
`.trim(),
};

export const layerZeroWorkers: ProjectDefinition = {
  name: 'LayerZero Workers',
  layer: 'L1',
  category: 'Bridge',
  description: 'LayerZero\'s on-chain worker deployments — 5 DVN instances (Nethermind, LayerZero Labs, USDT0, Luganodes, Horizen) sharing one LayerZero-Labs-published worker codebase at deployer `0x62279630…`, plus the Executor worker at deployer `0x76f89ad2…` (LayerZero Labs). 10 packages combined. Separated from the protocol-contracts row so verification / delivery activity is visible independently from user-messaging activity.',
  urls: [
    { label: 'DVN directory API', href: 'https://metadata.layerzero-api.com/v1/metadata/dvns' },
    { label: 'IOTA L1 docs', href: 'https://docs.layerzero.network/v2/deployments/chains/iota-l1' },
  ],
  teamId: 'layerzero',
  logo: '/logos/layerzero.png',
  match: {
    deployerAddresses: [
      '0x622796305d71e976f19d0183f43fd225310421542d0eb62cf0e878478d535422', // DVN workers
      '0x76f89ad2e913444040485b557c0dfee9e7a868dc9527ec7a6f363490c7e63651', // Executor worker
    ],
  },
  attribution: `
On-chain evidence: 10 packages across 2 deployers, both LayerZero Labs'.

**DVN worker deployer** \`0x622796305d71e976f19d0183f43fd225310421542d0eb62cf0e878478d535422\` — 5 packages, single \`dvn::DVN\` codebase instantiated 5× on mainnet:

| DVN object                                                           | Operator (LZ metadata-API match)                                                  |
|----------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| \`0x491ffda87bcbb42f2b5928782e20d69b3f64fd2f60bb497c8466f8d4c6d1ab4a\` | Nethermind       (cap pkg \`0x50e159c13f1222f7eea85c718f67b20146ef2485f844b23ffa15719adc97080a\`) |
| \`0x54f65453b21def69d3249eca6ab92f861d941e1f7fc6ba8461240d966435d652\` | Luganodes        (cap pkg \`0x02f42267433102ff09d5111fbedd375204bda05e6afe19e38e137fa97fc7dbfd\`) |
| \`0x75b513e1474a6c51e0eb941c575ed770eecd30ffce9cad029c911ab780789ba7\` | LayerZero Labs   (cap pkg \`0xa560697328ccb5dc3f3f8e8a2c41e282827060da7a29971d933e9aa405c2ba7f\`) |
| \`0x95371e0b0f53a61e68ceff95ac715897feded9482dc79f65ee0d681a3c9ddce9\` | Horizen          (cap pkg \`0xcefb342d62280f06a3d5673abe82f49675b6cd5c86211b2adc0c93e56fa388f5\`) |
| \`0xcc4cce1a6fc515da0584d74813bc0cf47b548c7d64644f73687fe1c38cd4bbd1\` | USDT0            (cap pkg \`0x1f4fa24418593ee8087cb62203c7405e7cb7234edc42494aeface57c1f42eeac\`) |

All 5 DVN objects are at \`vid: 423\` and point at ULN \`0x042e3bb837e5528e495124542495b9df5016acd011d89838ae529db5a814499e\` (same ULN published by the protocol deployer). Each object's \`worker.worker_cap.cap_type.Package.pos0\` field names the DVN operator, cross-referenced against LayerZero's DVN directory at \`metadata.layerzero-api.com/v1/metadata/dvns\` under \`chainName: iotal1\`.

**Executor worker deployer** \`0x76f89ad2e913444040485b557c0dfee9e7a868dc9527ec7a6f363490c7e63651\` — 5 packages, 1 Executor instance at \`0x87862030fcd8cb44e67ee8ea02506e28290b6e0669e75efb8c09d587a40438f6\`. Instance's \`worker.worker_cap.cap_type.Package.pos0\` = \`0x29b691f9496eea6df8f4d77ceacee5949e92e7e51b2e3c2e6cd70eef5237e99a\`, exactly matching the executor address LayerZero's metadata API publishes for \`iotal1\` (see the \`layerZero\` project for the API JSON). Confirms this is LayerZero Labs' Executor.

Why a separate row from \`layerZero\`: protocol-contract events (user messaging, OApp calls) are conceptually distinct from worker events (DVN attestations, Executor deliveries). Splitting makes each layer's activity legible; the \`layerzero\` team page aggregates both.

Why not split per-DVN-operator into 5 rows: the DVN worker codebase is one LayerZero-Labs-published package, not 5 operator-published packages. Per-operator breakdown belongs in the attribution prose (table above), not as 5 separate team rows — the operators don't ship code themselves.
`.trim(),
};

export const layerZeroOft: ProjectDefinition = {
  name: 'LayerZero OFT',
  layer: 'L1',
  category: 'Bridge (OFT)',
  description: 'LayerZero Omnichain Fungible Token standard on IOTA. Allows tokens to exist natively on multiple chains simultaneously with unified supply, enabling seamless cross-chain token transfers.',
  urls: [
    { label: 'Website', href: 'https://layerzero.network' },
  ],
  teamId: null,
  logo: '/logos/layerzero.png',
  disclaimer: "Aggregate bucket split by deployer — each sub-project represents all OFT packages published by a single address (a token-wrapper), identified by a short hash of that deployer. Known deployers (e.g., Virtue) are routed to their team via the registry.",
  splitByDeployer: true,
  match: { all: ['oft', 'oft_impl'] },
  attribution: `
On-chain evidence: Move package with both \`oft\` and \`oft_impl\` modules.

LayerZero's OFT (Omnichain Fungible Token) standard is a **contract pattern**, not a product — any team that wants to make its token cross-chain deploys its own OFT package. That's why this entry is an aggregate bucket (\`teamId: null\` + \`splitByDeployer: true\`): each deployer becomes its own sub-project. Where a sub-project's deployer is a known team (e.g. Virtue's wOFT), team-deployer routing attributes it to that team; otherwise it stays in the bucket with a deployer-hash suffix. Module names \`oft\` / \`oft_impl\` are LayerZero's canonical OFT module naming.
`.trim(),
};
