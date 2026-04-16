import { ProjectDefinition } from './project.interface';

import { poolsFinance, poolsFarming, virtue, virtueStability, virtuePool, swirl, swirlValidator } from './defi/_index';
import { tlip, notarization, traceability, salus } from './trade/_index';
import { identityFull, identityWot, oidIdentity, credentials } from './identity/_index';
import { ibtcBridge, layerZero, layerZeroOft, wormhole } from './bridges/_index';
import { pythOracle, switchboardOracle } from './oracles/_index';
import { nftLaunchpad, tradeport, nftCollections } from './nft/_index';
import { chess, ticTacToe, game2048, gambling } from './games/_index';
import { marketplaceEscrow, vault, tokenSale, easyPublish, giftDrop, pointsSystem, boltProtocol, staking } from './misc/_index';

/**
 * All known project definitions, ordered by match priority.
 * More specific matches (exact, more required modules) come first.
 */
export const ALL_PROJECTS: ProjectDefinition[] = [
  // DeFi
  poolsFinance, poolsFarming,
  virtue, virtueStability, virtuePool,
  swirl, swirlValidator,

  // Trade / Enterprise
  tlip, notarization, traceability, salus,

  // Identity (identityFull before identityWot — more specific)
  identityFull, identityWot, oidIdentity, credentials,

  // Bridges
  ibtcBridge, layerZero, layerZeroOft, wormhole,

  // Oracles
  pythOracle, switchboardOracle,

  // NFT (nftLaunchpad before nftCollections — more specific)
  nftLaunchpad, tradeport, nftCollections,

  // Games
  chess, ticTacToe, game2048, gambling,

  // Misc
  marketplaceEscrow, vault, tokenSale, easyPublish,
  giftDrop, pointsSystem, boltProtocol, staking,
];

export { ProjectDefinition };
