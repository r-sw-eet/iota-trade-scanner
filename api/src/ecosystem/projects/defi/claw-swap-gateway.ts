import { ProjectDefinition } from '../project.interface';

export const clawSwapGateway: ProjectDefinition = {
  name: 'CLAW Swap Gateway',
  layer: 'L1',
  category: 'DEX (AMM)',
  description: 'On-ramp swap gateway for the CLAW token (Studio 0a0d / Clawnera ecosystem, operated by GitHub user `Moron1337`). Users swap other coins into CLAW via an oracle-priced gateway with pausable / role-gated controls (`AdminCap`, `GuardianCap`, `OracleCap`). Distinct from a generic AMM — the gateway is the sole mint / distribution endpoint for CLAW, governed by explicit FX-update + coin-registration events. Single package `0x73467a1b…` on the `studio-0a0d` deployer, module `claw_swap_gateway`.',
  urls: [
    { label: 'CLAW sale', href: 'https://buy.claw-coin.com' },
  ],
  teamId: 'studio-0a0d',
  match: {
    deployerAddresses: ['0x0a0d4c9a9f935dac9f9bee55ca0632c187077a04d0dffcc479402f2de9a82140'],
    all: ['claw_swap_gateway'],
  },
  attribution: `
On-chain evidence: single package on the studio-0a0d (Clawnera) deployer matching the \`claw_swap_gateway\` module — \`0x73467a1b86bbfb8d9b0dcf0e4c320f7d8d6d3f60567cd70f5bb00b909fcddd8c\`.

Struct set reveals a full role-based gateway architecture:
- **State:** \`Gateway\` (\`key\` — shared swap gateway), \`CoinConfig\` (\`store\` — per-accepted-coin config).
- **Capabilities (3-role model):** \`AdminCap\` (full admin), \`GuardianCap\` (pause / emergency), \`OracleCap\` (FX-rate updates).
- **Events:** \`ClawSwap\` (swap executed), \`CoinRegistered\` / \`CoinConfigUpdated\` / \`CoinOracleUpdated\` / \`FXUpdated\` (config lifecycle), \`TopUpClaw\` / \`WithdrawClaw\` (treasury flow), \`Paused\` / \`Unpaused\` (circuit-breaker), \`TreasuryChanged\` (custody rotation).

The 3-cap role model (Admin / Guardian / Oracle) is a production-scale DeFi pattern — Admin owns the full upgrade path, Guardian exists to pause the gateway in an emergency without needing Admin keys, Oracle is restricted to FX-rate updates so the price-signing role is isolated.

**Relationship to the broader Clawnera stack:** Studio 0a0d (Moron1337) operates the CLAW meme-coin + CLAWNERA marketplace + SPEC launchpad. The \`claw_swap_gateway\` is the canonical on-ramp for CLAW — rather than a generic AMM, it's the controlled mint/distribution endpoint with FX rates set by the Oracle cap-holder. Consistent with a single-operator meme-coin project that wants tight economic control (per studio-0a0d team attribution: CLAW uses 1,337-based max supply, meme-coin numerology).

Match rule: \`deployerAddresses\` + \`all: ['claw_swap_gateway']\` (single-element) — pins the studio-0a0d deployer AND requires the specific module name so only this one package matches, not the other 8 Clawnera packages on the deployer (claw_coin, spec_coin, spec_sale_v2, order_escrow, manifest_anchor, reputation, review, tier, etc. — see studio-0a0d team attribution for the full commerce-stack inventory).

\`isCollectible: false\` — this is a functional swap gateway, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

Team \`studio-0a0d\` (documented as "Clawnera / Spec Weekly" — operator confirmed via Moron1337 GitHub repos + CoinMetadata icon URLs); this project row surfaces the CLAW gateway's swap activity as its own line on the dashboard.
`.trim(),
};
