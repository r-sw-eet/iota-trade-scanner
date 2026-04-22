import { ProjectDefinition } from '../project.interface';

export const clawnera: ProjectDefinition = {
  name: 'Clawnera',
  layer: 'L1',
  category: 'Misc',
  description: 'API-first bot-to-bot marketplace on IOTA — bots post tasks, bid, bind escrow, deliver, and settle through authenticated endpoints. On-chain commerce stack covers listings, bidding, orders, milestone-based payments, reputation, reviews, mutual cancellation, and quorum-voted dispute resolution. Settlement in IOTA (2%) or CLAW (0%). Operated by GitHub user Moron1337 (Studio 0x0a0d).',
  urls: [
    { label: 'Clawnera', href: 'https://clawnera.com' },
    { label: 'X', href: 'https://x.com/clawnera' },
    { label: 'clawnera-bot-market (npm)', href: 'https://www.npmjs.com/package/clawnera-bot-market' },
    { label: 'clawnera-bot-market (GitHub)', href: 'https://github.com/Moron1337/clawnera-bot-market' },
  ],
  teamId: 'clawnera',
  logo: '/logos/clawnera.png',
  match: { all: ['dispute_quorum', 'escrow'] },
  attribution: `
On-chain evidence: Move package with both \`dispute_quorum\` and \`escrow\` modules. 15-module commerce marketplace shipped from the Studio 0a0d deployer — full module set: \`admin, bond, deadline_ext, dispute_quorum, escrow, listing_deposit, manifest_anchor, milestone_escrow, mutual_cancel, order_escrow, order_mailbox, payment_assets, reputation, review, rewards, tier\`.

**Brand self-identification.** Landing page at [\`clawnera.com\`](https://clawnera.com) markets as "Clawnera | Bot-to-bot marketplace on IOTA" — API-first marketplace where bots post tasks, bid, bind escrow, deliver, and settle through authenticated endpoints. Settlement fees per the live site: \`IOTA 2% — CLAW 0%\`. Helper CLI distributed via npm as [\`clawnera-bot-market\`](https://www.npmjs.com/package/clawnera-bot-market).

**Operator attribution.** CLAWNERA is the marketplace brand of GitHub user \`Moron1337\`. Decisive evidence: the \`clawnera-bot-market\` README (MIT-licensed, v0.1.97 of 2026-04-15) embeds the exact on-chain type \`0x7a38b9af32e37eb55133ec6755fa18418b10f39a86f51618883aa5f466e828b6::claw_coin::CLAW_COIN\` of Studio 0a0d's \`claw_coin\` package. The repo's workflow (seller / buyer / request-buyer / request-seller / reviewer / operator + listings + bids + orders + juror voting + dispute evidence) maps module-for-module to this package's 15-module signature.

Per the CLAWNERA repo README: "Open-source knowledge base and CLI for bots and operators using the CLAWNERA marketplace." Supports seller, buyer, request-buyer, request-seller, reviewer, operator journeys; listings, bidding, orders, dispute evidence handling, juror voting. Settlement assets: IOTA and CLAW (TokenLabs-adjacent meme coin).

**Scope note.** This project row surfaces the **marketplace** specifically — the bot-to-bot commerce stack at \`clawnera.com\`. Sibling Clawnera-ecosystem products on the same team are tracked as separate rows: the CLAW swap gateway (\`claw_swap_gateway\`) and the SPEC launchpad (\`spec_sale_*\`). The \`claw_coin\` / \`spec_coin\` token-type packages themselves are captured by the appropriate token aggregates rather than this marketplace row.

Previously registered as a generic "Marketplace Escrow" with anonymous "Studio 0x0a0d4c9a" team — renamed 2026-04-20 to surface the Clawnera brand explicitly on the dashboard and promoted to a named \`clawnera\` team on the same day. The underlying match rule (\`dispute_quorum\` + \`escrow\` in the same package) is unchanged, so all prior snapshots continue to resolve to this row.
`.trim(),
};
