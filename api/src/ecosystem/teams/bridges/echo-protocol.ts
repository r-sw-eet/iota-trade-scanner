import { Team } from '../team.interface';

export const echoProtocol: Team = {
  id: 'echo-protocol',
  name: 'Echo Protocol',
  description: 'Multi-asset BTCFi bridge on IOTA Rebased. iBTC is the first asset minted; additional assets follow the same committee-custody design.',
  urls: [{ label: 'Website', href: 'https://www.echo-protocol.xyz' }],
  deployers: [{ address: '0x95ec54247e108d3a15be965c5723fee29de62ab445c002fc1b8a48bfc6fb281e', network: 'mainnet' }],
  logo: '/logos/echo-protocol.svg',
  attribution: `
Deployer \`0x95ec54247e108d3a15be965c5723fee29de62ab445c002fc1b8a48bfc6fb281e\` is Echo Protocol's IOTA bridge deployer. Hacken's public audit report names Echo Protocol as the customer and enumerates exactly nine Move source files in scope: \`bridge, chain_ids, committee, crypto, ibtc, limiter, message, message_types, treasury\`. A whole-mainnet scan finds exactly one deployer publishing packages with that 9-module signature (five upgrade versions over time), and IOTA-ecosystem press coverage (CryptoNews, MEXC, Bitget) independently confirms Echo Protocol as IOTA's BTC-bridge provider. iBTC is the first asset minted by this bridge; the team name is the bridge operator.
`.trim(),
};
