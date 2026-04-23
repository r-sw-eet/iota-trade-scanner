import { Team } from '../team.interface';

export const tokenlabs: Team = {
  id: 'tokenlabs',
  name: 'TokenLabs',
  description: 'IOTA Rebased validator operator + DeFi staking platform. Issues TLN (native utility token, fair launch, 21M cap — no presale, 95% community / 5% team, decreasing emission from 10,000 TLN/day to a 1,000 TLN/day floor), operates vIOTA liquid staking (IOTA\'s second LST alongside Swirl), maintains reward farms (TLN/IOTA, TLN/TLN self-stake, Pools Finance LP farms), and powers the TokenLabs AI assistant (TLN is burned per-use).',
  urls: [
    { label: 'Website', href: 'https://tokenlabs.network' },
    { label: 'Twitter/X', href: 'https://x.com/TokenLabsX' },
  ],
  deployers: [
    { address: '0x9bd84e617831511634d8aca9120e90b07ba9e4fd920029e1fe4c887fc8599841', network: 'mainnet' },
    { address: '0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c', network: 'mainnet' },
  ],
  logo: '/logos/tokenlabs.ico',
  attribution: `
Previously registered as "Staking (generic)" based on the Liquidswap-derived \`{stake, stake_config, stake_entries}\` module signature alone. Attribution was 🟠 UNVERIFIED until 2026-04-17, when a GlobalConfig object probe cracked it in one query.

Resolution: queried \`::stake_config::GlobalConfig\` object \`0xad0c222b5bfe63b50f31fee194bab69b636ffb70556053bc42234d8734ef280e\` and read its admin fields:

\`\`\`
admin_address:           0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c
emergency_admin_address: 0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c
treasury_admin_address:  0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c
global_emergency:        off
\`\`\`

The vanity-prefix address \`0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c\` holds all three admin roles. Scanning packages deployed by that address returned 4 additional packages with telling module names:

- \`0xb63c04714082f9edb86b4b8fd07f89f0afebb9e6a96dd1a360a810e17691b674\` — \`tln_token\` module (coin type **TLN_TOKEN** — TokenLabs' native utility token).
- \`0xaa560ead3f1c756ac896b44585de0435e9761b8aeaf6cd6c9bf9a4fe8cec332b\` — \`simple_payment\` module.
- \`0xe4abf8b6183c106282addbfb8483a043e1a60f1fd3dd91fb727fa284306a27fd\` — \`{cert, math, native_pool, ownership, validator_set}\` — a **liquid staking** contract (vIOTA).
- \`0x6ab984dfae09bbef27551765622a85f461e0b46629eee60807b6e5399c0f7f0f\` — same 5 modules (vIOTA upgrade).

Web search for "TLN token" IOTA mainnet surfaces \`tokenlabs.network\` immediately — "an IOTA Rebased Validator & DeFi Staking Platform." GeckoTerminal confirms a TLN/stIOTA pool live on Pools Finance at \`0x168669080aafe0434d4b0b86ffa9e4786cdbb42de7074e3fcd6c40d4f987320f\` (cross-protocol DeFi composability with Swirl).

On-chain product breakdown:

**Engine deployer \`0x9bd84e617831511634d8aca9120e90b07ba9e4fd920029e1fe4c887fc8599841\`** — ships the staking framework (\`{stake, stake_config, stake_entries}\` × 3 upgrade versions). Liquidswap-style multi-pool architecture:
\`\`\`
stake (30 fn): register_pool, stake, unstake, harvest, deposit_reward_coins,
               emergency_unstake, enable_emergency, get_pending_user_rewards,
               accum_rewards_since_last_updated, update_accum_reward,
               update_pool_duration
stake_config (9 fn): 3-admin model (regular / emergency / treasury)
stake_entries (15 fn): stake, unstake, harvest, compound, compound_with_extra
\`\`\`

**Admin/Operator \`0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c\`** — ships the operational product surface:
- **TLN Token** (\`0xb63c04714082f9edb86b4b8fd07f89f0afebb9e6a96dd1a360a810e17691b674\`) — the coin type.
- **Liquid Staking v1 / v2** (\`0xe4abf8b6183c106282addbfb8483a043e1a60f1fd3dd91fb727fa284306a27fd\`, \`0x6ab984dfae09bbef27551765622a85f461e0b46629eee60807b6e5399c0f7f0f\`) — TokenLabs' vIOTA product.
- **Simple Payment** (\`0xaa560ead3f1c756ac896b44585de0435e9761b8aeaf6cd6c9bf9a4fe8cec332b\`).

StakePool inventory (7 live pools): TLN→IOTA rewards, TLN→TLN self-staking with compound, Pools Finance LP-token farms (CERT/CERT pair) → TLN rewards.

Side-finding: TokenLabs' vIOTA is IOTA's **second** liquid staking protocol alongside Swirl's stIOTA. The 5-module \`{cert, math, native_pool, ownership, validator_set}\` signature doesn't match any pre-2026-04-18 rule (it does NOT match the old "Swirl Validator" dead-def, which required \`validator\` — TokenLabs uses \`validator_set\`, different name). The "Swirl Validator" def was chasing a module name neither team ships — confirmed dead and removed.

Triangulation:
- [x] On-chain admin probe resolves to vanity address \`0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c\`.
- [x] That address deploys 4 packages including a literally-named \`tln_token\` module resolving to TokenLabs' native token.
- [x] TokenLabs publicly runs an IOTA Rebased validator + DeFi staking platform (tokenlabs.network).
- [x] Module signature and product surface (vIOTA liquid staking + TLN farms + TokenLabs AI) match exactly what's on-chain.
- [x] Pools Finance integration confirmed via live TLN/stIOTA pool + LP-token farms.
- [x] Only TokenLabs-linked addresses ship these specific packages on IOTA mainnet.
`.trim(),
};
