import { Team, TeamDeployer } from './team.interface';

import { poolsFinance, virtue, swirl, cyberperp, iotaroyale, magicsea, studio6ff4, studioB9cf } from './defi/_index';
import { tlip, twinFoundation, salus, seedlot } from './trade/_index';
import { objectid, turingcerts } from './identity/_index';
import { echoProtocol, layerzero, wormholeFoundation } from './bridges/_index';
import { switchboard, kamui } from './oracles/_index';
import { tradeport, iotaPunks, apeDao, studio2cd3 } from './nft/_index';
import { iotaFlip, gamifly, lostCrusader } from './games/_index';
import { iotaFoundation, studioB8b1, studio0a0d, studioCb69, studio295e, studio5451, studio49c4, studiob5fc, studio457d, studiocebe, studioB30c, clawnera, izipublish, liquidlink, boltEarth, tokenlabs, risingPhoenix2 } from './misc/_index';

/**
 * Team registry. Every project references exactly one team via `teamId`.
 *
 * A team groups:
 * - a real-world entity (IOTA Foundation, Virtue, Salus, …) OR an anonymous
 *   but observably-distinct developer (identified only by deployer address)
 * - one or more mainnet addresses that publish its packages
 * - one or more projects in the scanner
 *
 * Aggregate projects (NFT Collections, LayerZero OFT) have `teamId: null`
 * because they represent unrelated third-party deployments.
 */
export const ALL_TEAMS: Team[] = [
  // DeFi
  poolsFinance,
  virtue,
  swirl,
  cyberperp,
  iotaroyale,
  magicsea,
  // Virtue-adjacent synthetic studios (Virtue-points primitive and a
  // multi-asset bank on neighbouring deployers). See team attribution for
  // why they're tied to Virtue thematically but kept as their own synthetic
  // teams pending Virtue's direct self-attestation.
  studio6ff4, studioB9cf,

  // Trade
  tlip, twinFoundation, salus,
  // Seedlot — SEEDLOT PTE. LTD. (Singapore). Third-party coffee-RWA startup
  // running the Lake Toba Collective pilot in North Sumatra. First RWA /
  // Agriculture project on the site.
  seedlot,

  // Identity
  objectid, turingcerts,

  // Bridges
  echoProtocol, layerzero, wormholeFoundation,

  // Oracles
  switchboard, kamui,

  // NFT
  tradeport, iotaPunks, apeDao,
  // Synthetic studio behind the "Number 1 Collection" FreeNFT campaign
  // (1.04M unique senders, biggest on-chain campaign on IOTA Rebased).
  studio2cd3,

  // Games
  iotaFlip, gamifly,
  // Lost Crusader — Q1 2026 IOTA mainnet grant-phase MMO with daily
  // Arcane Dust + Revive Spell mechanics.
  lostCrusader,

  // IOTA Foundation (consolidated: chain primitives + Identity + Notarization +
  // Traceability + Asset Framework + Accreditation + Testing).
  // `rising-phoenix-2` (IOTA Names + IOTA SPAM) shares the `0xd3906909…`
  // deployer with `iota-foundation` (iotaLink) and `layerZeroOft` (OFT
  // wrappers) — declared before `iota-foundation` so team-deployer routing
  // (first-match-wins) prefers the more-specific RP2 team for SPAM's packages;
  // IF's own packages on that deployer still resolve via their `packageAddresses`
  // pins (iotaLink) or module-set rules (LayerZero OFT, ifTesting routing).
  risingPhoenix2,
  iotaFoundation,

  // Misc — anonymous studios + single-project teams.
  // `clawnera` and `studio-0a0d` are sibling teams (shared operator Moron1337
  // / shared deployer keys / different product brands). Both claim the shared
  // deployers — the routing code at `ecosystem.service.ts` splitByDeployer
  // iterates all claiming teams, so the overlap is explicitly supported.
  studioB8b1, studio0a0d, clawnera, studioCb69, studio295e, studio5451, studio49c4,
  studiob5fc, studio457d, studiocebe, studioB30c,
  izipublish, liquidlink, boltEarth, tokenlabs,
];

/** Look up a team by its id. Returns undefined if not found. */
export function getTeam(id: string | null | undefined): Team | undefined {
  if (!id) return undefined;
  return ALL_TEAMS.find((t) => t.id === id);
}

/**
 * Find the team that claims the given deployer address on the given network
 * (lowercased compare on address). `network` defaults to `'mainnet'` — every
 * pre-existing call site is mainnet, and keypairs don't carry across networks
 * (see `TeamDeployer`), so network-aware lookup is a strict extension.
 */
export function getTeamByDeployer(
  address: string,
  network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet',
): Team | undefined {
  const lower = address.toLowerCase();
  return ALL_TEAMS.find((t) =>
    t.deployers.some((d) => d.network === network && d.address.toLowerCase() === lower),
  );
}

export { Team, TeamDeployer };
