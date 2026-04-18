import { Team } from '../team.interface';

export const switchboard: Team = {
  id: 'switchboard',
  name: 'Switchboard',
  description: 'Switchboard On-Demand oracle network on IOTA Rebased. Multi-chain oracle provider; IOTA is one of many supported deployments.',
  urls: [
    { label: 'Website', href: 'https://switchboard.xyz' },
    { label: 'IOTA docs', href: 'https://docs.switchboard.xyz/docs-by-chain/iota' },
    { label: 'GitHub', href: 'https://github.com/switchboard-xyz/iota' },
  ],
  deployers: ['0x55f1256ec64d7c4eacb1a5e24932b9face3cdf9400f8d828001b2da0494e7404'],
  logo: '/logos/switchboard.svg',
  attribution: `
Gold-standard attribution via Switchboard's official IOTA documentation (\`docs.switchboard.xyz/docs-by-chain/iota\`), which publishes the mainnet package address verbatim:

> "Switchboard On-Demand service is currently deployed on the following networks:
> **Mainnet:** \`0x8650249db8ffcffe8eb08b0696a8cb71e325f2afb9abc646f45344077b073ba1\`"

They also reference their IOTA-specific GitHub repo at \`github.com/switchboard-xyz/iota\` (used as a Move.toml dependency). No audit is linked from their IOTA docs page; Switchboard runs on many chains and their cross-chain audit history lives elsewhere.

On-chain: deployer \`0x55f1…7404\` has published exactly 1 package matching their documented address — \`0x8650249d…b073ba1\` with 20 modules: \`aggregator, aggregator_delete_action, aggregator_init_action, aggregator_set_authority_action, aggregator_set_configs_action, aggregator_submit_result_action, decimal, guardian_queue_init_action, hash, on_demand, oracle, oracle_attest_action, oracle_init_action, oracle_queue_init_action, queue, queue_add_fee_coin_action, queue_override_oracle_action, queue_remove_fee_coin_action, queue_set_authority_action, queue_set_configs_action\`. Textbook Switchboard On-Demand architecture — aggregator/oracle/queue primitives with explicit init/config actions. The \`on_demand\` module name is literal branding for Switchboard's "On-Demand" product line.

Triangulation:
- [x] Switchboard's docs publish package \`0x8650249d…b073ba1\` as their IOTA Mainnet deployment.
- [x] On-chain scan confirms exactly that package exists at deployer \`0x55f1…7404\`.
- [x] 20-module signature is unambiguously Switchboard On-Demand.
- [x] No other mainnet deployer ships an \`aggregator\` module on IOTA.
`.trim(),
};
