import { Team } from '../team.interface';

/**
 * Consolidated IOTA Foundation team. Owns the chain primitives (system packages
 * 0x2 / 0x3), the identity stack (Identity, WoT, Credentials), the Identity
 * Asset Framework, the Accreditation Registry, Notarization, Traceability,
 * IOTA Names (.iota name service), and IF's internal test deployments (reached
 * via team-deployer routing out of the NFT Collections aggregate bucket). Each
 * product line keeps its own UI row; the team attribution unifies them here.
 *
 * TLIP is kept as a separate team (`tlip`) because it's positioned as a
 * distinct public product with its own domain (tlip.io) and TMEA
 * partnership. TWIN Foundation (`twin-foundation`) is also separate — Swiss
 * parent foundation above TLIP, with its own deployer and brand.
 */
export const iotaFoundation: Team = {
  id: 'iota-foundation',
  name: 'IOTA Foundation',
  description: 'IOTA Foundation — owns the chain primitives (system packages 0x2 / 0x3), the Identity stack (full / WoT / Credentials), the Identity Asset Framework, the Accreditation Registry, Notarization, Traceability, IOTA Names (.iota name service), plus IF\'s internal test deployments.',
  isIotaFoundationFamily: true,
  urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
  logo: '/logos/iota.svg',
  deployers: [
    // Identity stack
    '0x45745c3d1ef637cb8c920e2bbc8b05ae2f8dbeb28fd6fb601aea92a31f35408f',
    // Notarization + Identity Asset Framework + Accreditation Registry (shared deployer)
    '0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f',
    '0xedb0c77b6393a11b4c29b7914410e468680e3bc8110e99a40c203038c9335fc2',
    // Traceability (3 per-customer deployers)
    '0x46365ba3a2eab8639d41f8ff2be3adf50e384db5c7d81b0d726bfea5674fb3f5',
    '0x8009891c7a1f173f03b72a674c9a65016c65250813b00f0b20df8d23f1c8a639',
    '0xd604621407ca777658c5834c90c36a432b38f9ace39fe951a87c03f800515bbe',
    // IOTA Names (.iota name service — github.com/iotaledger/iota-names)
    '0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1',
    // Internal test deployments — used to live on the standalone `if-testing`
    // team, merged in 2026-04-18 so "Hide IOTA Foundation" is one team check.
    // The routing-only `Testing` project picks up packages at these
    // addresses via the NFT-Collections team-deployer routing rule.
    '0xb83948c6db006a2d50669ff9fc80eef8a3a958bd3060050865fe9255fa4e5521',
    '0x278f2a12f9cb6f2c54f6f08bad283c3abc588696fadff6cf9dd88fd20019afeb',
    '0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe',
    // Chain primitives: system packages 0x2 / 0x3 have no conventional deployer
    // and are matched by package address, not by deployer.
  ],
  attribution: `
Consolidated team covering the IOTA Foundation's chain-primitive packages, Identity stack, Identity Asset Framework, Accreditation Registry, Notarization, Traceability, IOTA Names (\`.iota\` name service), and internal test deployments. All deployers are IF-operated addresses identified from IF-published documentation (iota.org/products, github.com/iotaledger/notarization, github.com/iotaledger/iota-names, the IOTA Identity developer docs) and cross-referenced against the module signatures we match (\`dynamic_notarization\`, \`asset\` + \`multicontroller\` for the Identity Asset Framework, \`accreditation\` + \`property\` for the Accreditation Registry, \`traceability\`, \`name_registration\` for IOTA Names, Identity modules). Chain primitives (\`0x0000000000000000000000000000000000000000000000000000000000000002\`, \`0x0000000000000000000000000000000000000000000000000000000000000003\`) are matched by literal address — genesis-installed system packages have no conventional deployer.

The Notarization deployer \`0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f\` ships four packages: the core \`dynamic_notarization\` (Notarization row), the 16/17-module Identity Asset Framework, and the 7-module Accreditation Registry.

The IOTA Names deployer \`0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1\` ships 6 packages, all containing a \`name_registration\` module whose \`NameRegistration\` objects carry \`name_str\` values ending in \`.iota\`. **Gold-standard confirmation:** the IF's own GitHub release \`[Mainnet] iota-names v1\` (2026-01-19, \`github.com/iotaledger/iota-names/releases\`, Apache-2.0) publishes the canonical Package ID \`0x6d2c743607ef275bd6934fe5c2a7e5179cca6fbd2049cfa79de2310b74f3cf83\` — the exact package whose \`::name_registration::NameRegistration\` type the fingerprint probes. Public app surface at \`iotanames.com\` (mainnet) and \`testnet.iotanames.com\` (testnet); SDK at \`@iota/iota-names-sdk\` under the reserved \`@iota\` npm scope.

The three Testing deployers (\`0xb83948c6db006a2d50669ff9fc80eef8a3a958bd3060050865fe9255fa4e5521\`, \`0x278f2a12f9cb6f2c54f6f08bad283c3abc588696fadff6cf9dd88fd20019afeb\`, \`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\`) ship 79 single-module \`nft\` packages using internal IF test-campaign tags (\`gas_station_*\`, \`transfer_test\`, \`regular_comparison\`, \`complex_tag\`). They reach the \`Testing\` project row via team-deployer routing out of the NFT Collections aggregate bucket — the \`Testing\` project sets \`match: {}\` specifically to declare itself as this team's routing-only target. 79 packages is institutional-scale volume consistent with IF-operated campaigns; IF publicly runs a Gas Station product at \`blog.iota.org/iota-gas-station-alpha\`, matching the observed \`gas_station_*\` tag pattern.

**Shared deployer note:** \`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\` is listed on BOTH this team and \`twin-foundation\`. 6 of its 17 packages are TWIN \`verifiable_storage\` (caught by the TWIN project's module rule, routed to \`twin-foundation\`); the remaining 11 \`nft\` fixtures fall through to the NFT-Collections team-deployer routing and land on the \`Testing\` project here. The routing logic picks the first team whose projects include a routing-only target, so packages route correctly despite the deployer overlap.

Carve-outs: \`tlip\` (IF × TMEA partnership — distinct public brand, separate wiki, separate GitHub org); \`twin-foundation\` (IF-co-founded Swiss sibling — separate legal entity).
`.trim(),
};
