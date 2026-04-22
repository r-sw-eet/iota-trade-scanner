import { ProjectDefinition } from '../project.interface';

export const carNft: ProjectDefinition = {
  name: 'Car NFT',
  layer: 'L1',
  category: 'Real World',
  subcategory: 'Application',
  industries: ['Automotive'],
  description: 'RWA vehicle-title NFT pilot on IOTA Rebased — each token represents one car, with fields for `brand` / `model` / `vin` / `fuel` / `power` / `year` / `mileage` / `last_maintenance_date` / `last_TC_status` (European inspection) / `current_owner` + IPFS image. 3 single-module `car_nft` packages at one anonymous deployer; sophisticated architecture with a shared `Config` object holding a 32-byte `backend_pubkey` (for off-chain signed mileage / TC / ownership updates) + a `vin_registry` table. Currently 1 minted token (a 2019 Ford Fiesta — demo scale). Listed as `isCollectible: false` — functional RWA, not a PFP.',
  urls: [],
  teamId: 'studio-5451',
  match: {
    deployerAddresses: ['0x545160c945b6acbf1b8a295cd488294f17144b0324786d049953e168e783c8a9'],
  },
  attribution: `
On-chain evidence: 3 packages from the anonymous deployer \`0x545160c945b6acbf1b8a295cd488294f17144b0324786d049953e168e783c8a9\`, all single-module \`car_nft\`, all shipping the same 4-struct signature: \`CAR_NFT\` (OTW witness), \`CarNFT\` (the vehicle NFT — \`store, key\`), \`Config\` (shared admin object — \`store, key\`), \`NFTMinted\` (mint event).

Sampled CarNFT carries realistic vehicle fields: \`brand: "FORD"\`, \`model: "FIESTA"\`, \`vin: "WF0JXXGAHJKD30348"\` (WMI \`WF0\` = Ford Werke Germany), \`year: "2019"\`, \`mileage: "53000"\`, \`fuel: "ICE"\`, \`power: "86"\`, \`last_TC_status: "Pending"\` (TC = Contrôle Technique / Technische Kontrolle / standardized European periodic vehicle inspection), \`current_owner\` set to an IOTA-address. IPFS-hosted image at \`bafybeigcs4…/fordFiesta.jpeg\` (web3.storage gateway, folder contains only the one image).

Architecture and operator identification live on the \`studio-5451\` team attribution — summary: sophisticated backend-signed-update pattern (Config holds a 32-byte pubkey; off-chain backend signs mutations; contract verifies signature on-chain), clear European-dev origin from field names and VIN WMI, no public web surface to connect the deployer to a real product brand. Demo / pilot scale so far: 1 minted NFT across 3 upgrade versions.

Match rule: \`deployerAddresses\` catch-all on the one deployer. Module name \`car_nft\` is a plausible collision candidate with other RWA-automotive deployers on IOTA, so deployer-pin is the tight rule; if a real branded product deploys separately later, it gets its own project row and this stays on the anonymous pilot.

\`isCollectible: false\` — these are functional RWA tokens anchoring real vehicle identity (VIN + title fields), not PFP collectibles. Stays visible regardless of the "Hide collectibles" toggle.

Category \`RWA / Product Authenticity\` — same class as ObjectID (digital twins for physical products). Sibling row on the dashboard. Promote to a named-brand team if operator identity ever surfaces (GitHub commit linking the deployer, blog post, IOTA-community channel).
`.trim(),
};
