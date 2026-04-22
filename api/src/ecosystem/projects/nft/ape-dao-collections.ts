import { ProjectDefinition } from '../project.interface';

/**
 * ApeDAO's two PFP collections on IOTA Rebased — OG Ape (senior tier, 1,074
 * supply) + Lil' Ape (newer/larger tier, 5,370 supply). Same `ape-dao`
 * deployer ships both with the same architecture (MintCap, NFTCollection
 * shared object, per-NFT object with classic 8-slot PFP traits + a `Traits`
 * helper struct, OTW witness, Minted/Complete events). Split into two project
 * rows rather than one aggregate because they're distinct DAO governance
 * tiers — voting weight + trading price + holder pool differ, so the
 * dashboard surfacing each separately is informative.
 *
 * Both projects match via `deployerAddresses` + a module-set pin — deployer
 * catches all packages from this team, and the module rule narrows each row
 * to the specific collection variant. `isCollectible: true` — PFPs, hidden
 * by the "Hide collectibles" toggle.
 */

const APEDAO_DEPLOYER = '0x03ce67aaa3f321f24c07ffd864f719c922283de2d2880a03986c217dc2a3419b';

export const ogApe: ProjectDefinition = {
  name: 'OG Ape',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Collection',
  description: 'Senior-tier PFP collection for ApeDAO — 1,074 minted. DAO governance NFT (voting weight). 8-trait classic PFP shape (accessories / background / clothes / eyes / fur / hand / head / mouth). Deployed at `0x2b148b76…5b75b6`, module `ogape_nft`, same deployer as Lil\' Ape. See the `ape-dao` team page for the full ApeDAO context, APEin token, and legacy REMIX! Club collection on ShimmerEVM.',
  urls: [],
  teamId: 'ape-dao',
  isCollectible: true,
  match: {
    deployerAddresses: [APEDAO_DEPLOYER],
    all: ['ogape_nft'],
  },
  countTypes: ['ogape_nft::OGApeNFT'],
  attribution: `
Matches the one package at ApeDAO's deployer \`0x03ce67aa…3419b\` whose module is \`ogape_nft\` — \`0x2b148b762c93eabea3e1feeca52fc32e2cc9dce359054a9d7a7977230b5b75b6\`. Struct set: \`OGApeNFT\` (NFT, \`store, key\`), \`OGAPE_NFT\` (OTW, \`drop\`), \`NFTCollection\` (shared collection object), \`MintCap\` (admin), \`Traits\` (helper, \`store\`), plus \`NFTMinted\` / \`MintingComplete\` events.

Collection object \`0xbf981811f8351e2a2673b20d6c1817b9d3f010faf618b9425cc39b664187c217\` tracks \`total_supply: 1074\` with a full \`edition_to_id\` table. Sampled NFT (OG Ape #140): \`name: "Ape #140"\`, \`edition: 140\`, \`image_url: ipfs://QmNbZSywnbrf4HSAzDX1jvdvwCkHKgRACChZXF4j1t3X4S/140.png\`, traits \`{ accessories: "Golden Earring", background: "Orange", clothes: "Squared Shirt", eyes: "OG Sunglasses", fur: "Cream", hand: "Glass", head: "Hat", mouth: "Boring" }\`.

Match rule pins the deployer + requires module \`ogape_nft\` — \`all: ['ogape_nft']\` with a single entry. Separates OG Ape from its sibling Lil' Ape cleanly. \`isCollectible: true\`.
`.trim(),
};

export const lilApe: ProjectDefinition = {
  name: 'Lil\' Ape',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Collection',
  description: 'Newer / larger-pool PFP tier for ApeDAO — 5,370 minted (5× the OG Ape supply). DAO governance NFT (voting weight). 9-trait shape adds a `back` slot over the OG layout (for backpacks / wings / capes). Some traits self-reference the parent DAO (`accessories: "ApeDAO Necklace"`, `"FOMO Chain"`), providing on-chain brand confirmation. Deployed at `0x809a8f9d…d5ea7b`, module `lilape_nft`, same deployer as OG Ape.',
  urls: [],
  teamId: 'ape-dao',
  isCollectible: true,
  match: {
    deployerAddresses: [APEDAO_DEPLOYER],
    all: ['lilape_nft'],
  },
  countTypes: ['lilape_nft::LilApeNFT'],
  attribution: `
Matches the one package at ApeDAO's deployer \`0x03ce67aa…3419b\` whose module is \`lilape_nft\` — \`0x809a8f9da21b396de77ba4d5a71217404036dd3de067442441b95a3548d5ea7b\`. Struct set mirrors OG Ape's (\`LilApeNFT\`, \`LILAPE_NFT\` OTW, \`NFTCollection\`, \`MintCap\`, \`Traits\`, events).

Collection object \`0x0dcfb9bb464024dfea2dae991f7586ee71a85df31be05e7efb7094c6b58851e8\` tracks \`total_supply: 5370\`. Sampled NFT (Lil' Ape #4203): traits include \`accessories: "FOMO Chain"\`, \`back: "Empty"\`, \`background: "Retro"\`, \`clothes: "Red T Shirt"\`, \`eyes: "VR"\`, \`fur: "Tan"\`, \`hand: "Empty"\`, \`head: "Cylinder"\`, \`mouth: "Bubble Gum"\`. Another sample (Lil' Ape #2467) includes \`accessories: "ApeDAO Necklace"\` — direct on-chain reference to the parent DAO brand.

Match rule pins the deployer + requires module \`lilape_nft\`. Separates Lil' Ape from OG Ape cleanly on the dashboard. \`isCollectible: true\`.
`.trim(),
};
