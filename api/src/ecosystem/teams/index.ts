import { Team } from './team.interface';

import { poolsFinance, virtue, swirl, cyberperp, iotaroyale } from './defi/_index';
import { tlip, twinFoundation, salus } from './trade/_index';
import { objectid } from './identity/_index';
import { echoProtocol, layerzero, wormholeFoundation } from './bridges/_index';
import { switchboard } from './oracles/_index';
import { tradeport } from './nft/_index';
import { iotaFlip } from './games/_index';
import { iotaFoundation, studioB8b1, studio0a0d, studioCb69, izipublish, liquidlink, boltEarth, tokenlabs } from './misc/_index';

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

  // Trade
  tlip, twinFoundation, salus,

  // Identity
  objectid,

  // Bridges
  echoProtocol, layerzero, wormholeFoundation,

  // Oracles
  switchboard,

  // NFT
  tradeport,

  // Games
  iotaFlip,

  // IOTA Foundation (consolidated: chain primitives + Identity + Notarization +
  // Traceability + Asset Framework + Accreditation + Testing)
  iotaFoundation,

  // Misc — anonymous studios + single-project teams
  studioB8b1, studio0a0d, studioCb69,
  izipublish, liquidlink, boltEarth, tokenlabs,
];

/** Look up a team by its id. Returns undefined if not found. */
export function getTeam(id: string | null | undefined): Team | undefined {
  if (!id) return undefined;
  return ALL_TEAMS.find((t) => t.id === id);
}

/** Find the team that claims the given deployer address (lowercased compare). */
export function getTeamByDeployer(address: string): Team | undefined {
  const lower = address.toLowerCase();
  return ALL_TEAMS.find((t) => t.deployers.some((d) => d.toLowerCase() === lower));
}

export { Team };
