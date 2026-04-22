import { ProjectDefinition } from '../project.interface';

export const giveRep: ProjectDefinition = {
  name: 'GiveRep',
  layer: 'L1',
  category: 'Social',
  subcategory: 'Incentive',
  description: 'SocialFi reputation / reward-claim platform at `giverep.com`. Converts social-media engagement (primarily X / Twitter) into on-chain $REP points. Primary deployment is on Sui; IOTA Rebased is the secondary chain, used for campaign reward claims. On-chain module `giverep_claim` provides per-workspace `Pool` objects (balance + managers + claimed-set); admins deposit IOTA, users claim their rewards via signed proofs. Same `studio-b8b1` team as KrillTube / chess / 2048 / tic_tac_iota / vault / giftdrop. IOTA Foundation\'s Ambassador Program famously migrated to GiveRep for engagement rewards (press-covered: "750k+ $IOTA distributed to LiquidLink users via GiveRep campaigns").',
  urls: [
    { label: 'Website', href: 'https://giverep.com/' },
  ],
  teamId: 'studio-b8b1',
  match: {
    deployerAddresses: ['0xb8b1380eb2f879440e6f568edbc3aab46b54c48b8bfe81acbc1b4cf15a2706c6'],
    all: ['giverep_claim'],
  },
  attribution: `
On-chain evidence: single package on the studio-b8b1 deployer whose module set contains \`giverep_claim\` — \`0x91b430ac8a732f4e0622eb0cee61e54899961e87597ae7fe2989787ad1084d30\` (shipping \`giverep_claim\` + \`vault\`, since Rebased builds often bundle the vault utility with the claim primitive).

Struct set: \`Pool\` (\`key\` — per-workspace reward pool), \`SuperAdmin\` (\`key\` — admin registry), \`ClaimStruct\` (\`drop\`), plus the usual event structs \`ClaimEvent\` / \`DepositEvent\` / \`WithdrawEvent\` / \`PoolCreatedEvent\` / \`PoolDeletedEvent\`.

**Pool object fields (sampled live):**
\`\`\`
{ workspace_id: "105",  // ties the on-chain pool to a GiveRep off-chain workspace
  balance: { value: "2201073694679" },  // ~2,201 IOTA held for this workspace's rewards
  managers: [0x619063…, 0x54df0f…],  // off-chain ops signers
  claimed: { size: "221" } }  // 221 claims processed so far on this pool
\`\`\`

**SuperAdmin:** \`[ 0xb8b1380e… (the studio-b8b1 deployer itself), 0x619063… ]\`. The deployer directly administers the contract via the SuperAdmin cap — consistent with the studio-b8b1 team attribution note that the deployer administers games + utilities via cap objects rather than handing control off to third-party operators.

**Cross-references to press / ecosystem coverage:**
- IOTA Foundation's Ambassador Program migrated to GiveRep for engagement tracking.
- Press: "Over 750,000 $IOTA (~$108K USD) distributed to LiquidLink users via GiveRep campaigns" (LiquidLink cross-integration).
- Primary GiveRep deployment is on Sui; Rebased is the secondary IOTA-side chain used for claims.

Match rule: \`deployerAddresses\` + \`all: ['giverep_claim']\` (single-element) — pins the studio-b8b1 deployer AND requires the \`giverep_claim\` module, so only this one package matches, not the other 36 packages on the deployer (vault / giftdrop_iota / chess / tic_tac_iota / etc.).

\`isCollectible: false\` — functional reputation-reward primitive, not a PFP. Stays visible regardless of the "Hide collectibles" toggle.

Team \`studio-b8b1\` already documents GiveRep in its attribution prose; this project row surfaces GiveRep's on-chain claim activity as its own line on the dashboard rather than burying it in the studio rollup.
`.trim(),
};
