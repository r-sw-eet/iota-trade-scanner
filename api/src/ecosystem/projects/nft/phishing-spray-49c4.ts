import { ProjectDefinition } from '../project.interface';

export const phishingSpray49c4: ProjectDefinition = {
  name: 'Phishing Spray (PANDABYTE / Kiln)',
  layer: 'L1',
  category: 'NFT',
  description: 'Phishing-airdrop NFT campaign on IOTA Rebased. Deployer `0x49c4e917…` sprays NFTs with metadata pointing at two non-resolving impersonation sites: `pandabyte.org` (inventing a "PANDABYTE Reward Event 2025" brand) and `kilnstake.net` (squatting on real validator brand Kiln, whose actual site is `kiln.fi`). Spray fingerprint confirms the pattern — 597 `PandabyteTicket` NFTs, each held by a different wallet (one per recipient). Classic scam-airdrop playbook: recipient sees "claim your reward" metadata, visits fake site, wallet drains. All 3 packages on this deployer attributed here as one warning row.',
  urls: [],
  teamId: 'studio-49c4',
  isCollectible: true,
  disclaimer: '⚠️ Phishing campaign. NFTs spray-airdropped with metadata linking to non-resolving impersonation sites (pandabyte.org, kilnstake.net — the latter is NOT the real Kiln validator service at kiln.fi). DO NOT follow these URLs — connecting a wallet to the target sites would likely drain funds. Row exists so the scam is visible on the scanner rather than silently ignored.',
  match: {
    deployerAddresses: ['0x49c4e917a0d6ca7da640b0267123e5416457e88651e06a79f99dc2fd7b88dbbf'],
  },
  attribution: `
Matches all 3 packages on deployer \`0x49c4e917a0d6ca7da640b0267123e5416457e88651e06a79f99dc2fd7b88dbbf\`:

| Package                                                              | Module      | Role                                                                                    |
|----------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------------------|
| \`0xe0c9aa208c96b396556b2043d9cd103140a2e30f7ec57a2a3a125e5e28dff239\` | \`voucher\`   | \`PandabyteTicket\` NFTs — 597 sprayed, each to a distinct wallet; URL \`pandabyte.org\`   |
| \`0x7a5f3b3d53d5408b756e517f6c3b9de1424a61eed947533acd1e2c780c1f85ca\` | \`ticket\`    | \`KilnTicket\` NFTs — "3000 IOTA Kiln Reward Event 2025"; URL \`kilnstake.net\` (NOT Kiln!) |
| \`0x483b9ecede64c47f19d976556e318632324b1c1684be798b2bea296c8a5481a3\` | \`my_token\`  | Unused OTW template — likely scaffolding for a third campaign not yet rolled out        |

**Scam verification (2026-04-19):**
- \`pandabyte.org\` — DNS \`Could not resolve host\` (inventing a brand for the scam).
- \`kilnstake.net\` — DNS \`Could not resolve host\`, AND not Kiln's real domain. The genuine Kiln enterprise-staking service uses \`kiln.fi\` (documented at \`docs.kiln.fi/v1/kiln-products/validators/protocols/iota-iota\` for IOTA specifically).
- \`PandabyteTicket\` distribution: 597 total minted, 597 unique holders, exactly 1 per wallet — canonical mass-spray-airdrop pattern (vs. user-claimed mint, which would concentrate ownership on wallets that opted in).
- All NFT descriptions use the template \`"<brand> Reward Event 2025 is Live at <fake-domain>"\` — identical copy structure across both brands suggests a scripted campaign rather than organic drops.

**Why tracked at all rather than just ignored:** surfaces the scam on the ecosystem view so users (or the next scanner maintainer) don't have to re-investigate when the cluster shows up in unattributed. Disclaimer on the row renders as an amber-warning icon on the dashboard, signaling "drill in for context before trusting this".

\`isCollectible: true\` — hidden from the real-usecases view by default (the "Hide collectibles" toggle). Users who toggle collectibles on see the row with the disclaimer. Team \`studio-49c4\` carries the full operational fingerprint.

If another phishing-spray cluster surfaces later, use the same shape: \`studio-<prefix>\` synthetic team + deployer-catch-all project + disclaimer describing the target domains + impersonated brand. Grep \`disclaimer:.*Phishing\` to find them all.
`.trim(),
};
