import { ProjectDefinition } from '../project.interface';

export const ifTesting: ProjectDefinition = {
  name: 'Testing',
  layer: 'L1',
  category: 'Misc',
  description: 'Internal test deployments by the IOTA Foundation — gas station validation, transfer tests, and comparison campaigns. 79 packages across three deployers, each a single-module `nft` package; NFT instances carry tags like `gas_station_*`, `transfer_test`, `regular_comparison`. Packages reach this project exclusively via deployer-based team routing out of the NFT Collections aggregate bucket — the module matcher intentionally claims nothing directly.',
  urls: [{ label: 'IOTA Foundation', href: 'https://www.iota.org' }],
  teamId: 'iota-foundation',
  match: {},
  attribution: `
On-chain evidence: no direct module or address rule. This project has an empty \`match\` block and is reached exclusively via **team-deployer routing** — \`NFT Collections\` is an aggregate bucket (\`splitByDeployer: true\`); when a sub-project's deployer belongs to a team that exposes at least one project with \`match: {}\` (routing-only), the scanner routes the package to that target. This project is the \`iota-foundation\` team's routing-only target.

Circumstantial attribution (🟡, not [x]). 79 packages across three deployers (\`0xb83948c6db006a2d50669ff9fc80eef8a3a958bd3060050865fe9255fa4e5521\`, \`0x278f2a12f9cb6f2c54f6f08bad283c3abc588696fadff6cf9dd88fd20019afeb\`, \`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\`), all single-module \`nft\` with the Salus-shared NFT schema (\`{id, immutable_metadata, tag, metadata, issuer, issuerIdentity, ownerIdentity, network}\`). Tag vocabulary observed in-sample: \`gas_station_*\`, \`transfer_test\`, \`regular_comparison\`, \`complex_tag\`, \`test_tag\` — IF-internal test naming, not a branded product. 79 packages is institutional-scale volume; individual developers don't mint that many mainnet test packages. IF publicly runs a Gas Station product at \`blog.iota.org/iota-gas-station-alpha\`, matching the \`gas_station_*\` tag pattern we observe.

**Shared-deployer note:** one of the three deployers (\`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\`) also publishes TWIN Foundation's \`verifiable_storage\` packages. Of 17 packages at this deployer, 6 are TWIN (caught by the TWIN project's \`{all: [verifiable_storage]}\` rule earlier in \`ALL_PROJECTS\`); the remaining 11 \`nft\` fixtures route here. A future refinement may split a "TWIN Foundation (Testing)" row off from the IF-proper campaigns if stronger evidence accumulates — the tag vocabulary + gas-station dependency fits TWIN testing better than IF for some of the packages.

Merged into the consolidated \`iota-foundation\` team 2026-04-18 (previously lived on a standalone \`if-testing\` team) so the "Hide IOTA Foundation" filter needs to check only one team id.
`.trim(),
};
