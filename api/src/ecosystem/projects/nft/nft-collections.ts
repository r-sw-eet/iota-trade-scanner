import { ProjectDefinition } from '../project.interface';

export const nftCollections: ProjectDefinition = {
  name: 'NFT Collections',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Collection',
  description: 'Generic NFT minting contracts deployed on IOTA Rebased. Includes 135+ individual collection packages using a shared single-module NFT standard.',
  urls: [],
  teamId: null,
  disclaimer: "Aggregate bucket split by deployer — each sub-project represents all NFT-minting packages published by a single address, identified by a short hash of that deployer. Display name is enriched with a sample NFT's `tag` or `name` field when available.",
  splitByDeployer: true,
  isCollectible: true,
  match: { exact: ['nft'] },
  attribution: `
On-chain evidence: Move package whose module set is exactly \`{nft}\` (a single module named \`nft\`, nothing else).

Aggregate bucket — this signature fits the canonical single-module NFT-minting pattern used by 100+ unrelated NFT deployers on IOTA. The name "NFT Collections" is ours, purely descriptive. Each matching package becomes a per-deployer sub-project via \`splitByDeployer: true\`, with the display name enriched at runtime from a sample Move object's \`tag\` / \`name\` / \`collection_name\` field (the NFT's own on-chain label).

Team-deployer routing: if a matching deployer belongs to a known team that exposes a \`match: {}\` (routing-only) project, the sub-project is routed to that project row instead of remaining in the bucket. Currently used by the \`iota-foundation\` team's \`Testing\` project for IF's internal test deployments.

\`isCollectible: true\` — the \`{nft}\` single-module signature is the canonical dumb-PFP shape on IOTA; every packages that lands in this aggregate (after narrower defs like \`iotaEstoicos\`, \`ctrlvAgents\`, \`numberOneFreeNft\` have claimed theirs) is a pure collectible with no utility / RWA anchor. The flag propagates to every \`splitByDeployer\` sub-project via \`def.isCollectible ?? false\` in \`ecosystem.service.ts\`, so the dashboard's "Hide collectibles" toggle correctly filters the whole bucket in one go. Team-routed sub-projects (deployer → routing-only project like \`iota-foundation\`'s \`Testing\`) use the routed project's own flag, not this one.
`.trim(),
};
