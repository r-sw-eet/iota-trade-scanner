import { ProjectDefinition } from './project.interface';

import { poolsFinance, virtue, virtueStabilityPool, swirl, swirlV1, cyberperp, iotaroyale } from './defi/_index';
import { tlip, twinImmutableProof, notarization, iotaAssetFramework, iotaAccreditationRegistry, traceability, salus } from './trade/_index';
import { identityFull, identityWot, objectid, credentials, iotaNames } from './identity/_index';
import { echoProtocolBridge, layerZero, layerZeroOft, wormhole } from './bridges/_index';
import { pythOracle, switchboardOracle } from './oracles/_index';
import { nftLaunchpad, tradeport, nftCollections } from './nft/_index';
import { chess, ticTacToe, game2048, iotaFlip } from './games/_index';
import {
  marketplaceEscrow, vault, tokenSale, izipublish, giftDrop, liquidlink, boltEarth,
  tokenlabsStaking, tokenlabsVIota, tokenlabsTln, tokenlabsPayment,
  nativeStaking, iotaFramework, ifTesting,
} from './misc/_index';

/**
 * All known project definitions, ordered by match priority.
 * More specific matches (exact, more required modules) come first.
 */
export const ALL_PROJECTS: ProjectDefinition[] = [
  // DeFi
  poolsFinance,
  // Stability Pool first — its module-pair rule {all: [balance_number, stability_pool]}
  // is more specific than `virtue`'s deployer catch-all, so it wins for the
  // single Stability Pool package and the rest of Virtue's deployer's packages
  // fall through to `virtue`.
  virtueStabilityPool, virtue,
  // Swirl V2 before Swirl V1 so the current product carries the DefiLlama
  // TVL under the existing first-wins dedup. Deployers are disjoint so match
  // order is otherwise irrelevant.
  swirl, swirlV1,
  cyberperp, iotaroyale,

  // Trade / Enterprise
  // TLIP and TWIN keep priority above IF Asset Framework / Accreditation to
  // preserve the shared-deployer split at `0x164625aa…` (TWIN matches first
  // on `verifiable_storage`; IF-proper products match on different modules).
  tlip, twinImmutableProof,
  notarization, iotaAssetFramework, iotaAccreditationRegistry,
  traceability, salus,

  // Identity (identityFull before identityWot — more specific)
  identityFull, identityWot, objectid, credentials,
  iotaNames,

  // Bridges
  echoProtocolBridge, layerZero, layerZeroOft, wormhole,

  // Oracles
  pythOracle, switchboardOracle,

  // NFT (nftLaunchpad before tradeport so the launchpad sub-product wins
  // its `{launchpad, mint_box}` match over tradeport's deployer-catch-all)
  nftLaunchpad, tradeport, nftCollections,

  // Games
  chess, ticTacToe, game2048, iotaFlip,

  // Misc
  marketplaceEscrow, vault, tokenSale, izipublish,
  giftDrop, liquidlink, boltEarth,
  tokenlabsStaking, tokenlabsVIota, tokenlabsTln, tokenlabsPayment,
  nativeStaking, iotaFramework,
  ifTesting,
];

export { ProjectDefinition };
