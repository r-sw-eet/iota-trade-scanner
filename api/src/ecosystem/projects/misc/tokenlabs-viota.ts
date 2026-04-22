import { ProjectDefinition } from '../project.interface';

export const tokenlabsVIota: ProjectDefinition = {
  name: 'TokenLabs Liquid Staking (vIOTA)',
  layer: 'L1',
  category: 'DeFi',
  subcategory: 'Liquid Staking',
  description: 'TokenLabs\' liquid staking product. Users stake IOTA and receive vIOTA, an LST that accrues validator rewards while remaining liquid. **Second liquid-staking protocol on IOTA Rebased** alongside Swirl\'s stIOTA.',
  urls: [{ label: 'Website', href: 'https://tokenlabs.network' }],
  teamId: 'tokenlabs',
  match: { packageAddresses: [
    '0xe4abf8b6183c106282addbfb8483a043e1a60f1fd3dd91fb727fa284306a27fd', // vIOTA v1
    '0x6ab984dfae09bbef27551765622a85f461e0b46629eee60807b6e5399c0f7f0f', // vIOTA v2 upgrade
  ] },
  attribution: `
On-chain evidence: two exact package addresses at TokenLabs' admin/operator deployer \`0x5555679093281ffa85c51c24b55fc45ff0f1bb6a57c0bee2c61eae3d5b54ae7c\` — the vIOTA v1 and v2 packages. Both carry the module set \`{cert, math, native_pool, ownership, validator_set}\`.

Pinned by address rather than module signature because \`{cert, math, native_pool, ownership, validator_set}\` false-positively matches **9 non-TokenLabs packages** on mainnet (confirmed via whole-mainnet scan). Deployers \`0x119191cd04c303b5cd872868a1898fe205c1eb9eaee9fb97c1ee87c943e40066\` and \`0x13b068af67f69cc9d4f85f33af1ad5d2d5800b4e8148e3c6a9a39bb018a73040\` publish unrelated packages with the same 5-module shape. Accept the cost of updating this def when TokenLabs ships a vIOTA v3; the alternative (a module-based rule) would silently mis-attribute 9 other packages.

**Liquid-staking landscape**: TokenLabs' vIOTA is the second LST on IOTA. Before this pass our registry surfaced only Swirl; both now show up, making IOTA's two-LST reality legible on the site.

A related dead def — "Swirl Validator" \`{all: [cert, native_pool, validator]}\` — was dropped in the same pass. That rule matched zero packages on mainnet: TokenLabs uses \`validator_set\` (plural), not \`validator\`; Swirl itself doesn't publish these modules at all. The def was speculative when authored.
`.trim(),
};
