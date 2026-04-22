import { ProjectDefinition } from '../project.interface';

export const iotaFlip: ProjectDefinition = {
  name: 'IOTA Flip',
  layer: 'L1',
  category: 'Game',
  subcategory: 'GambleFi',
  description: 'On-chain coin flip, roulette, and raffle contracts on IOTA Rebased. Uses verifiable randomness for fair outcomes; all bets and results settle on-chain.',
  urls: [{ label: 'App', href: 'https://iotaflip.netlify.app' }],
  teamId: 'iota-flip',
  match: { any: ['iota_flip', 'roulette', 'raffle'] },
  attribution: `
On-chain evidence: Move package containing at least one of \`iota_flip\`, \`roulette\`, or \`raffle\` — the three game modules the IOTA Flip operator has shipped.

Previously registered as "Gambling / IOTA Flip / Roulette" (bi-branded). Dropped the \`Gambling\` descriptor and the slash — the product brand is IOTA Flip. \`iotaflip.netlify.app\` is live, and module struct names embed \`IotaFlipHouse\` / \`IotaFlipRouletteHouse\`, making the brand attribution trivial. Widened the module predicate to \`any\` so the standalone raffle package (previously uncaptured) lands in this row too. Operator identity is pseudonymous (see team attribution).
`.trim(),
};
