import { Team } from '../team.interface';

export const iotaFlip: Team = {
  id: 'iota-flip',
  name: 'IOTA Flip',
  description: 'On-chain coin flip, roulette, and raffle contracts. Anonymous operator (NL-based, shared hosting on Mijndomein + Netlify free tier) — product is live at iotaflip.netlify.app, team identity is deliberately pseudonymous.',
  urls: [{ label: 'App', href: 'https://iotaflip.netlify.app' }],
  deployers: [{ address: '0xbe95685023788ea57c6633564eab3fb919847ecd1234448e38e8951fbd4b6654', network: 'mainnet' }],
  attribution: `
Product verified via \`iotaflip.netlify.app\` + Move module struct names embedding \`IotaFlipHouse\` / \`IotaFlipRouletteHouse\`. Operator identity remains anonymous: domain \`iotaflip.com\` registered 2024-11-18 via Mijndomein/Metaregistrar (NL), no About page, no GitHub, no audit, no ToS, no contact email anywhere on the site or in the SvelteKit bundle or on-chain metadata. Shared-hosting + Netlify free-tier footprint is consistent with a solo dev or very small team. "IOTA Flip" is the branded product name; we do not attribute it to a named real-world entity.
`.trim(),
};
