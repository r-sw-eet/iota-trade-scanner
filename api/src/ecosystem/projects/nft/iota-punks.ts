import { ProjectDefinition } from '../project.interface';

export const iotaPunks: ProjectDefinition = {
  name: 'IOTAPUNKS',
  layer: 'L1',
  category: 'NFT',
  description: 'Community-driven 32×32 pixel-art PFP collection on IOTA Rebased, CryptoPunks-inspired but with traits modelled on well-known figures from the IOTA Foundation / community (character trait values like "Holger" surface in minted NFTs). 15,555 total planned; 89 minted on Rebased L1 Move so far (gradual ramp-up from a 2022-era Stardust/IOTA-EVM origin listed on Figment Marketplace). Single package at `0x65034c5…cd31`, single module `iotapunks`, full collection-management shape (AdminCap, RelayerCap, shared Collection object with swap + freeze controls).',
  urls: [
    { label: 'Website', href: 'https://iotapunks.com/' },
  ],
  teamId: 'iota-punks',
  isCollectible: true,
  match: {
    deployerAddresses: ['0x8bfa0f4ba8ab9b2849e8fb99bcd4d43b9fdab2cf84f20e5d7a117ad74ab165ea'],
  },
  countTypes: ['iotapunks::IotaPunk'],
  attribution: `
On-chain evidence: single package at deployer \`0x8bfa0f4ba8ab9b2849e8fb99bcd4d43b9fdab2cf84f20e5d7a117ad74ab165ea\`, package address \`0x65034c5392fbc59cc5b6d20a4e5980a0dc4cd65fe6c5762d8f5b4fe0c9e2cd31\`, single module \`iotapunks\`. Struct set matches a production PFP collection: \`IOTAPUNKS\` (OTW), \`IotaPunk\` (NFT), \`Collection\`, \`AdminCap\`, \`RelayerCap\`, \`Traits\`, plus the usual mint / config-change events.

Brand chain (public site at \`iotapunks.com\` — tagline "soon is now"): the og:description matches the on-chain product exactly ("community-driven collectibles NFT project … using Cryptopunk as base design"). Shared \`Collection\` object (\`0x588554523e1350e3f466f206f6b19849e11d79d8a26fd789bac66a744f561643\`) tracks \`total_minted: "89"\`, \`image_base_url: "ipfs://bafybeihw47…/"\`, \`swap_open: true\`, \`frozen: false\`.

Sampled NFT (IOTAPUNKS #13167):
\`\`\`
{ token_id: "13167", name: "IOTAPUNKS #13167",
  image_url: "ipfs://<CID>/13167.png",
  traits: { edition: "#13167", background: "Orange",
            characters: "Holger", hair: "No", beard: "No",
            style: "Suit", clothing_color: "Black",
            headwear: "Cowboy - Blue #1", facewear: "Cigarette",
            ranking: "5329", rarity: "75,802" } }
\`\`\`
\`characters: "Holger"\` cross-references the team's CryptoPunks-meets-IOTA-community-figures concept (likely Holger Köther, IF Director of Partnerships).

Match rule: \`deployerAddresses\` catch-all on the one deployer. Module name \`iotapunks\` is specific enough that a collision with an unrelated project would be surprising, but deployer-pin keeps the rule tight regardless.

\`isCollectible: true\` — textbook PFP collection; hidden by the "Hide collectibles" toggle. Team \`iota-punks\` carries the full brand chain + community links (Discord, Twitter \`@IotaPunks_71\`, legacy Figment Marketplace listing for the pre-Rebased drop).
`.trim(),
};
