import { Team } from '../team.interface';

/**
 * Consolidated IOTA Foundation team. Owns the chain primitives (system packages
 * 0x2 / 0x3), the identity stack (Identity, WoT, Credentials), the Identity
 * Asset Framework, the Accreditation Registry, Notarization, Traceability,
 * IF's IOTA Link migration commemorative + bridge tooling, and IF's internal
 * test deployments (reached via team-deployer routing out of the NFT
 * Collections aggregate bucket). Each product line keeps its own UI row; the
 * team attribution unifies them here.
 *
 * IF-adjacent products kept as their own teams (separate legal entities, own
 * commercial surface, own brand, even though the codebase is `iotaledger/…`):
 *   - `tlip` — IF × TradeMark East Africa partnership (distinct domain, wiki,
 *     GitHub org).
 *   - `twin-foundation` — Swiss sibling foundation (separate legal entity).
 *   - `iota-names` — Rising Phoenix 2 Ltd (BVI; privacy@iota.org) operates the
 *     `.iota` name service at iotanames.com. IF-operated BVI wrapper rather
 *     than a true third party, so kept separate but `isIotaFoundationFamily:
 *     true` — hides together with IF when the filter is on.
 */
export const iotaFoundation: Team = {
  id: 'iota-foundation',
  name: 'IOTA Foundation',
  description: 'IOTA Foundation — owns the chain primitives (system packages 0x2 / 0x3), the Identity stack (full / WoT / Credentials), the Identity Asset Framework, the Accreditation Registry, Notarization, Traceability, IOTA Link migration commemorative + bridge tooling, plus IF\'s internal test deployments.',
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
    // IOTA Link migration commemorative NFT + IF migration / bridge tooling
    // (12 pkgs: iotalink + 3 LayerZero OFT wrappers + 3 mockcoins + airdrop
    // + rebased_nft + test_nft + icon/spam + custom_metadata_registry+nft)
    '0xd3906909a7bfc50ea9f4c0772a75bc99cd0da938c90ec05a556de1b5407bd639',
    // Stardust→Rebased migration-history ledger admin. Single package at
    // `0x4770d22b…` (module `legacy_migration_history`) with a `MigrationHistory`
    // shared object recording 2,274 migrations across 3,968 addresses. See the
    // `legacyMigrationHistory` project def for the full evidence trail.
    '0xbeb1ba753fd0bbc0f5470b3948345da6dc870c0421d809cfc3abe95b70f625a7',
    // IOTA EVM L2 anchor deployer — publishes the live mainnet IOTA EVM anchor
    // package `0x1b33a3cf…` (ISC `anchor` + `assets_bag` + `request` modules).
    // Gold-standard confirmation: IOTA's own docs page
    // (docs.iota.org/developer/iota-evm/getting-started/networks-and-chains)
    // publishes `0x1b33a3cf7eb5dde04ed7ae571db1763006811ff6b7bb35b3d1c780de153af9dd`
    // verbatim as the mainnet IOTA EVM Package ID. Chain ID 8822.
    '0x8779ca52589fd6f4ca1776b63b200a7b8f9fd71f2c4d386a987dfdb24569fc5e',
    // Internal test deployments — used to live on the standalone `if-testing`
    // team, merged in 2026-04-18 so "Hide IOTA Foundation" is one team check.
    // The routing-only `Testing` project picks up packages at these
    // addresses via the NFT-Collections team-deployer routing rule.
    '0xb83948c6db006a2d50669ff9fc80eef8a3a958bd3060050865fe9255fa4e5521',
    '0x278f2a12f9cb6f2c54f6f08bad283c3abc588696fadff6cf9dd88fd20019afeb',
    '0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe',
    // Chain primitives: system packages 0x2 / 0x3 have no conventional deployer
    // and are matched by package address, not by deployer. `0x107a` (Stardust
    // framework, per `stardustFramework`) is likewise genesis-installed and
    // deployerless.
  ],
  attribution: `
Consolidated team covering the IOTA Foundation's chain-primitive packages, Identity stack, Identity Asset Framework, Accreditation Registry, Notarization, Traceability, and internal test deployments. All deployers are IF-operated addresses identified from IF-published documentation (iota.org/products, github.com/iotaledger/notarization, the IOTA Identity developer docs) and cross-referenced against the module signatures we match (\`dynamic_notarization\`, \`asset\` + \`multicontroller\` for the Identity Asset Framework, \`accreditation\` + \`property\` for the Accreditation Registry, \`traceability\`, Identity modules). Chain primitives (\`0x0000000000000000000000000000000000000000000000000000000000000002\`, \`0x0000000000000000000000000000000000000000000000000000000000000003\`) are matched by literal address — genesis-installed system packages have no conventional deployer.

The Notarization deployer \`0x56afb2eded3fb2cdb73f63f31d0d979c1527804144eb682c142eb93d43786c8f\` ships four packages: the core \`dynamic_notarization\` (Notarization row), the 16/17-module Identity Asset Framework, and the 7-module Accreditation Registry.

**IOTA Names was split into its own team** (\`iota-names\`) on 2026-04-19 after the \`iotanames.com\` ToS + privacy policy surfaced a separate operator entity: "the IOTA Names Service, offered by Rising Phoenix 2 Ltd" (British Virgin Islands, Trinity Chambers / Road Town / Tortola; privacy contact \`privacy@iota.org\`). English law + LCIA arbitration. The \`iotaledger/iota-names\` codebase + \`@iota/iota-names-sdk\` npm scope remain IF-maintained, and the \`privacy@iota.org\` contact means the BVI wrapper is IF-operated rather than an independent third party — the \`iota-names\` team is flagged \`isIotaFoundationFamily: true\` so it still hides with the IF filter. Separate team row instead of folding into here so the BVI-commercial-structure-vs-non-profit-foundation distinction stays visible.

The three Testing deployers (\`0xb83948c6db006a2d50669ff9fc80eef8a3a958bd3060050865fe9255fa4e5521\`, \`0x278f2a12f9cb6f2c54f6f08bad283c3abc588696fadff6cf9dd88fd20019afeb\`, \`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\`) ship 79 single-module \`nft\` packages using internal IF test-campaign tags (\`gas_station_*\`, \`transfer_test\`, \`regular_comparison\`, \`complex_tag\`). They reach the \`Testing\` project row via team-deployer routing out of the NFT Collections aggregate bucket — the \`Testing\` project sets \`match: {}\` specifically to declare itself as this team's routing-only target. 79 packages is institutional-scale volume consistent with IF-operated campaigns; IF publicly runs a Gas Station product at \`blog.iota.org/iota-gas-station-alpha\`, matching the observed \`gas_station_*\` tag pattern.

The **IOTA Link migration** deployer \`0xd3906909a7bfc50ea9f4c0772a75bc99cd0da938c90ec05a556de1b5407bd639\` ships 12 packages built around post-Rebased-launch migration tooling: \`iotalink\` (commemorative NFT linking an Ethereum-format \`network_address\` to each holder, \`token_id\` issued sequentially into the thousands, media served from \`files.iota.org/media/IOTA-Link-NFT.mp4\` — IF's own CDN, last-modified 2025-05-20, 15 days after the Rebased mainnet went live on 2025-05-05), 3 full LayerZero OFT token-wrapper packages, 3 \`mockcoin\` packages, an \`airdrop\` module, a \`rebased_nft\` module, a \`custom_metadata_registry\`+\`nft\` pair, an \`icon\`+\`spam\` pair, and a \`test_nft\`. IF-operated via the CDN signal. Only the \`iotalink::IotaLink\` package is currently carved out into its own project row (\`iota-link\`); the remaining 11 are TODO — the 3 OFT wrappers get picked up as sub-projects of the \`layerZeroOft\` aggregate with this deployer's hash suffix, which is a reasonable placeholder until per-OFT attribution is worked out.

**Shared deployer note:** \`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\` is listed on BOTH this team and \`twin-foundation\`. 6 of its 17 packages are TWIN \`verifiable_storage\` (caught by the TWIN project's module rule, routed to \`twin-foundation\`); the remaining 11 \`nft\` fixtures fall through to the NFT-Collections team-deployer routing and land on the \`Testing\` project here. The routing logic picks the first team whose projects include a routing-only target, so packages route correctly despite the deployer overlap.

Carve-outs: \`tlip\` (IF × TMEA partnership — distinct public brand, separate wiki, separate GitHub org); \`twin-foundation\` (IF-co-founded Swiss sibling — separate legal entity).
`.trim(),
};
