import { ProjectDefinition } from '../project.interface';

/**
 * Stardust framework package on Rebased mainnet — installed at genesis, pinned at
 * the well-known low-hex address `0x107a`. Per the official IOTA documentation
 * (`docs.iota.org/references/framework/stardust`):
 *
 *   "The on-chain identifier for the stardust package is 0x107a."
 *
 * Ships the 12 Move modules that emulate the pre-Rebased Stardust output models
 * (alias / basic / NFT outputs + their unlock-condition types + IRC27 metadata
 * helpers + upgrade-label utilities) so migrated UTXOs can continue to be
 * unlocked, spent, and claimed on the Move-based L1. The scanner's low-hex
 * skip rule filters `0x107a` out of generic matching; listing it via
 * `packageAddresses` is the escape hatch that lets it attribute cleanly.
 */
export const stardustFramework: ProjectDefinition = {
  name: 'Stardust Framework',
  layer: 'L1',
  category: 'Chain Primitive',
  description: 'Genesis-installed Stardust framework package at `0x107a`, documented by IOTA as the on-chain identifier for the Stardust Move package. Ships 12 modules emulating pre-Rebased Stardust output types — `alias_output`, `basic_output`, `nft_output` + their unlock-condition modules (`address_unlock_condition`, `expiration_unlock_condition`, `storage_deposit_return_unlock_condition`, `timelock_unlock_condition`) + `alias` / `nft` (the output-owned inner objects) + `irc27` (Stardust NFT metadata standard) + `stardust_upgrade_label` + `utilities` — so migrated UTXOs can be unlocked, spent, and claimed via Move. Live claim traffic: 5.6k TXs observed post-launch, ongoing as Stardust holders migrate late.',
  urls: [
    { label: 'Stardust framework docs', href: 'https://docs.iota.org/references/framework/stardust' },
    { label: 'Stardust migration process', href: 'https://docs.iota.org/developer/stardust/migration-process' },
    { label: 'Move models reference', href: 'https://docs.iota.org/developer/stardust/move-models' },
  ],
  teamId: 'iota-foundation',
  match: {
    packageAddresses: ['0x000000000000000000000000000000000000000000000000000000000000107a'],
  },
  attribution: `
Gold-standard attribution via official IOTA documentation. The Stardust framework docs page at \`docs.iota.org/references/framework/stardust\` names the package address verbatim:

> "The on-chain identifier for the stardust package is 0x107a."

Migration-process docs (\`docs.iota.org/developer/stardust/migration-process\`) further document: "The IOTA Foundation developed a Move package that emulates the Stardust output models in the Move language with all the previous Stardust functionality supported." On-chain scan confirms the package at \`0x000…107a\` ships all 12 modules referenced in the Move-models doc: \`address_unlock_condition\`, \`alias\`, \`alias_output\`, \`basic_output\`, \`expiration_unlock_condition\`, \`irc27\`, \`nft\`, \`nft_output\`, \`stardust_upgrade_label\`, \`storage_deposit_return_unlock_condition\`, \`timelock_unlock_condition\`, \`utilities\`.

**Deployer shape.** The package has \`previousTransactionBlock.sender = null\` — characteristic of genesis-installed system packages (same pattern as \`0x1\` / \`0x2\` / \`0x3\` and the 79 Stardust migrated token packages already attributed via \`stardustMigratedTokens\`). The scanner's generic-match skip rule excludes packages with null deployers to prevent framework-address collisions; this project's \`packageAddresses\` entry is the explicit escape hatch that trips the \`claimedAddresses\` path in \`ecosystem.service.ts\` so \`0x107a\` attributes cleanly here rather than disappearing into the NFT Collections fallthrough.

**Live activity.** Prod capture (2026-04-22) reports 5,559 TXs hitting this package — ongoing Stardust→Rebased migration claims where holders walk legacy UTXOs through the framework's unlock functions to materialize modern \`Coin<IOTA>\` / NFT objects. Zero emitted events is expected: the Stardust emulation paths use \`object::new\` + direct transfers, not custom \`event::emit\` calls.

**Relationship to existing \`stardustMigratedTokens\` project.** This row covers the *framework itself* (code that knows how to unlock legacy outputs); \`stardustMigratedTokens\` covers the 79 legacy *token packages* (one per ticker — BTC, KATZO, MONKE, etc.) that were materialized alongside. Both attribute to \`iota-foundation\`; they surface as separate dashboard rows because the framework has ongoing call traffic ("how often does anyone still unlock Stardust outputs?") while the token packages are mostly inert one-shot migration artifacts ("here's the 79 legacy tickers that survived the migration").

\`isCollectible: false\` — chain primitive, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

Category \`Chain Primitive\` aligns with the \`iotaFramework\` project row (which covers the core framework packages \`0x1\` / \`0x2\` / \`0x3\`). \`0x107a\` is the fourth genesis-installed framework package and slots into the same category.
`.trim(),
};
