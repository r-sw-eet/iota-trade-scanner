import { ProjectDefinition } from './project.interface';

import { poolsFinance, virtue, virtueStabilityPool, swirl, swirlV1, cyberperp, iotaroyale, clawSwapGateway, virtuePoints, multiAssetBank } from './defi/_index';
import { tlip, twinImmutableProof, notarization, iotaAssetFramework, iotaAccreditationRegistry, traceability, salus, truvid } from './trade/_index';
import { identityFull, identityWot, objectid, credentials, iotaNames, iotaLink, carNft, turingcerts } from './identity/_index';
import { echoProtocolBridge, layerZero, layerZeroWorkers, layerZeroPriceFeed, layerZeroOft, wormhole } from './bridges/_index';
import { pythOracle, switchboardOracle, kamuiVrf } from './oracles/_index';
import { nftLaunchpad, tradeport, nftCollections, healthyGang, ghostLights, tanapaz, tomaRajadao, tranquilidadeDrops, studioCb69Aggregate, gamiflyAylab, gamiflyIsla, gamiflyOtterfly, gamiflyChamillion, iotaPunks, ogApe, lilApe, lumis, phishingSpray49c4, iotaEstoicos, ctrlvAgents, numberOneFreeNft } from './nft/_index';
import { chess, ticTacToe, game2048, iotaFlip, lostCrusaderArcaneDust, lostCrusaderReviveSpells } from './games/_index';
import {
  clawnera, vault, tokenSale, izipublish, giftDrop, liquidlink, boltEarth,
  tokenlabsStaking, tokenlabsVIota, tokenlabsTln, tokenlabsPayment,
  nativeStaking, iotaFramework, ifTesting, stardustMigratedTokens, krillTube, giveRep,
  carbonCredits,
  stardustFramework, legacyMigrationHistory, iotaEvmAnchor,
  studioB8b1Demos, studio0a0dExtras,
  iotaSpam,
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
  clawSwapGateway,
  // Virtue-adjacent synthetic-studio rows (disjoint deployers from `virtue`
  // itself — their own match rules pin `studio-6ff4` and `studio-b9cf` so
  // there's no priority collision with Virtue's deployer catch-all).
  virtuePoints, multiAssetBank,

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
  // Turing Certs — IOTA Business Innovation Program partner, W3C VC issuance
  // stack. Deployer-pinned so the `vc_data` / `vc_envelope` module names can't
  // false-positive against any other VC deployment.
  turingcerts,

  // Bridges
  echoProtocolBridge,
  // LayerZero rows: protocol, Workers (DVNs + Executor), Price Feed (Executor
  // pricing oracle, deployer-pinned), OFT (aggregate bucket for third-party
  // tokens, splitByDeployer → routes to known teams where possible).
  layerZero, layerZeroWorkers, layerZeroPriceFeed, layerZeroOft,
  wormhole,

  // Oracles
  pythOracle, switchboardOracle,
  // Kamui VRF by Mangekyou Labs — single-package VRF primitive at
  // `0xc871ca37…`. Deployer-pinned + module-name-guarded.
  kamuiVrf,

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
  iotaEstoicos, ctrlvAgents,
  phishingSpray49c4,
  // "Number 1 Collection" — biggest single-project unique-sender campaign
  // on IOTA Rebased (1.04M wallets). Deployer + single module pin; no
  // overlap with other NFT rules.
  numberOneFreeNft,

  // Games
  chess, ticTacToe, game2048, iotaFlip,
  // Lost Crusader — daily Arcane Dust claim + higher-tier Revive Spells /
  // Golden Arcane Dust on the sibling deployer. Two separate project rows
  // under the same `lost-crusader` team.
  lostCrusaderArcaneDust, lostCrusaderReviveSpells,

  // Misc
  // Chain primitives grouped up top — genesis-installed framework packages
  // and IF migration/anchor infrastructure. These ship from IOTA Foundation
  // deployers (or deployerless genesis) and are matched by packageAddresses
  // or narrow module rules, not by team routing.
  stardustFramework,
  legacyMigrationHistory,
  iotaEvmAnchor,
  clawnera, vault, tokenSale, izipublish,
  giftDrop, liquidlink, boltEarth,
  tokenlabsStaking, tokenlabsVIota, tokenlabsTln, tokenlabsPayment,
  nativeStaking, iotaFramework,
  stardustMigratedTokens,
  krillTube,
  giveRep,
  carbonCredits,
  // IOTA SPAM — Rising Phoenix 2 Ltd experimental "Proof of Spam" product.
  // Shares deployer `0xd3906909…` with `iota-foundation` (iotaLink) and
  // `layerZeroOft`. MUST come AFTER `iotaLink` (already declared in the
  // Identity block above) and AFTER `layerZeroOft` (already declared in
  // the Bridges block above) so the narrower rules win first; only packages
  // on this deployer that don't match those narrower rules — i.e. the
  // spam / icon / nft / airdrop / mockcoin / rebased_nft / test_nft /
  // custom_metadata_registry cluster — fall through to iotaSpam.
  iotaSpam,
  // Studio-sibling aggregate rows — MUST come after any narrower project defs
  // on the same team (studioB8b1Demos after game2048, studio0a0dExtras after
  // clawnera/clawSwapGateway/tokenSale). Both deployer-pinned + module-any
  // bucket rows, catch-all for modules that don't match dedicated rules.
  studioB8b1Demos,
  studio0a0dExtras,
  // `ifTesting` is routing-only (match: {}) and MUST come last among
  // `iota-foundation` projects — the team-deployer routing code picks the
  // first routing-only project it finds on the team, so putting it last
  // means it can only absorb aggregate-bucket fallthrough, never packages
  // that a narrower team project (`stardustMigratedTokens`, `iotaLink`,
  // etc.) would have caught.
  ifTesting,
];

export { ProjectDefinition };
