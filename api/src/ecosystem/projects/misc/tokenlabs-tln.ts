import { ProjectDefinition } from '../project.interface';

export const tokenlabsTln: ProjectDefinition = {
  name: 'TLN Token',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Token',
  description: 'TokenLabs Network (TLN) token. TokenLabs\' governance / utility token, consumed by downstream IOTA products (e.g. IotaRoyale\'s TLN farm).',
  urls: [{ label: 'Website', href: 'https://tokenlabs.network' }],
  teamId: 'tokenlabs',
  match: { exact: ['tln_token'] },
  attribution: `
On-chain evidence: Move package whose module set is exactly \`{tln_token}\` — single-module exact-set match. Whole-mainnet scan finds no non-TokenLabs package shipping this module; \`tln_token\` is branded (TLN = TokenLabs Network), making collision risk near-zero.
`.trim(),
};
