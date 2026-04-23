import { Team } from '../team.interface';

export const boltEarth: Team = {
  id: 'bolt-earth',
  name: 'Bolt.Earth',
  description: 'India\'s largest EV charging network (founded 2017, Bengaluru, 100,000+ chargers across 1,800+ cities). Tokenizes real-world EV charging stations on IOTA Rebased as RealFi — on-chain shares, NFT ownership, and smart-contract-driven yield distribution.',
  urls: [{ label: 'Website', href: 'https://bolt.earth' }],
  deployers: [{ address: '0x1d4ec616351c6be450771d2b291c41579177218da6c5735f2c80af8661f36da3', network: 'mainnet' }],
  logo: '/logos/bolt-earth.ico',
  attribution: `
Gold-standard attribution via real-world location names baked into module identifiers — arguably the strongest single signal in the registry, because on-chain module names literally include real-world city names that match press coverage.

Our registry previously called this "Bolt Protocol", but the real team is **Bolt.Earth** — India's largest EV charging network, now tokenizing real-world charging stations on IOTA Rebased. Easy to confuse because there are three unrelated "Bolt Protocol" projects on other chains (Chainbound's Ethereum preconfirmation protocol at \`docs.boltprotocol.xyz\`, a Stacks/Bitcoin project, and Bolt Payments). Ours is none of those.

Public attestation:

- **Bolt.Earth** (\`bolt.earth\`) — India's largest EV charging network.
- **Partnership announcement:** IOTA + Bolt.Earth launched RealFi on IOTA's mainnet, tokenizing physical EV charging stations as on-chain shares with NFT-represented ownership and smart-contract-automated yield distribution. Press: \`cryptonews.net/news/altcoins/31874237/\`, \`mexc.co/news/501685\`.
- **Technical stack confirmation:** cryptonews.net explicitly states "Each of these stations has been registered and tokenized on-chain during the testing phase using the $IOTA Rebased Move VM."
- **Specific pilot locations named in press:** Mount Austin in Johor Bahru, Malaysia; Nottingham in the United Kingdom (Bolt.Earth's "first European pilot site").

On-chain: deployer \`0x1d4ec616351c6be450771d2b291c41579177218da6c5735f2c80af8661f36da3\` has published 1 package (\`0x7110f3deb0e1f78f15c81b38dca3ba7f23ecd34fa6b1f0ab4919f6a3054d56b9\`) with 11 modules:

\`\`\`
bolt
proxy
registry
shares
station
station_ecomajestic
station_majestic_labs
station_mount_austin   ← Mount Austin, Johor Bahru, Malaysia
station_nottingham     ← Nottingham, United Kingdom
tokenized_asset
unlock
\`\`\`

The decisive signal: module names \`station_mount_austin\` and \`station_nottingham\` are exactly the two pilot locations cryptonews names for Bolt.Earth's RealFi testnet-to-mainnet rollout. A coincidence on this specificity is not plausible. \`station_ecomajestic\` and \`station_majestic_labs\` are likely additional pilot operators/properties (EcoMajestic surfaces as a Malaysian township/residential brand — consistent with a second Malaysian charging location).

Supporting modules match the described product surface exactly: \`tokenized_asset\` (NFTs representing charger ownership), \`shares\` (on-chain shares in charging infrastructure), \`unlock\` (yield-distribution mechanics), \`registry\` + \`station\` (station registry abstraction), \`bolt\` (top-level brand module), \`proxy\` (upgrade-proxy pattern).

Triangulation:
- [x] Bolt.Earth publicly announced IOTA RealFi partnership.
- [x] Press coverage names specific pilot locations — on-chain modules are literally named after those locations.
- [x] Press coverage explicitly states the deployment uses IOTA Rebased Move VM.
- [x] Module signatures match the described RealFi architecture.
- [x] Only one deployer on IOTA mainnet ships this specific package signature.
`.trim(),
};
