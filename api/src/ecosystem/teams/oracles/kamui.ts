import { Team } from '../team.interface';

/**
 * Kamui (by Mangekyou Labs) — verifiable-randomness-function (VRF) service.
 * Multi-chain: flagship implementation on Solana, with `kamui-ink` port to Ink
 * (Coinbase's zkEVM L2). The IOTA deployment ships under the same
 * `kamui-<chain>` naming convention — on-chain module name `kamui_iota_vrf`.
 *
 * Attribution is circumstantial: no public blog post or GitHub repo specifically
 * claims the IOTA deployer, but the on-chain module naming and architectural
 * shape (coordinator + request + consumer pattern) matches Mangekyou Labs'
 * other VRF deployments exactly. Kept as named team on the strength of the
 * brand self-labelling in the module name; see project attribution for the
 * detailed evidence trail.
 */
export const kamui: Team = {
  id: 'kamui',
  name: 'Kamui (Mangekyou Labs)',
  description: 'Multi-chain verifiable random function (VRF) service by Mangekyou Labs. Flagship implementation on Solana; ports to additional chains under the `kamui-<chain>` naming convention (e.g. `kamui-ink` for Coinbase Ink zkEVM). On IOTA Rebased: one package at `0xc871ca37…` shipping the canonical VRF coordinator + request + demo-consumer pattern. Small footprint on-chain so far (6 events, 2 senders, 11 TXs) — likely a recent / early-stage deployment.',
  urls: [
    { label: 'Kamui on HackQuest', href: 'https://www.hackquest.io/projects/Kamui-GntkNn' },
    { label: 'Kamui (Solana, GitHub)', href: 'https://github.com/mangekyou-labs/kamui' },
    { label: 'kamui-ink (Ink port)', href: 'https://github.com/mangekyou-labs/kamui-ink' },
    { label: 'kamuipoc.vercel.app', href: 'https://kamuipoc.vercel.app' },
    { label: 'Mangekyou Labs GitHub', href: 'https://github.com/mangekyou-labs' },
  ],
  deployers: ['0xb5de96379d9eb22739de93b983de28b8c7cbbf8c8f0ddf1390c090f7f6eb74db'],
  attribution: `
On-chain self-labelling via the module name \`kamui_iota_vrf\` — brand-explicit naming that follows Mangekyou Labs' cross-chain convention (\`kamui\` on Solana, \`kamui-ink\` on Ink zkEVM L2, \`kamui_iota_vrf\` here on IOTA).

**Attribution chain:**

**1. GitHub organization — Mangekyou Labs.** The organization \`github.com/mangekyou-labs\` ships Kamui (Solana flagship, "Efficient Elliptic Curve VRF on Solana") plus \`kamui-ink\` ("VRF on Ink"), \`tengai-shinsei\` ("Movement VRF oracle"), and adjacent crypto-infrastructure projects (Susanoo zkML, Izanagi ZKML audit, Tsukuyomi shared-sequencer Celestia rollup, Oreka prediction markets). The naming convention is consistent across repos: each chain port sits under a chain-suffixed variant (\`kamui-ink\`, \`kamui-iota\`-style).

**2. Module-name match.** On-chain deployer \`0xb5de96379d9eb22739de93b983de28b8c7cbbf8c8f0ddf1390c090f7f6eb74db\` ships a single package \`0xc871ca37099f0d2fa47b4e9ed0b0b18b8f03cf9ac3bd3da60f5b788e69265126\` with 4 modules: \`coordinator\`, \`demo_consumer\`, \`kamui_iota_vrf\`, \`request\`. The \`kamui_iota_vrf\` module name is an explicit brand + chain label — the exact shape Mangekyou Labs uses for cross-chain ports.

**3. Architecture match.** The \`{coordinator, request, demo_consumer}\` module trio is the canonical Kamui VRF shape: \`coordinator::Coordinator\` holds the VRF config, \`coordinator::Subscription\` tracks per-consumer balances, \`request::RequestRecord\` logs each randomness request, \`demo_consumer::DemoConsumer\` is an example integration showing a dApp how to pull randomness. Compare with \`mangekyou-labs/kamui\`'s own Solana repo layout: \`kamui-program\`, \`example-vrf-game\`, \`crosschain-prover\` — the same coordinator / consumer-example / cross-chain-prover split.

**4. Public product surface.** Landing page \`kamuipoc.vercel.app\` (from the Solana repo's GitHub "homepage" field); primary contributor identified as "MrSufferer Kyler" (Mangekyou Labs). Product description: "first working elliptic curve VRF on Solana that fully verifies the proof on-chain."

**5. Not confirmed by direct on-chain self-attestation of the deployer address.** Mangekyou Labs has not (as of 2026-04-22) published a blog post, commit, or social post naming \`0xb5de9637…\` as the IOTA Kamui VRF deployer. Sign-in-required GitHub code search for \`kamui_iota_vrf\` cannot be performed anonymously. A public \`kamui-iota\` repo in the Mangekyou Labs org was also not visible from the anonymous org listing; either it lives in a private repo or it has been renamed (e.g. folded into a \`crosschain-prover\` subpath of the main \`kamui\` repo).

**Attribution confidence: strong circumstantial, short of [x] self-attestation.** The module-name + architectural + brand-naming-convention match is enough to land the attribution under the \`kamui\` brand with high confidence; the only alternative (someone unrelated copying Kamui's module structure AND name onto IOTA) is implausible given the \`_iota_vrf\` suffix follows the exact Mangekyou-Labs chain-suffix pattern.

Upgrade to [x] if (a) Mangekyou Labs publishes the IOTA deployment address in a future commit / blog post, (b) the \`kamuipoc.vercel.app\` UI adds an IOTA-specific page with a visible deployer reference, or (c) direct confirmation surfaces via IOTA Discord / community channels.

**Not IF, not IF-family.** Mangekyou Labs is an independent crypto-infrastructure dev shop covering Solana + multi-chain randomness, not IOTA Foundation. \`isIotaFoundationFamily\` unset — filter behavior unchanged.

**Low on-chain activity (6 events, 2 senders, 11 TXs).** Consistent with a recently-deployed infrastructure primitive in early-adopter testing. Dashboard ranking will surface low; that's correct for the current-state reality.
`.trim(),
};
