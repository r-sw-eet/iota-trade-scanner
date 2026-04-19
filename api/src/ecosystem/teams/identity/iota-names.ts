import { Team } from '../team.interface';

export const iotaNames: Team = {
  id: 'iota-names',
  name: 'IOTA Names',
  isIotaFoundationFamily: true,
  description: 'Operator of the `.iota` name service at `iotanames.com`. Per the Terms of Service: "the IOTA Names Service, offered by Rising Phoenix 2 Ltd" — a British Virgin Islands-registered company (Trinity Chambers, PO Box 4301, Road Town, Tortola) with **`privacy@iota.org` as its privacy contact**, i.e. IF\'s own email domain. Governed by English law, arbitrated under the LCIA Rules. Codebase is IF-maintained at `iotaledger/iota-names`; SDK under the reserved `@iota/` npm scope; hero media on `files.iota.org`. This is IF\'s commercial BVI wrapper for the name-service product rather than a truly independent third party — flagged `isIotaFoundationFamily: true` so it hides with the IF toggle.',
  urls: [
    { label: 'App', href: 'https://iotanames.com' },
    { label: 'Docs', href: 'https://docs.iotanames.com' },
    { label: 'GitHub', href: 'https://github.com/iotaledger/iota-names' },
    { label: 'SDK (npm)', href: 'https://www.npmjs.com/package/@iota/iota-names-sdk' },
  ],
  deployers: ['0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1'],
  logo: '/logos/iota-names.svg',
  logoWordmark: '/logos/iota-names-wordmark.svg',
  attribution: `
IOTA Names runs as its own team rather than rolling up under \`iota-foundation\` because the on-chain operator is a separate legal entity with its own commercial + legal surface — but the entity is **IF-operated BVI structure**, not a truly independent third party. Flagged \`isIotaFoundationFamily: true\` so the "Hide IOTA Foundation" filter hides it together with IF-proper.

**Operator:** per the Terms of Service + Privacy Policy at \`iotanames.com\`:

> *"Terms and Conditions ('Terms') govern your access to and use of the IOTA Names Service, offered by **Rising Phoenix 2 Ltd** ('IOTA Names', 'we', 'our', 'us' …)"*

> *Registered address: **Trinity Chambers, PO Box 4301, Road Town, Tortola, British Virgin Islands**.*
>
> *Privacy contact: **privacy@iota.org**.*

and governing law + arbitration:

> *"These Terms and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with them or their subject matter shall be governed by and construed in accordance with the laws of England and Wales."*

with arbitration under the **LCIA Rules** (London Court of International Arbitration).

**Why the "IF-operated BVI wrapper" read:** the combination is decisive — the privacy contact \`privacy@iota.org\` sits on IOTA Foundation's own email domain, not on a Rising-Phoenix-specific one. That's not the posture of a partner or third-party licensee; it's the posture of a legal wrapper that IF operates. BVI incorporation is a very common choice for crypto-commercial structures (minimal regulatory burden, tax-efficient, well-established commercial court precedent); English law + LCIA arbitration is the conventional neutral-forum choice that BVI entities typically pair with. Explains why the name didn't show up in UK Companies House — it was never a UK entity.

**Why it's still its own team** rather than folded into \`iota-foundation\`: IOTA Foundation (\`iota-foundation\`) is the non-profit foundation that builds the chain-primitive / Identity / Notarization / Traceability / Asset Framework / Accreditation stack. IOTA Names is a *commercial service* offered via a BVI wrapper — different legal vehicle, different operational posture, own domain, own brand, own ToS, own arbitration clause. Keeping it on a distinct team row surfaces that structural difference on the dashboard without having to read prose; the \`isIotaFoundationFamily\` flag ensures it still hides together with IF when users filter on the Hide-IF toggle.

**IF-adjacency signals** (why it's not standalone anonymous either):
- Source code lives at [\`github.com/iotaledger/iota-names\`](https://github.com/iotaledger/iota-names) — the \`iotaledger\` GitHub org is IF-maintained; third-party projects don't publish into it.
- SDK at \`@iota/iota-names-sdk\` — the \`@iota/\` npm scope is reserved for IF-published packages.
- App hero media loads from \`files.iota.org/media/iota-names/homepage_hero.mp4\` + \`…/homepage_hero_poster.jpg\` — IOTA Foundation's official CDN.
- Mainnet v1 GitHub release \`[Mainnet] iota-names v1\` (2026-01-19, Apache-2.0) published directly from the IF repo, publishing canonical Package ID \`0x6d2c743607ef275bd6934fe5c2a7e5179cca6fbd2049cfa79de2310b74f3cf83\` + registry Object IDs.
- App footer / header links into IOTA's official Discord (\`discord.iota.org\`).

**Pattern analogy:** same shape as TWIN Foundation (Swiss sibling legal entity, IF-co-founded) and TLIP (IF × TMEA partnership brand) — IF-adjacent but with its own legal entity + domain + brand. Different from IF-proper products (Identity, Notarization, Traceability, Asset Framework, Accreditation, Chain primitives) which run under the \`iota-foundation\` team with no separate commercial operator.

**On-chain footprint:** 6 packages at deployer \`0xfc684adb479789acb754d98b952deb46dbbeeaa9cb6d431b95c8f7d72e893af1\`. All packages contain a \`name_registration\` module; sampled \`NameRegistration\` objects carry \`name_str\` fields ending in \`.iota\` (\`nnpc.iota\`, \`kenyaportsauthority.iota\`, \`hapaglloyd.iota\`, \`onchainidentity.iota\`, \`web3.iota\`, …). Deployer footprint is exclusively \`name_registration\` modules — clean single-product team.

**Instrumentation observed in the webapp:** Sentry error tracking at \`de.sentry.io\` (EU Sentry region; org \`o4508279186718720\`, project \`4510205355360337\`), Amplitude product analytics (EU + US endpoints). Consistent with a professionally-run EU-based operation.

**Logo sources:** icon + wordmark SVG extracted from the live header via Playwright render of \`iotanames.com\` (the logo is inline SVG, not a distributable asset file). Saved to \`website/public/logos/iota-names.svg\` (icon-only) and \`iota-names-wordmark.svg\` (full "IOTA NAMES" lockup). Original site renders them in white (\`text-names-primary-100\`); \`fill="currentColor"\` preserved so the dashboard can style them.

**TODO:** look up the BVI Financial Services Commission registry for Rising Phoenix 2 Ltd's exact registration number + incorporation date; if accessible, may also surface directors / beneficial owners that confirm IF leadership.
`.trim(),
};
