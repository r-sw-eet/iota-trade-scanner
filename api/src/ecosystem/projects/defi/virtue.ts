import { ProjectDefinition } from '../project.interface';

export const virtue: ProjectDefinition = {
  name: 'Virtue',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Stablecoin',
  description: 'First native stablecoin (VUSD) protocol on IOTA Rebased. Users mint VUSD (USD-pegged) by locking wIOTA or stIOTA as collateral in Collateralized Debt Positions. Row covers all Virtue packages by their known deployer — Framework, VUSD Treasury, Oracle, CDP, plus the rule packages (cert_rule, vcert_rule, whitelist_rule, pyth_rule), incentive add-ons (borrow_incentive, stability_pool_incentive, incentive_admin), config/upgrade variants, and any future packages they ship. The Stability Pool primitive has its own row.',
  urls: [
    { label: 'App', href: 'https://virtue.money' },
    { label: 'Docs', href: 'https://docs.virtue.money' },
  ],
  teamId: 'virtue',
  match: {
    deployerAddresses: ['0xf67d0193e9cd65c3c8232dbfe0694eb9e14397326bdc362a4fe9d590984f5a12'],
  },
  attribution: `
On-chain evidence: matches every package deployed by Virtue's known deployer \`0xf67d0193e9cd65c3c8232dbfe0694eb9e14397326bdc362a4fe9d590984f5a12\`. The deployer link is gold-standard — confirmed via Virtue's own docs (\`docs.virtue.money/resources/technical-resources\` lists the 5 canonical addresses, all under this deployer) and the MoveBit audit (github.com/Virtue-CDP/virtue-audits) which independently certifies the source repo at github.com/Virtue-CDP/move-contracts.

Canonical components claimed by this rule: Framework \`0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b\`, VUSD Treasury \`0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f\` (ships the VUSD coin type literally), Oracle \`0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf\`, CDP \`0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22\`. The 5th canonical component (Stability Pool, \`0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b\`) lands on its own row via \`virtueStabilityPool\`'s more-specific module-pair rule, which is checked first per registry order.

Match rule history: previously \`{all: [liquidity_pool, delegates]}\`, which actually matched CyberPerp's GMX fork (Virtue ships no \`liquidity_pool\` module — that's DEX/perps vocabulary). Rewritten to the 4 canonical docs-listed addresses on 2026-04-18; widened again on 2026-04-19 to deployer-based catch-all because the 4-address allowlist left ~25 rule/incentive/upgrade packages from the same Virtue deployer falling through to Unattributed. The deployer-match approach is safe: Virtue's deployer ships only Virtue packages (per team docs + audit), and any future packages they release auto-attribute without scanner edits.
`.trim(),
};

export const virtueStabilityPool: ProjectDefinition = {
  name: 'Virtue Stability Pool',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Stablecoin',
  description: 'Stability-pool primitive for the Virtue CDP system. Depositors provide VUSD to absorb liquidations and earn collateral rewards; the balance_number module maintains the internal ledger of depositor shares across the protocol.',
  urls: [{ label: 'App', href: 'https://virtue.money' }],
  teamId: 'virtue',
  logo: '/logos/virtue.svg',
  match: { all: ['balance_number', 'stability_pool'] },
  attribution: `
On-chain evidence: Move package with both \`balance_number\` and \`stability_pool\` modules. This is the 5th Virtue canonical component (Stability Pool at \`0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b\` per the Virtue docs), kept as its own row so stability-pool events (deposits, liquidations, reward claims) don't get lumped with the other 4 core components.

Previously named "Virtue Pool" — renamed because the module pair unambiguously identifies Virtue's Stability Pool primitive. The old "Virtue Stability" def (matching \`{stability_pool, borrow_incentive}\`) matched zero packages on mainnet and was dropped: Virtue's incentive packages ship \`stability_pool_incentive\`, not \`stability_pool\`.
`.trim(),
};
