import { ProjectDefinition } from '../project.interface';

export const krillTube: ProjectDefinition = {
  name: 'KrillTube',
  layer: 'L1',
  category: 'Social',
  subcategory: 'Incentive',
  description: 'Decentralized video platform on IOTA Rebased — watch-to-earn + upload-to-earn economics via Move `tunnel` primitive: each viewer-creator session opens a `Tunnel` with a `ReceiverConfig` fee-split (creator / operator / additional recipients, all in basis-points). `CreatorConfig` objects register each content creator and their payout routing. 21 creators onboarded, primary operator `0xba1e07d0…` (matches the KrillTube operator noted in the `studio-b8b1` team attribution). Branded metadata on closed tunnels shows `"KrillTube Video - <UUID>"` — TX-history reveals real video-payment flows. Frontend at `krill.tube` is currently offline (Vercel `DEPLOYMENT_NOT_FOUND`), but the on-chain tunnel package remains deployed and the creator-config state is intact.',
  urls: [
    { label: 'App (currently offline)', href: 'https://krill.tube/' },
  ],
  teamId: 'studio-b8b1',
  match: {
    deployerAddresses: ['0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6'],
    all: ['tunnel'],
  },
  attribution: `
On-chain evidence: single package at studio-b8b1 deployer matching the \`tunnel\` module — \`0x414cdef54dcf8b37cf3201fa519b53aa555bb876d161679aea91923cff9977fc\`. Struct set: \`CreatorConfig\` (\`store, key\` — per-creator payout config), \`ReceiverConfig\` (\`copy, drop, store\` — fee-split recipient entry), \`Tunnel\` (\`store, key\` — ephemeral per-session payment channel), \`ClaimReceipt\` (\`drop\`), plus events \`CreatorConfigCreated\` / \`TunnelOpened\` / \`TunnelClosed\` / \`CloseInitiated\` / \`PaymentProcessed\` / \`FundsClaimed\`.

**Sampled CreatorConfig:**
\`\`\`
{ creator: "0xebf595b1…42e0d",
  operator: "0xba1e07d0…3020d",   // KrillTube operator
  receiver_configs: [
    { _type: "4020", fee_bps: "6000", _address: "<creator>" },   // 60% → creator
    { _type: "4021", fee_bps: "1000", _address: "<operator>" },  // 10% → operator
    ...                                                            // additional recipients
  ] }
\`\`\`

The fee_bps structure is the smoking gun for a creator-economy payment protocol — 60% to creator, 10% to platform, remainder split across additional configurable recipients. Matches a classic video-platform revenue-share architecture.

**Activity snapshot (2026-04-19):**
- 21 \`CreatorConfig\` objects on-chain — 21 creator slots registered.
- 5 distinct \`creator\` addresses (some creators have multiple configs — probably per-channel or per-revision).
- 2 distinct \`operator\` addresses: the dominant one is \`0xba1e07d0a5db4ed0aab5ada813c3abb8a58f4d34ba19b153f19c70d6e163020d\` (20 configs — KrillTube's operator account, matches the address already documented in the \`studio-b8b1\` team attribution), plus one self-operated creator (1 config).
- 0 live \`Tunnel\` objects. Tunnels are ephemeral: opened when a viewer starts a session, closed (and destroyed) when the session ends, with \`PaymentProcessed\` and \`FundsClaimed\` events emitted on close. The "KrillTube Video - <UUID>" metadata surfaced by the scanner's earlier TX-effects probe comes from historical \`TunnelOpened\` events.

**Frontend status:** \`krill.tube\` currently returns Vercel's \`DEPLOYMENT_NOT_FOUND\` (verified 2026-04-19) — the hosted app has been taken down. The on-chain contract remains live and the 21 creators' configs remain claimable; if/when the frontend is redeployed, creator payouts can resume against the existing configs.

Match rule: \`deployerAddresses\` + \`all: ['tunnel']\` (single-element) — pins the studio-b8b1 deployer AND requires the \`tunnel\` module so only the one KrillTube package matches, not the other 36 packages this deployer ships (chess / vault / giftdrop / tic_tac_iota / gas_station / etc.).

\`isCollectible: false\` (default) — this is a functional creator-economy primitive, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

Team \`studio-b8b1\` (the "Studio 0xb8b1380e" anonymous multi-brand deployer) already describes KrillTube in its attribution — this project row surfaces the on-chain tunnel activity as its own line on the dashboard rather than burying it in the studio team's generic rollup.
`.trim(),
};
