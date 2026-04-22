import { ProjectDefinition } from '../project.interface';

export const ctrlvAgents: ProjectDefinition = {
  name: 'ctrlv AI Agents',
  layer: 'L1',
  category: 'Identity',
  subcategory: 'Framework',
  industries: ['AI'],
  description: 'On-chain AI-agent identity-registry pilot on IOTA Rebased. Single package shipping the `ctrlv_agent::AgentNFT` primitive with structured AI-agent metadata (`model` / `service` / `role` / `name` / `description` / `url`) and full lifecycle events (Mint / Transfer / Update / Burn). Each `AgentNFT` represents one tokenized AI agent — a bet on giving agents durable cross-service identity + reputation. Demo scale: 1 "Demo Agent" minted (`model: "Claude"`, `role: "Assistant"`, `service: "Customer Support"`). No public brand presence.',
  urls: [],
  teamId: 'studio-cebe',
  isCollectible: false,
  match: {
    deployerAddresses: ['0xcebec37ad6c05b7fa54344c0bc4dd7e0c340eab11e691f57bdf9f9ed0e75999a'],
    all: ['ctrlv_agent'],
  },
  countTypes: ['ctrlv_agent::AgentNFT'],
  attribution: `
Matches the single \`ctrlv_agent\`-module package on the studio-cebe deployer — \`0xbda68e9bff262135feaeb47e1111471789574e138a0d03b523fe95fda0e00269\`.

Struct set is a full CRUD lifecycle for an identity primitive: \`AgentNFT\` (\`store, key\`) + events \`AgentNFTMinted\` / \`AgentNFTTransferred\` / \`AgentNFTUpdated\` / \`AgentNFTBurned\`. The \`Updated\` event in particular is distinctive — most NFT collections don't let you mutate a token after mint, but an AI-agent profile that carries reputation / capability / model-version info plausibly does.

Sampled AgentNFT (the single "Demo Agent" minted so far):
\`\`\`
{ name: "Demo Agent",
  model: "Claude",
  service: "Customer Support",
  role: "Assistant",
  description: "An AI assistant specialized in customer support and general assistance",
  url: { url: "https://cdn.builtin.com/…/image from builtin.com" } }
\`\`\`

Field schema (\`name\` / \`model\` / \`service\` / \`role\` / \`description\` / \`url\`) is specifically AI-agent-shaped, not PFP-shaped. A dev prototyping "on-chain identity for AI agents" — interesting speculative primitive.

Match rule: \`deployerAddresses\` + \`all: ['ctrlv_agent']\` — pins deployer + module name.

\`isCollectible: false\` — functional identity primitive (speculative, but non-PFP), stays visible regardless of the "Hide collectibles" toggle. Category \`Identity\` since it's an identity-registry-shaped product; distinct from ObjectID's physical-goods DIDs and IOTA Names' human-readable address aliases.

Team \`studio-cebe\` is synthetic pending operator identification — "ctrlv" likely stylized "ctrl-v" (paste keyboard shortcut) but no site / Twitter / GitHub linking the deployer to a real product has surfaced.
`.trim(),
};
