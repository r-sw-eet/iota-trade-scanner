import { ProjectDefinition } from '../project.interface';

export const vault: ProjectDefinition = {
  name: 'Vault',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Vault',
  description: 'Token vault contracts on IOTA Rebased — custody and controlled access to pooled tokens, used as building blocks by other DeFi protocols. Multiple variants shipped from Studio 0xb8b1380e, each with its own VaultManager object owned by a distinct creator address.',
  urls: [],
  teamId: 'studio-b8b1',
  match: { exact: ['vault'] },
  attribution: `
On-chain evidence: Move package whose module set is exactly \`{vault}\` — single module, nothing else. Exact-set match restricts the rule to narrow single-module vault packages (a generic name like \`vault\` would false-match many unrelated contracts if we used \`all\` instead of \`exact\`).

Studio 0xb8b1380e publishes multiple \`vault\` variants — each creator gets their own VaultManager object (seen in live-object inspection), which is consistent with the studio's dev-shop / multi-tenant pattern where third parties deploy the \`vault\` package per-use. Part of the studio's infrastructure-utility portfolio alongside \`gas_station\` and \`giftdrop_iota\`.
`.trim(),
};
