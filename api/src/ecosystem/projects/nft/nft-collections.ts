import { ProjectDefinition } from '../project.interface';

export const nftCollections: ProjectDefinition = {
  name: 'NFT Collections',
  layer: 'L1',
  category: 'NFT',
  description: 'Generic NFT minting contracts deployed on IOTA Rebased. Includes 135+ individual collection packages using a shared single-module NFT standard.',
  urls: [],
  teamId: null,
  disclaimer: "Aggregate bucket — this matches 140+ distinct NFT-minting packages from ~6 unrelated deployers. They're grouped here because our matcher only sees the generic single-module 'nft' pattern; we can't cheaply tell them apart without per-package metadata inspection.",
  match: { exact: ['nft'] },
};
