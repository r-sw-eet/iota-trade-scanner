import { Team } from '../team.interface';

export const liquidlink: Team = {
  id: 'liquidlink',
  name: 'LiquidLink',
  description: 'Modular on-chain incentive infrastructure — points, profile NFTs, referrals, and social engagement. Multi-chain (IOTA + Sui mainnet) with integrations to Bucket Protocol and Strater on Sui. Profile data stored on Walrus.',
  urls: [
    { label: 'Website', href: 'https://www.liquidlink.io' },
    { label: 'IOTA App', href: 'https://iota.liquidlink.io' },
    { label: 'Snap', href: 'https://snap.liquidlink.io' },
    { label: 'Twitter/X', href: 'https://x.com/Liquidlink_io' },
  ],
  deployers: [{ address: '0xd6a54ff7f851b58c19729c11d210d46fd46d702b9d9caff78747de1914c934ee', network: 'mainnet' }],
  logo: '/logos/liquidlink.ico',
  attribution: `
Previously registered as "Points System" — a generic descriptor from before the team was identified. The real project is **LiquidLink**, modular on-chain incentive infrastructure running on both IOTA and Sui mainnet. The Points System module signature was their original loyalty-engine package; subsequent deploys evolved into a full social-profile + engagement platform.

Public attestation — gold-standard:
- Official site \`liquidlink.io\` — "Modular On-Chain Incentive Infrastructure."
- IOTA-specific app at \`iota.liquidlink.io\`.
- Snap wallet (?) at \`snap.liquidlink.io\`.
- X/Twitter \`@Liquidlink_io\`.
- Press coverage confirms LiquidLink's point system live on IOTA and Sui mainnet with Bucket Protocol + Strater (Sui) integrations, on-chain profiles, referral system, points-system SDK. Profile data stored on Walrus. Developing social features.

On-chain: deployer \`0xd6a54ff7f851b58c19729c11d210d46fd46d702b9d9caff78747de1914c934ee\` has published **11 packages** grouped into four distinct module signatures, visible as product evolution:

1. **Original Points System core** — \`{constant, event, point, profile}\` exact set, 4 upgrade versions (\`0x12fc1744dbd2401a0bbc1cb07995e1d7b2d9179a42a90ae7311e4c477112bf83\`, \`0x249dd22d5d65bd74d1427061620a3b4143e6c61b21375d841761eb71630ea1ff\`, \`0xcc62dc17ff55d0e434bdec1dce0a7127f891ca76808a63348cc46a9d50f41c20\`, \`0x2ecd5a5ddfeaf9f73174fc5459ba2289d4ef4bd2bd966b0ed548b4661f27140f\`). Matches the prior "Points System" rule.
2. **Refactored core** — \`{core, events}\`, 2 versions (\`0x4d62811016a2e0a3a44adcdaaf1f8fc46aa2e807ccb208dfb4cb00642a668b2a\`, \`0x4d0f83803033da5fdb5728335bed0557405d1f28ffc832714363df47361dbeed\`). Simpler v2 of the points engine.
3. **Utility packages** — \`{utils}\` alone, 2 versions (\`0x6d0efef88d35ae63bdc7ca4b32e8611ecde34841dacbd3c00df1ee4825774ab8\`, \`0xf9fa275e30f07d3155e75441b7a50e795758627455c2fa714c2285045de3b973\`). Shared utilities.
4. **LiquidLink profile + social layer** — \`{iota_liquidlink_profile}\` alone (1 pkg) + \`{iota_liquidlink_profile, like}\` (2 versions). Profile NFTs + engagement tracker.

Module introspection of the latest LiquidLink-branded package:
\`\`\`
module iota_liquidlink_profile (5 fn, 5 structs):
  structs: AdminCap, EditCap, IOTA_LIQUIDLINK_PROFILE, ProfileNFT, ProfileRegistry
  functions: get_profile_id, init, mint_to_user, update_image, update_texts

module like (3 fn, 2 structs):
  structs: LikeEvent, LikeTracker
  functions: get_like_count, give_like, migrate
\`\`\`

Profile NFTs with image/text metadata, a registry, and a like tracker — a mini social network on-chain.

Triangulation:
- [x] LiquidLink publicly runs on IOTA mainnet, documented on their own site + press coverage.
- [x] Module name \`iota_liquidlink_profile\` literally embeds the brand — irrefutable.
- [x] Product-evolution pattern (simple points → social profile + like engagement) matches LiquidLink's published roadmap.
- [x] Multi-chain deployment (IOTA + Sui) matches LiquidLink's documented architecture.
- [x] Only one deployer on IOTA mainnet ships the \`iota_liquidlink_profile\` module.
`.trim(),
};
