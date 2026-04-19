import { ProjectDefinition } from '../project.interface';

export const iotaLink: ProjectDefinition = {
  name: 'IOTA Link',
  layer: 'L1',
  category: 'Identity',
  description: 'IOTA Foundation commemorative NFT issued post-Rebased-mainnet-launch (2025-05) that links an Ethereum-format `network_address` (likely the holder\'s IOTA EVM L2 account) to their L1 Move identity. `token_id` issued sequentially into the thousands; media `IOTA-Link-NFT.mp4` served from `files.iota.org/media/` (IF CDN). Mints from the IF migration deployer `0xd3906909…` which also ships LayerZero OFT wrappers, mockcoin tokens, airdrop + rebased_nft scaffolding — the broader IF migration / bridge-tooling footprint.',
  urls: [
    { label: 'IF-hosted media', href: 'https://files.iota.org/media/IOTA-Link-NFT.mp4' },
  ],
  teamId: 'iota-foundation',
  match: {
    packageAddresses: ['0x1badcfafdae5db34db99d535d29956f47401b4cecbdd45c3a9d31452d7217c9a'],
    fingerprint: {
      type: 'iotalink::IotaLink',
      fields: {
        common_image_url: { suffix: 'IOTA-Link-NFT.mp4' },
      },
    },
  },
  attribution: `
On-chain evidence: fingerprint-only rule on Move objects of type \`<pkg>::iotalink::IotaLink\` whose \`common_image_url\` field ends in \`IOTA-Link-NFT.mp4\`. The minted NFT's fields carry \`network_address\` (40-hex Ethereum-format address — almost certainly the holder's IOTA EVM L2 wallet), \`timestamp_ms\`, and a sequential \`token_id\` (observed values into the thousands — e.g. \`3596\`, \`6540\`, \`9064\`).

**Smoking-gun IF signal:** the \`common_image_url\` points at \`https://files.iota.org/media/IOTA-Link-NFT.mp4\` — IF's own CDN. \`files.iota.org\` serves IF-hosted content only; third-party projects can't publish there. The file was last-modified 2025-05-20 — 15 days after the Rebased mainnet went live on 2025-05-05 — which fits the migration-commemorative framing.

**Deployer context:** package ships from \`0xd3906909a7bfc50ea9f4c0772a75bc99cd0da938c90ec05a556de1b5407bd639\`, an IF operational deployer with 12 packages total:

| Module set                                                         | Pkgs | Role                                                    |
|--------------------------------------------------------------------|------|---------------------------------------------------------|
| \`ethereum + iotalink + registry_v1 + utils\`                         | 1    | IOTA Link (this project) + backing registry             |
| \`oft + oft_impl + oft_fee + oft_ptb_builder + pausable + rate_limiter + 8 more\` | 3    | LayerZero OFT token wrappers (IF-issued)                |
| \`mockcoin\`                                                          | 3    | Mock / test coin types                                  |
| \`airdrop\`                                                           | 1    | Airdrop distribution module                             |
| \`rebased_nft\`                                                       | 1    | Rebased-era NFT scaffolding                             |
| \`custom_metadata_registry + nft\`                                    | 1    | NFT metadata registry                                   |
| \`icon + spam\`                                                       | 1    | Icon + anti-spam utilities                              |
| \`test_nft\`                                                          | 1    | Test-mint NFT                                           |

Deployer added to the \`iota-foundation\` team roster. Only the \`iotalink::IotaLink\` carve-out lives as its own row on the dashboard currently; the 11 siblings are TODO follow-ups for per-product attribution (OFT wrappers likely need per-token names — which coin types bridged — whereas the mockcoin / test / icon-spam packages may stay un-split as development utilities).

Match rule: \`packageAddresses\` pinned to \`0x1badcfafdae5db34db99d535d29956f47401b4cecbdd45c3a9d31452d7217c9a\` (the one iotalink-module package on this deployer), plus the fingerprint as belt-and-suspenders if IF ever redeploys. The pin is important — without it the def would have only fingerprint match, making it look "routing-only" to the splitByDeployer team-routing code at \`ecosystem.service.ts\`, which would have absorbed IF Testing packages into this row (see the now-tightened \`isRoutingOnly\` check in the service).

\`isCollectible: false\` — the NFT is functional (address-link identity artifact, not a PFP). Stays visible regardless of the "Hide collectibles" toggle.
`.trim(),
};
