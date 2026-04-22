import { ProjectDefinition } from '../project.interface';

export const tokenlabsStaking: ProjectDefinition = {
  name: 'TokenLabs Staking Framework',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Staking',
  description: 'Liquidswap-derived multi-pool staking framework shipped by TokenLabs\' engine deployer. Generic `StakePool<StakingCoin, RewardCoin>` primitive that powers the 7 live TokenLabs farms — TLN/IOTA, TLN/TLN self-stake with compound, Pools Finance LP-token farms, cross-protocol CERT/CERT pair farms.',
  urls: [{ label: 'Website', href: 'https://tokenlabs.network' }],
  teamId: 'tokenlabs',
  match: { all: ['stake', 'stake_config'] },
  attribution: `
On-chain evidence: Move package with both \`stake\` and \`stake_config\` modules (usually paired with \`stake_entries\`) at TokenLabs' engine deployer \`0x9bd84e617831511634d8aca9120e90b07ba9e4fd920029e1fe4c887fc8599841\`. 3 upgrade versions on mainnet.

The 3-module signature is textbook Liquidswap-style staking — a multi-pool framework with classic primitives:

\`\`\`
stake (30 fn): register_pool, stake, unstake, harvest, deposit_reward_coins,
               emergency_unstake, enable_emergency, get_pending_user_rewards,
               accum_rewards_since_last_updated, update_accum_reward,
               update_pool_duration
stake_config (9 fn): 3-admin model (regular / emergency / treasury)
stake_entries (15 fn): stake, unstake, harvest, compound, compound_with_extra
\`\`\`

Attribution resolved 2026-04-17 via GlobalConfig probe: queried \`::stake_config::GlobalConfig\` object \`0xad0c222b5bfe63b50f31fee194bab69b636ffb70556053bc42234d8734ef280e\` and found \`admin_address = emergency_admin_address = treasury_admin_address = 0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c\`. That vanity-prefix address holds all three admin roles and separately publishes \`tln_token\`, vIOTA liquid staking, and a \`simple_payment\` helper — identifying the team as TokenLabs. Previously registered as "Staking (generic)"; now part of the 4-row TokenLabs product line.

**No false-match concern:** Pools Finance's 10-module AMM packages also contain \`{stake, stake_config, stake_entries}\` (vendored from the same Liquidswap source), but the Pools Finance match rule \`{amm_config, amm_router}\` fires earlier in \`ALL_PROJECTS\` and claims those packages first. The Staking Framework rule only matches TokenLabs' 3 standalone packages.
`.trim(),
};
