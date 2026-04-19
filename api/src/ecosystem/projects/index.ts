import { ProjectDefinition } from './project.interface';

import { poolsFinance, virtue, virtueStabilityPool, swirl, swirlV1, cyberperp, iotaroyale } from './defi/_index';
import { tlip, twinImmutableProof, notarization, iotaAssetFramework, iotaAccreditationRegistry, traceability, salus, truvid } from './trade/_index';
import { identityFull, identityWot, objectid, credentials, iotaNames, iotaLink, carNft } from './identity/_index';
import { echoProtocolBridge, layerZero, layerZeroWorkers, layerZeroOft, wormhole } from './bridges/_index';
import { pythOracle, switchboardOracle } from './oracles/_index';
import { nftLaunchpad, tradeport, nftCollections, healthyGang, ghostLights, tanapaz, tomaRajadao, tranquilidadeDrops, studioCb69Aggregate, gamiflyAylab, gamiflyIsla, gamiflyOtterfly, gamiflyChamillion, iotaPunks, ogApe, lilApe, lumis, phishingSpray49c4 } from './nft/_index';
import { chess, ticTacToe, game2048, iotaFlip } from './games/_index';
import {
  marketplaceEscrow, vault, tokenSale, izipublish, giftDrop, liquidlink, boltEarth,
  tokenlabsStaking, tokenlabsVIota, tokenlabsTln, tokenlabsPayment,
  nativeStaking, iotaFramework, ifTesting, stardustMigratedTokens, krillTube,
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
  traceability, salus, truvid,

  // Identity (identityFull before identityWot — more specific)
  identityFull, identityWot, objectid, credentials,
  iotaNames, iotaLink, carNft,

  // Bridges
  echoProtocolBridge, layerZero, layerZeroWorkers, layerZeroOft, wormhole,

  // Oracles
  pythOracle, switchboardOracle,

  // NFT (nftLaunchpad before tradeport so the launchpad sub-product wins
  // its `{launchpad, mint_box}` match over tradeport's deployer-catch-all)
  nftLaunchpad, tradeport, nftCollections,
  // Studio 0xcb6956e9 — multi-collection PFP deployer. Narrow defs
  // (healthyGang fingerprint + the 4 sibling module-name rules) come before
  // the deployer-catch-all aggregate so the specific rule wins sync match;
  // packages from this deployer that don't match any of the narrow defs
  // fall through to the aggregate's `splitByDeployer` bucket.
  healthyGang,
  ghostLights, tanapaz, tomaRajadao, tranquilidadeDrops,
  studioCb69Aggregate,
  // Gamifly — 9 single-module PFP packages at one deployer, grouped into
  // 4 theme-family rows (Aylab / Isla / Otterfly / Chamillion). Each rule
  // pins the deployer + a module `any`-set so we can't accidentally catch
  // unrelated packages reusing these generic module names elsewhere.
  gamiflyAylab, gamiflyIsla, gamiflyOtterfly, gamiflyChamillion,
  iotaPunks,
  ogApe, lilApe,
  lumis,
  phishingSpray49c4,

  // Games
  chess, ticTacToe, game2048, iotaFlip,

  // Misc
  marketplaceEscrow, vault, tokenSale, izipublish,
  giftDrop, liquidlink, boltEarth,
  tokenlabsStaking, tokenlabsVIota, tokenlabsTln, tokenlabsPayment,
  nativeStaking, iotaFramework,
  stardustMigratedTokens,
  krillTube,
  // `ifTesting` is routing-only (match: {}) and MUST come last among
  // `iota-foundation` projects — the team-deployer routing code picks the
  // first routing-only project it finds on the team, so putting it last
  // means it can only absorb aggregate-bucket fallthrough, never packages
  // that a narrower team project (`stardustMigratedTokens`, `iotaLink`,
  // etc.) would have caught.
  ifTesting,
];

export { ProjectDefinition };
