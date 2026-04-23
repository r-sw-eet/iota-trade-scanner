import { Team } from '../team.interface';

/**
 * Rising Phoenix 2 Ltd — IOTA Foundation's BVI commercial wrapper company.
 * Registered at Trinity Chambers, PO Box 4301, Road Town, Tortola, British
 * Virgin Islands; privacy contact `privacy@iota.org` (IF's own email domain).
 *
 * Operates multiple on-chain products under distinct brands + domains:
 *
 *   - **IOTA Names** (`iotanames.com`) — `.iota` name service. Consumer-facing
 *     commercial product (governed by English law + LCIA arbitration).
 *   - **IOTA SPAM** (`iotaspam.io`) — experimental "Proof of Spam" coin
 *     protocol + SpamNFT PFP collection. Non-commercial / at-cost (governed
 *     by BVI law). Explicitly framed as an experimental sideline in its ToS.
 *
 * Both products have their own project rows on the dashboard; this team
 * captures them under one legal entity. Flagged `isIotaFoundationFamily: true`
 * so the "Hide IOTA Foundation" filter hides them together with IF-proper.
 *
 * **Shared deployer with IOTA Foundation.** The IOTA SPAM product ships from
 * deployer `0xd3906909…` which ALSO publishes IF's IOTA Link migration
 * commemorative NFT and 3 LayerZero OFT wrappers. Multi-team deployer claims
 * are supported in `ecosystem.service.ts` (same pattern as `studio-0a0d` +
 * `clawnera`); packages route correctly per-project via `packageAddresses` or
 * module-set rules.
 */
export const risingPhoenix2: Team = {
  id: 'rising-phoenix-2',
  name: 'Rising Phoenix 2 Ltd',
  isIotaFoundationFamily: true,
  description: 'IOTA Foundation\'s BVI commercial wrapper company (Trinity Chambers, Road Town, Tortola, British Virgin Islands; privacy contact `privacy@iota.org` = IF\'s own email domain). Provides the legal surface for multiple on-chain products: **IOTA Names** (`iotanames.com` — `.iota` name service; codebase IF-maintained at `iotaledger/iota-names`; governed by English law + LCIA) and **Spam Club** (`iotaspam.io` — a port of Polymedia\'s Sui "Proof of Spam" codebase to IOTA by GitHub user `trungtt198x`; RP2 provides the ToS wrapper; governed by BVI law). Different products, one legal entity. For Spam Club, RP2 is the legal operator only — not the codebase\'s author.',
  urls: [
    { label: 'IOTA Names', href: 'https://iotanames.com' },
    { label: 'IOTA Names docs', href: 'https://docs.iotanames.com' },
    { label: 'IOTA Names (GitHub)', href: 'https://github.com/iotaledger/iota-names' },
    { label: 'IOTA Names SDK (npm)', href: 'https://www.npmjs.com/package/@iota/iota-names-sdk' },
    { label: 'Spam Club', href: 'https://iotaspam.io' },
    { label: 'Spam Club IOTA port (trungtt198x fork)', href: 'https://github.com/trungtt198x/polymedia-spam/tree/dev' },
    { label: 'Spam Club upstream (Polymedia / Sui)', href: 'https://github.com/juzybits/polymedia-spam' },
  ],
  deployers: [
    // IOTA Names — single-product deployer, 6 packages, all `name_registration` modules.
    { address: '0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1', network: 'mainnet' },
    // Spam Club — 8 packages (spam/icon engine + SpamNFT PFP + mockcoin/
    // airdrop/test_nft/rebased_nft scaffolding). Port of Polymedia's Sui
    // Spam codebase by GitHub user `trungtt198x`; RP2 is the legal operator,
    // not the author. Deployer is SHARED with `iota-foundation` (IOTA Link
    // commemorative NFT) and the `layerZeroOft` aggregate (3 OFT wrappers).
    // Per-project routing resolves via `packageAddresses` / module-set
    // rules, so packages attribute correctly despite the shared deployer.
    { address: '0xd3906909a7bfc50ea9f4c0772a75bc99cd0da938c90ec05a556de1b5407bd639', network: 'mainnet' },
  ],
  // Split IOTA-mark logo — left half: black dots on white background; right
  // half: white dots on black. Visual signal that RP2 is IOTA-family but a
  // separate legal entity (BVI commercial wrapper) rather than IF-proper.
  // Projects on this team that want to show their own product icon
  // (e.g. IOTA Names) override via `ProjectDefinition.logo` / `logoWordmark`.
  logo: '/logos/rising-phoenix-2.svg',
  attribution: `
Rising Phoenix 2 Ltd runs as its own team rather than rolling up under \`iota-foundation\` because the on-chain operator is a separate legal entity with its own commercial + legal surface — but the entity is **IF-operated BVI structure**, not a truly independent third party. Flagged \`isIotaFoundationFamily: true\` so the "Hide IOTA Foundation" filter hides it together with IF-proper.

**Team semantics note (important):** RP2 is a legal-operator team, not a single-builder team. For **IOTA Names** the codebase is IF-authored (\`iotaledger/iota-names\`) AND RP2 is the legal operator — one-hand-washes-the-other IF-family product. For **Spam Club** the codebase is a fork of Polymedia's Sui Spam (upstream: \`juzybits/polymedia-spam\`) ported to IOTA by independent GitHub user \`trungtt198x\` (fork: \`trungtt198x/polymedia-spam\`, \`dev\` branch — linked directly from iotaspam.io's footer), with RP2 providing only the ToS legal wrapper. Treat this team as "the legal operator, whoever built the code" rather than "the builder of the products."

**Legal identity — Rising Phoenix 2 Ltd (BVI).** Consistent across both products' terms of service:

> *(IOTA Names ToS)* "Terms and Conditions ('Terms') govern your access to and use of the IOTA Names Service, offered by **Rising Phoenix 2 Ltd** ('IOTA Names', 'we', 'our', 'us' …)"*

> *(SPAM Webapp ToS)* "These terms of use … apply to your use of the SPAM Webapp ('SPAM' or 'Webapp') provided to you by the **Rising Phoenix 2 Ltd.** ('we', 'us' or 'ours')."*

Same legal entity, two products. Registered address (per IOTA Names ToS): **Trinity Chambers, PO Box 4301, Road Town, Tortola, British Virgin Islands**. Privacy contact: **privacy@iota.org** — sits on IOTA Foundation's own email domain, which anchors Rising Phoenix 2 Ltd as an IF-operated BVI wrapper rather than an independent licensee.

**Why BVI?** The combination is decisive — IF operates the entity as a legal wrapper rather than a partner/licensee. BVI incorporation is a common choice for crypto-commercial structures (minimal regulatory burden, tax-efficient, well-established commercial court precedent); different products can pair it with different governing-law + arbitration clauses depending on their commercial posture:

- **IOTA Names** — governed by English law, arbitrated under the LCIA Rules. Commercial, consumer-facing; neutral-forum choice aligns with its enterprise / trade-finance audience (see sample registrations: \`kenyaportsauthority.iota\`, \`hapaglloyd.iota\`, \`nnpc.iota\`).
- **IOTA SPAM** — governed by BVI law (no LCIA layer). Non-commercial / at-cost ("we do not receive any profit or financial benefit from its use … our total liability, if any, shall be limited to $0.00"); lighter legal apparatus matches the experimental posture.

**Product lineup (2026-04):**

| Product | Deployer | Packages | Codebase origin | Scope |
|---|---|---|---|---|
| IOTA Names | \`0xfc684adb…\` | 6 | IF-authored (\`iotaledger/iota-names\`) | Dedicated, single-product deployer |
| Spam Club | \`0xd3906909…\` | 8 | Ported from \`juzybits/polymedia-spam\` (Sui) by \`trungtt198x\` | Shared deployer (also \`iota-foundation\` IOTA Link + \`layerZeroOft\` wrappers) |

Each product has its own project row on the dashboard. Each carries the operator's branding (\`iotanames.com\` / \`iotaspam.io\`) rather than generic "Rising Phoenix 2" branding, so users find the products they're searching for.

**IF-adjacency signals** (why the team is not treated as independent):

- \`privacy@iota.org\` on BOTH products' privacy contact fields — IF's own email domain.
- IOTA Names source code hosted under the \`iotaledger\` GitHub org (\`github.com/iotaledger/iota-names\`, IF-maintained) and its SDK published under the reserved \`@iota/\` npm scope.
- IOTA Names app hero media loads from \`files.iota.org/media/iota-names/homepage_hero.mp4\` — IOTA Foundation's official CDN.
- IOTA Names mainnet v1 release (\`[Mainnet] iota-names v1\`, 2026-01-19, Apache-2.0) published directly from the IF GitHub repo with canonical Package ID \`0x6d2c743607ef275bd6934fe5c2a7e5179cca6fbd2049cfa79de2310b74f3cf83\`.
- Both apps' footers link into IOTA's official Discord (\`discord.iota.org\`).

**Pattern analogy.** Same structural shape as TWIN Foundation (Swiss sibling legal entity, IF-co-founded) and TLIP (IF × TMEA partnership brand) — IF-adjacent but with its own legal entity + domain + brand. Different from IF-proper products (Identity, Notarization, Traceability, Asset Framework, Accreditation, Chain primitives, Testing) which run under the \`iota-foundation\` team with no separate commercial operator.

**Why merged** (2026-04-22 edit). Previously registered as two separate teams (\`iota-names\` + \`iotaspam\`) with identical operator prose. Rising Phoenix 2 Ltd is one legal entity; the codebase pattern supports one-team-many-products (\`iota-foundation\` owns 13+ projects, \`studio-b8b1\` owns 6). The dashboard still surfaces IOTA Names + IOTA SPAM as distinct project rows under this team — the merge is at the operator/legal-entity level only, not at the product level.

**Logo** is a custom split treatment of the IOTA mark: left half rendered as black dots on a white background, right half as white dots on a black background (split line vertical, down the middle). Visual signal that Rising Phoenix 2 is IOTA-family but a separate legal entity (BVI commercial wrapper) rather than IF-proper — same semantic as the \`isIotaFoundationFamily: true\` flag but at a glance. Projects on this team override per-row when they want to surface their own product icon — IOTA Names pins its own icon + wordmark (\`/logos/iota-names.svg\` + \`/logos/iota-names-wordmark.svg\`); Spam Club pins its pixel-invader mascot cropped out of the live site wordmark (\`/logos/spam-club-alien.svg\`) for list-view icon + the full landscape wordmark from the site header (\`/logos/spam-club.svg\`) for the details page.

**Instrumentation observed** (IOTA Names webapp): Sentry error tracking at \`de.sentry.io\` (EU Sentry region; org \`o4508279186718720\`, project \`4510205355360337\`), Amplitude product analytics (EU + US endpoints). Consistent with a professionally-run EU-based operation.

**TODO:** look up the BVI Financial Services Commission registry for Rising Phoenix 2 Ltd's exact registration number + incorporation date; if accessible, may also surface directors / beneficial owners that confirm IF leadership.
`.trim(),
};
