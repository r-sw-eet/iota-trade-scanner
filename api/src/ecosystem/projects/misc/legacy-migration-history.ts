import { ProjectDefinition } from '../project.interface';

/**
 * IOTA Foundation Stardust→Rebased migration ledger. Single-package, single-module
 * contract at `0x4770d22b…` that records the running migration log. Writer is the
 * dedicated admin deployer `0xbeb1ba75…`; ledger exposes a `MigrationHistory` root
 * object with a per-address lookup table tracking every migration event.
 *
 * Differs from `stardustMigratedTokens` (the 79 genesis token packages) and
 * `stardustFramework` (the `0x107a` unlock runtime): those are the rails; this
 * is the accounting book that records who claimed what, when.
 */
export const legacyMigrationHistory: ProjectDefinition = {
  name: 'Legacy Migration History',
  layer: 'L1',
  category: 'Infrastructure',
  subcategory: 'Chain Primitive',
  description: 'Admin-maintained ledger recording Stardust→Rebased migrations. Single package at `0x4770d22b…` with module `legacy_migration_history` shipping a shared `MigrationHistory` object + `records_lut` per-address table. Live counters (2026-04-22 probe): `migration_count: 2274`, `address_count: 3968` — 2.3k migrations recorded for 3,968 distinct addresses. Sole writer is the dedicated admin account `0xbeb1ba…`; activity continued as late as 2026-01-09, months after Rebased mainnet launch, indicating the migration window stays open for late claimants.',
  urls: [
    { label: 'Stardust migration process', href: 'https://docs.iota.org/developer/stardust/migration-process' },
    { label: 'Rebased Mainnet Upgrade', href: 'https://blog.iota.org/rebased-mainnet-upgrade/' },
  ],
  teamId: 'iota-foundation',
  match: {
    packageAddresses: ['0x4770d22bc561bddee048b209f14dec2880d54e5f15ff166f58d43290a6679f66'],
    all: ['legacy_migration_history'],
  },
  attribution: `
On-chain evidence: single package \`0x4770d22bc561bddee048b209f14dec2880d54e5f15ff166f58d43290a6679f66\` (one module, \`legacy_migration_history\`) deployed by admin account \`0xbeb1ba753fd0bbc0f5470b3948345da6dc870c0421d809cfc3abe95b70f625a7\`. The package ships a shared \`MigrationHistory\` object at \`0x57711efb…\` whose live state reads (2026-04-22 GraphQL probe):

\`\`\`
{ migration_count: "2274",
  address_count: "3968",
  records_lut: { size: "3968" } }
\`\`\`

2,274 migration records across 3,968 distinct addresses — every matched package event count (2,274) equals \`migration_count\` exactly, confirming each event is one logged migration. The \`records_lut\` (lookup table) indexes by address with size 3,968, so one address can own multiple migration records (legacy multi-UTXO wallets being claimed into multiple destination objects).

**Writer identity.** The dedicated admin account \`0xbeb1ba…\` has no other public surface — it published this one migration-tracking package and exclusively writes to its shared \`MigrationHistory\`. Last observed TX 2026-01-09, months after the 2025-05-05 Rebased mainnet launch, indicating the migration window stays open for late claimants (Stardust users who never ran the migration tool). Shape — single-admin write path, registry-accounting object, no token emission — fits the IF-operated migration-tooling pattern.

**Not on public GitHub (as of 2026-04-22).** Anonymous GitHub search for \`legacy_migration_history\` returned 31 commit-level hits, but all are unrelated Prisma / LCMS-style database migration histories; no Move code surfaces. Authenticated search across \`iotaledger/*\` would be the closer path but isn't automatable here. The \`iotaledger/legacy-migration-tool\` repo documented in \`blog.iota.org/iota-legacy-migration-tool/\` covers the earlier Legacy→Stardust migration wave; this package is the subsequent Stardust→Rebased one and may live in an IF-private infra repo or an unindexed subpackage of \`iotaledger/iota\`.

**Attribution confidence.** Strong but circumstantial (🟡, not [x]). Direct self-attestation would require either an IF blog / docs page naming this deployer address, or authenticated grep finding the Move source. Best available: (a) the IOTA Foundation blog explicitly states "The migration to IOTA Rebased is performed via a global snapshot" + IF operates the migration tooling (\`blog.iota.org/iota-legacy-migration-tool\` + \`blog.iota.org/rebased-mainnet-upgrade/\`); (b) the deployer's sole on-chain activity is writing to a migration-accounting ledger; (c) single-admin write pattern matches the IF-internal deployment shape for \`stardustMigratedTokens\` + \`stardustFramework\` (both genesis-installed, both with null/admin-only writers).

Upgrade to [x] if IF publishes the deployer address in a future blog post or opens up the migration-tool repo, OR if someone confirms via IOTA Discord / ambassador channels.

**Deployer registered on \`iota-foundation\`.** The 2026-04-22 edit adds \`0xbeb1ba75…\` to the iota-foundation team's \`deployers\` list so \`anomalousDeployers\` detection resolves this package as expected IF activity rather than an unknown-deployer anomaly.

Match rule: \`packageAddresses\` pin (the one known package) + \`all: ['legacy_migration_history']\` as a defence-in-depth guard — if IF ever redeploys the ledger to a new address, the module-name check would still catch it routing-only via the \`iota-foundation\` team. No fingerprint rule; the \`MigrationHistory\` object has predictable state fields but nothing we'd prefer over a package address pin.

\`isCollectible: false\` — administrative ledger, not a user-facing NFT. Stays visible regardless of the "Hide collectibles" toggle.

Category \`Chain Primitive\` — bundled with \`stardustFramework\`, \`stardustMigratedTokens\`, \`iotaFramework\` as the IF-operated genesis/migration-infrastructure row family. Not a user-facing product; the purpose is to make sure the dashboard surfaces every IF-operated on-chain surface.
`.trim(),
};
