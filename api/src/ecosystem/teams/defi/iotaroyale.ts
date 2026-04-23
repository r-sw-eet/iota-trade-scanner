import { Team } from '../team.interface';

export const iotaroyale: Team = {
  id: 'iotaroyale',
  name: 'IotaRoyale',
  description: 'Parchís / board-games platform on IOTA Rebased with its own $IRT reward token. Liquidity farms on top of Pools Finance\'s DEX — customer of Pools, not the operator.',
  urls: [{ label: 'Website', href: 'https://iotaroyale.com' }],
  deployers: [{ address: '0x21303d10b1369c414f297a6297e48d6bce07bec58f251ea842c7b33779283542', network: 'mainnet' }],
  logo: '/logos/iotaroyale.ico',
  attribution: `
Deployer \`0x21303d10b1369c414f297a6297e48d6bce07bec58f251ea842c7b33779283542\` identified as IotaRoyale via IOTA RPC \`iotax_getCoinMetadata\` on the \`irt::IRT\` coin type: returns \`name: "IotaRoyale Token"\`, \`symbol: "IRT"\`, \`iconUrl: https://iotaroyale.com/logo.png\`, description \`"Token nativo de IotaRoyale — Plataforma de juegos PvP en IOTA"\`. Product verified at \`iotaroyale.com\` (Parchís/board games), GeckoTerminal listing "IRT/vIOTA - IotaRoyale Token Price on Pools Finance", and the public launch video \`youtube.com/watch?v=6530JLNTqoU\` (Feb 2026, "IOTAROYALE lanza su token $IRT y conecta farms con $TLN").

Previously mis-attributed to Pools Finance as their "farming deployer" based on the \`irt\` module name. Corrected 2026-04-18: \`app.pools.finance\` bundle grep found **zero** references to this deployer or any of its 5 packages; Pools' own LP-staking lives inside the audited AMM package's \`stake*\` modules, not in a separate farming package. IotaRoyale trades \`stIOTA → CERT → TLN\` through the Pools AMM router — behavior of a liquidity customer, not the AMM operator.
`.trim(),
};
