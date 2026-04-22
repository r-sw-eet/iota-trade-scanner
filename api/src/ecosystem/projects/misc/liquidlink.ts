import { ProjectDefinition } from '../project.interface';

export const liquidlink: ProjectDefinition = {
  name: 'LiquidLink',
  layer: 'L1',
  category: 'Social',
  subcategory: 'Incentive',
  description: 'On-chain points, loyalty, and profile system on IOTA Rebased. LiquidLink\'s IOTA-native front door (iota.liquidlink.io) lets projects attach verifiable engagement scores to user profiles.',
  urls: [
    { label: 'Website', href: 'https://www.liquidlink.io' },
    { label: 'IOTA app', href: 'https://iota.liquidlink.io' },
  ],
  teamId: 'liquidlink',
  match: { deployerAddresses: ['0xd6a54ff7f851b58c19729c11d210d46fd46d702b9d9caff78747de1914c934ee'] },
  attribution: `
Previously registered as "Points System" based on the \`{constant, event, point, profile}\` exact-module-set. Verified as LiquidLink via \`iota.liquidlink.io\`, the product's IOTA-specific subdomain that calls into this deployer's packages.

Match rule switched from the 4-module exact set (which only caught the original v1 packages — 4 of 11) to a deployer-based rule: everything published by LiquidLink's single known deployer. The 11-package footprint covers the original core, two refactored v2 packages with \`{core, events}\`, utility packages, and three profile-with-like variants; all published from \`0xd6a54ff7f851b58c19729c11d210d46fd46d702b9d9caff78747de1914c934ee\`.
`.trim(),
};
