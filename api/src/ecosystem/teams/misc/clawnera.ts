import { Team } from '../team.interface';

export const clawnera: Team = {
  id: 'clawnera',
  name: 'Clawnera',
  description: 'CLAWNERA — API-first bot-to-bot marketplace on IOTA. Operated by GitHub user Moron1337; sibling products (CLAW meme-coin + swap gateway, SPEC launchpad) ship from the same deployer keys but are tracked under the sibling `studio-0a0d` team since they carry their own product brands. Meme-coin adjacent; one-person / small-community operation with public presence via the Spec Weekly YouTube channel and the IOTA Discord `#speculations` channel.',
  urls: [
    { label: 'Clawnera', href: 'https://clawnera.com' },
    { label: 'X', href: 'https://x.com/clawnera' },
    { label: 'GitHub (Moron1337)', href: 'https://github.com/Moron1337' },
    { label: 'CLAW sale', href: 'https://buy.claw-coin.com' },
    { label: 'SPEC sale', href: 'https://buy.spec-coin.cc' },
  ],
  deployers: [
    { address: '0x0a0d4c9a9f935dac9f9bee55ca0632c187077a04d0dffcc479402f2de9a82140', network: 'mainnet' },
    { address: '0x4468c8ddb42728fd1194033c1dd14ffd015f0d81e4b5329ddc11793c989f3f39', network: 'mainnet' },
  ],
  logo: '/logos/clawnera.png',
  attribution: `
Previously 🟠 UNVERIFIED and tracked as a synthetic \`studio-0a0d\` label; hard-linked 2026-04-18 via downstream-dependency scan + coin-metadata icon probing, and promoted to a named \`clawnera\` team 2026-04-20 once the operator signalled that public surfacing under the Clawnera brand is wanted.

Scanning all 747 mainnet packages for \`linkage\` pointing at this team's packages returned zero external downstream customers — but the reverse direction broke the case. Three \`spec_sale_v2\` packages depend on \`spec_coin\` at a DIFFERENT deployer (\`0x4468c8ddb42728fd1194033c1dd14ffd015f0d81e4b5329ddc11793c989f3f39\`, SPEC-coin-only, 2 packages) — logically the same team using a dedicated token key. Both deployers are now registered on this team.

Chain of evidence:

1. SPEC CoinMetadata icon URL: \`raw.githubusercontent.com/Moron1337/SPEC/main/Spec.png\`.
2. CLAW CoinMetadata icon URL: \`raw.githubusercontent.com/Moron1337/CLAW/main/logo/claw.png\`.
3. GitHub user \`Moron1337\` has 4 public repos: \`SPEC\`, \`CLAW\`, \`openclaw-iota-wallet\`, **\`clawnera-bot-market\`** — the shared GitHub account is what links the three product brands together.
4. \`clawnera-bot-market\` README (MIT-licensed, v0.1.97 of 2026-04-15) embeds the exact on-chain type \`0x7a38b9af32e37eb55133ec6755fa18418b10f39a86f51618883aa5f466e828b6::claw_coin::CLAW_COIN\` — which is one of this team's packages. **Direct contract-address match in an MIT-licensed README** — strongest possible single attribution signal.
5. The repo's workflow (seller / buyer / request-buyer / request-seller / reviewer / operator + listings + bids + orders + juror voting + dispute evidence) maps module-for-module to the team's 15 commerce packages: \`order_escrow\`, \`dispute_quorum\`, \`manifest_anchor\`, \`reputation\`, \`review\`, \`tier\`, \`milestone_escrow\`, \`bond\`, \`deadline_ext\`, \`escrow\`, \`listing_deposit\`, \`mutual_cancel\`, \`order_mailbox\`, \`payment_assets\`, \`rewards\`, \`admin\`.
6. Both tokens use 1,337-based max supply (SPEC: 1.337e12, CLAW: 1.337e19 = 1337 × 10^16 at 6 decimals) — meme-coin / leet numerology signature consistent with a single operator.

**Scope of this team.** Only the **CLAWNERA marketplace** rolls up under this team. Sibling Moron1337 products live on the **\`studio-0a0d\`** team and share the same deployer keys:

- **[Clawnera](https://clawnera.com) marketplace** — this team. On-chain commerce stack matched via \`dispute_quorum\` + \`escrow\` module pair.
- **CLAW Swap Gateway** — sibling team \`studio-0a0d\` (module \`claw_swap_gateway\`).
- **SPEC Launchpad** — sibling team \`studio-0a0d\` (modules \`spec_sale_multicoin\`, \`spec_sale_v2\`).

Both teams claim the deployer keys so that \`anomalousDeployers\` detection resolves correctly on either side. The \`splitByDeployer\` routing at \`ecosystem.service.ts\` already iterates all teams claiming a deployer, so the overlap is explicitly supported (same pattern as \`0x164625aa…\` being on both TWIN and iota-foundation).

**Operator:** GitHub user [\`Moron1337\`](https://github.com/Moron1337). **Public presence:** [Clawnera X account](https://x.com/clawnera), Spec Weekly YouTube channel (\`youtube.com/c/SpecWeekly\`, tagline "Speculation for IOTA, Shimmer, and Crypto degenerates") + IOTA Discord \`#speculations\`. **Company:** no formal team — reads as a one-person / small community-run meme-coin project.
`.trim(),
};
