import { ProjectDefinition } from '../project.interface';

export const switchboardOracle: ProjectDefinition = {
  name: 'Switchboard Oracle',
  layer: 'L1',
  category: 'Oracle',
  subcategory: 'Price Feed',
  description: 'Switchboard On-Demand oracle network on IOTA Rebased. Customizable data feeds with aggregator/oracle/queue primitives, guardian-queue initialization, and on-demand oracle functionality for smart contracts. Multi-chain provider; IOTA is one of many supported deployments.',
  urls: [
    { label: 'Website', href: 'https://switchboard.xyz' },
    { label: 'IOTA docs', href: 'https://docs.switchboard.xyz/docs-by-chain/iota' },
    { label: 'GitHub', href: 'https://github.com/switchboard-xyz/iota' },
  ],
  teamId: 'switchboard',
  match: { all: ['aggregator', 'aggregator_init_action'], minModules: 10 },
  attribution: `
On-chain evidence: Move package with both \`aggregator\` and \`aggregator_init_action\`, and the package has at least 10 modules total.

Gold-standard attestation via Switchboard's official IOTA docs (\`docs.switchboard.xyz/docs-by-chain/iota\`), which publishes the mainnet package address verbatim:

> "Switchboard On-Demand service is currently deployed on the following networks:
> **Mainnet:** \`0x8650249db8ffcffe8eb08b0696a8cb71e325f2afb9abc646f45344077b073ba1\`"

They also reference their IOTA-specific GitHub repo at \`github.com/switchboard-xyz/iota\` (used as a Move.toml dependency).

On-chain, the package contains 20 modules: \`aggregator, aggregator_delete_action, aggregator_init_action, aggregator_set_authority_action, aggregator_set_configs_action, aggregator_submit_result_action, decimal, guardian_queue_init_action, hash, on_demand, oracle, oracle_attest_action, oracle_init_action, oracle_queue_init_action, queue, queue_add_fee_coin_action, queue_override_oracle_action, queue_remove_fee_coin_action, queue_set_authority_action, queue_set_configs_action\`.

Textbook Switchboard On-Demand architecture — aggregator/oracle/queue primitives with explicit init/config actions. The \`on_demand\` module name is literal branding for Switchboard's "On-Demand" product line.

The \`minModules: 10\` guard is defensive tuning: \`aggregator\` is a common module name, so the floor prevents a small one-module \`aggregator\` helper from another team from false-matching. Switchboard's production on-demand package (20 modules) clears the floor easily; it matches 1/1 package — full coverage.
`.trim(),
};
