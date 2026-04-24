import { ProjectDefinition } from '../project.interface';

export const twinNft: ProjectDefinition = {
  name: 'TWIN NFT (Pre-launch)',
  layer: 'L1',
  category: 'NFT',
  subcategory: 'Dynamic NFT',
  description: 'TWIN Foundation\'s `nft` package line — same deployer and Move-package scaffold as TWIN ImmutableProof, but with the `nft` module instead of `verifiable_storage`. All instances are dormant on mainnet today (zero events, zero objects, zero senders); listed separately so the four scaffolded NFT packages don\'t get absorbed by the IOTA Foundation Testing routing target on the shared deployer.',
  urls: [{ label: 'TWIN', href: 'https://www.twin.org' }],
  teamId: 'twin-foundation',
  addedAt: '2026-04-25',
  match: {
    deployerAddresses: ['0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe'],
    all: ['nft'],
    objectTypes: ['MigrationState', 'UpgradeCapRegistry'],
  },
  attribution: `
On-chain evidence: Move package with module \`nft\` from the shared deployer \`0x164625aaa09a1504cd37ba25ab98525cf2e15792f06a12dd378a044a0d719abe\` AND exposing the TWIN Foundation scaffold types \`MigrationState\` + \`UpgradeCapRegistry\` as companion objects to the main \`NFT\` struct. The scaffold pattern is what mechanically separates these from the IF Testing fixtures that share the same deployer + module name: across 18 packages from this deployer, 8 carry the scaffold (5× \`verifiable_storage\` — the live TWIN ImmutableProof line — and 3× \`nft\`, plus a fourth \`nft\` package \`0x3f56e85d1e6e33bb1b014f0a0bab065b85a853f7da26dc42c64d6e1a36962519\` discovered 2026-04-25), while 10 are bare \`nft\` packages without the migration/upgrade-cap plumbing — those are the IF gas-station / transfer-test fixtures that stay routed to \`IOTA Foundation (Testing)\`.

Naming uses \`(Pre-launch)\` suffix because every matched package today has zero transactions, zero events, and zero objects. Promote/rename when at least one instance lights up with real activity and the user-facing product name is known. Until then, "TWIN NFT" is the most honest label — the scaffold + deployer prove TWIN Foundation provenance, but we don't yet know whether this is a credentials-as-NFT layer, a trade-document NFT line, or something else.

This def predates a known activity signal on purpose: the alternative is letting the dormant scaffolded packages route to IF Testing (wrong team, wrong project) for the entire pre-launch window, then having to retroactively re-classify when activity starts. The \`objectTypes\` matcher (added 2026-04-25) is the reusable primitive that makes this routing tractable — see also \`api/src/ecosystem/projects/project.interface.ts\` \`match.objectTypes\`.
`.trim(),
};
